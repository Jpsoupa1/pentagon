// npm run seed:rotina [email]  → cria a rotina pessoal (só para quem ainda não tem).
import "./env";
import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { users } from "../src/server/db/schema";
import { semearRotina } from "../src/server/rotina/seed";

export async function semearRotinaParaTodos(db: ReturnType<typeof drizzle>, email?: string) {
  const alvo = email
    ? await db
        .select({ id: users.id, email: users.email })
        .from(users)
        .where(eq(users.email, email))
    : await db.select({ id: users.id, email: users.email }).from(users);
  for (const u of alvo) {
    const r = await semearRotina(db, u.id);
    console.log(`Rotina pessoal de ${u.email}: ${r.criada ? "criada" : "já existia, nada mudou"}.`);
  }
}

if (process.argv[1]?.endsWith("seed-rotina.ts")) {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL, max: 1 });
  semearRotinaParaTodos(drizzle(pool), process.argv[2])
    .catch((e) => {
      console.error(e);
      process.exitCode = 1;
    })
    .finally(() => pool.end());
}
