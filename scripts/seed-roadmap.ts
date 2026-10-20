// npm run seed:roadmap [email]  → grava o catálogo do Roadmap e o progresso inicial ("done") do usuário (ou de todos).
import "./env";
import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { urlDoBanco } from "../src/server/db/url";
import { users } from "../src/server/db/schema";
import { semearRoadmap } from "../src/server/roadmap/seed";

export async function semearRoadmapParaTodos(db: ReturnType<typeof drizzle>, email?: string) {
  const alvo = email
    ? await db.select({ id: users.id }).from(users).where(eq(users.email, email))
    : await db.select({ id: users.id }).from(users);
  const resumo = await semearRoadmap(
    db,
    alvo.map((u) => u.id),
  );
  for (const r of resumo)
    console.log(`Roadmap ${r.slug}: ${r.fases} fases, ${alvo.length} usuário(s).`);
}

if (process.argv[1]?.endsWith("seed-roadmap.ts")) {
  const pool = new Pool({ connectionString: urlDoBanco(process.env.DATABASE_URL ?? ""), max: 1 });
  semearRoadmapParaTodos(drizzle(pool), process.argv[2])
    .catch((e) => {
      console.error(e);
      process.exitCode = 1;
    })
    .finally(() => pool.end());
}
