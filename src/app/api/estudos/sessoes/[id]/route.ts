import { after } from "next/server";
import { z } from "zod";
import { corpo, idSchema, rota } from "@/server/api";
import { reconciliarAvisos } from "@/server/servicos/avisos";
import { marcarSessao } from "@/server/servicos/estudos";

/** PATCH { feita: boolean } marca a sessão como feita ou pendente. */
export const PATCH = rota<{ id: string }>(async ({ userId, params, req }) => {
  const { feita } = await corpo(req, z.object({ feita: z.boolean() }));
  const sessao = await marcarSessao(userId, idSchema.parse(params.id), feita);
  after(() => reconciliarAvisos(userId));
  return sessao;
});
