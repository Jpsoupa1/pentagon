import { ajustesSchema } from "@/lib/validacao";
import { corpo, rota } from "@/server/api";
import { atualizarAjustes, obterAjustes } from "@/server/servicos/ajustes";

export const GET = rota(async ({ userId }) => obterAjustes(userId));

export const PATCH = rota(async ({ userId, req }) =>
  atualizarAjustes(userId, await corpo(req, ajustesSchema)),
);
