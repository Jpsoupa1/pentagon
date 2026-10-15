import { checklistSchema } from "@/lib/validacao";
import { corpo, idSchema, rota } from "@/server/api";
import { apagarItem, atualizarItem } from "@/server/servicos/avaliacoes";

type P = { id: string };

export const PATCH = rota<P>(async ({ userId, params, req }) =>
  atualizarItem(userId, idSchema.parse(params.id), await corpo(req, checklistSchema.partial())),
);

export const DELETE = rota<P>(async ({ userId, params }) => {
  await apagarItem(userId, idSchema.parse(params.id));
});
