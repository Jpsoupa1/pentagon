import { dentro, indiceFaseAtual } from "../../lib/roadmap";
import { diaDaSemana } from "../../lib/tempo";
import seguranca from "./trilhas/seguranca.json";

// A trilha Segurança divide a semana com a DevOps: as tardes de terça e quinta são dela nas
// semanas compartilhadas e voltam para a DevOps nas pausas (as retas finais das provas).
// O sábado à tarde é sempre da Segurança, inclusive nas pausas.

export const SLUG_SEGURANCA_ROADMAP = seguranca.trail.slug;

/** Terça e quinta (0 = domingo). */
export const DIAS_DA_SEGURANCA = [2, 4] as const;

const periodo = {
  inicio: seguranca.trail.starts_on,
  fim: seguranca.phases[seguranca.phases.length - 1].ends_on,
};
const pausas = seguranca.breaks.map((b) => ({ inicio: b.starts_on, fim: b.ends_on }));

export const PAUSAS_DA_SEGURANCA = pausas;
export const PERIODO_DA_SEGURANCA = periodo;

/** A Segurança está ativa no dia (dentro da trilha e fora das pausas). */
export function segurancaAtiva(data: string): boolean {
  return dentro(data, periodo) && !pausas.some((p) => dentro(data, p));
}

/** O turno da DevOps naquele dia foi cedido para a Segurança. */
export function turnoCedidoASeguranca(data: string, turno: string): boolean {
  return (
    turno === "tarde" &&
    (DIAS_DA_SEGURANCA as readonly number[]).includes(diaDaSemana(data)) &&
    segurancaAtiva(data)
  );
}

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
