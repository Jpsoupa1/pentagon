import { lembreteSchema } from "@/lib/validacao";
import { corpo, rota } from "@/server/api";
import { criarLembrete, listarLembretes } from "@/server/servicos/lembretes";

export const GET = rota(async ({ userId }) => listarLembretes(userId));

export const POST = rota(
  async ({ userId, req }) => criarLembrete(userId, await corpo(req, lembreteSchema)),
  { status: 201 },
);
