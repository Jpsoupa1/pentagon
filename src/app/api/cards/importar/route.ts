import { rota } from "@/server/api";
import { importarCards } from "@/server/servicos/cards";

/** POST { cards: [...] }: importa os válidos, ignora ids repetidos e devolve os cards com erro. */
export const POST = rota(async ({ userId, req }) => importarCards(userId, await req.json()), {
  status: 201,
});
