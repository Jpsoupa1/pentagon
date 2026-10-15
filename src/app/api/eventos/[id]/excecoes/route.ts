import { excecaoSchema } from "@/lib/validacao";
import { corpo, idSchema, rota } from "@/server/api";
import { excecaoComChecagem } from "@/server/servicos/compromissos";

/** Cancela ou move uma ocorrência específica (cria ou substitui a exceção daquele dia). */
export const POST = rota<{ id: string }>(
  async ({ userId, params, req }) =>
    excecaoComChecagem(userId, idSchema.parse(params.id), await corpo(req, excecaoSchema)),
  { status: 201, reconciliar: true },
);
