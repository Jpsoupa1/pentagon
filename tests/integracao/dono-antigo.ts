import { randomUUID } from "node:crypto";
import { and, eq } from "drizzle-orm";
import type { drizzle } from "drizzle-orm/node-postgres";
import { db } from "@/server/db";
import {
  events,
  studyErrors,
  studyReviews,
  studyTracks,
  studyWeeks,
  users,
} from "@/server/db/schema";
import { semearTrilha } from "@/server/estudos/seed";
import { semearSeguranca } from "@/server/estudos/seguranca";
import { semearRoadmap } from "@/server/roadmap/seed";
import { semearRotina } from "@/server/rotina/seed";
import { reconciliarAvisos, salvarInscricao } from "@/server/servicos/avisos";
import { acervo, importarCards, responderCard } from "@/server/servicos/cards";
import { exemplo } from "./exemplo";

// Um dono no formato de dados que o app tinha antes do plano AI. Serve aos testes de arquivamento
// e ao ensaio da migração (scripts/ensaio-migracao-plano.ts).

/** Como o e2e: a rotina e a Segurança começam na semana de 19/10/2026. */
export const SEMEADO_EM = new Date("2026-10-19T12:00:00-03:00");
/** Quarta 21/10/2026, 10:00 em São Paulo. */
export const AGORA = new Date("2026-10-21T13:00:00Z");
export const HOJE = "2026-10-21";
export const TERCA = "2026-10-27";
export const SEM_AGENDADOR = { ativo: false, agendar: async () => null, cancelar: async () => {} };
export const FUSO = "America/Sao_Paulo";

export const banco = () => db() as unknown as ReturnType<typeof drizzle>;
export const reconciliar = (id: string, agora = AGORA) =>
  reconciliarAvisos(id, agora, SEM_AGENDADOR);

export async function criarUsuario(email: string) {
  await db().delete(users).where(eq(users.email, email));
  const [u] = await db().insert(users).values({ email }).returning();
  return u.id;
}

/**
 * Dono no formato real de antes do plano: DevOps, Segurança, roadmaps com progresso, Academia de
 * 90 min, cards CKA e SEG (um respondido), erros antigos, revisão de sexta e avisos agendados.
 */
/** `agora` é o momento em que os avisos já estavam agendados (padrão: quarta 21/10/2026). */
export async function criarDono(email: string, agora = AGORA) {
  const id = await criarUsuario(email);
  await semearTrilha(db(), id);
  await semearRotina(db(), id, SEMEADO_EM);
  await semearSeguranca(db(), id, SEMEADO_EM);
  await semearRoadmap(db(), [id]);
  await db()
    .update(events)
    .set({ duracaoMin: 90 })
    .where(and(eq(events.userId, id), eq(events.titulo, "Academia")));

  await importarCards(id, {
    cards: [...exemplo.cards, { ...exemplo.cards[0], id: "seg-teste-001", trilha: "SEG" }],
  });
  const [card] = (await acervo(id, AGORA)).cards;
  await responderCard(id, {
    id: randomUUID(),
    cardId: card.id,
    resultado: "acertou",
    modo: "dia",
    data: HOJE,
    respondidaEm: AGORA.toISOString(),
  });

  const [trilha] = await db()
    .select({ id: studyTracks.id })
    .from(studyTracks)
    .where(and(eq(studyTracks.userId, id), eq(studyTracks.slug, "devops")));
  const [semana] = await db()
    .select({ id: studyWeeks.id })
    .from(studyWeeks)
    .where(eq(studyWeeks.trackId, trilha.id))
    .limit(1);
  await db().insert(studyReviews).values({ userId: id, weekId: semana.id, nota: 7 });
  await db()
    .insert(studyErrors)
    .values({
      userId: id,
      data: "2026-09-01",
      tema: "etcd",
      errei: "achei que o scheduler gravava no etcd",
      correto: "só o kube-apiserver grava",
      revisarEm: "2026-10-25",
      createdAt: new Date("2026-09-01T12:00:00Z"),
    });

  await salvarInscricao(id, {
    endpoint: `https://push.exemplo/${id}`,
    p256dh: "p",
    auth: "a",
    aparelho: "teste",
  });
  await reconciliar(id, agora);
  return id;
}
