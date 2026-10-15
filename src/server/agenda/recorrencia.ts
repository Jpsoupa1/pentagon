import { addDias, diaDaSemana, difDias, partesLocais, paraUtc } from "@/lib/tempo";
import type { AreaId } from "@/lib/dominio";

export type EventoParaExpandir = {
  id: string;
  titulo: string;
  areaId: AreaId;
  subjectId?: string | null;
  local?: string | null;
  inicio: Date;
  duracaoMin: number;
  diaInteiro: boolean;
  fuso: string;
  diasSemana: number[] | null;
  repeteDesde: string | null;
  repeteAte: string | null;
};

export type ExcecaoParaExpandir = {
  eventId: string;
  data: string;
  tipo: "cancelada" | "movida";
  novoInicio: Date | null;
  novaDuracaoMin: number | null;
};

export type OrigemOcorrencia = "evento" | "sessao" | "marco";

export type Ocorrencia = {
  /** Identificador estável da ocorrência: `<eventId>:<data original>` */
  chave: string;
  /** De onde veio: compromisso da agenda, sessão da trilha ou marco da trilha. */
  origem: OrigemOcorrencia;
  /** Id do item de origem (evento, sessão de estudo ou data do marco). */
  eventId: string;
  /** Data local original da ocorrência (a que a exceção usaria). */
  dataOriginal: string;
  titulo: string;
  areaId: AreaId;
  subjectId: string | null;
  local: string | null;
  inicio: Date;
  fim: Date;
  diaInteiro: boolean;
  movida: boolean;
  recorrente: boolean;
  /** Só para sessões de estudo. */
  feita?: boolean;
};

export type Intervalo = { de: string; ate: string };

function ehRecorrente(e: EventoParaExpandir) {
  return !!e.diasSemana && e.diasSemana.length > 0;
}

/** Datas locais em que o evento acontece (sem exceções), limitadas ao intervalo. */
function datasDoEvento(e: EventoParaExpandir, intervalo: Intervalo): string[] {
  const primeira = partesLocais(e.inicio, e.fuso).data;
  if (!ehRecorrente(e)) {
    return primeira >= intervalo.de && primeira <= intervalo.ate ? [primeira] : [];
  }
  const desde = [primeira, e.repeteDesde ?? primeira, intervalo.de].sort().at(-1)!;
  const ate = e.repeteAte && e.repeteAte < intervalo.ate ? e.repeteAte : intervalo.ate;
  const dias = new Set(e.diasSemana);
  const datas: string[] = [];
  for (let d = desde; d <= ate; d = addDias(d, 1)) {
    if (dias.has(diaDaSemana(d))) datas.push(d);
  }
  return datas;
}

function aconteceEm(e: EventoParaExpandir, data: string): boolean {
  return datasDoEvento(e, { de: data, ate: data }).length === 1;
}

function montar(
  e: EventoParaExpandir,
  dataOriginal: string,
  inicio: Date,
  duracaoMin: number,
  movida: boolean,
): Ocorrencia {
  return {
    chave: `${e.id}:${dataOriginal}`,
    origem: "evento",
    eventId: e.id,
    dataOriginal,
    titulo: e.titulo,
    areaId: e.areaId,
    subjectId: e.subjectId ?? null,
    local: e.local ?? null,
    inicio,
    fim: new Date(inicio.getTime() + duracaoMin * 60_000),
    diaInteiro: e.diaInteiro,
    movida,
    recorrente: ehRecorrente(e),
  };
}

/**
 * Expande eventos (únicos e semanais) em ocorrências dentro de um intervalo de datas locais
 * (inclusivo), aplicando cancelamentos e mudanças de um dia só. Única implementação do app.
 */
export function expandirOcorrencias(
  eventos: EventoParaExpandir[],
  excecoes: ExcecaoParaExpandir[],
  intervalo: Intervalo,
): Ocorrencia[] {
  const excecoesPorEvento = new Map<string, Map<string, ExcecaoParaExpandir>>();
  for (const x of excecoes) {
    const mapa = excecoesPorEvento.get(x.eventId) ?? new Map();
    mapa.set(x.data, x);
    excecoesPorEvento.set(x.eventId, mapa);
  }

  const saida: Ocorrencia[] = [];
  for (const e of eventos) {
    const doEvento = excecoesPorEvento.get(e.id);
    const horaLocal = partesLocais(e.inicio, e.fuso).hora;

    for (const data of datasDoEvento(e, intervalo)) {
      if (doEvento?.has(data)) continue; // cancelada, ou movida (tratada abaixo)
      const inicio = e.diaInteiro
        ? paraUtc(data, "00:00", e.fuso)
        : paraUtc(data, horaLocal, e.fuso);
      saida.push(montar(e, data, inicio, e.duracaoMin, false));
    }

    // Ocorrências movidas entram pela data nova, mesmo que a original esteja fora do intervalo.
    for (const x of doEvento?.values() ?? []) {
      if (x.tipo !== "movida" || !x.novoInicio || !aconteceEm(e, x.data)) continue;
      const novaData = partesLocais(x.novoInicio, e.fuso).data;
      if (novaData < intervalo.de || novaData > intervalo.ate) continue;
      saida.push(montar(e, x.data, x.novoInicio, x.novaDuracaoMin ?? e.duracaoMin, true));
    }
  }

  return saida.sort(
    (a, b) => a.inicio.getTime() - b.inicio.getTime() || a.titulo.localeCompare(b.titulo),
  );
}

/** Minutos planejados por área num conjunto de ocorrências (dia inteiro não conta). */
export function minutosPorArea(ocorrencias: Ocorrencia[]): Record<AreaId, number> {
  const total: Record<AreaId, number> = { aulas: 0, provas: 0, estudos: 0, estagio: 0, pessoal: 0 };
  for (const o of ocorrencias) {
    if (o.diaInteiro) continue;
    total[o.areaId] += Math.round((o.fim.getTime() - o.inicio.getTime()) / 60_000);
  }
  return total;
}

export function diasNoIntervalo(intervalo: Intervalo): number {
  return difDias(intervalo.de, intervalo.ate) + 1;
}
