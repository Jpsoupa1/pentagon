// npm run migrar:plano [email]  → passo de dados do plano AI: arquiva o que saiu do app (só donos, uma vez).
import "./env";
import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { urlDoBanco } from "../src/server/db/url";
import { users } from "../src/server/db/schema";
import { recebeConteudoPessoal } from "../src/server/permissao";
import { migrarPlano } from "../src/server/plano/migracao";

type Opcoes = {
  email?: string;
  agora?: Date;
  /** Quem migra um usuário. Os testes trocam por uma versão que falha. */
  migrar?: typeof migrarPlano;
  /** Passo 5 (cancelar os avisos arquivados). Roda depois do commit de cada usuário migrado. */
  reconciliar?: (userId: string) => Promise<unknown>;
};

/** Reconcilia pelo serviço de avisos. Importa na hora: ele exige a condição `react-server` do tsx. */
async function reconciliarAvisosDoServidor(userId: string) {
  const { reconciliarAvisos } = await import("../src/server/servicos/avisos");
  return reconciliarAvisos(userId);
}

/**
 * Migra cada dono numa transação própria. A falha de um não desfaz nem impede os outros; no fim,
 * lança com os ids que falharam, para o deploy quebrar e a versão anterior continuar no ar.
 * Falha na reconciliação não desfaz a migração (já gravada): o cron diário reconcilia de novo.
 */
export async function migrarPlanoParaTodos(db: ReturnType<typeof drizzle>, opcoes: Opcoes = {}) {
  const { email, agora = new Date(), migrar = migrarPlano } = opcoes;
  const reconciliar = opcoes.reconciliar ?? reconciliarAvisosDoServidor;
  const alvo = email
    ? await db
        .select({ id: users.id, email: users.email })
        .from(users)
        .where(eq(users.email, email))
    : await db.select({ id: users.id, email: users.email }).from(users);

  const migrados: string[] = [];
  const falharam: string[] = [];
  for (const u of alvo.filter((x) => recebeConteudoPessoal(x.email))) {
    try {
      if ((await migrar(db, u.id, agora)) === "migrado") {
        migrados.push(u.id);
        console.log(`Plano migrado para ${u.email}.`);
      }
    } catch (erro) {
      console.error(`Migração do plano falhou para ${u.email} (${u.id}):`, erro);
      falharam.push(u.id);
    }
  }
  for (const id of migrados) {
    try {
      await reconciliar(id);
    } catch (erro) {
      console.error(`Avisos de ${id} não reconciliados; o cron diário reconcilia:`, erro);
    }
  }
  if (falharam.length) {
    throw new Error(`Migração do plano falhou para os usuários: ${falharam.join(", ")}.`);
  }
  return { migrados };
}

if (process.argv[1]?.endsWith("migrar-plano.ts")) {
  const pool = new Pool({ connectionString: urlDoBanco(process.env.DATABASE_URL ?? ""), max: 1 });
  migrarPlanoParaTodos(drizzle(pool), { email: process.argv[2] })
    .catch((e) => {
      console.error(e);
      process.exitCode = 1;
    })
    .finally(() => pool.end());
}
