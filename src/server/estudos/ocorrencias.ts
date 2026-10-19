import type { HorariosEstudo } from "@/lib/dominio";
import { chaveTurno, type Turno } from "@/lib/estudos";
import { addDias, paraUtc } from "@/lib/tempo";
import type { Intervalo, Ocorrencia } from "../agenda/recorrencia";
import type { MarcoTrilha } from "../db/schema";
import { tituloDaSessao } from "./trilha";

export type SessaoParaAgenda = {
  id: string;
  data: string;
  turno: Turno;
  tipo: string;
  conteudo: string;
  status: "pendente" | "feita";
  diaSemana: number;
  horaInicio?: string | null;
  permiteSobreposicao?: boolean;
};

/** Sessões da trilha nos turnos ligados, no horário configurado em Ajustes. */
export function ocorrenciasDeSessoes(
  sessoes: SessaoParaAgenda[],
  horarios: HorariosEstudo,
  fuso: string,
): Ocorrencia[] {
  const saida: Ocorrencia[] = [];
  for (const s of sessoes) {
    const h = horarios[chaveTurno(s.diaSemana, s.turno)];
    if (!h?.ativo) continue;
    const inicio = paraUtc(s.data, s.horaInicio ?? h.inicio, fuso);
    saida.push({
      chave: `sessao:${s.data}:${s.turno}`,
      origem: "sessao",
      eventId: s.id,
      dataOriginal: s.data,
      titulo: tituloDaSessao(s),
      areaId: "estudos",
      subjectId: null,
      local: null,
      inicio,
      fim: new Date(inicio.getTime() + h.minutos * 60_000),
      diaInteiro: false,
      movida: false,
      recorrente: true,
      feita: s.status === "feita",
      permiteSobreposicao: !!s.permiteSobreposicao,
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
