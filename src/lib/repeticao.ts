import type { Repeticao } from "./dominio";
import { addDias, FUSO_PADRAO, paraUtc, partesLocais } from "./tempo";

function avancar(data: string, repetir: Repeticao): string {
  if (repetir === "diario") return addDias(data, 1);
  if (repetir === "semanal") return addDias(data, 7);
  // Mensal: mesmo dia do mês seguinte (31 vira o último dia do mês quando não existe).
  const [a, m, d] = data.split("-").map(Number);
  const prox = new Date(Date.UTC(a, m, 1));
  const ultimo = new Date(Date.UTC(prox.getUTCFullYear(), prox.getUTCMonth() + 1, 0)).getUTCDate();
  const dia = Math.min(d, ultimo);
  return `${prox.getUTCFullYear()}-${String(prox.getUTCMonth() + 1).padStart(2, "0")}-${String(dia).padStart(2, "0")}`;
}

/**
 * Próxima vez de um lembrete que repete, mantendo a hora local e sempre depois de `agora`.
 * Devolve null para lembretes que não repetem.
 */
export function proximaRepeticao(
  quando: Date,
  repetir: Repeticao,
  agora = new Date(),
  fuso = FUSO_PADRAO,
): Date | null {
  if (repetir === "nunca") return null;
  const { data, hora } = partesLocais(quando, fuso);
  let d = avancar(data, repetir);
  let proximo = paraUtc(d, hora, fuso);
  for (let i = 0; proximo <= agora && i < 1000; i++) {
    d = avancar(d, repetir);
    proximo = paraUtc(d, hora, fuso);
  }
  return proximo;
}
