import { z } from "zod";
import { corpo, idSchema, rota } from "@/server/api";
import { somarPratica } from "@/server/servicos/roadmap";

/** POST { delta: 1 | -1 } soma mais um no contador de prática (ou desfaz o último). */
export const POST = rota<{ slug: string; id: string }>(async ({ userId, params, req }) => {
  const { delta } = await corpo(req, z.object({ delta: z.union([z.literal(1), z.literal(-1)]) }));
  return somarPratica(userId, params.slug, idSchema.parse(params.id), delta);
});
