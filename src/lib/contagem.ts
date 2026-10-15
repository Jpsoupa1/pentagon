import { difDias, FUSO_PADRAO, hojeLocal } from "./tempo";

export type TomContagem = "urgente" | "proximo" | "distante" | "passou";

export type Contagem = { dias: number; texto: string; tom: TomContagem };

/**
 * Contagem regressiva em dias de calendário no fuso do usuário.
 * Tom: até 3 dias "urgente" (preto), até 7 "proximo" (fundo de Provas), depois "distante" (cinza).
 */
export function contagemRegressiva(alvo: Date, agora = new Date(), fuso = FUSO_PADRAO): Contagem {
  const dias = difDias(hojeLocal(agora, fuso), hojeLocal(alvo, fuso));
  if (dias < 0) return { dias, texto: dias === -1 ? "ontem" : `há ${-dias} dias`, tom: "passou" };
  const texto = dias === 0 ? "hoje" : dias === 1 ? "amanhã" : `${dias} dias`;
  const tom: TomContagem = dias <= 3 ? "urgente" : dias <= 7 ? "proximo" : "distante";
  return { dias, texto, tom };
}
