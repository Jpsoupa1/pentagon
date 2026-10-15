import type { HorariosEstudo } from "@/lib/dominio";
import { diaDaSemana, hmParaMin } from "@/lib/tempo";
import type { FaseTrilha, MarcoTrilha } from "../db/schema";
import type { EventoIcs } from "./ics";

export type SessaoFeed = {
  data: string;
  tipo: string;
  conteudo: string;
  horaInicio?: string | null;
  semana: number;
  fase: number;
  tema: string;
  parte: string;
};

const TOTAL_SEMANAS = 49;

/** Eventos da trilha (sessões nos dias ligados + marcos), com os mesmos textos e UIDs do gerador original. */
export function eventosDaTrilha(opcoes: {
  sessoes: SessaoFeed[];
  fases: FaseTrilha[];
  marcos: MarcoTrilha[];
  horarios: HorariosEstudo;
  avisoMin: number;
  urlApp?: string;
}): EventoIcs[] {
  const url = opcoes.urlApp ? `\n\nAbrir o app: ${opcoes.urlApp}` : "";
  const eventos: EventoIcs[] = [];
  for (const s of opcoes.sessoes) {
    const h = opcoes.horarios[String(diaDaSemana(s.data))];
    if (!h?.ativo) continue;
    const fase = opcoes.fases.find((f) => f.id === s.fase);
    eventos.push({
      tipo: "hora",
      uid: `sessao-${s.data}@rotina-devops`,
      data: s.data,
      inicioMin: hmParaMin(s.horaInicio ?? h.inicio),
      minutos: h.minutos,
      titulo: `${s.tipo}: ${s.conteudo}`,
      descricao:
        (s.semana ? `Semana ${s.semana} de ${TOTAL_SEMANAS} · ` : "") +
        `Fase ${s.fase}, ${fase?.nome ?? ""}\nTema: ${s.tema}${s.parte ? ` (parte ${s.parte})` : ""}${url}`,
      categoria: "Estudo DevOps",
      alarmeMin: Math.max(0, opcoes.avisoMin),
    });
  }
  for (const m of opcoes.marcos) {
    eventos.push({
      tipo: "dia",
      uid: `marco-${m.data}@rotina-devops`,
      data: m.data,
      titulo: `Marco: ${m.titulo}`,
      alarme: "PT9H",
      alarmeTexto: m.titulo,
    });
  }
  return eventos;
}
