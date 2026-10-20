// Cálculos do Roadmap das trilhas (sem dependências de servidor): fase atual, percentuais e prazos.
import { difDias, FUSO_PADRAO, hojeLocal } from "./tempo";

export const tiposPortao = ["exam", "project"] as const;
export type TipoPortao = (typeof tiposPortao)[number];

export const precosRecurso = ["free", "paid"] as const;
export type PrecoRecurso = (typeof precosRecurso)[number];

export const tiposAvaliacaoRoadmap = ["simulado", "prova", "entrega"] as const;
export type TipoAvaliacaoRoadmap = (typeof tiposAvaliacaoRoadmap)[number];

/**
 * Contador de prática que soma sozinho a partir do que o Pentagon já registra:
 * `cards:<trilha>` dias com resposta de flashcard daquela trilha, `sessoes:pratica` sessões de
 * prática feitas e `revisoes` revisões de sexta com nota, sempre dentro do período da fase.
 */
export type FontePratica = `cards:${string}` | "sessoes:pratica" | "revisoes";

export type Periodo = { inicio: string; fim: string };

/**
 * A fase em que hoje cai. Antes da primeira, é a primeira; depois da última, a última;
 * num intervalo entre duas fases, a próxima.
 */
export function indiceFaseAtual(fases: Periodo[], hoje: string): number {
  if (!fases.length) return -1;
  const dentro = fases.findIndex((f) => f.inicio <= hoje && hoje <= f.fim);
  if (dentro >= 0) return dentro;
  const proxima = fases.findIndex((f) => hoje < f.inicio);
  return proxima >= 0 ? proxima : fases.length - 1;
}

/** "Você está aqui" na estação Semana zero: só enquanto hoje estiver dentro dela. */
export function naSemanaZero(semanaZero: Periodo | null, hoje: string): boolean {
  return !!semanaZero && semanaZero.inicio <= hoje && hoje <= semanaZero.fim;
}

/** Percentual inteiro de 0 a 100 (0 quando não há nada para fazer). */
export function percentual(feitos: number, total: number): number {
  if (total <= 0) return 0;
  return Math.round((Math.min(feitos, total) / total) * 100);
}

/** Dias de calendário de hoje até a data (AAAA-MM-DD), no fuso do usuário. Negativo se passou. */
export function diasAte(data: string, agora = new Date(), fuso = FUSO_PADRAO): number {
  return difDias(hojeLocal(agora, fuso), data);
}

export function textoFaltam(dias: number): string {
  if (dias < 0) return dias === -1 ? "Foi ontem" : `Foi há ${-dias} dias`;
  if (dias === 0) return "É hoje";
  if (dias === 1) return "Falta 1 dia";
  return `Faltam ${dias} dias`;
}

/** Semanas cheias entre o início e o fim (inclusive) de uma fase. */
export function semanasDoPeriodo(p: Periodo): number {
  return Math.round((difDias(p.inicio, p.fim) + 1) / 7);
}

/** "05/03" */
export function dataNumerica(data: string): string {
  const [, m, d] = data.split("-");
  return `${d}/${m}`;
}

/** "26/10/2026 a 07/03/2027" */
export function periodoTexto(p: Periodo): string {
  const f = (d: string) => `${dataNumerica(d)}/${d.slice(0, 4)}`;
  return `${f(p.inicio)} a ${f(p.fim)}`;
}

/** Contador de prática: o que veio sozinho mais o que foi marcado no "+". */
export function feitoDaPratica(p: { automatico: number; manual: number }): number {
  return p.automatico + p.manual;
}
