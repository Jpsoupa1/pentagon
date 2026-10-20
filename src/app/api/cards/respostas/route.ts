import { respostaCardSchema } from "@/lib/validacao";
import { corpo, rota } from "@/server/api";
import { responderCard } from "@/server/servicos/cards";

/** POST { id, cardId, resultado, modo, data, respondidaEm }: registra a resposta e reagenda o card. */
export const POST = rota(async ({ userId, req }) =>
  responderCard(userId, await corpo(req, respostaCardSchema)),
);
