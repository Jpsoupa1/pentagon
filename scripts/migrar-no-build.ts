// Roda no build da Vercel: produção usa o banco principal, preview usa o branch da Neon do PR.
import { migrar } from "./migrar";

const ambiente = process.env.VERCEL_ENV;

if (ambiente === "production" || ambiente === "preview") {
  console.log(`Aplicando migrações (${ambiente})...`);
  migrar().catch((erro) => {
    console.error(erro);
    process.exit(1);
  });
} else {
  console.log("Fora da Vercel: migrações não rodam no build. Use `npm run db:migrate`.");
}
