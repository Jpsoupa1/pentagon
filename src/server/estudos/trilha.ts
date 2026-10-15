import "../../../trilha_devops.js";
import type { Rotina } from "./rotina";

/** Dados da trilha DevOps, lidos do arquivo original `trilha_devops.js` (fonte única). */
export const ROTINA = (globalThis as unknown as { Rotina: Rotina }).Rotina;

export const SLUG_TRILHA = "devops";
export const NOME_TRILHA = "Trilha DevOps";

/** Configuração com todos os dias ligados: o banco guarda todas as sessões, inclusive a Reposição. */
export const TODOS_OS_DIAS = {
  ...ROTINA.PADRAO,
  dias: Object.fromEntries(
    Object.entries(ROTINA.PADRAO.dias).map(([d, slot]) => [d, { ...slot, on: true }]),
  ),
};

/** Número da semana da trilha (0 a 49) de uma data, ou null fora dela. */
export function semanaDaTrilha(data: string): number | null {
  return ROTINA.sessao(data, TODOS_OS_DIAS)?.semana ?? null;
}
