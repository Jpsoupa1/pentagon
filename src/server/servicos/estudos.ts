import "server-only";
import { and, asc, eq, sql } from "drizzle-orm";
import { horariosComPadrao } from "@/lib/estudos";
import { diaDaSemana } from "@/lib/tempo";
import type { Intervalo, Ocorrencia } from "../agenda/recorrencia";
import { db } from "../db";
import { studySessions, studyTracks, studyWeeks } from "../db/schema";
import { NaoEncontrado } from "../erros";
import { ocorrenciasDeMarcos, ocorrenciasDeSessoes } from "../estudos/ocorrencias";
import { SLUG_TRILHA } from "../estudos/trilha";
import { obterAjustes } from "./ajustes";

export async function obterTrilha(userId: string) {
  const [t] = await db()
    .select()
    .from(studyTracks)
    .where(and(eq(studyTracks.userId, userId), eq(studyTracks.slug, SLUG_TRILHA)));
  return t ?? null;
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

export async function sessoesEntre(userId: string, de: string, ate: string) {
  return db()
    .select({
      id: studySessions.id,
      data: studySessions.data,
      tipo: studySessions.tipo,
      conteudo: studySessions.conteudo,
      status: studySessions.status,
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
    .orderBy(asc(studySessions.data));
}

/** Sessões (nos dias ligados) e marcos da trilha como ocorrências da agenda. */
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

/** Sessões de dias já passados, em dias ligados, ainda não feitas (as mais recentes primeiro). */
export async function sessoesPendentes(userId: string, antesDe: string, limite = 5) {
  const ajustes = await obterAjustes(userId);
  const horarios = horariosComPadrao(ajustes.horariosEstudo);
  const diasLigados = Object.entries(horarios)
    .filter(([, h]) => h.ativo)
    .map(([d]) => Number(d));
  if (!diasLigados.length) return { total: 0, lista: [] };
  const filtro = and(
    eq(studySessions.userId, userId),
    eq(studySessions.status, "pendente"),
    sql`${studySessions.data} < ${antesDe}`,
    sql`extract(dow from ${studySessions.data})::int in (${sql.join(diasLigados, sql`, `)})`,
  );
  const [{ total }] = await db()
    .select({ total: sql<number>`count(*)::int` })
    .from(studySessions)
    .where(filtro);
  const lista = await db()
    .select({
      id: studySessions.id,
      data: studySessions.data,
      tipo: studySessions.tipo,
      conteudo: studySessions.conteudo,
    })
    .from(studySessions)
    .where(filtro)
    .orderBy(sql`${studySessions.data} desc`)
    .limit(limite);
  return { total, lista };
}

/** Progresso por fase, contando só os dias ligados. */
export async function progressoPorFase(userId: string) {
  const ajustes = await obterAjustes(userId);
  const horarios = horariosComPadrao(ajustes.horariosEstudo);
  const diasLigados = Object.entries(horarios)
    .filter(([, h]) => h.ativo)
    .map(([d]) => Number(d));
  if (!diasLigados.length) return [];
  return db()
    .select({
      fase: studyWeeks.fase,
      total: sql<number>`count(*)::int`,
      feitas: sql<number>`count(*) filter (where ${studySessions.status} = 'feita')::int`,
    })
    .from(studySessions)
    .innerJoin(studyWeeks, eq(studyWeeks.id, studySessions.weekId))
    .where(
      and(
        eq(studySessions.userId, userId),
        sql`extract(dow from ${studySessions.data})::int in (${sql.join(diasLigados, sql`, `)})`,
      ),
    )
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
