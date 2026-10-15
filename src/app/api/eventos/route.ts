import { eventoSchema } from "@/lib/validacao";
import { corpo, rota } from "@/server/api";
import { criarComChecagem } from "@/server/servicos/compromissos";
import { listarEventos } from "@/server/servicos/eventos";

export const GET = rota(async ({ userId }) => listarEventos(userId));

export const POST = rota(
  async ({ userId, req }) => criarComChecagem(userId, await corpo(req, eventoSchema)),
  { status: 201, reconciliar: true },
);
