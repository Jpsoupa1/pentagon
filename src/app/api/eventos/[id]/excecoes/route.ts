import { excecaoSchema } from "@/lib/validacao";
import { corpo, idSchema, rota } from "@/server/api";
import { salvarExcecao } from "@/server/servicos/eventos";

/** Cancela ou move uma ocorrência específica (cria ou substitui a exceção daquele dia). */
export const POST = rota<{ id: string }>(
  async ({ userId, params, req }) =>
    salvarExcecao(userId, idSchema.parse(params.id), await corpo(req, excecaoSchema)),
  { status: 201 },
);
