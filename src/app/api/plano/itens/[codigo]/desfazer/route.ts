import { codigoPlanoSchema } from "@/lib/validacao";
import { rota } from "@/server/api";
import { desfazerConclusao } from "@/server/servicos/plano";

/** POST: desfaz a conclusão mais recente da trilha. */
export const POST = rota<{ codigo: string }>(async ({ userId, params }) =>
  desfazerConclusao(userId, codigoPlanoSchema.parse(params.codigo)),
);
