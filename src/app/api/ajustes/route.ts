import { after } from "next/server";
import { ajustesSchema } from "@/lib/validacao";
import { corpo, rota } from "@/server/api";
import { atualizarAjustes, obterAjustes } from "@/server/servicos/ajustes";
import { reconciliarAvisos } from "@/server/servicos/avisos";

export const GET = rota(async ({ userId }) => obterAjustes(userId));

export const PATCH = rota(async ({ userId, req }) => {
  const salvos = await atualizarAjustes(userId, await corpo(req, ajustesSchema));
  // Horário de estudo ou antecedência mudou: troca os avisos agendados.
  after(() => reconciliarAvisos(userId));
  return salvos;
});
