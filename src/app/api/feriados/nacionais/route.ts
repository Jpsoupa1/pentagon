import { feriadosNacionaisSchema } from "@/lib/validacao";
import { corpo, rota } from "@/server/api";
import { adicionarFeriadosNacionais } from "@/server/servicos/feriados";

/** POST { ano } cadastra os feriados nacionais daquele ano. */
export const POST = rota(
  async ({ userId, req }) =>
    adicionarFeriadosNacionais(userId, (await corpo(req, feriadosNacionaisSchema)).ano),
  { status: 201, reconciliar: true },
);
