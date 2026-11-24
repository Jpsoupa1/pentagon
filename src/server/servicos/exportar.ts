import "server-only";
import { eq } from "drizzle-orm";
import { db } from "../db";
import * as t from "../db/schema";
import { cardArquivado, eventoArquivado, trilhaIdArquivada } from "../plano/arquivados";
import { arquivados } from "./arquivamentos";

/**
 * Todos os dados do usuário em JSON (sem tokens de login nem chaves de push). O que está
 * arquivado continua aqui, com `arquivado: true`, e `arquivamentos` lista os registros.
 */
export async function exportarTudo(userId: string) {
  const d = db();
  const a = await arquivados(userId);
  const [usuario] = await d
    .select({ id: t.users.id, nome: t.users.name, email: t.users.email })
    .from(t.users)
    .where(eq(t.users.id, userId));
  const [
    ajustes,
    eventos,
    excecoes,
    disciplinas,
    faltas,
    avaliacoes,
    checklist,
    trilhas,
    sessoes,
    lembretes,
    avisos,
    flashcards,
    respostasCards,
    registrosDeArquivamento,
  ] = await Promise.all([
    d.select().from(t.settings).where(eq(t.settings.userId, userId)),
    d.select().from(t.events).where(eq(t.events.userId, userId)),
    d.select().from(t.eventExceptions).where(eq(t.eventExceptions.userId, userId)),
    d.select().from(t.subjects).where(eq(t.subjects.userId, userId)),
    d.select().from(t.absences).where(eq(t.absences.userId, userId)),
    d.select().from(t.assessments).where(eq(t.assessments.userId, userId)),
    d.select().from(t.checklistItems).where(eq(t.checklistItems.userId, userId)),
    d.select().from(t.studyTracks).where(eq(t.studyTracks.userId, userId)),
    d.select().from(t.studySessions).where(eq(t.studySessions.userId, userId)),
    d.select().from(t.reminders).where(eq(t.reminders.userId, userId)),
    d.select().from(t.notifications).where(eq(t.notifications.userId, userId)),
    d.select().from(t.flashcards).where(eq(t.flashcards.userId, userId)),
    d.select().from(t.flashcardAnswers).where(eq(t.flashcardAnswers.userId, userId)),
    d.select().from(t.arquivamentos).where(eq(t.arquivamentos.userId, userId)),
  ]);
  return {
    app: "Pentagon",
    versao: 1,
    exportadoEm: new Date().toISOString(),
    usuario,
    ajustes: ajustes[0] ?? null,
    eventos: eventos.map((e) => ({ ...e, arquivado: eventoArquivado(a, e) })),
    excecoes,
    disciplinas,
    faltas,
    avaliacoes,
    checklist,
    trilhas: trilhas.map((x) => ({ ...x, arquivado: a.trilhasEstudo.has(x.slug) })),
    sessoes: sessoes.map((x) => ({ ...x, arquivado: trilhaIdArquivada(a, x.trackId) })),
    lembretes,
    avisos,
    flashcards: flashcards.map((x) => ({ ...x, arquivado: cardArquivado(a, x) })),
    respostasCards,
    arquivamentos: registrosDeArquivamento,
  };
}
