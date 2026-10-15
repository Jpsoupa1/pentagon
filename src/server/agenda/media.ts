/** Média parcial ponderada pelas avaliações já com nota (peso ausente conta 1). */
export function mediaParcial(
  avaliacoes: { nota: number | null; peso: number | null }[],
): number | null {
  const comNota = avaliacoes.filter((a) => a.nota !== null);
  const pesoTotal = comNota.reduce((s, a) => s + (a.peso ?? 1), 0);
  if (!comNota.length || pesoTotal === 0) return null;
  const soma = comNota.reduce((s, a) => s + a.nota! * (a.peso ?? 1), 0);
  return Math.round((soma / pesoTotal) * 100) / 100;
}
