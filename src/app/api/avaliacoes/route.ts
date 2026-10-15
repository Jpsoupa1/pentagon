import { avaliacaoSchema } from "@/lib/validacao";
import { corpo, rota } from "@/server/api";
import { criarAvaliacao, listarAvaliacoes } from "@/server/servicos/avaliacoes";

export const GET = rota(async ({ userId }) => listarAvaliacoes(userId));

export const POST = rota(
  async ({ userId, req }) => criarAvaliacao(userId, await corpo(req, avaliacaoSchema)),
  { status: 201, reconciliar: true },
);
