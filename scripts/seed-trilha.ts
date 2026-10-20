// npm run seed:trilha [email]  → grava a trilha DevOps para o usuário (ou para todos os usuários).
import "./env";
import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { urlDoBanco } from "../src/server/db/url";
import { users } from "../src/server/db/schema";
import { recebeConteudoPessoal } from "../src/server/permissao";
import { semearTrilha } from "../src/server/estudos/seed";

export async function semearTrilhaParaTodos(db: ReturnType<typeof drizzle>, email?: string) {
  const alvo = email
    ? await db
        .select({ id: users.id, email: users.email })
        .from(users)
        .where(eq(users.email, email))
    : await db.select({ id: users.id, email: users.email }).from(users);
  // Só o dono (OWNER_EMAILS) recebe a rotina e as trilhas; os outros usuários ficam vazios.
  for (const u of alvo.filter((x) => recebeConteudoPessoal(x.email))) {
    const r = await semearTrilha(db, u.id);
    console.log(
      `Trilha gravada para ${u.email}: ${r.semanas} semanas, ${r.sessoes} sessões` +
        (r.removidas ? `, ${r.removidas} fora do período removidas.` : "."),
    );
  }
  if (!alvo.length) console.log("Nenhum usuário encontrado. Entre no app uma vez e rode de novo.");
}

if (process.argv[1]?.endsWith("seed-trilha.ts")) {
  const pool = new Pool({ connectionString: urlDoBanco(process.env.DATABASE_URL ?? ""), max: 1 });
  semearTrilhaParaTodos(drizzle(pool), process.argv[2])
    .catch((e) => {
      console.error(e);
      process.exitCode = 1;
    })
    .finally(() => pool.end());
}
