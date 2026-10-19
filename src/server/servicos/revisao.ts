import "server-only";
import { and, asc, desc, eq, isNull, lte, sql } from "drizzle-orm";
import type { z } from "zod";
import { dataDeRevisao, errosDaSemana } from "@/lib/estudos";
import { addDias } from "@/lib/tempo";
import type { erroSchema, revisaoSchema } from "@/lib/validacao";
import { db } from "../db";
import { studyErrors, studyReviews, studySessions, studyWeeks } from "../db/schema";
import { NaoEncontrado } from "../erros";
import { obterTrilha } from "./estudos";

// ---------------------------------------------------------------- Revisão de sexta

async function semanaDoUsuario(userId: string, weekId: string) {
  const trilha = await obterTrilha(userId);
  if (!trilha) throw new NaoEncontrado("Semana");
  const [s] = await db()
    .select()
    .from(studyWeeks)
    .where(and(eq(studyWeeks.id, weekId), eq(studyWeeks.trackId, trilha.id)));
  if (!s) throw new NaoEncontrado("Semana");
  return s;
}

export async function obterRevisao(userId: string, weekId: string) {
  const [r] = await db()
    .select()
    .from(studyReviews)
    .where(and(eq(studyReviews.userId, userId), eq(studyReviews.weekId, weekId)));
  return r ?? null;
}

/** Grava (ou atualiza) a revisão de sexta da semana: etapas feitas, nota e pontos fracos. */
export async function salvarRevisao(
  userId: string,
  weekId: string,
  r: z.output<typeof revisaoSchema>,
) {
  await semanaDoUsuario(userId, weekId);
  const [salva] = await db()
    .insert(studyReviews)
    .values({ userId, weekId, ...r })
    .onConflictDoUpdate({
      target: [studyReviews.userId, studyReviews.weekId],
      set: { ...r, updatedAt: new Date() },
    })
    .returning();
  return salva;
}

/** Notas das revisões de sexta, das semanas mais recentes até `ate` (as últimas `limite`). */
export async function notasDasRevisoes(userId: string, ate: string, limite = 8) {
  const linhas = await db()
    .select({
      weekId: studyReviews.weekId,
      semana: studyWeeks.numero,
      inicio: studyWeeks.inicio,
      tema: studyWeeks.tema,
      parte: studyWeeks.parte,
      nota: studyReviews.nota,
      pontosFracos: studyReviews.pontosFracos,
    })
    .from(studyReviews)
    .innerJoin(studyWeeks, eq(studyWeeks.id, studyReviews.weekId))
    .where(
      and(
        eq(studyReviews.userId, userId),
        sql`${studyReviews.nota} is not null`,
        lte(studyWeeks.inicio, ate),
      ),
    )
    .orderBy(desc(studyWeeks.inicio))
    .limit(limite);
  return linhas.reverse();
}

// ---------------------------------------------------------------- Caderno de erros

export async function criarErro(userId: string, e: z.output<typeof erroSchema>) {
  if (e.sessaoId) {
    const [s] = await db()
      .select({ id: studySessions.id })
      .from(studySessions)
      .where(and(eq(studySessions.id, e.sessaoId), eq(studySessions.userId, userId)));
    if (!s) throw new NaoEncontrado("Sessão");
  }
  const [criado] = await db()
    .insert(studyErrors)
    .values({
      userId,
      data: e.data,
      tema: e.tema,
      errei: e.errei,
      correto: e.correto,
      revisarEm: e.revisarEm ?? dataDeRevisao(e.data),
      origem: e.origem ?? null,
      sessionId: e.sessaoId ?? null,
    })
    .returning();
  return criado;
}

/** Erros ainda no caderno com revisão até o domingo da semana de `hoje` (inclusive os atrasados). */
export async function errosParaRevisar(userId: string, hoje: string) {
  const abertos = await db()
    .select()
    .from(studyErrors)
    .where(and(eq(studyErrors.userId, userId), isNull(studyErrors.resolvidoEm)))
    .orderBy(asc(studyErrors.createdAt));
  return errosDaSemana(abertos, hoje);
}

/** Resumo do caderno: quantos erros ainda estão nele e quando é a próxima revisão. */
export async function resumoDoCaderno(userId: string) {
  const [r] = await db()
    .select({
      abertos: sql<number>`count(*)::int`,
      proxima: sql<string | null>`min(${studyErrors.revisarEm})`,
    })
    .from(studyErrors)
    .where(and(eq(studyErrors.userId, userId), isNull(studyErrors.resolvidoEm)));
  return r;
}

/**
 * Resultado da revisão espaçada: "acertei" tira o erro da lista; "errei" marca de novo para
 * três semanas depois de `hoje`.
 */
export async function revisarErro(
  userId: string,
  id: string,
  resultado: "acertei" | "errei",
  hoje: string,
) {
  const [e] = await db()
    .update(studyErrors)
    .set(
      resultado === "acertei"
        ? { resolvidoEm: new Date() }
        : {
            revisarEm: dataDeRevisao(hoje),
            reincidencias: sql`${studyErrors.reincidencias} + 1`,
          },
    )
    .where(and(eq(studyErrors.id, id), eq(studyErrors.userId, userId)))
    .returning();
  if (!e) throw new NaoEncontrado("Erro do caderno");
  return e;
}

export async function apagarErro(userId: string, id: string) {
  const [e] = await db()
    .delete(studyErrors)
    .where(and(eq(studyErrors.id, id), eq(studyErrors.userId, userId)))
    .returning({ id: studyErrors.id });
  if (!e) throw new NaoEncontrado("Erro do caderno");
}

/** Erros anotados numa semana (para a revisão de sexta mostrar o que já foi anotado). */
export async function errosDaSemanaAnotados(userId: string, inicio: string) {
  return db()
    .select()
    .from(studyErrors)
    .where(
      and(
        eq(studyErrors.userId, userId),
        sql`${studyErrors.data} between ${inicio} and ${addDias(inicio, 6)}`,
      ),
    )
    .orderBy(asc(studyErrors.createdAt));
}
