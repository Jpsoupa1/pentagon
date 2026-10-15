import "server-only";
import { and, asc, eq, gte, lt, or } from "drizzle-orm";
import type { z } from "zod";
import { proximaRepeticao } from "@/lib/repeticao";
import { addDias, paraUtc } from "@/lib/tempo";
import type { lembreteSchema } from "@/lib/validacao";
import { db } from "../db";
import { reminders } from "../db/schema";
import { NaoEncontrado } from "../erros";
import { obterAjustes } from "./ajustes";

type LembreteValido = z.output<typeof lembreteSchema>;

async function paraLinha(userId: string, l: LembreteValido) {
  const { fuso } = await obterAjustes(userId);
  return {
    texto: l.texto,
    quando: paraUtc(l.data, l.hora, fuso),
    repetir: l.repetir,
    areaId: l.areaId,
    ...(l.concluido === undefined
      ? {}
      : { concluido: l.concluido, concluidoEm: l.concluido ? new Date() : null }),
  };
}

export async function listarLembretes(userId: string) {
  return db()
    .select()
    .from(reminders)
    .where(eq(reminders.userId, userId))
    .orderBy(asc(reminders.concluido), asc(reminders.quando));
}

/** Lembretes do dia (no fuso do usuário) e os atrasados ainda abertos. */
export async function lembretesDeHoje(userId: string, hoje: string, fuso: string) {
  const inicioDoDia = paraUtc(hoje, "00:00", fuso);
  const fimDoDia = paraUtc(addDias(hoje, 1), "00:00", fuso);
  return db()
    .select()
    .from(reminders)
    .where(
      and(
        eq(reminders.userId, userId),
        lt(reminders.quando, fimDoDia),
        or(eq(reminders.concluido, false), gte(reminders.quando, inicioDoDia)),
      ),
    )
    .orderBy(asc(reminders.quando));
}

export async function criarLembrete(userId: string, entrada: LembreteValido) {
  const [criado] = await db()
    .insert(reminders)
    .values({ userId, ...(await paraLinha(userId, entrada)) })
    .returning();
  return criado;
}

export async function atualizarLembrete(userId: string, id: string, entrada: LembreteValido) {
  const [salvo] = await db()
    .update(reminders)
    .set(await paraLinha(userId, entrada))
    .where(and(eq(reminders.id, id), eq(reminders.userId, userId)))
    .returning();
  if (!salvo) throw new NaoEncontrado("Lembrete");
  return salvo;
}

/**
 * Concluir um lembrete que repete não o encerra: ele pula para a próxima vez (mesma hora local).
 * Os que não repetem ficam marcados como concluídos.
 */
export async function concluirLembrete(userId: string, id: string, concluido: boolean) {
  const [atual] = await db()
    .select()
    .from(reminders)
    .where(and(eq(reminders.id, id), eq(reminders.userId, userId)));
  if (!atual) throw new NaoEncontrado("Lembrete");
  const { fuso } = await obterAjustes(userId);
  const proximo = concluido
    ? proximaRepeticao(atual.quando, atual.repetir, new Date(), fuso)
    : null;
  const [salvo] = await db()
    .update(reminders)
    .set(
      proximo
        ? { quando: proximo, concluido: false, concluidoEm: new Date() }
        : { concluido, concluidoEm: concluido ? new Date() : null },
    )
    .where(eq(reminders.id, id))
    .returning();
  return { ...salvo, repetiu: !!proximo };
}

export async function apagarLembrete(userId: string, id: string) {
  const r = await db()
    .delete(reminders)
    .where(and(eq(reminders.id, id), eq(reminders.userId, userId)))
    .returning({ id: reminders.id });
  if (!r.length) throw new NaoEncontrado("Lembrete");
}
