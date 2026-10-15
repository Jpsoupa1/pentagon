import { idSchema, rota } from "@/server/api";
import { desfazerAcao } from "@/server/assistente/executar";

export const POST = rota<{ id: string }>(
  async ({ userId, params }) => desfazerAcao(userId, idSchema.parse(params.id)),
  { reconciliar: true },
);
