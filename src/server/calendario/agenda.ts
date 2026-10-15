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
