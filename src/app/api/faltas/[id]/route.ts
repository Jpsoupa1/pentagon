import { idSchema, rota } from "@/server/api";
import { apagarFalta } from "@/server/servicos/disciplinas";

export const DELETE = rota<{ id: string }>(async ({ userId, params }) => {
  await apagarFalta(userId, idSchema.parse(params.id));
});
