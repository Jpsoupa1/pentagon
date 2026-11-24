// npm run seed:plano  → grava o catálogo do plano AI Engineer (o migrar.ts já faz isso a cada deploy).
import "./env";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { urlDoBanco } from "../src/server/db/url";
import { semearCatalogoPlano } from "../src/server/plano/seed";

export { semearCatalogoPlano };

if (process.argv[1]?.endsWith("seed-plano.ts")) {
  const pool = new Pool({ connectionString: urlDoBanco(process.env.DATABASE_URL ?? ""), max: 1 });
  semearCatalogoPlano(drizzle(pool))
    .then((r) => console.log(`Plano: catálogo v${r.versao} com ${r.itens} itens.`))
    .catch((e) => {
      console.error(e);
      process.exitCode = 1;
    })
    .finally(() => pool.end());
}
