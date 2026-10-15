import "./env";
import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { Pool } from "pg";
import { semearAreas } from "./seed-areas";

export async function migrar() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL não definida.");
  const pool = new Pool({ connectionString: url, max: 1 });
  try {
    const db = drizzle(pool);
    await migrate(db, { migrationsFolder: "drizzle" });
    await semearAreas(db);
    console.log("Migrações aplicadas e áreas conferidas.");
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
