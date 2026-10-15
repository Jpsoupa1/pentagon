import "server-only";
import { and, asc, eq, sql } from "drizzle-orm";
import type { z } from "zod";
import { feriadosNacionais } from "@/lib/feriados";
import type { feriadoSchema } from "@/lib/validacao";
import type { Feriado } from "../agenda/regras";
import { db } from "../db";
import { holidays } from "../db/schema";
import { NaoEncontrado } from "../erros";

export async function listarFeriados(userId: string): Promise<Feriado[]> {
  return db()
    .select({
      id: holidays.id,
      data: holidays.data,
      nome: holidays.nome,
      areasCanceladas: holidays.areasCanceladas,
    })
    .from(holidays)
    .where(eq(holidays.userId, userId))
    .orderBy(asc(holidays.data));
}

export async function feriadosEntre(userId: string, de: string, ate: string): Promise<Feriado[]> {
  return db()
    .select({
      id: holidays.id,
      data: holidays.data,
      nome: holidays.nome,
      areasCanceladas: holidays.areasCanceladas,
    })
    .from(holidays)
    .where(and(eq(holidays.userId, userId), sql`${holidays.data} between ${de} and ${ate}`));
}

export async function salvarFeriado(userId: string, f: z.output<typeof feriadoSchema>) {
  const [salvo] = await db()
    .insert(holidays)
    .values({ userId, ...f })
    .onConflictDoUpdate({
      target: [holidays.userId, holidays.data],
      set: { nome: f.nome, areasCanceladas: f.areasCanceladas },
    })
    .returning();
  return salvo;
}

/** Cadastra os feriados nacionais do ano que ainda não existem (não mexe nos já cadastrados). */
export async function adicionarFeriadosNacionais(userId: string, ano: number) {
  const novos = await db()
    .insert(holidays)
    .values(feriadosNacionais(ano).map((f) => ({ userId, ...f })))
    .onConflictDoNothing()
    .returning({ id: holidays.id });
  return { adicionados: novos.length };
}

export async function apagarFeriado(userId: string, id: string) {
  const r = await db()
    .delete(holidays)
    .where(and(eq(holidays.id, id), eq(holidays.userId, userId)))
    .returning({ id: holidays.id });
  if (!r.length) throw new NaoEncontrado("Feriado");
}
