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
