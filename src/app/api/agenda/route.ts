import { intervaloSchema } from "@/lib/validacao";
import { rota } from "@/server/api";
import { agenda } from "@/server/servicos/agenda";

/** GET /api/agenda?de=AAAA-MM-DD&ate=AAAA-MM-DD: ocorrências expandidas, prazos e horas por área. */
export const GET = rota(async ({ userId, req }) => {
  const p = req.nextUrl.searchParams;
  return agenda(userId, intervaloSchema.parse({ de: p.get("de"), ate: p.get("ate") }));
});
