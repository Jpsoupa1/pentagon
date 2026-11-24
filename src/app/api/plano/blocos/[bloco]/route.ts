import { blocoFeitoPlanoSchema, blocoPlanoSchema } from "@/lib/validacao";
import { corpo } from "@/server/api";
import { rotaDoDono } from "@/server/plano/rota";
import { marcarBloco } from "@/server/servicos/plano";

/** PUT { feito, minutos? }: "Fiz este bloco" de hoje (ou desmarcar). */
export const PUT = rotaDoDono<{ bloco: string }>(async ({ userId, req, params }) =>
  marcarBloco(
    userId,
    blocoPlanoSchema.parse(params.bloco),
    await corpo(req, blocoFeitoPlanoSchema),
  ),
);
