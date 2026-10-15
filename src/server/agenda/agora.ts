import type { Ocorrencia } from "./recorrencia";

export type Agora = {
  atual: (Ocorrencia & { progresso: number; restanteMin: number }) | null;
  proximo: Ocorrencia | null;
};

/** O compromisso em andamento (com progresso de 0 a 1) e o próximo a começar. */
export function agoraEProximo(ocorrencias: Ocorrencia[], agora: Date): Agora {
  const t = agora.getTime();
  const comHora = ocorrencias.filter((o) => !o.diaInteiro);
  const emAndamento = comHora.filter((o) => o.inicio.getTime() <= t && t < o.fim.getTime());
  // Se houver sobreposição, vale o que começou por último.
  const atual = emAndamento.sort((a, b) => b.inicio.getTime() - a.inicio.getTime())[0] ?? null;
  const proximo =
    comHora
      .filter((o) => o.inicio.getTime() > t)
      .sort((a, b) => a.inicio.getTime() - b.inicio.getTime())[0] ?? null;
  if (!atual) return { atual: null, proximo };
  const total = atual.fim.getTime() - atual.inicio.getTime();
  return {
    atual: {
      ...atual,
      progresso: total > 0 ? (t - atual.inicio.getTime()) / total : 1,
      restanteMin: Math.ceil((atual.fim.getTime() - t) / 60_000),
    },
    proximo,
  };
}
