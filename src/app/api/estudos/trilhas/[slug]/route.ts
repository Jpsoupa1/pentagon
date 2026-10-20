import { z } from "zod";
import { corpo, rota } from "@/server/api";
import { mudarFase } from "@/server/servicos/estudos";

/** PATCH { faseAtual } muda a fase em estudo de uma trilha sem datas (Segurança). */
export const PATCH = rota<{ slug: string }>(async ({ userId, params, req }) => {
  const { faseAtual } = await corpo(req, z.object({ faseAtual: z.int().min(0).max(20) }));
  return mudarFase(userId, params.slug, faseAtual);
});
