import "server-only";
import { eq } from "drizzle-orm";
import type { z } from "zod";
import type { ajustesSchema } from "@/lib/validacao";
import { db } from "../db";
import { settings, users } from "../db/schema";
import { recebeConteudoPessoal } from "../permissao";

export type Ajustes = typeof settings.$inferSelect;

/** Lê os ajustes do usuário, criando os padrões na primeira vez. */
export async function obterAjustes(userId: string): Promise<Ajustes> {
  const [atual] = await db().select().from(settings).where(eq(settings.userId, userId));
  if (atual) return atual;
  const [criado] = await db().insert(settings).values({ userId }).onConflictDoNothing().returning();
  return criado ?? (await db().select().from(settings).where(eq(settings.userId, userId)))[0];
}

/** Campos do plano de estudos: só o dono os grava; para os outros o PATCH os descarta. */
const CAMPOS_DO_PLANO = ["blocosPlano", "perguntaFolga", "avisoBlocosMin"] as const;

export async function atualizarAjustes(userId: string, entrada: z.output<typeof ajustesSchema>) {
  await obterAjustes(userId);
  const [u] = await db().select({ email: users.email }).from(users).where(eq(users.id, userId));
  if (!u || !recebeConteudoPessoal(u.email)) {
    entrada = { ...entrada };
    for (const campo of CAMPOS_DO_PLANO) delete entrada[campo];
  }
  if (!Object.keys(entrada).length) return obterAjustes(userId);
  const [salvo] = await db()
    .update(settings)
    .set(entrada)
    .where(eq(settings.userId, userId))
    .returning();
  return salvo;
}
