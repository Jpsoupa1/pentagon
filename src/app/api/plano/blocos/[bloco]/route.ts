import { blocoFeitoPlanoSchema, blocoPlanoSchema } from "@/lib/validacao";
import { corpo, rota } from "@/server/api";
import { marcarBloco } from "@/server/servicos/plano";

/** PUT { feito, minutos? }: "Fiz este bloco" de hoje (ou desmarcar). */
export const PUT = rota<{ bloco: string }>(async ({ userId, req, params }) =>
  marcarBloco(
    userId,
    blocoPlanoSchema.parse(params.bloco),
    await corpo(req, blocoFeitoPlanoSchema),
  ),
);
