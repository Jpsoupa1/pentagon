import "server-only";
import { and, asc, eq, gte, isNull } from "drizzle-orm";
import type { z } from "zod";
import { paraUtc } from "@/lib/tempo";
import type { avaliacaoSchema, checklistSchema } from "@/lib/validacao";
import { db } from "../db";
import { assessments, checklistItems, subjects } from "../db/schema";
import { NaoEncontrado } from "../erros";
import { obterAjustes } from "./ajustes";
import { obterDisciplina } from "./disciplinas";

type AvaliacaoValida = z.output<typeof avaliacaoSchema>;

async function paraLinha(userId: string, a: AvaliacaoValida) {
  const { fuso } = await obterAjustes(userId);
  if (a.subjectId) await obterDisciplina(userId, a.subjectId);
  return {
    tipo: a.tipo,
    titulo: a.titulo,
    subjectId: a.subjectId,
    entregaEm: paraUtc(a.data, a.hora, fuso),
    peso: a.peso,
    nota: a.nota,
    anotacoes: a.anotacoes,
    lembrarMin: a.lembrarMin,
    ...(a.concluida === undefined ? {} : { concluidaEm: a.concluida ? new Date() : null }),
  };
}

const colunas = {
  id: assessments.id,
  tipo: assessments.tipo,
  titulo: assessments.titulo,
  subjectId: assessments.subjectId,
  disciplina: subjects.nome,
  sigla: subjects.sigla,
  entregaEm: assessments.entregaEm,
  peso: assessments.peso,
  nota: assessments.nota,
  anotacoes: assessments.anotacoes,
  concluidaEm: assessments.concluidaEm,
  lembrarMin: assessments.lembrarMin,
};

export type AvaliacaoLista = Awaited<ReturnType<typeof listarAvaliacoes>>[number];

export async function listarAvaliacoes(userId: string) {
  return db()
    .select(colunas)
    .from(assessments)
    .leftJoin(subjects, eq(subjects.id, assessments.subjectId))
    .where(eq(assessments.userId, userId))
    .orderBy(asc(assessments.entregaEm));
}

export async function proximosPrazos(userId: string, desde: Date, limite = 5) {
  return db()
    .select(colunas)
    .from(assessments)
    .leftJoin(subjects, eq(subjects.id, assessments.subjectId))
    .where(
      and(
        eq(assessments.userId, userId),
        isNull(assessments.concluidaEm),
        gte(assessments.entregaEm, desde),
      ),
    )
    .orderBy(asc(assessments.entregaEm))
    .limit(limite);
}

export async function obterAvaliacao(userId: string, id: string) {
  const [a] = await db()
    .select(colunas)
    .from(assessments)
    .leftJoin(subjects, eq(subjects.id, assessments.subjectId))
    .where(and(eq(assessments.id, id), eq(assessments.userId, userId)));
  if (!a) throw new NaoEncontrado("Avaliação");
  const checklist = await db()
    .select()
    .from(checklistItems)
    .where(and(eq(checklistItems.assessmentId, id), eq(checklistItems.userId, userId)))
    .orderBy(asc(checklistItems.posicao), asc(checklistItems.createdAt));
  return { ...a, checklist };
}

export async function criarAvaliacao(userId: string, entrada: AvaliacaoValida) {
  const [criada] = await db()
    .insert(assessments)
    .values({ userId, ...(await paraLinha(userId, entrada)) })
    .returning();
  return criada;
}

export async function atualizarAvaliacao(userId: string, id: string, entrada: AvaliacaoValida) {
  await obterAvaliacao(userId, id);
  const [salva] = await db()
    .update(assessments)
    .set(await paraLinha(userId, entrada))
    .where(and(eq(assessments.id, id), eq(assessments.userId, userId)))
    .returning();
  return salva;
}

export async function concluirAvaliacao(userId: string, id: string, concluida: boolean) {
  const [salva] = await db()
    .update(assessments)
    .set({ concluidaEm: concluida ? new Date() : null })
    .where(and(eq(assessments.id, id), eq(assessments.userId, userId)))
    .returning();
  if (!salva) throw new NaoEncontrado("Avaliação");
  return salva;
}

export async function apagarAvaliacao(userId: string, id: string) {
  const r = await db()
    .delete(assessments)
    .where(and(eq(assessments.id, id), eq(assessments.userId, userId)))
    .returning({ id: assessments.id });
  if (!r.length) throw new NaoEncontrado("Avaliação");
}

export async function adicionarItem(
  userId: string,
  assessmentId: string,
  item: z.output<typeof checklistSchema>,
) {
  await obterAvaliacao(userId, assessmentId);
  const [criado] = await db()
    .insert(checklistItems)
    .values({
      userId,
      assessmentId,
      texto: item.texto,
      feito: item.feito ?? false,
      posicao: item.posicao ?? 0,
    })
    .returning();
  return criado;
}

export async function atualizarItem(
  userId: string,
  id: string,
  item: Partial<z.output<typeof checklistSchema>>,
) {
  const [salvo] = await db()
    .update(checklistItems)
    .set(item)
    .where(and(eq(checklistItems.id, id), eq(checklistItems.userId, userId)))
    .returning();
  if (!salvo) throw new NaoEncontrado("Item");
  return salvo;
}

export async function apagarItem(userId: string, id: string) {
  const r = await db()
    .delete(checklistItems)
    .where(and(eq(checklistItems.id, id), eq(checklistItems.userId, userId)))
    .returning({ id: checklistItems.id });
  if (!r.length) throw new NaoEncontrado("Item");
}
