import type { AreaId } from "@/lib/dominio";
import { addDias, paraUtc } from "@/lib/tempo";
import type { EventoParaExpandir, ExcecaoParaExpandir, Intervalo, Ocorrencia } from "./recorrencia";
import { expandirOcorrencias } from "./recorrencia";

export type PeriodoLetivo = { inicio: string | null; fim: string | null };
export type Feriado = { id: string; data: string; nome: string; areasCanceladas: AreaId[] };

/** Aulas recorrentes só acontecem dentro do período letivo definido em Ajustes. */
export function aplicarPeriodoLetivo<E extends EventoParaExpandir>(
  eventos: E[],
  periodo: PeriodoLetivo | null,
): E[] {
  if (!periodo || (!periodo.inicio && !periodo.fim)) return eventos;
  return eventos.map((e) => {
    if (e.areaId !== "aulas" || !e.diasSemana?.length) return e;
    const desde = [e.repeteDesde, periodo.inicio].filter(Boolean).sort().at(-1) ?? null;
    const ate = [e.repeteAte, periodo.fim].filter(Boolean).sort()[0] ?? null;
    return { ...e, repeteDesde: desde, repeteAte: ate };
  });
}

/**
 * Feriados viram cancelamentos das ocorrências recorrentes das áreas escolhidas naquele dia.
 * Uma exceção que o usuário já criou para o dia tem prioridade.
 */
export function excecoesDeFeriados(
  eventos: EventoParaExpandir[],
  feriados: Feriado[],
  excecoes: ExcecaoParaExpandir[],
): ExcecaoParaExpandir[] {
  const existentes = new Set(excecoes.map((x) => `${x.eventId}:${x.data}`));
  const extras: ExcecaoParaExpandir[] = [];
  for (const f of feriados) {
    for (const e of eventos) {
      if (!e.diasSemana?.length || !f.areasCanceladas.includes(e.areaId)) continue;
      if (existentes.has(`${e.id}:${f.data}`)) continue;
      extras.push({
        eventId: e.id,
        data: f.data,
        tipo: "cancelada",
        novoInicio: null,
        novaDuracaoMin: null,
      });
    }
  }
  return [...excecoes, ...extras];
}

/** Feriados como itens de dia inteiro na agenda. */
export function ocorrenciasDeFeriados(
  feriados: Feriado[],
  intervalo: Intervalo,
  fuso: string,
): Ocorrencia[] {
  return feriados
    .filter((f) => f.data >= intervalo.de && f.data <= intervalo.ate)
    .map((f) => ({
      chave: `feriado:${f.data}`,
      origem: "feriado" as const,
      eventId: f.id,
      dataOriginal: f.data,
      titulo: `Feriado: ${f.nome}`,
      areaId: "pessoal" as const,
      subjectId: null,
      local: null,
      inicio: paraUtc(f.data, "00:00", fuso),
      fim: paraUtc(addDias(f.data, 1), "00:00", fuso),
      diaInteiro: true,
      movida: false,
      recorrente: false,
    }));
}

/** Tudo de uma vez: período letivo, feriados e exceções aplicados. */
export function expandirComRegras(
  eventos: EventoParaExpandir[],
  excecoes: ExcecaoParaExpandir[],
  feriados: Feriado[],
  periodo: PeriodoLetivo | null,
  intervalo: Intervalo,
): Ocorrencia[] {
  const comPeriodo = aplicarPeriodoLetivo(eventos, periodo);
  return expandirOcorrencias(
    comPeriodo,
    excecoesDeFeriados(comPeriodo, feriados, excecoes),
    intervalo,
  );
}

export type Conflito = { ocorrencia: Ocorrencia; com: Ocorrencia };

const seSobrepoem = (a: Ocorrencia, b: Ocorrencia) => a.inicio < b.fim && b.inicio < a.fim;

/** Estudo marcado para acontecer durante o estágio (a manhã da trilha): os dois juntos não são choque. */
function estudoNoEstagio(a: Ocorrencia, b: Ocorrencia) {
  return (
    (a.permiteSobreposicao && b.areaId === "estagio") ||
    (b.permiteSobreposicao && a.areaId === "estagio")
  );
}

/**
 * Choques de horário entre as ocorrências novas e as demais. Dia inteiro, sessões feitas e
 * estudo marcado para acontecer dentro do estágio não contam.
 */
export function encontrarConflitos(novas: Ocorrencia[], outras: Ocorrencia[]): Conflito[] {
  const conta = (o: Ocorrencia) => !o.diaInteiro && !o.feita;
  const saida: Conflito[] = [];
  for (const n of novas.filter(conta)) {
    for (const o of outras.filter(conta)) {
      if (o.eventId === n.eventId && o.origem === n.origem) continue;
      if (estudoNoEstagio(n, o)) continue;
      if (seSobrepoem(n, o)) saida.push({ ocorrencia: n, com: o });
    }
  }
  return saida;
}

/** Marca as sessões que de fato acontecem durante o estágio (para o selo "no estágio"). */
export function marcarNoEstagio(ocorrencias: Ocorrencia[]): Ocorrencia[] {
  const estagio = ocorrencias.filter((o) => o.areaId === "estagio" && !o.diaInteiro);
  return ocorrencias.map((o) =>
    o.origem === "sessao" && o.permiteSobreposicao && estagio.some((e) => seSobrepoem(o, e))
      ? { ...o, noEstagio: true }
      : o,
  );
}
