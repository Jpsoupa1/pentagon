import { partesLocais } from "@/lib/tempo";
import type { Ocorrencia } from "../agenda/recorrencia";
import type { EventoIcs } from "./ics";

/**
 * Compromissos criados pelo usuário (ocorrências já expandidas, com exceções aplicadas)
 * como eventos do feed. O alerta usa o "lembrar antes" do compromisso ou o padrão de Ajustes.
 */
export function eventosDeCompromissos(
  ocorrencias: Ocorrencia[],
  opcoes: { fuso: string; avisoPadrao: number; lembrarPorEvento: Map<string, number | null> },
): EventoIcs[] {
  return ocorrencias
    .filter((o) => o.origem === "evento")
    .map((o): EventoIcs => {
      const uid = `${o.eventId}-${o.dataOriginal}@pentagon`;
      const ini = partesLocais(o.inicio, opcoes.fuso);
      if (o.diaInteiro) {
        return {
          tipo: "dia",
          uid,
          data: ini.data,
          titulo: o.titulo,
          alarme: "PT9H",
          alarmeTexto: o.titulo,
        };
      }
      return {
        tipo: "hora",
        uid,
        data: ini.data,
        inicioMin: ini.minutos,
        minutos: Math.round((o.fim.getTime() - o.inicio.getTime()) / 60_000),
        titulo: o.titulo,
        descricao: o.local ?? undefined,
        alarmeMin: opcoes.lembrarPorEvento.get(o.eventId) ?? opcoes.avisoPadrao,
      };
    });
}

export type AvaliacaoFeed = {
  id: string;
  tipo: "prova" | "entrega" | "trabalho" | "apresentacao";
  titulo: string;
  sigla: string | null;
  entregaEm: Date;
  lembrarMin: number | null;
};

const NOME: Record<AvaliacaoFeed["tipo"], string> = {
  prova: "Prova",
  entrega: "Entrega",
  trabalho: "Trabalho",
  apresentacao: "Apresentação",
};

/** Provas e apresentações duram 1 h; entregas e trabalhos marcam o prazo. Alerta na véspera e horas antes. */
export function eventosDeAvaliacoes(
  avaliacoes: AvaliacaoFeed[],
  fuso: string,
  avisoPadrao: number,
): EventoIcs[] {
  return avaliacoes.map((a) => {
    const ini = partesLocais(a.entregaEm, fuso);
    const comHorario = a.tipo === "prova" || a.tipo === "apresentacao";
    return {
      tipo: "hora",
      uid: `avaliacao-${a.id}@pentagon`,
      data: ini.data,
      inicioMin: ini.minutos,
      minutos: comHorario ? 60 : 15,
      titulo: `${NOME[a.tipo]}${a.sigla ? ` ${a.sigla}` : ""}: ${a.titulo}`,
      alarmeMin: a.lembrarMin ?? avisoPadrao,
      alarmesExtras: a.lembrarMin === 24 * 60 ? [] : ["-P1D"],
    };
  });
}

/** Feriados como itens de dia inteiro. */
export function eventosDeFeriados(feriados: { data: string; nome: string }[]): EventoIcs[] {
  return feriados.map((f) => ({
    tipo: "dia",
    uid: `feriado-${f.data}@pentagon`,
    data: f.data,
    titulo: `Feriado: ${f.nome}`,
    alarme: "PT9H",
    alarmeTexto: f.nome,
  }));
}
