import "server-only";
import { and, asc, eq, gte } from "drizzle-orm";
import type { z } from "zod";
import {
  responder,
  sessaoDoDia,
  validarImportacao,
  type CardCliente,
  type ErroImportacao,
  type RespostaCliente,
} from "@/lib/cards";
import { hojeLocal, segundaDe } from "@/lib/tempo";
import type { cardEdicaoSchema, respostaCardSchema } from "@/lib/validacao";
import { db, naTransacao } from "../db";
import { flashcardAnswers, flashcards } from "../db/schema";
import { EntradaInvalida, NaoEncontrado } from "../erros";
import { obterAjustes } from "./ajustes";

const colunasCard = {
  id: flashcards.id,
  chave: flashcards.chave,
  trilha: flashcards.trilha,
  tema: flashcards.tema,
  frente: flashcards.frente,
  verso: flashcards.verso,
  codigo: flashcards.codigo,
  origem: flashcards.origem,
  criadoEm: flashcards.criadoEm,
  caixa: flashcards.caixa,
  proximaEm: flashcards.proximaEm,
  suspenso: flashcards.suspenso,
  acertos: flashcards.acertos,
  erros: flashcards.erros,
};

const colunasResposta = {
  id: flashcardAnswers.id,
  cardId: flashcardAnswers.cardId,
  data: flashcardAnswers.data,
  resultado: flashcardAnswers.resultado,
  modo: flashcardAnswers.modo,
};

function listarCards(userId: string): Promise<CardCliente[]> {
  return db()
    .select(colunasCard)
    .from(flashcards)
    .where(eq(flashcards.userId, userId))
    .orderBy(asc(flashcards.trilha), asc(flashcards.tema), asc(flashcards.chave));
}

/** Respostas desde segunda: bastam para o limite de hoje e para "errados na semana". */
function respostasDesde(userId: string, data: string): Promise<RespostaCliente[]> {
  return db()
    .select(colunasResposta)
    .from(flashcardAnswers)
    .where(and(eq(flashcardAnswers.userId, userId), gte(flashcardAnswers.data, data)));
}

/** Acervo inteiro para o aparelho guardar e usar sem internet. */
export async function acervo(userId: string, agora = new Date()) {
  const { fuso, limiteCards } = await obterAjustes(userId);
  const hoje = hojeLocal(agora, fuso);
  const [cards, respostas] = await Promise.all([
    listarCards(userId),
    respostasDesde(userId, segundaDe(hoje)),
  ]);
  return { hoje, fuso, limite: limiteCards, cards, respostas };
}

/** Quantos cards faltam na sessão de hoje (bloco da tela Hoje). */
export async function cardsDeHoje(userId: string, hoje: string, limite: number) {
  const [cards, respostas] = await Promise.all([listarCards(userId), respostasDesde(userId, hoje)]);
  return { faltam: sessaoDoDia(cards, respostas, limite, hoje).length, total: cards.length };
}

/**
 * Importa o JSON colado. Ids que já estão no acervo são ignorados (o card salvo não muda);
 * cards inválidos voltam com o motivo e não impedem os válidos de entrar.
 */
export async function importarCards(
  userId: string,
  entrada: unknown,
): Promise<{ importados: number; repetidos: string[]; erros: ErroImportacao[] }> {
  const existentes = await db()
    .select({ chave: flashcards.chave })
    .from(flashcards)
    .where(eq(flashcards.userId, userId));
  const r = validarImportacao(
    entrada,
    existentes.map((e) => e.chave),
  );
  if (!r.ok) throw new EntradaInvalida(r.erro);
  let importados = 0;
  const repetidos = [...r.repetidos];
  // Em lotes, para não estourar o limite de parâmetros do Postgres.
  for (let i = 0; i < r.validos.length; i += 500) {
    const lote = r.validos.slice(i, i + 500);
    const inseridos = await db()
      .insert(flashcards)
      .values(
        lote.map((c) => ({
          userId,
          chave: c.id,
          trilha: c.trilha,
          tema: c.tema,
          frente: c.frente,
          verso: c.verso,
          codigo: c.codigo,
          origem: c.origem,
          criadoEm: c.criado_em,
        })),
      )
      .onConflictDoNothing({ target: [flashcards.userId, flashcards.chave] })
      .returning({ chave: flashcards.chave });
    importados += inseridos.length;
    const entraram = new Set(inseridos.map((x) => x.chave));
    repetidos.push(...lote.filter((c) => !entraram.has(c.id)).map((c) => c.id));
  }
  return { importados, repetidos, erros: r.erros };
}

/**
 * Registra uma resposta e reagenda o card com a mesma regra do aparelho. Respostas
 * repetidas (a fila offline reenviou) não contam duas vezes.
 */
export async function responderCard(userId: string, r: z.output<typeof respostaCardSchema>) {
  return naTransacao(async () => {
    const [card] = await db()
      .select(colunasCard)
      .from(flashcards)
      .where(and(eq(flashcards.id, r.cardId), eq(flashcards.userId, userId)))
      .for("update");
    if (!card) throw new NaoEncontrado("Card");
    const [registrada] = await db()
      .select({ id: flashcardAnswers.id })
      .from(flashcardAnswers)
      .where(eq(flashcardAnswers.id, r.id));
    if (registrada) return card;
    const novo = responder(card, r.resultado, r.modo, r.data);
    await db()
      .insert(flashcardAnswers)
      .values({
        id: r.id,
        userId,
        cardId: card.id,
        data: r.data,
        respondidaEm: new Date(r.respondidaEm),
        resultado: r.resultado,
        modo: r.modo,
        caixaAntes: card.caixa,
        caixaDepois: novo.caixa,
      });
    const [salvo] = await db()
      .update(flashcards)
      .set({
        caixa: novo.caixa,
        proximaEm: novo.proximaEm,
        acertos: novo.acertos,
        erros: novo.erros,
      })
      .where(eq(flashcards.id, card.id))
      .returning(colunasCard);
    return salvo;
  });
}

export async function editarCard(
  userId: string,
  id: string,
  mudancas: z.output<typeof cardEdicaoSchema>,
) {
  const [salvo] = await db()
    .update(flashcards)
    .set(mudancas)
    .where(and(eq(flashcards.id, id), eq(flashcards.userId, userId)))
    .returning(colunasCard);
  if (!salvo) throw new NaoEncontrado("Card");
  return salvo;
}

/** Única forma de um card sair do acervo. As respostas dele saem junto. */
export async function apagarCard(userId: string, id: string) {
  const apagados = await db()
    .delete(flashcards)
    .where(and(eq(flashcards.id, id), eq(flashcards.userId, userId)))
    .returning({ id: flashcards.id });
  if (!apagados.length) throw new NaoEncontrado("Card");
}
