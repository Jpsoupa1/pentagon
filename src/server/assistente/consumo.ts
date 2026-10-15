import "server-only";
import { and, eq, gte, sql } from "drizzle-orm";
import { CREDITOS_MENSAIS_USD, custoEmDolares } from "@/lib/assistente";
import { hojeLocal, paraUtc } from "@/lib/tempo";
import { db } from "../db";
import { assistantRuns } from "../db/schema";

/** Consumo do assistente no mês corrente (no fuso do usuário), em tokens e em dólares. */
export async function consumoDoMes(userId: string, fuso: string, agora = new Date()) {
  const inicioDoMes = paraUtc(`${hojeLocal(agora, fuso).slice(0, 7)}-01`, "00:00", fuso);
  const linhas = await db()
    .select({
      modelo: assistantRuns.modelo,
      pedidos: sql<number>`count(*)::int`,
      entrada: sql<number>`coalesce(sum(${assistantRuns.tokensEntrada}), 0)::int`,
      saida: sql<number>`coalesce(sum(${assistantRuns.tokensSaida}), 0)::int`,
      cacheEscrita: sql<number>`coalesce(sum(${assistantRuns.tokensCacheEscrita}), 0)::int`,
      cacheLeitura: sql<number>`coalesce(sum(${assistantRuns.tokensCacheLeitura}), 0)::int`,
    })
    .from(assistantRuns)
    .where(and(eq(assistantRuns.userId, userId), gte(assistantRuns.createdAt, inicioDoMes)))
    .groupBy(assistantRuns.modelo);
  const total = linhas.reduce(
    (t, l) => ({
      pedidos: t.pedidos + l.pedidos,
      tokens: t.tokens + l.entrada + l.saida + l.cacheEscrita + l.cacheLeitura,
      dolares: t.dolares + custoEmDolares(l.modelo, l),
    }),
    { pedidos: 0, tokens: 0, dolares: 0 },
  );
  return { ...total, percentual: (total.dolares / CREDITOS_MENSAIS_USD) * 100 };
}
