import {
  and,
  eq,
  gte,
  inArray,
  isNull,
  notInArray,
  or,
  type AnyColumn,
  type SQL,
} from "drizzle-orm";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import {
  arquivamentos,
  events,
  flashcards,
  studyErrors,
  studySessions,
  studyTracks,
} from "../db/schema";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type QualquerDb = NodePgDatabase<any>;

/** Chave do arquivamento do caderno de erros: os erros criados antes dela saem de cena. */
export const CHAVE_ERROS_ANTES_DO_PLANO = "antes_do_plano";

/**
 * O que o usuário tirou de circulação (tabela `arquivamentos`), por tipo. Arquivar é só registrar:
 * nada é apagado, e cada consulta afetada aplica o filtro daqui, nunca um próprio.
 */
export type Arquivados = {
  /** Slugs das trilhas de estudo (DevOps, Segurança). */
  trilhasEstudo: ReadonlySet<string>;
  /** Ids dessas trilhas em `study_tracks`, para filtrar sessões e compromissos ligados a elas. */
  trilhaIds: readonly string[];
  /** Slugs dos roadmaps. */
  roadmaps: ReadonlySet<string>;
  /** Valores de `flashcards.trilha` (CKA, SEG...). */
  cards: ReadonlySet<string>;
  /** Ids de compromissos arquivados (o "Ciber e SecOps"). */
  eventos: ReadonlySet<string>;
  /** Erros do caderno criados antes deste instante ficam ocultos; nulo quando nada foi arquivado. */
  errosAntesDe: Date | null;
};

/** Lê os arquivamentos do usuário. Os serviços chamam `arquivados(userId)` (servicos/arquivamentos.ts). */
export async function arquivadosDe(conexao: QualquerDb, userId: string): Promise<Arquivados> {
  const linhas = await conexao
    .select({
      tipo: arquivamentos.tipo,
      chave: arquivamentos.chave,
      arquivadoEm: arquivamentos.arquivadoEm,
    })
    .from(arquivamentos)
    .where(eq(arquivamentos.userId, userId));
  const chaves = (tipo: (typeof linhas)[number]["tipo"]) =>
    new Set(linhas.filter((l) => l.tipo === tipo).map((l) => l.chave));

  const trilhasEstudo = chaves("trilha_estudo");
  const trilhaIds = trilhasEstudo.size
    ? (
        await conexao
          .select({ id: studyTracks.id })
          .from(studyTracks)
          .where(and(eq(studyTracks.userId, userId), inArray(studyTracks.slug, [...trilhasEstudo])))
      ).map((t) => t.id)
    : [];
  const erros = linhas.find((l) => l.tipo === "erros" && l.chave === CHAVE_ERROS_ANTES_DO_PLANO);
  return {
    trilhasEstudo,
    trilhaIds,
    roadmaps: chaves("roadmap"),
    cards: chaves("cards"),
    eventos: chaves("evento"),
    errosAntesDe: erros?.arquivadoEm ?? null,
  };
}

// ---------------------------------------------------------------- Filtros (um por tabela)
// Cada um devolve `undefined` quando não há nada arquivado, e o `and(...)` do Drizzle o ignora.

/** Sessões (ou qualquer linha com `track_id`) de trilhas de estudo arquivadas. */
export function semTrilhasArquivadas(
  a: Arquivados,
  coluna: AnyColumn = studySessions.trackId,
): SQL | undefined {
  return a.trilhaIds.length ? notInArray(coluna, [...a.trilhaIds]) : undefined;
}

/** Compromissos arquivados e os ligados a uma trilha arquivada. */
export function semEventosArquivados(a: Arquivados): SQL | undefined {
  return and(
    a.eventos.size ? notInArray(events.id, [...a.eventos]) : undefined,
    a.trilhaIds.length
      ? or(isNull(events.trackId), notInArray(events.trackId, [...a.trilhaIds]))
      : undefined,
  );
}

/** Cards de trilhas arquivadas. As respostas ficam no banco. */
export function semCardsArquivados(a: Arquivados): SQL | undefined {
  return a.cards.size ? notInArray(flashcards.trilha, [...a.cards]) : undefined;
}

/** Erros do caderno criados antes do arquivamento. */
export function semErrosArquivados(a: Arquivados): SQL | undefined {
  return a.errosAntesDe ? gte(studyErrors.createdAt, a.errosAntesDe) : undefined;
}

// ---------------------------------------------------------------- Marca na exportação
// A exportação traz tudo e só marca o que está arquivado, com a mesma regra dos filtros acima.

export const trilhaIdArquivada = (a: Arquivados, trackId: string | null) =>
  trackId !== null && a.trilhaIds.includes(trackId);

export const eventoArquivado = (a: Arquivados, e: { id: string; trackId: string | null }) =>
  a.eventos.has(e.id) || trilhaIdArquivada(a, e.trackId);

export const cardArquivado = (a: Arquivados, c: { trilha: string }) => a.cards.has(c.trilha);
