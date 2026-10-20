// npm run seed:seguranca [email]  → registra a trilha de Segurança e as sessões semanais (só para quem ainda não tem).
import "./env";
import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { urlDoBanco } from "../src/server/db/url";
import { users } from "../src/server/db/schema";
import { recebeConteudoPessoal } from "../src/server/permissao";
import { semearSeguranca } from "../src/server/estudos/seguranca";

export async function semearSegurancaParaTodos(db: ReturnType<typeof drizzle>, email?: string) {
  const alvo = email
    ? await db
        .select({ id: users.id, email: users.email })
        .from(users)
        .where(eq(users.email, email))
    : await db.select({ id: users.id, email: users.email }).from(users);
  // Só o dono (OWNER_EMAILS) recebe a rotina e as trilhas; os outros usuários ficam vazios.
  for (const u of alvo.filter((x) => recebeConteudoPessoal(x.email))) {
    const r = await semearSeguranca(db, u.id);
    console.log(
      `Trilha de Segurança de ${u.email}: ${r.criada ? "criada com as sessões semanais" : "já existia, fases atualizadas"}.`,
    );
  }
}

if (process.argv[1]?.endsWith("seed-seguranca.ts")) {
  const pool = new Pool({ connectionString: urlDoBanco(process.env.DATABASE_URL ?? ""), max: 1 });
  semearSegurancaParaTodos(drizzle(pool), process.argv[2])
    .catch((e) => {
      console.error(e);
      process.exitCode = 1;
    })
    .finally(() => pool.end());
}
