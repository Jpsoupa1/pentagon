import { MESES, partesLocais } from "@/lib/tempo";
import type { estadoDoPlano } from "@/server/servicos/plano";

type EstadoDaApi = NonNullable<Awaited<ReturnType<typeof estadoDoPlano>>["plano"]>;

/** Estado depois da primeira abertura: trilhas, horas, recrutamento e o dia. */
export type PlanoIniciado = Extract<EstadoDaApi, { iniciado: true }>;
/** Estado antes da primeira abertura: o catálogo para marcar o que já foi feito. */
export type PlanoNaoIniciado = Extract<EstadoDaApi, { iniciado: false }>;
export type TrilhaDoPlano = PlanoIniciado["trilhas"][number];
export type ItemAtual = NonNullable<TrilhaDoPlano["atual"]>;
export type GrupoDeChecks = keyof ItemAtual["checks"];

/** O que toda escrita devolve: o estado inteiro, mais o que a operação acrescenta. */
export type RespostaDoPlano = { plano: EstadoDaApi | null };

/** Texto da liberação e a mensagem da tentativa chegam só nas respostas que os trazem. */
export type RespostaDeConclusao = RespostaDoPlano & { concluido: string; liberacao: string[] };
export type RespostaDeTentativa = RespostaDoPlano & { tentativa: { mensagem: string } };

/** Resultado de uma escrita já tratado: a fila offline vira recusa, porque a tela não adivinha. */
export type Retorno<T> = { ok: true; dados: T } | { ok: false; erro: string };

export const rotuloDe = (i: { codigo: string; titulo: string }) => `${i.codigo}. ${i.titulo}`;

/** "2026-12-03T15:00:00Z" no fuso do usuário: "3 de dezembro". */
export function diaDeConclusao(iso: string, fuso: string) {
  const [, mes, dia] = partesLocais(new Date(iso), fuso).data.split("-").map(Number);
  return `${dia} de ${MESES[mes - 1]}`;
}

/** Relê o estado depois de uma recusa (a nota recusada fica gravada como tentativa). */
export async function lerEstado(): Promise<PlanoIniciado | null> {
  try {
    const r = await fetch("/api/plano");
    if (!r.ok) return null;
    const { plano } = (await r.json()) as RespostaDoPlano;
    return plano?.iniciado ? plano : null;
  } catch {
    return null;
  }
}
