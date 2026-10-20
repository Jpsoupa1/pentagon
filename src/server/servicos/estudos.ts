import "server-only";
import { and, asc, eq, sql } from "drizzle-orm";
import { horariosComPadrao } from "@/lib/estudos";
import type { HorariosEstudo } from "@/lib/dominio";
import { diaDaSemana } from "@/lib/tempo";
import type { Intervalo, Ocorrencia } from "../agenda/recorrencia";
import { db } from "../db";
import { events, studySessions, studyTracks, studyWeeks } from "../db/schema";
import { NaoEncontrado } from "../erros";
import { ocorrenciasDeMarcos, ocorrenciasDeSessoes } from "../estudos/ocorrencias";
import { SLUG_SEGURANCA } from "../estudos/seguranca";
import { SLUG_TRILHA } from "../estudos/trilha";
import { obterAjustes } from "./ajustes";

export async function obterTrilha(userId: string) {
  const [t] = await db()
    .select()
    .from(studyTracks)
    .where(and(eq(studyTracks.userId, userId), eq(studyTracks.slug, SLUG_TRILHA)));
  return t ?? null;
}

/** Trilha de Segurança (sem datas) e os compromissos semanais ligados a ela. */
export async function obterTrilhaSeguranca(userId: string) {
  const [t] = await db()
    .select()
    .from(studyTracks)
    .where(and(eq(studyTracks.userId, userId), eq(studyTracks.slug, SLUG_SEGURANCA)));
  if (!t) return null;
  const sessoes = await db()
    .select({
      id: events.id,
      titulo: events.titulo,
      inicio: events.inicio,
      duracaoMin: events.duracaoMin,
      fuso: events.fuso,
      diasSemana: events.diasSemana,
    })
    .from(events)
    .where(and(eq(events.userId, userId), eq(events.trackId, t.id)));
  return { ...t, sessoes };
}

/** Trilhas com o total de sessões (nos dias ligados) e quantas foram feitas. */
export async function listarTrilhas(userId: string) {
  return db()
    .select({
      id: studyTracks.id,
      slug: studyTracks.slug,
      nome: studyTracks.nome,
      inicio: studyTracks.inicio,
      fim: studyTracks.fim,
      fases: studyTracks.fases,
      marcos: studyTracks.marcos,
      total: sql<number>`(select count(*) from ${studySessions} where ${studySessions.trackId} = ${studyTracks.id})::int`,
      feitas: sql<number>`(select count(*) from ${studySessions} where ${studySessions.trackId} = ${studyTracks.id} and ${studySessions.status} = 'feita')::int`,
    })
    .from(studyTracks)
    .where(eq(studyTracks.userId, userId))
    .orderBy(asc(studyTracks.inicio));
}

export type SessaoComSemana = Awaited<ReturnType<typeof sessoesEntre>>[number];

/** Só as sessões dos turnos ligados em Ajustes (chave `<dia>-<turno>`). */
function turnosLigados(horarios: HorariosEstudo) {
  const chaves = Object.entries(horarios)
    .filter(([, h]) => h.ativo)
    .map(([chave]) => chave);
  if (!chaves.length) return null;
  return sql`(extract(dow from ${studySessions.data})::int || '-' || ${studySessions.turno}) in (${sql.join(chaves, sql`, `)})`;
}

export async function sessoesEntre(userId: string, de: string, ate: string) {
  return db()
    .select({
      id: studySessions.id,
      data: studySessions.data,
      turno: studySessions.turno,
      categoria: studySessions.categoria,
      permiteSobreposicao: studySessions.permiteSobreposicao,
      weekId: studySessions.weekId,
      tipo: studySessions.tipo,
      conteudo: studySessions.conteudo,
      status: studySessions.status,
      horaInicio: studySessions.horaInicio,
      feitaEm: studySessions.feitaEm,
      semana: studyWeeks.numero,
      fase: studyWeeks.fase,
      tema: studyWeeks.tema,
      parte: studyWeeks.parte,
    })
    .from(studySessions)
    .innerJoin(studyWeeks, eq(studyWeeks.id, studySessions.weekId))
    .where(
      and(eq(studySessions.userId, userId), sql`${studySessions.data} between ${de} and ${ate}`),
    )
    .orderBy(asc(studySessions.data), asc(studySessions.turno));
}

/** Sessões (nos turnos ligados) e marcos da trilha como ocorrências da agenda. */
export async function ocorrenciasDeEstudo(
  userId: string,
  intervalo: Intervalo,
): Promise<Ocorrencia[]> {
  const [ajustes, trilha] = await Promise.all([obterAjustes(userId), obterTrilha(userId)]);
  if (!trilha) return [];
  const sessoes = await sessoesEntre(userId, intervalo.de, intervalo.ate);
  const horarios = horariosComPadrao(ajustes.horariosEstudo);
  return [
    ...ocorrenciasDeSessoes(
      sessoes.map((s) => ({ ...s, diaSemana: diaDaSemana(s.data) })),
      horarios,
      ajustes.fuso,
    ),
    ...ocorrenciasDeMarcos(trilha.marcos, intervalo, ajustes.fuso),
  ];
}

/** Sessões de dias já passados, em turnos ligados, ainda não feitas (as mais recentes primeiro). */
export async function sessoesPendentes(userId: string, antesDe: string, limite = 5) {
  const ajustes = await obterAjustes(userId);
  const ligados = turnosLigados(horariosComPadrao(ajustes.horariosEstudo));
  if (!ligados) return { total: 0, lista: [] };
  const filtro = and(
    eq(studySessions.userId, userId),
    eq(studySessions.status, "pendente"),
    sql`${studySessions.data} < ${antesDe}`,
    ligados,
  );
  const [{ total }] = await db()
    .select({ total: sql<number>`count(*)::int` })
    .from(studySessions)
    .where(filtro);
  const lista = await db()
    .select({
      id: studySessions.id,
      data: studySessions.data,
      turno: studySessions.turno,
      tipo: studySessions.tipo,
      conteudo: studySessions.conteudo,
    })
    .from(studySessions)
    .where(filtro)
    .orderBy(sql`${studySessions.data} desc`, sql`${studySessions.turno} desc`)
    .limit(limite);
  return { total, lista };
}

/** Progresso por fase, contando só os turnos ligados. */
export async function progressoPorFase(userId: string) {
  const ajustes = await obterAjustes(userId);
  const ligados = turnosLigados(horariosComPadrao(ajustes.horariosEstudo));
  if (!ligados) return [];
  return db()
    .select({
      fase: studyWeeks.fase,
      total: sql<number>`count(*)::int`,
      feitas: sql<number>`count(*) filter (where ${studySessions.status} = 'feita')::int`,
    })
    .from(studySessions)
    .innerJoin(studyWeeks, eq(studyWeeks.id, studySessions.weekId))
    .where(and(eq(studySessions.userId, userId), ligados))
    .groupBy(studyWeeks.fase)
    .orderBy(studyWeeks.fase);
}

export async function marcarSessao(userId: string, id: string, feita: boolean) {
  const [s] = await db()
    .update(studySessions)
    .set({ status: feita ? "feita" : "pendente", feitaEm: feita ? new Date() : null })
    .where(and(eq(studySessions.id, id), eq(studySessions.userId, userId)))
    .returning();
  if (!s) throw new NaoEncontrado("Sessão");
  return s;
}

export async function obterSessao(userId: string, id: string) {
  const [s] = await db()
    .select()
    .from(studySessions)
    .where(and(eq(studySessions.id, id), eq(studySessions.userId, userId)));
  if (!s) throw new NaoEncontrado("Sessão");
  return s;
}

/** Como a sessão ficaria na agenda com outro horário (null = horário do dia em Ajustes). */
export async function ocorrenciaDaSessao(userId: string, id: string, hora: string | null) {
  const [s, ajustes] = await Promise.all([obterSessao(userId, id), obterAjustes(userId)]);
  const [o] = ocorrenciasDeSessoes(
    [{ ...s, horaInicio: hora, diaSemana: diaDaSemana(s.data) }],
    horariosComPadrao(ajustes.horariosEstudo),
    ajustes.fuso,
  );
  return o ?? null;
}

/** Horário próprio da sessão naquele dia (null volta ao horário de Ajustes). */
export async function moverSessao(userId: string, id: string, hora: string | null) {
  const [s] = await db()
    .update(studySessions)
    .set({ horaInicio: hora })
    .where(and(eq(studySessions.id, id), eq(studySessions.userId, userId)))
    .returning();
  if (!s) throw new NaoEncontrado("Sessão");
  return s;
}
