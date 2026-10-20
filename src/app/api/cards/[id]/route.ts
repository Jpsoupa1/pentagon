import { cardEdicaoSchema } from "@/lib/validacao";
import { corpo, idSchema, rota } from "@/server/api";
import { apagarCard, editarCard } from "@/server/servicos/cards";

/** PATCH { trilha?, tema?, frente?, verso?, codigo?, origem?, suspenso? } */
export const PATCH = rota<{ id: string }>(async ({ userId, params, req }) =>
  editarCard(userId, idSchema.parse(params.id), await corpo(req, cardEdicaoSchema)),
);

export const DELETE = rota<{ id: string }>(async ({ userId, params }) => {
  await apagarCard(userId, idSchema.parse(params.id));
});
