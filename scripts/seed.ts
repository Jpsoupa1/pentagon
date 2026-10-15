import "./env";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { urlDoBanco } from "../src/server/db/url";
import { semearAreas } from "./seed-areas";

const pool = new Pool({ connectionString: urlDoBanco(process.env.DATABASE_URL ?? ""), max: 1 });
semearAreas(drizzle(pool))
  .then(() => console.log("Áreas criadas."))
  .finally(() => pool.end());
