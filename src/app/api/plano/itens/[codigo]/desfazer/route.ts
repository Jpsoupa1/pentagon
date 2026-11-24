import { codigoPlanoSchema } from "@/lib/validacao";
import { rotaDoDono } from "@/server/plano/rota";
import { desfazerConclusao } from "@/server/servicos/plano";

/** POST: desfaz a conclusão mais recente da trilha. */
export const POST = rotaDoDono<{ codigo: string }>(
  async ({ userId, params }) => desfazerConclusao(userId, codigoPlanoSchema.parse(params.codigo)),
  { reconciliar: true },
);
