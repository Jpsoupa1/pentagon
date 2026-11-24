export class NaoEncontrado extends Error {
  constructor(o = "Item") {
    super(`${o} não encontrado.`);
  }
}

/** O pedido é válido, mas o estado atual não permite (409). `motivo` é o código que a tela lê. */
export class Conflito extends Error {
  constructor(
    mensagem: string,
    readonly detalhes?: unknown,
    readonly motivo?: string,
  ) {
    super(mensagem);
  }
}

/** A conta não tem acesso a este recurso (403). */
export class Proibido extends Error {}

/** Pedidos demais ao assistente na última hora. */
export class LimiteExcedido extends Error {}

/** A API do Claude respondeu que os créditos do mês acabaram. */
export class SemCreditos extends Error {}

/** Pedido que não dá para atender como veio (ex.: JSON de importação sem a lista de cards). */
export class EntradaInvalida extends Error {
  constructor(
    mensagem: string,
    /** Dados para a tela mostrar (ex.: os requisitos que faltam marcar). */
    readonly detalhes?: unknown,
  ) {
    super(mensagem);
  }
}
