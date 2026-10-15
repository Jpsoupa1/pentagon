import type { AreaId } from "./dominio";

// Textos e tipos do assistente de voz usados pela tela e pelo servidor (sem dependências de servidor).

/** Recusa fixa, escrita no app: a tela nunca mostra o texto gerado pela IA. */
export const MENSAGEM_FORA_DO_ESCOPO =
  "Isso fica fora do que eu faço aqui. Posso ajudar com sua agenda, aulas, provas, estudos, estágio e lembretes.";

export const MENSAGEM_PARTE_IGNORADA =
  "Uma parte do pedido ficou de fora: ela não tem a ver com a sua rotina no Pentagon.";

export const MENSAGEM_SEM_CREDITOS = "O assistente volta quando os créditos renovarem.";

export const SUGESTOES_DE_PEDIDO = [
  "O que eu tenho hoje à tarde?",
  "Me lembra de revisar Cálculo amanhã às três",
  "Marca a sessão de estudo de hoje como feita",
] as const;

export const LIMITE_TEXTO_PEDIDO = 500;
export const LIMITE_POR_HORA = 60;

/**
 * Preços do modelo em US$ por milhão de tokens. Atualize aqui quando a Anthropic mudar a tabela.
 * Escrita no cache custa 1,25× a entrada; leitura do cache, 0,1×.
 */
export const PRECOS_POR_MILHAO = {
  "claude-sonnet-5-5": { entrada: 2, saida: 10, cacheEscrita: 2.5, cacheLeitura: 0.2 },
} as const;

/** Créditos mensais da API que vêm com o plano (não acumulam). */
export const CREDITOS_MENSAIS_USD = 100;

export type TokensUsados = {
  entrada: number;
  saida: number;
  cacheEscrita: number;
  cacheLeitura: number;
};

export function custoEmDolares(modelo: string, t: TokensUsados): number {
  const p =
    PRECOS_POR_MILHAO[modelo as keyof typeof PRECOS_POR_MILHAO] ??
    PRECOS_POR_MILHAO["claude-sonnet-5-5"];
  return (
    (t.entrada * p.entrada +
      t.saida * p.saida +
      t.cacheEscrita * p.cacheEscrita +
      t.cacheLeitura * p.cacheLeitura) /
    1_000_000
  );
}

// ---------------------------------------------------------------- O que a tela recebe

export type TipoDeAcao = "alterado" | "criado" | "concluido" | "apagado";
export type StatusDaAcao = "feita" | "proposta" | "desfeita" | "descartada";

export const ROTULO_DA_ACAO: Record<TipoDeAcao, string> = {
  alterado: "ALTERADO",
  criado: "CRIADO",
  concluido: "CONCLUÍDO",
  apagado: "APAGADO",
};

export type ConflitoVisivel = {
  titulo: string;
  horario: string;
  /** Rótulo do botão de correção (ex.: "Mover sessão para 16:00"); null quando não há sugestão. */
  correcao: string | null;
};

export type AcaoVisivel = {
  id: string;
  tipo: TipoDeAcao;
  status: StatusDaAcao;
  areaId: AreaId | null;
  titulo: string;
  campos: { rotulo: string; antes: string | null; depois: string | null }[];
  conflitos: ConflitoVisivel[];
  conflitoDecisao: string | null;
};

export type ItemDeConsulta = {
  chave: string;
  titulo: string;
  areaId: AreaId | null;
  quando: string;
  feito: boolean;
};

export type ExecucaoVisivel = {
  id: string;
  texto: string;
  tipo: "acoes" | "consulta" | "fora_do_escopo" | "erro" | "pendente";
  ignorouParte: boolean;
  acoes: AcaoVisivel[];
  consulta: { titulo: string; itens: ItemDeConsulta[] } | null;
  falhas: string[];
};
