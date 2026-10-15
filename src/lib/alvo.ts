import type { AreaId } from "./dominio";

type OcorrenciaBasica = {
  origem: string;
  eventId: string;
  dataOriginal: string;
  titulo: string;
  areaId: AreaId;
  inicio: Date;
  fim: Date;
  movida: boolean;
  recorrente: boolean;
};

/** Dados para abrir a edição de uma ocorrência; só compromissos (não sessões, marcos ou feriados). */
export function alvoDeEdicao(o: OcorrenciaBasica) {
  if (o.origem !== "evento") return undefined;
  return {
    eventId: o.eventId,
    dataOriginal: o.dataOriginal,
    titulo: o.titulo,
    areaId: o.areaId,
    inicio: o.inicio.toISOString(),
    fim: o.fim.toISOString(),
    movida: o.movida,
    recorrente: o.recorrente,
  };
}
