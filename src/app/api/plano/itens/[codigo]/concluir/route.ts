import { codigoPlanoSchema, conclusaoPlanoSchema } from "@/lib/validacao";
import { corpo, rota } from "@/server/api";
import { concluirItem } from "@/server/servicos/plano";

/** POST { nota?, aprovado? }: conclui o item atual; recusa vira 409 com `motivo`. */
export const POST = rota<{ codigo: string }>(async ({ userId, req, params }) =>
  concluirItem(
    userId,
    codigoPlanoSchema.parse(params.codigo),
    await corpo(req, conclusaoPlanoSchema),
  ),
);
