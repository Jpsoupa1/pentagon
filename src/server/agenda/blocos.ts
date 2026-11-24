import type { BlocoMontado } from "@/lib/plano";
import { paraUtc } from "@/lib/tempo";
import type { Ocorrencia } from "./recorrencia";

/** Cada bloco do plano como ocorrência da área estudos. A manhã pode sobrepor o estágio. */
export function ocorrenciaDoBloco(b: BlocoMontado, fuso: string): Ocorrencia {
  const inicio = paraUtc(b.data, b.inicio, fuso);
  return {
    chave: `bloco:${b.data}:${b.bloco}`,
    origem: "bloco",
    eventId: `${b.data}:${b.bloco}`,
    dataOriginal: b.data,
    titulo: b.titulo,
    areaId: "estudos",
    subjectId: null,
    local: null,
    inicio,
    fim: new Date(inicio.getTime() + b.minutos * 60_000),
    diaInteiro: false,
    movida: false,
    recorrente: false,
    feita: b.feito,
    permiteSobreposicao: b.bloco === "manha",
  };
}
