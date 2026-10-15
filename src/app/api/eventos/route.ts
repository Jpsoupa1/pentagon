import { eventoSchema } from "@/lib/validacao";
import { corpo, rota } from "@/server/api";
import { criarEvento, listarEventos } from "@/server/servicos/eventos";

export const GET = rota(async ({ userId }) => listarEventos(userId));

export const POST = rota(
  async ({ userId, req }) => criarEvento(userId, await corpo(req, eventoSchema)),
  { status: 201 },
);
