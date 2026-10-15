import { idSchema, rota } from "@/server/api";
import { apagarFeriado } from "@/server/servicos/feriados";

export const DELETE = rota<{ id: string }>(
  async ({ userId, params }) => {
    await apagarFeriado(userId, idSchema.parse(params.id));
  },
  { reconciliar: true },
);
