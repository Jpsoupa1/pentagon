import type { HorariosEstudo } from "@/lib/dominio";
import { addDias, paraUtc } from "@/lib/tempo";
import type { Intervalo, Ocorrencia } from "../agenda/recorrencia";
import type { MarcoTrilha } from "../db/schema";

export type SessaoParaAgenda = {
  id: string;
  data: string;
  tipo: string;
  conteudo: string;
  status: "pendente" | "feita";
  diaSemana: number;
};

/** Sessões da trilha nos dias ligados, no horário configurado em Ajustes. */
export function ocorrenciasDeSessoes(
  sessoes: SessaoParaAgenda[],
  horarios: HorariosEstudo,
  fuso: string,
): Ocorrencia[] {
  const saida: Ocorrencia[] = [];
  for (const s of sessoes) {
    const h = horarios[String(s.diaSemana)];
    if (!h?.ativo) continue;
    const inicio = paraUtc(s.data, h.inicio, fuso);
    saida.push({
      chave: `sessao:${s.data}`,
      origem: "sessao",
      eventId: s.id,
      dataOriginal: s.data,
      titulo: `${s.tipo}: ${s.conteudo}`,
      areaId: "estudos",
      subjectId: null,
      local: null,
      inicio,
      fim: new Date(inicio.getTime() + h.minutos * 60_000),
      diaInteiro: false,
      movida: false,
      recorrente: true,
      feita: s.status === "feita",
    });
  }
  return saida;
}

/** Marcos da trilha como itens de dia inteiro. */
export function ocorrenciasDeMarcos(
  marcos: MarcoTrilha[],
  intervalo: Intervalo,
  fuso: string,
): Ocorrencia[] {
  return marcos
    .filter((m) => m.data >= intervalo.de && m.data <= intervalo.ate)
    .map((m) => {
      const inicio = paraUtc(m.data, "00:00", fuso);
      return {
        chave: `marco:${m.data}`,
        origem: "marco" as const,
        eventId: m.data,
        dataOriginal: m.data,
        titulo: `Marco: ${m.titulo}`,
        areaId: "estudos" as const,
        subjectId: null,
        local: null,
        inicio,
        fim: paraUtc(addDias(m.data, 1), "00:00", fuso),
        diaInteiro: true,
        movida: false,
        recorrente: false,
      };
    });
}
