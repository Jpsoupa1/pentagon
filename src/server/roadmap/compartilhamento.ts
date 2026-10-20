import { dentro, indiceFaseAtual } from "../../lib/roadmap";
import seguranca from "./trilhas/seguranca.json";

// A trilha Segurança corre em paralelo à DevOps, num horário só dela (de segunda a sexta, das
// 17:30 às 18:40). As pausas são as semanas leves das retas finais das provas da DevOps: valem só
// como informação no Roadmap e em Estudos, sem mexer na agenda de nenhuma das duas trilhas.

export const SLUG_SEGURANCA_ROADMAP = seguranca.trail.slug;

const periodo = {
  inicio: seguranca.trail.starts_on,
  fim: seguranca.phases[seguranca.phases.length - 1].ends_on,
};
const pausas = seguranca.breaks.map((b) => ({ inicio: b.starts_on, fim: b.ends_on }));

export const PAUSAS_DA_SEGURANCA = pausas;
export const PERIODO_DA_SEGURANCA = periodo;

/** Onde a Segurança está num dia: a fase atual (pela regra das pausas) e a pausa, se houver. */
export function segurancaEm(hoje: string) {
  const fases = seguranca.phases.map((f) => ({ inicio: f.starts_on, fim: f.ends_on }));
  const i = indiceFaseAtual(fases, hoje, pausas);
  const f = seguranca.phases[i];
  const pausa = seguranca.breaks.find((b) => dentro(hoje, { inicio: b.starts_on, fim: b.ends_on }));
  return {
    numero: i + 1,
    total: seguranca.phases.length,
    nome: f.name,
    portao: f.gate_full_name,
    portaoData: f.gate_date,
    cor: f.color,
    pausa: pausa ? { rotulo: pausa.label, fim: pausa.ends_on } : null,
  };
}
