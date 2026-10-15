import "server-only";
import { eq } from "drizzle-orm";
import type { z } from "zod";
import type { ajustesSchema } from "@/lib/validacao";
import { db } from "../db";
import { settings } from "../db/schema";

export type Ajustes = typeof settings.$inferSelect;

/** Lê os ajustes do usuário, criando os padrões na primeira vez. */
export async function obterAjustes(userId: string): Promise<Ajustes> {
  const [atual] = await db().select().from(settings).where(eq(settings.userId, userId));
  if (atual) return atual;
  const [criado] = await db().insert(settings).values({ userId }).onConflictDoNothing().returning();
  return criado ?? (await db().select().from(settings).where(eq(settings.userId, userId)))[0];
}

export async function atualizarAjustes(userId: string, entrada: z.output<typeof ajustesSchema>) {
  await obterAjustes(userId);
  const [salvo] = await db()
    .update(settings)
    .set(entrada)
    .where(eq(settings.userId, userId))
    .returning();
  return salvo;
}
