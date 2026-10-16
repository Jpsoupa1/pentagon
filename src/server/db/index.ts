import "server-only";
import { AsyncLocalStorage } from "node:async_hooks";
import { attachDatabasePool } from "@vercel/functions";
import { drizzle, type NodePgDatabase } from "drizzle-orm/node-postgres";
import { Pool, type PoolClient } from "pg";
import * as schema from "./schema";
import { urlDoBanco } from "./url";

export type Db = NodePgDatabase<typeof schema>;

const globalParaDb = globalThis as unknown as { pentagonDb?: Db; pentagonPool?: Pool };

function pool(): Pool {
  if (!globalParaDb.pentagonPool) {
    const url = process.env.DATABASE_URL;
    if (!url) throw new Error("DATABASE_URL não definida. Veja o .env.example.");
    const p = new Pool({ connectionString: urlDoBanco(url), max: 5, idleTimeoutMillis: 5_000 });
    // Na Vercel (Fluid compute) fecha conexões ociosas antes da função ser suspensa.
    attachDatabasePool(p);
    globalParaDb.pentagonPool = p;
  }
  return globalParaDb.pentagonPool;
}

function criar(): Db {
  return drizzle(pool(), { schema });
}

const transacaoAtual = new AsyncLocalStorage<Db>();

/**
 * Conexão preguiçosa: o build não precisa do banco.
 * Dentro de `naTransacao`, devolve a transação aberta, então os serviços entram nela sem mudar nada.
 */
export function db(): Db {
  const tx = transacaoAtual.getStore();
  if (tx) return tx;
  globalParaDb.pentagonDb ??= criar();
  return globalParaDb.pentagonDb;
}

/** Roda `fn` numa transação; tudo que chamar `db()` lá dentro grava junto ou não grava nada. */
export async function naTransacao<T>(fn: () => Promise<T>): Promise<T> {
  if (transacaoAtual.getStore()) return fn();
  const cliente = await pool().connect();
  // Os serviços consultam em paralelo (Promise.all); numa conexão só, as consultas entram em fila.
  const original = cliente.query;
  let fila: Promise<unknown> = Promise.resolve();
  cliente.query = ((...args: Parameters<PoolClient["query"]>) => {
    const vez = fila.then(() => original.apply(cliente, args));
    fila = vez.catch(() => undefined);
    return vez;
  }) as PoolClient["query"];
  try {
    return await drizzle(cliente, { schema }).transaction((tx) =>
      transacaoAtual.run(tx as unknown as Db, fn),
    );
  } finally {
    cliente.query = original;
    cliente.release();
  }
}

export { schema };
