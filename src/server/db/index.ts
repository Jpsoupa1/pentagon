import "server-only";
import { attachDatabasePool } from "@vercel/functions";
import { drizzle, type NodePgDatabase } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "./schema";
import { urlDoBanco } from "./url";

export type Db = NodePgDatabase<typeof schema>;

const globalParaDb = globalThis as unknown as { pentagonDb?: Db };

function criar(): Db {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL não definida. Veja o .env.example.");
  const pool = new Pool({ connectionString: urlDoBanco(url), max: 5, idleTimeoutMillis: 5_000 });
  // Na Vercel (Fluid compute) fecha conexões ociosas antes da função ser suspensa.
  attachDatabasePool(pool);
  return drizzle(pool, { schema });
}

/** Conexão preguiçosa: o build não precisa do banco. */
export function db(): Db {
  globalParaDb.pentagonDb ??= criar();
  return globalParaDb.pentagonDb;
}

export { schema };
