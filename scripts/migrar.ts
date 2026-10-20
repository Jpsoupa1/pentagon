import "./env";
import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { Pool } from "pg";
import { urlDoBanco } from "../src/server/db/url";
import { semearAreas } from "./seed-areas";
import { semearRotinaParaTodos } from "./seed-rotina";
import { semearSegurancaParaTodos } from "./seed-seguranca";
import { semearTrilhaParaTodos } from "./seed-trilha";

export async function migrar() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL não definida.");
  const pool = new Pool({ connectionString: urlDoBanco(url), max: 1 });
  try {
    const db = drizzle(pool);
    await migrate(db, { migrationsFolder: "drizzle" });
    await semearAreas(db);
    await semearTrilhaParaTodos(db);
    await semearRotinaParaTodos(db);
    await semearSegurancaParaTodos(db);
    console.log("Migrações aplicadas; áreas, trilhas e rotina conferidas.");
  } finally {
    await pool.end();
  }
}

if (process.argv[1]?.endsWith("migrar.ts")) {
  migrar().catch((erro) => {
    console.error(erro);
    process.exit(1);
  });
}
