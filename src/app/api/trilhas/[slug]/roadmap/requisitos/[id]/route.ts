import { z } from "zod";
import { corpo, idSchema, rota } from "@/server/api";
import { marcarRequisito } from "@/server/servicos/roadmap";

/** PATCH { feito } marca ou desmarca um requisito do portão da fase. */
export const PATCH = rota<{ slug: string; id: string }>(async ({ userId, params, req }) => {
  const { feito } = await corpo(req, z.object({ feito: z.boolean() }));
  return marcarRequisito(userId, params.slug, idSchema.parse(params.id), feito);
});
