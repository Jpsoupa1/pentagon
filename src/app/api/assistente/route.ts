import { after } from "next/server";
import { z } from "zod";
import { LIMITE_TEXTO_PEDIDO } from "@/lib/assistente";
import { corpo, rota } from "@/server/api";
import { executarAssistente } from "@/server/assistente/executar";
import { visaoDaExecucao } from "@/server/assistente/visao";
import { reconciliarDepois } from "@/server/assistente/avisos";

// O pedido pode levar algumas idas e voltas com a API do Claude.
export const maxDuration = 120;

/** POST { texto } atende um pedido ao assistente. Só o texto transcrito chega aqui, nunca áudio. */
export const POST = rota(async ({ userId, req }) => {
  const { texto } = await corpo(
    req,
    z.object({ texto: z.string().trim().min(1).max(LIMITE_TEXTO_PEDIDO) }),
  );
  const r = await executarAssistente(userId, texto);
  if (r.houveMudanca) after(() => reconciliarDepois(userId));
  return visaoDaExecucao(userId, r.id);
});
