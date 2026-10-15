import { checklistSchema } from "@/lib/validacao";
import { corpo, idSchema, rota } from "@/server/api";
import { adicionarItem } from "@/server/servicos/avaliacoes";

export const POST = rota<{ id: string }>(
  async ({ userId, params, req }) =>
    adicionarItem(userId, idSchema.parse(params.id), await corpo(req, checklistSchema)),
  { status: 201 },
);
