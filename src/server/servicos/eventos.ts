import "server-only";
import { and, asc, eq, gte, isNotNull, isNull, lte, or } from "drizzle-orm";
import type { z } from "zod";
import { addDias, paraUtc } from "@/lib/tempo";
import type { eventoSchema, excecaoSchema } from "@/lib/validacao";
import { db } from "../db";
import { eventExceptions, events, subjects } from "../db/schema";
import { NaoEncontrado } from "../erros";
import { obterAjustes } from "./ajustes";

type EventoValido = z.output<typeof eventoSchema>;

/** Converte a entrada do formulário na linha do banco (data e hora locais viram instante UTC). */
export async function linhaDoEvento(userId: string, e: EventoValido) {
  const { fuso } = await obterAjustes(userId);
  if (e.subjectId) await garantirDisciplina(userId, e.subjectId);
  return {
    titulo: e.titulo,
    areaId: e.areaId,
    subjectId: e.subjectId,
    local: e.local,
    notas: e.notas,
    inicio: paraUtc(e.data, e.diaInteiro ? "00:00" : e.hora, fuso),
    duracaoMin: e.diaInteiro ? Math.max(1440, e.duracaoMin) : e.duracaoMin,
    diaInteiro: e.diaInteiro,
    fuso,
    diasSemana: e.diasSemana,
    repeteDesde: e.diasSemana ? e.data : null,
    repeteAte: e.diasSemana ? e.repeteAte : null,
    lembrarMin: e.lembrarMin,
  };
}

async function garantirDisciplina(userId: string, id: string) {
  const [s] = await db()
    .select({ id: subjects.id })
    .from(subjects)
    .where(and(eq(subjects.id, id), eq(subjects.userId, userId)));
  if (!s) throw new NaoEncontrado("Disciplina");
}

export async function listarEventos(userId: string) {
  return db().select().from(events).where(eq(events.userId, userId)).orderBy(asc(events.inicio));
}

export async function obterEvento(userId: string, id: string) {
  const [e] = await db()
    .select()
    .from(events)
    .where(and(eq(events.id, id), eq(events.userId, userId)));
  if (!e) throw new NaoEncontrado("Compromisso");
  return e;
}

export async function criarEvento(userId: string, entrada: EventoValido) {
  const [criado] = await db()
    .insert(events)
    .values({ userId, ...(await linhaDoEvento(userId, entrada)) })
    .returning();
  return criado;
}

export async function atualizarEvento(userId: string, id: string, entrada: EventoValido) {
  await obterEvento(userId, id);
  const [salvo] = await db()
    .update(events)
    .set(await linhaDoEvento(userId, entrada))
    .where(and(eq(events.id, id), eq(events.userId, userId)))
    .returning();
  return salvo;
}

export async function apagarEvento(userId: string, id: string) {
  const apagados = await db()
    .delete(events)
    .where(and(eq(events.id, id), eq(events.userId, userId)))
    .returning({ id: events.id });
  if (!apagados.length) throw new NaoEncontrado("Compromisso");
}

/** Eventos que podem ter ocorrência no intervalo (com folga de um dia por causa do fuso). */
export async function eventosNoIntervalo(userId: string, de: string, ate: string) {
  const inicioUtc = paraUtc(addDias(de, -1), "00:00");
  const fimUtc = paraUtc(addDias(ate, 2), "00:00");
  const lista = await db()
    .select()
    .from(events)
    .where(
      and(
        eq(events.userId, userId),
        lte(events.inicio, fimUtc),
        or(
          and(isNull(events.diasSemana), gte(events.inicio, inicioUtc)),
          and(
            isNotNull(events.diasSemana),
            or(isNull(events.repeteAte), gte(events.repeteAte, de)),
          ),
        ),
      ),
    );
  const excecoes = await db()
    .select()
    .from(eventExceptions)
    .where(eq(eventExceptions.userId, userId));
  const ids = new Set(lista.map((e) => e.id));
  return { eventos: lista, excecoes: excecoes.filter((x) => ids.has(x.eventId)) };
}

export async function salvarExcecao(
  userId: string,
  eventId: string,
  x: z.output<typeof excecaoSchema>,
) {
  const evento = await obterEvento(userId, eventId);
  const novoInicio = x.tipo === "movida" ? paraUtc(x.novaData!, x.novaHora!, evento.fuso) : null;
  const valores = {
    tipo: x.tipo,
    novoInicio,
    novaDuracaoMin: x.tipo === "movida" ? (x.novaDuracaoMin ?? null) : null,
    motivo: x.motivo,
  };
  const [salva] = await db()
    .insert(eventExceptions)
    .values({ userId, eventId, data: x.data, ...valores })
    .onConflictDoUpdate({ target: [eventExceptions.eventId, eventExceptions.data], set: valores })
    .returning();
  return salva;
}

export async function apagarExcecao(userId: string, eventId: string, data: string) {
  const apagadas = await db()
    .delete(eventExceptions)
    .where(
      and(
        eq(eventExceptions.userId, userId),
        eq(eventExceptions.eventId, eventId),
        eq(eventExceptions.data, data),
      ),
    )
    .returning({ id: eventExceptions.id });
  if (!apagadas.length) throw new NaoEncontrado("Exceção");
}
