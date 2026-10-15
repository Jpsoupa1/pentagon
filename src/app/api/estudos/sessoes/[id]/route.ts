import { z } from "zod";
import { corpo, idSchema, rota } from "@/server/api";
import { marcarSessao } from "@/server/servicos/estudos";

/** PATCH { feita: boolean } marca a sessão como feita ou pendente. */
export const PATCH = rota<{ id: string }>(
  async ({ userId, params, req }) => {
    const { feita } = await corpo(req, z.object({ feita: z.boolean() }));
    return marcarSessao(userId, idSchema.parse(params.id), feita);
  },
  { reconciliar: true },
);
