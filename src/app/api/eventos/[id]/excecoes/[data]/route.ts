import { dataSchema } from "@/lib/validacao";
import { idSchema, rota } from "@/server/api";
import { apagarExcecao } from "@/server/servicos/eventos";

/** Desfaz a exceção: a ocorrência volta ao horário normal. */
export const DELETE = rota<{ id: string; data: string }>(
  async ({ userId, params }) => {
    await apagarExcecao(userId, idSchema.parse(params.id), dataSchema.parse(params.data));
  },
  { reconciliar: true },
);
