import "server-only";
import { and, asc, eq, inArray, isNotNull, sql } from "drizzle-orm";
import { horariosComPadrao } from "@/lib/estudos";
import { indiceFaseAtual, naSemanaZero, type Periodo } from "@/lib/roadmap";
import { hojeLocal } from "@/lib/tempo";
import { db } from "../db";
import {
  flashcardAnswers,
  flashcards,
  roadmapAssessments,
  roadmapDomains,
  roadmapPhases,
  roadmapPractice,
  roadmapPracticeProgress,
  roadmapRequirementProgress,
  roadmapRequirements,
  roadmapResources,
  roadmapTrails,
  studyReviews,
  studySessions,
  studyTracks,
  studyWeeks,
} from "../db/schema";
import { NaoEncontrado } from "../erros";
import { obterAjustes } from "./ajustes";

type Fase = typeof roadmapPhases.$inferSelect;

export type RequisitoRoadmap = { id: string; rotulo: string; feito: boolean };
export type PraticaRoadmap = {
  id: string;
  titulo: string;
  cadencia: string;
  meta: number;
  fonte: string | null;
  /** Somado sozinho a partir de cards, sessões ou revisões. */
  automatico: number;
  /** Marcado no "+". */
  manual: number;
};
export type FaseRoadmap = Omit<Fase, "trailId"> & {
  dominios: { id: string; rotulo: string; peso: number | null }[];
  requisitos: RequisitoRoadmap[];
  recursos: Omit<typeof roadmapResources.$inferSelect, "phaseId" | "posicao">[];
  avaliacoes: Omit<typeof roadmapAssessments.$inferSelect, "phaseId" | "posicao">[];
  pratica: PraticaRoadmap[];
};
export type RoadmapDados = {
  trilha: typeof roadmapTrails.$inferSelect;
  fases: FaseRoadmap[];
  hoje: string;
  fuso: string;
  /** Índice da fase atual em `fases`. */
  atual: number;
  semanaZeroAgora: boolean;
  /** Soma dos horários de estudo ligados em Ajustes. */
  minutosPorSemana: number;
};

export async function listarRoadmaps() {
  return db()
    .select({ slug: roadmapTrails.slug, nome: roadmapTrails.nome, titulo: roadmapTrails.titulo })
    .from(roadmapTrails)
    .orderBy(asc(roadmapTrails.nome));
}

/** A trilha inteira, com fases, recursos e o progresso do usuário, numa leitura só. */
export async function obterRoadmap(
  userId: string,
  slug: string,
  agora = new Date(),
): Promise<RoadmapDados> {
  const [trilha] = await db().select().from(roadmapTrails).where(eq(roadmapTrails.slug, slug));
  if (!trilha) throw new NaoEncontrado("Trilha");
  const [fases, ajustes] = await Promise.all([
    db()
      .select()
      .from(roadmapPhases)
      .where(eq(roadmapPhases.trailId, trilha.id))
      .orderBy(asc(roadmapPhases.posicao)),
    obterAjustes(userId),
  ]);
  const ids = fases.map((f) => f.id);
  const doPai = <T extends { phaseId: string }>(linhas: T[], id: string) =>
    linhas.filter((l) => l.phaseId === id);
  const [dominios, requisitos, recursos, avaliacoes, pratica, feitos, contagens] = ids.length
    ? await Promise.all([
        db()
          .select()
          .from(roadmapDomains)
          .where(inArray(roadmapDomains.phaseId, ids))
          .orderBy(asc(roadmapDomains.posicao)),
        db()
          .select()
          .from(roadmapRequirements)
          .where(inArray(roadmapRequirements.phaseId, ids))
          .orderBy(asc(roadmapRequirements.posicao)),
        db()
          .select()
          .from(roadmapResources)
          .where(inArray(roadmapResources.phaseId, ids))
          .orderBy(asc(roadmapResources.posicao)),
        db()
          .select()
          .from(roadmapAssessments)
          .where(inArray(roadmapAssessments.phaseId, ids))
          .orderBy(asc(roadmapAssessments.posicao)),
        db()
          .select()
          .from(roadmapPractice)
          .where(inArray(roadmapPractice.phaseId, ids))
          .orderBy(asc(roadmapPractice.posicao)),
        db()
          .select({ id: roadmapRequirementProgress.requirementId })
          .from(roadmapRequirementProgress)
          .where(
            and(
              eq(roadmapRequirementProgress.userId, userId),
              eq(roadmapRequirementProgress.feito, true),
            ),
          ),
        db()
          .select({
            id: roadmapPracticeProgress.practiceId,
            contagem: roadmapPracticeProgress.contagem,
          })
          .from(roadmapPracticeProgress)
          .where(eq(roadmapPracticeProgress.userId, userId)),
      ])
    : [[], [], [], [], [], [], []];

  const feito = new Set(feitos.map((f) => f.id));
  const manual = new Map(contagens.map((c) => [c.id, c.contagem]));
  const automatico = await contagensAutomaticas(userId, slug, fases, pratica);
  const hoje = hojeLocal(agora, ajustes.fuso);
  const minutosPorSemana = Object.values(horariosComPadrao(ajustes.horariosEstudo))
    .filter((h) => h.ativo)
    .reduce((t, h) => t + h.minutos, 0);

  return {
    trilha,
    hoje,
    fuso: ajustes.fuso,
    atual: indiceFaseAtual(fases, hoje),
    semanaZeroAgora: naSemanaZero(
      trilha.semanaZeroInicio && trilha.semanaZeroFim
        ? { inicio: trilha.semanaZeroInicio, fim: trilha.semanaZeroFim }
        : null,
      hoje,
    ),
    minutosPorSemana,
    fases: fases.map((f) => ({
      ...omitir(f, "trailId"),
      dominios: doPai(dominios, f.id).map(({ id, rotulo, peso }) => ({ id, rotulo, peso })),
      requisitos: doPai(requisitos, f.id).map((r) => ({
        id: r.id,
        rotulo: r.rotulo,
        feito: feito.has(r.id),
      })),
      recursos: doPai(recursos, f.id).map((r) => omitir(r, "phaseId", "posicao")),
      avaliacoes: doPai(avaliacoes, f.id).map((a) => omitir(a, "phaseId", "posicao")),
      pratica: doPai(pratica, f.id).map((p) => ({
        id: p.id,
        titulo: p.titulo,
        cadencia: p.cadencia,
        meta: p.meta,
        fonte: p.fonte,
        automatico: automatico.get(p.id) ?? 0,
        manual: manual.get(p.id) ?? 0,
      })),
    })),
  };
}

const noPeriodo = (data: string, p: Periodo) => p.inicio <= data && data <= p.fim;

function omitir<T extends object, K extends keyof T>(o: T, ...chaves: K[]): Omit<T, K> {
  const copia = { ...o };
  for (const k of chaves) delete copia[k];
  return copia;
}

/**
 * Ponto de ligação com o resto do Pentagon: contadores de prática que somam sozinhos, dentro do
 * período da fase. `cards:<trilha>` conta dias com resposta de flashcard daquela trilha;
 * `sessoes:pratica`, sessões de prática feitas; `revisoes`, revisões de sexta com nota.
 * As sessões e revisões são as da trilha de estudos com o mesmo slug (a DevOps).
 */
async function contagensAutomaticas(
  userId: string,
  slug: string,
  fases: Fase[],
  pratica: (typeof roadmapPractice.$inferSelect)[],
) {
  const saida = new Map<string, number>();
  const comFonte = pratica.filter((p) => p.fonte);
  if (!comFonte.length) return saida;
  const fontes = new Set(comFonte.map((p) => p.fonte!.split(":")[0]));
  const [sessoes, revisoes, cards] = await Promise.all([
    fontes.has("sessoes")
      ? db()
          .select({ data: studySessions.data })
          .from(studySessions)
          .innerJoin(studyTracks, eq(studyTracks.id, studySessions.trackId))
          .where(
            and(
              eq(studySessions.userId, userId),
              eq(studyTracks.slug, slug),
              eq(studySessions.categoria, "pratica"),
              eq(studySessions.status, "feita"),
            ),
          )
      : [],
    fontes.has("revisoes")
      ? db()
          .select({ data: studyWeeks.inicio })
          .from(studyReviews)
          .innerJoin(studyWeeks, eq(studyWeeks.id, studyReviews.weekId))
          .innerJoin(studyTracks, eq(studyTracks.id, studyWeeks.trackId))
          .where(
            and(
              eq(studyReviews.userId, userId),
              eq(studyTracks.slug, slug),
              isNotNull(studyReviews.nota),
            ),
          )
      : [],
    fontes.has("cards")
      ? db()
          .selectDistinct({
            data: flashcardAnswers.data,
            trilha: sql<string>`lower(${flashcards.trilha})`,
          })
          .from(flashcardAnswers)
          .innerJoin(flashcards, eq(flashcards.id, flashcardAnswers.cardId))
          .where(eq(flashcardAnswers.userId, userId))
      : [],
  ]);
  const fase = new Map(fases.map((f) => [f.id, f]));
  for (const p of comFonte) {
    const periodo = fase.get(p.phaseId)!;
    const [tipo, alvo] = p.fonte!.split(":");
    const datas =
      tipo === "sessoes"
        ? sessoes.map((s) => s.data)
        : tipo === "revisoes"
          ? revisoes.map((r) => r.data)
          : cards.filter((c) => c.trilha === alvo?.toLowerCase()).map((c) => c.data);
    saida.set(p.id, datas.filter((d) => noPeriodo(d, periodo)).length);
  }
  return saida;
}

/** Garante que o item é da trilha do endereço (e devolve 404 se não for). */
async function itemDaTrilha(
  tabela: typeof roadmapRequirements | typeof roadmapPractice,
  slug: string,
  id: string,
  nome: string,
) {
  const [item] = await db()
    .select({ id: tabela.id })
    .from(tabela)
    .innerJoin(roadmapPhases, eq(roadmapPhases.id, tabela.phaseId))
    .innerJoin(roadmapTrails, eq(roadmapTrails.id, roadmapPhases.trailId))
    .where(and(eq(tabela.id, id), eq(roadmapTrails.slug, slug)));
  if (!item) throw new NaoEncontrado(nome);
}

/** Marca ou desmarca um requisito. O progresso é sempre o do usuário da sessão. */
export async function marcarRequisito(userId: string, slug: string, id: string, feito: boolean) {
  await itemDaTrilha(roadmapRequirements, slug, id, "Requisito");
  const valores = { feito, feitoEm: feito ? new Date() : null };
  const [salvo] = await db()
    .insert(roadmapRequirementProgress)
    .values({ userId, requirementId: id, ...valores })
    .onConflictDoUpdate({
      target: [roadmapRequirementProgress.userId, roadmapRequirementProgress.requirementId],
      set: valores,
    })
    .returning();
  return { id, feito: salvo.feito };
}

/** Soma 1 (ou desfaz 1) na parte manual de um contador de prática, sem ficar negativo. */
export async function somarPratica(userId: string, slug: string, id: string, delta: 1 | -1) {
  await itemDaTrilha(roadmapPractice, slug, id, "Prática");
  const [salvo] = await db()
    .insert(roadmapPracticeProgress)
    .values({ userId, practiceId: id, contagem: Math.max(0, delta) })
    .onConflictDoUpdate({
      target: [roadmapPracticeProgress.userId, roadmapPracticeProgress.practiceId],
      set: { contagem: sql`greatest(0, ${roadmapPracticeProgress.contagem} + ${delta})` },
    })
    .returning();
  return { id, manual: salvo.contagem };
}
