import { mkdirSync, writeFileSync } from "node:fs";
import "../scripts/env";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { semearTrilha } from "../src/server/estudos/seed";
import { semearRoadmap } from "../src/server/roadmap/seed";
import { semearSeguranca } from "../src/server/estudos/seguranca";
import { semearRotina } from "../src/server/rotina/seed";
import { iniciarClaudeFalso } from "./claude-falso";
import { criarSessaoDeTeste } from "./sessao";

// Os testes olham semanas fixas (19/10 a 9/11/2026). A rotina e a Segurança começam na semana
// de `agora`, então o seed usa a data em que esses testes foram escritos, e não a data real.
const SEMEADO_EM = new Date("2026-10-19T12:00:00-03:00");

export default async function globalSetup() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL não definida para os testes e2e.");
  const claude = await iniciarClaudeFalso(Number(process.env.PORTA_E2E ?? 3100) + 99);
  const { token, userId } = await criarSessaoDeTeste(url);
  const pool = new Pool({ connectionString: url, max: 1 });
  try {
    await semearTrilha(drizzle(pool), userId);
    await semearRotina(drizzle(pool), userId, SEMEADO_EM);
    await semearSeguranca(drizzle(pool), userId, SEMEADO_EM);
    await semearRoadmap(drizzle(pool), [userId]);
    // De propósito, sem `migrarPlano`: os e2e de Estudos e Trilhas dependem da DevOps e da
    // Segurança ativas até o 6b removê-los. O dono migrado é coberto em
    // tests/integracao/arquivamento.test.ts.
  } finally {
    await pool.end();
  }
  mkdirSync("e2e/.auth", { recursive: true });
  writeFileSync(
    "e2e/.auth/estado.json",
    JSON.stringify({
      cookies: [
        {
          name: "authjs.session-token",
          value: token,
          domain: "localhost",
          path: "/",
          expires: Math.floor(Date.now() / 1000) + 86_400,
          httpOnly: true,
          secure: false,
          sameSite: "Lax",
        },
      ],
      origins: [],
    }),
  );
  return () => new Promise<void>((ok) => claude.close(() => ok()));
}
