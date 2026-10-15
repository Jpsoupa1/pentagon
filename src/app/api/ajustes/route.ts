import { ajustesSchema } from "@/lib/validacao";
import { corpo, rota } from "@/server/api";
import { atualizarAjustes, obterAjustes } from "@/server/servicos/ajustes";

export const GET = rota(async ({ userId }) => obterAjustes(userId));

// Horário de estudo, antecedência ou áreas mudaram: troca os avisos agendados.
export const PATCH = rota(
  async ({ userId, req }) => atualizarAjustes(userId, await corpo(req, ajustesSchema)),
  {
    reconciliar: true,
  },
);
