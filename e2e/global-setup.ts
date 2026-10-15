import { mkdirSync, writeFileSync } from "node:fs";
import "../scripts/env";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { semearTrilha } from "../src/server/estudos/seed";
import { criarSessaoDeTeste } from "./sessao";

export default async function globalSetup() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL não definida para os testes e2e.");
  const { token, userId } = await criarSessaoDeTeste(url);
  const pool = new Pool({ connectionString: url, max: 1 });
  try {
    await semearTrilha(drizzle(pool), userId);
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
}
