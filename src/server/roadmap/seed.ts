import { and, eq, gte, sql } from "drizzle-orm";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import type { PgColumn, PgTable } from "drizzle-orm/pg-core";
import { z } from "zod";
import { precosRecurso, tiposAvaliacaoRoadmap, tiposPortao } from "../../lib/roadmap";
import {
  roadmapAssessments,
  roadmapDomains,
  roadmapPhases,
  roadmapPractice,
  roadmapPracticeProgress,
  roadmapRequirementProgress,
  roadmapRequirements,
  roadmapResources,
  roadmapTrails,
} from "../db/schema";
import devops from "./trilhas/devops.json";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type QualquerDb = NodePgDatabase<any>;

// Uma trilha nova do Roadmap é um JSON em ./trilhas no mesmo formato, adicionado a TRILHAS.

const data = z.iso.date();
const fonte = z.union([
  z.templateLiteral(["cards:", z.string().min(1)]),
  z.literal("sessoes:pratica"),
  z.literal("revisoes"),
]);

const trilhaSchema = z.object({
  trail: z.object({
    slug: z.string().min(1),
    name: z.string().min(1),
    title: z.string().min(1),
    intro: z.string().min(1),
    starts_on: data,
    goal_label: z.string().min(1),
    goal_note: z.string().optional(),
    week_zero: z.object({ label: z.string(), starts_on: data, ends_on: data }).optional(),
  }),
  phases: z
    .array(
      z.object({
        slug: z.string().min(1),
        name: z.string().min(1),
        short_name: z.string().min(1),
        weeks_label: z.string().min(1),
        starts_on: data,
        ends_on: data,
        color: z.string().regex(/^#[0-9a-f]{6}$/i),
        color_ink: z.string().regex(/^#[0-9a-f]{6}$/i),
        color_soft: z.string().regex(/^#[0-9a-f]{6}$/i),
        gate_name: z.string().min(1),
        gate_full_name: z.string().min(1),
        gate_date: data,
        gate_kind: z.enum(tiposPortao),
        gate_format: z.string().min(1),
        cost_note: z.string().optional(),
        tip: z.string().optional(),
        domains_title: z.string().min(1),
        domains: z.array(z.tuple([z.string().min(1), z.int().min(0).max(100).nullable()])),
        requirements: z.array(z.object({ label: z.string().min(1), done: z.boolean().optional() })),
        resources: z.array(
          z.object({
            title: z.string().min(1),
            provider: z.string().min(1),
            pricing: z.enum(precosRecurso),
            price_label: z.string().min(1),
            lang: z.string().min(2),
            note: z.string().min(1),
            url: z.url(),
          }),
        ),
        assessments: z.array(
          z.object({
            date: data.nullable(),
            kind: z.enum(tiposAvaliacaoRoadmap),
            title: z.string().min(1),
            format: z.string().min(1),
            price_label: z.string().min(1),
            note: z.string().min(1),
            optional: z.boolean().optional(),
          }),
        ),
        practice: z.array(
          z.object({
            title: z.string().min(1),
            cadence: z.string().min(1),
            target: z.int().min(1),
            source: fonte.optional(),
            done: z.int().min(0).optional(),
          }),
        ),
      }),
    )
    .min(1),
});

export type TrilhaRoadmapJson = z.output<typeof trilhaSchema>;

export const TRILHAS: TrilhaRoadmapJson[] = [trilhaSchema.parse(devops)];

/**
 * Upsert pela posição dentro do pai e remoção do que passou do fim da lista. Mudar o texto de um
 * requisito preserva o progresso; tirar um item da lista apaga o progresso dele junto (cascade).
 */
async function sincronizar<T extends PgTable>(
  db: QualquerDb,
  tabela: T,
  colunas: { pai: PgColumn; posicao: PgColumn; id: PgColumn },
  paiId: string,
  linhas: Record<string, unknown>[],
  atualizar: string[],
) {
  let ids: { id: string; posicao: number }[] = [];
  if (linhas.length) {
    ids = (await db
      .insert(tabela)
      .values(linhas as never)
      .onConflictDoUpdate({
        target: [colunas.pai, colunas.posicao],
        set: Object.fromEntries(atualizar.map((c) => [c, sql.raw(`excluded."${c}"`)])) as never,
      })
      .returning({ id: colunas.id, posicao: colunas.posicao })) as typeof ids;
  }
  await db.delete(tabela).where(and(eq(colunas.pai, paiId), gte(colunas.posicao, linhas.length)));
  return ids.sort((a, b) => a.posicao - b.posicao).map((l) => l.id);
}

/** Grava o catálogo de uma trilha (igual para todos). Idempotente: roda a cada deploy. */
export async function semearCatalogo(db: QualquerDb, t: TrilhaRoadmapJson) {
  const trilha = {
    slug: t.trail.slug,
    nome: t.trail.name,
    titulo: t.trail.title,
    sobre: t.trail.intro,
    inicio: t.trail.starts_on,
    meta: t.trail.goal_label,
    metaNota: t.trail.goal_note ?? null,
    semanaZeroRotulo: t.trail.week_zero?.label ?? null,
    semanaZeroInicio: t.trail.week_zero?.starts_on ?? null,
    semanaZeroFim: t.trail.week_zero?.ends_on ?? null,
  };
  const [{ id: trailId }] = await db
    .insert(roadmapTrails)
    .values(trilha)
    .onConflictDoUpdate({ target: roadmapTrails.slug, set: trilha })
    .returning({ id: roadmapTrails.id });

  const faseIds = await sincronizar(
    db,
    roadmapPhases,
    { pai: roadmapPhases.trailId, posicao: roadmapPhases.posicao, id: roadmapPhases.id },
    trailId,
    t.phases.map((f, posicao) => ({
      trailId,
      posicao,
      slug: f.slug,
      nome: f.name,
      curto: f.short_name,
      semanas: f.weeks_label,
      inicio: f.starts_on,
      fim: f.ends_on,
      cor: f.color,
      corTexto: f.color_ink,
      corSuave: f.color_soft,
      portao: f.gate_name,
      portaoNome: f.gate_full_name,
      portaoData: f.gate_date,
      portaoFormato: f.gate_format,
      portaoTipo: f.gate_kind,
      custo: f.cost_note ?? null,
      dica: f.tip ?? null,
      dominiosTitulo: f.domains_title,
    })),
    [
      "slug",
      "nome",
      "curto",
      "semanas",
      "inicio",
      "fim",
      "cor",
      "cor_texto",
      "cor_suave",
      "portao",
      "portao_nome",
      "portao_data",
      "portao_formato",
      "portao_tipo",
      "custo",
      "dica",
      "dominios_titulo",
    ],
  );

  const requisitosFeitos: string[] = [];
  const praticaFeita: { id: string; contagem: number }[] = [];
  for (const [i, f] of t.phases.entries()) {
    const phaseId = faseIds[i];
    await sincronizar(
      db,
      roadmapDomains,
      { pai: roadmapDomains.phaseId, posicao: roadmapDomains.posicao, id: roadmapDomains.id },
      phaseId,
      f.domains.map(([rotulo, peso], posicao) => ({ phaseId, posicao, rotulo, peso })),
      ["rotulo", "peso"],
    );
    const reqIds = await sincronizar(
      db,
      roadmapRequirements,
      {
        pai: roadmapRequirements.phaseId,
        posicao: roadmapRequirements.posicao,
        id: roadmapRequirements.id,
      },
      phaseId,
      f.requirements.map((r, posicao) => ({ phaseId, posicao, rotulo: r.label })),
      ["rotulo"],
    );
    f.requirements.forEach((r, j) => r.done && requisitosFeitos.push(reqIds[j]));
    await sincronizar(
      db,
      roadmapResources,
      { pai: roadmapResources.phaseId, posicao: roadmapResources.posicao, id: roadmapResources.id },
      phaseId,
      f.resources.map((r, posicao) => ({
        phaseId,
        posicao,
        titulo: r.title,
        fornecedor: r.provider,
        preco: r.pricing,
        precoTexto: r.price_label,
        idioma: r.lang,
        nota: r.note,
        url: r.url,
      })),
      ["titulo", "fornecedor", "preco", "preco_texto", "idioma", "nota", "url"],
    );
    await sincronizar(
      db,
      roadmapAssessments,
      {
        pai: roadmapAssessments.phaseId,
        posicao: roadmapAssessments.posicao,
        id: roadmapAssessments.id,
      },
      phaseId,
      f.assessments.map((a, posicao) => ({
        phaseId,
        posicao,
        data: a.date,
        tipo: a.kind,
        titulo: a.title,
        formato: a.format,
        precoTexto: a.price_label,
        nota: a.note,
        opcional: a.optional ?? false,
      })),
      ["data", "tipo", "titulo", "formato", "preco_texto", "nota", "opcional"],
    );
    const praticaIds = await sincronizar(
      db,
      roadmapPractice,
      { pai: roadmapPractice.phaseId, posicao: roadmapPractice.posicao, id: roadmapPractice.id },
      phaseId,
      f.practice.map((p, posicao) => ({
        phaseId,
        posicao,
        titulo: p.title,
        cadencia: p.cadence,
        meta: p.target,
        fonte: p.source ?? null,
      })),
      ["titulo", "cadencia", "meta", "fonte"],
    );
    f.practice.forEach(
      (p, j) => p.done && praticaFeita.push({ id: praticaIds[j], contagem: p.done }),
    );
  }
  return { trailId, fases: faseIds.length, requisitosFeitos, praticaFeita };
}

/**
 * Grava o catálogo e o progresso inicial do JSON ("done") para os usuários. Só na primeira vez:
 * o que o usuário desmarcar depois não volta a ficar marcado no próximo deploy.
 */
export async function semearRoadmap(db: QualquerDb, userIds: string[]) {
  const resumo: { slug: string; fases: number }[] = [];
  for (const t of TRILHAS) {
    const c = await semearCatalogo(db, t);
    resumo.push({ slug: t.trail.slug, fases: c.fases });
    if (!userIds.length) continue;
    if (c.requisitosFeitos.length) {
      await db
        .insert(roadmapRequirementProgress)
        .values(
          userIds.flatMap((userId) =>
            c.requisitosFeitos.map((requirementId) => ({
              userId,
              requirementId,
              feito: true,
              feitoEm: new Date(),
            })),
          ),
        )
        .onConflictDoNothing();
    }
    if (c.praticaFeita.length) {
      await db
        .insert(roadmapPracticeProgress)
        .values(
          userIds.flatMap((userId) =>
            c.praticaFeita.map((p) => ({ userId, practiceId: p.id, contagem: p.contagem })),
          ),
        )
        .onConflictDoNothing();
    }
  }
  return resumo;
}

/** Ids dos requisitos de uma trilha (usado nos testes). */
export async function requisitosDaTrilha(db: QualquerDb, slug: string) {
  return db
    .select({ id: roadmapRequirements.id, rotulo: roadmapRequirements.rotulo })
    .from(roadmapRequirements)
    .innerJoin(roadmapPhases, eq(roadmapPhases.id, roadmapRequirements.phaseId))
    .innerJoin(roadmapTrails, eq(roadmapTrails.id, roadmapPhases.trailId))
    .where(eq(roadmapTrails.slug, slug))
    .orderBy(roadmapPhases.posicao, roadmapRequirements.posicao);
}
