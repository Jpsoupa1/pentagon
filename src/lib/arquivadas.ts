// Nome legível e data dos itens arquivados (sem dependências de servidor).
import { MESES, partesLocais } from "./tempo";

export type TipoArquivado = "trilha_estudo" | "roadmap" | "cards" | "evento" | "erros";

/** Ordem da lista: o que era trilha, depois roadmaps, cards, compromissos e o caderno. */
export const ORDEM_ARQUIVADOS: readonly TipoArquivado[] = [
  "trilha_estudo",
  "roadmap",
  "cards",
  "evento",
  "erros",
];

/**
 * Nome mostrado na lista. `nome` é o do catálogo (trilha, roadmap ou compromisso); quando o item
 * não existe mais lá, a lista mostra a chave guardada em vez de esconder o arquivamento.
 */
export function nomeDoArquivado(tipo: TipoArquivado, chave: string, nome: string | null): string {
  const base = nome ?? chave;
  switch (tipo) {
    case "trilha_estudo":
      return base;
    case "roadmap":
      return `Roadmap ${base}`;
    case "cards":
      return `Cards ${chave}`;
    case "evento":
      return `Compromisso ${base}`;
    case "erros":
      return "Erros anteriores ao plano";
  }
}

/** "24 de novembro", no dia do fuso da pessoa. */
export function dataDoArquivamento(instante: Date, fuso: string): string {
  const [, m, d] = partesLocais(instante, fuso).data.split("-").map(Number);
  return `${d} de ${MESES[m - 1]}`;
}
