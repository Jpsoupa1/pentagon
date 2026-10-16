export class NaoEncontrado extends Error {
  constructor(o = "Item") {
    super(`${o} não encontrado.`);
  }
}

export class Conflito extends Error {
  constructor(
    mensagem: string,
    readonly detalhes?: unknown,
  ) {
    super(mensagem);
  }
}

/** Pedidos demais ao assistente na última hora. */
export class LimiteExcedido extends Error {}

/** A API do Claude respondeu que os créditos do mês acabaram. */
export class SemCreditos extends Error {}
