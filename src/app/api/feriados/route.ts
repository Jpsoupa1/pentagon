import { feriadoSchema } from "@/lib/validacao";
import { corpo, rota } from "@/server/api";
import { listarFeriados, salvarFeriado } from "@/server/servicos/feriados";

export const GET = rota(async ({ userId }) => listarFeriados(userId));

export const POST = rota(
  async ({ userId, req }) => salvarFeriado(userId, await corpo(req, feriadoSchema)),
  {
    status: 201,
    reconciliar: true,
  },
);
