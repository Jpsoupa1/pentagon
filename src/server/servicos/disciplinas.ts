import "server-only";
import { and, asc, desc, eq, sql } from "drizzle-orm";
import type { z } from "zod";
import type { disciplinaSchema, faltaSchema } from "@/lib/validacao";
import { mediaParcial } from "../agenda/media";
import { db } from "../db";
import { absences, assessments, subjects } from "../db/schema";
import { NaoEncontrado } from "../erros";

export async function listarDisciplinas(userId: string) {
  return db()
    .select({
      id: subjects.id,
      nome: subjects.nome,
      sigla: subjects.sigla,
      professor: subjects.professor,
      sala: subjects.sala,
      limiteFaltas: subjects.limiteFaltas,
      faltas: sql<number>`coalesce((select sum(${absences.quantidade}) from ${absences} where ${absences.subjectId} = ${subjects.id}), 0)::int`,
    })
    .from(subjects)
    .where(eq(subjects.userId, userId))
    .orderBy(asc(subjects.nome));
}

export async function obterDisciplina(userId: string, id: string) {
  const [s] = await db()
    .select()
    .from(subjects)
    .where(and(eq(subjects.id, id), eq(subjects.userId, userId)));
  if (!s) throw new NaoEncontrado("Disciplina");
  return s;
}

export async function detalheDisciplina(userId: string, id: string) {
  const disciplina = await obterDisciplina(userId, id);
  const [faltas, avaliacoes] = await Promise.all([
    db()
      .select()
      .from(absences)
      .where(and(eq(absences.subjectId, id), eq(absences.userId, userId)))
      .orderBy(desc(absences.data)),
    db()
      .select()
      .from(assessments)
      .where(and(eq(assessments.subjectId, id), eq(assessments.userId, userId)))
      .orderBy(asc(assessments.entregaEm)),
  ]);
  return {
    disciplina,
    faltas,
    faltasUsadas: faltas.reduce((s, f) => s + f.quantidade, 0),
    avaliacoes,
    media: mediaParcial(avaliacoes),
  };
}

export async function criarDisciplina(userId: string, entrada: z.output<typeof disciplinaSchema>) {
  const [criada] = await db()
    .insert(subjects)
    .values({ userId, ...entrada })
    .returning();
  return criada;
}

export async function atualizarDisciplina(
  userId: string,
  id: string,
  entrada: z.output<typeof disciplinaSchema>,
) {
  await obterDisciplina(userId, id);
  const [salva] = await db()
    .update(subjects)
    .set(entrada)
    .where(and(eq(subjects.id, id), eq(subjects.userId, userId)))
    .returning();
  return salva;
}

export async function apagarDisciplina(userId: string, id: string) {
  const r = await db()
    .delete(subjects)
    .where(and(eq(subjects.id, id), eq(subjects.userId, userId)))
    .returning({ id: subjects.id });
  if (!r.length) throw new NaoEncontrado("Disciplina");
}

export async function registrarFalta(
  userId: string,
  subjectId: string,
  entrada: z.output<typeof faltaSchema>,
) {
  await obterDisciplina(userId, subjectId);
  const [falta] = await db()
    .insert(absences)
    .values({ userId, subjectId, ...entrada })
    .onConflictDoUpdate({
      target: [absences.subjectId, absences.data],
      set: { quantidade: entrada.quantidade, nota: entrada.nota },
    })
    .returning();
  return falta;
}

export async function apagarFalta(userId: string, id: string) {
  const r = await db()
    .delete(absences)
    .where(and(eq(absences.id, id), eq(absences.userId, userId)))
    .returning({ id: absences.id });
  if (!r.length) throw new NaoEncontrado("Falta");
}
