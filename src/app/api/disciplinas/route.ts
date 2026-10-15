import { disciplinaSchema } from "@/lib/validacao";
import { corpo, rota } from "@/server/api";
import { criarDisciplina, listarDisciplinas } from "@/server/servicos/disciplinas";

export const GET = rota(async ({ userId }) => listarDisciplinas(userId));

export const POST = rota(
  async ({ userId, req }) => criarDisciplina(userId, await corpo(req, disciplinaSchema)),
  { status: 201 },
);
