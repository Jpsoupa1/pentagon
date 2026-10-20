import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";
import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { exemplo } from "./exemplo";
import { db } from "@/server/db";
import { flashcardAnswers, flashcards } from "@/server/db/schema";
import { EntradaInvalida, NaoEncontrado } from "@/server/erros";
import {
  acervo,
  apagarCard,
  cardsDeHoje,
  editarCard,
  importarCards,
  responderCard,
} from "@/server/servicos/cards";
import { AGORA, AMANHA, apagarUsuarioDeTeste, HOJE, usuarioDeTeste } from "./apoio";

let userId: string;

beforeEach(async () => {
  userId = await usuarioDeTeste();
});

afterAll(apagarUsuarioDeTeste);

const resposta = (
  cardId: string,
  resultado: "acertou" | "errou",
  modo: "dia" | "aleatorio" = "dia",
) => ({
  id: randomUUID(),
  cardId,
  resultado,
  modo,
  data: HOJE,
  respondidaEm: AGORA.toISOString(),
});

describe("flashcards", () => {
  it("importa o arquivo de exemplo; importar de novo ignora os ids repetidos sem mexer no salvo", async () => {
    const r = await importarCards(userId, exemplo);
    expect(r).toEqual({ importados: 5, repetidos: [], erros: [] });

    const [primeiro] = (await acervo(userId, AGORA)).cards.filter((c) => c.chave === "cka-arq-001");
    await responderCard(userId, resposta(primeiro.id, "acertou"));

    const deNovo = await importarCards(userId, {
      cards: [
        ...exemplo.cards,
        { ...exemplo.cards[0], id: "cka-novo-001" },
        { ...exemplo.cards[0], id: "cka-ruim-001", origem: "livro" },
      ],
    });
    expect(deNovo.importados).toBe(1);
    expect(deNovo.repetidos).toHaveLength(5);
    expect(deNovo.erros.map((e) => e.id)).toEqual(["cka-ruim-001"]);
    const salvo = (await acervo(userId, AGORA)).cards.find((c) => c.chave === "cka-arq-001")!;
    expect(salvo).toMatchObject({ caixa: 2, proximaEm: "2026-10-24", acertos: 1 });
  });

  it("recusa JSON sem a lista de cards", async () => {
    await expect(importarCards(userId, { itens: [] })).rejects.toBeInstanceOf(EntradaInvalida);
  });

  it("resposta reenviada pela fila offline não conta duas vezes", async () => {
    await importarCards(userId, exemplo);
    const { cards } = await acervo(userId, AGORA);
    const r = resposta(cards[0].id, "errou");
    await responderCard(userId, r);
    const repetida = await responderCard(userId, r);
    expect(repetida).toMatchObject({ caixa: 1, proximaEm: AMANHA, erros: 1 });
    const linhas = await db()
      .select()
      .from(flashcardAnswers)
      .where(eq(flashcardAnswers.userId, userId));
    expect(linhas).toHaveLength(1);
    expect(linhas[0]).toMatchObject({ caixaAntes: 1, caixaDepois: 1, modo: "dia" });
  });

  it("acerto no modo aleatório conta na estatística, mas não adianta a caixa", async () => {
    await importarCards(userId, exemplo);
    const { cards } = await acervo(userId, AGORA);
    const c = await responderCard(userId, resposta(cards[0].id, "acertou", "aleatorio"));
    expect(c).toMatchObject({ caixa: 1, proximaEm: null, acertos: 1 });
  });

  it("cards de hoje descontam o que já foi respondido e respeitam o limite", async () => {
    await importarCards(userId, exemplo);
    expect(await cardsDeHoje(userId, HOJE, 20)).toEqual({ faltam: 5, total: 5 });
    expect(await cardsDeHoje(userId, HOJE, 3)).toEqual({ faltam: 3, total: 5 });
    const { cards } = await acervo(userId, AGORA);
    await responderCard(userId, resposta(cards[0].id, "acertou"));
    await responderCard(userId, resposta(cards[1].id, "errou"));
    expect(await cardsDeHoje(userId, HOJE, 20)).toEqual({ faltam: 3, total: 5 });
    expect(await cardsDeHoje(userId, HOJE, 3)).toEqual({ faltam: 1, total: 5 });
  });

  it("revisar nunca tira o card do acervo; suspenso continua salvo; só apagar remove", async () => {
    await importarCards(userId, exemplo);
    const { cards } = await acervo(userId, AGORA);
    const alvo = cards[0];
    for (const dia of ["2026-10-21", "2026-10-22", "2026-10-25", "2026-11-01", "2026-11-22"]) {
      await responderCard(userId, { ...resposta(alvo.id, "acertou"), data: dia });
    }
    await editarCard(userId, cards[1].id, { suspenso: true, tema: "Outro tema" });
    let atual = (await acervo(userId, AGORA)).cards;
    expect(atual).toHaveLength(5);
    expect(atual.find((c) => c.id === alvo.id)).toMatchObject({ caixa: 4 });
    expect(atual.find((c) => c.id === cards[1].id)).toMatchObject({
      suspenso: true,
      tema: "Outro tema",
    });

    await apagarCard(userId, alvo.id);
    atual = (await acervo(userId, AGORA)).cards;
    expect(atual).toHaveLength(4);
    const respostas = await db()
      .select()
      .from(flashcardAnswers)
      .where(eq(flashcardAnswers.cardId, alvo.id));
    expect(respostas).toHaveLength(0);
    await expect(apagarCard(userId, alvo.id)).rejects.toBeInstanceOf(NaoEncontrado);
    // Resposta de um card apagado (chegando atrasada da fila) é recusada sem quebrar nada.
    await expect(responderCard(userId, resposta(alvo.id, "acertou"))).rejects.toBeInstanceOf(
      NaoEncontrado,
    );
    expect(await db().select().from(flashcards).where(eq(flashcards.userId, userId))).toHaveLength(
      4,
    );
  });
});
