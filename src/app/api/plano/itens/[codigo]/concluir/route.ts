import { codigoPlanoSchema, conclusaoPlanoSchema } from "@/lib/validacao";
import { corpo } from "@/server/api";
import { rotaDoDono } from "@/server/plano/rota";
import { concluirItem } from "@/server/servicos/plano";

/** POST { nota?, aprovado? }: conclui o item atual; recusa vira 409 com `motivo`. */
export const POST = rotaDoDono<{ codigo: string }>(
  async ({ userId, req, params }) =>
    concluirItem(
      userId,
      codigoPlanoSchema.parse(params.codigo),
      await corpo(req, conclusaoPlanoSchema),
    ),
  { reconciliar: true },
);
