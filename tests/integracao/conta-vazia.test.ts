import { eq } from "drizzle-orm";
import type { drizzle } from "drizzle-orm/node-postgres";
import { afterAll, afterEach, beforeEach, describe, expect, it } from "vitest";
import { db } from "@/server/db";
import { events, studyTracks, users } from "@/server/db/schema";
import { semearRotinaParaTodos } from "../../scripts/seed-rotina";
import { semearSegurancaParaTodos } from "../../scripts/seed-seguranca";
import { semearTrilhaParaTodos } from "../../scripts/seed-trilha";

const AMIGO = "amigo-teste@pentagon.local";
const DONO = "dono-teste@pentagon.local";
const banco = () => db() as unknown as ReturnType<typeof drizzle>;

async function criar(email: string) {
  await db().delete(users).where(eq(users.email, email));
  const [u] = await db().insert(users).values({ email }).returning();
  return u.id;
}

async function semearTudo(email: string) {
  await semearTrilhaParaTodos(banco(), email);
  await semearRotinaParaTodos(banco(), email);
  await semearSegurancaParaTodos(banco(), email);
}

const contar = async (userId: string) => ({
  trilhas: (await db().select().from(studyTracks).where(eq(studyTracks.userId, userId))).length,
  compromissos: (await db().select().from(events).where(eq(events.userId, userId))).length,
});

beforeEach(() => {
  process.env.OWNER_EMAILS = DONO;
});

afterEach(() => {
  delete process.env.OWNER_EMAILS;
});

afterAll(async () => {
  for (const e of [AMIGO, DONO]) await db().delete(users).where(eq(users.email, e));
});

describe("conta vazia para quem não é o dono", () => {
  it("o deploy não cria rotina nem trilhas para outros usuários", async () => {
    const amigo = await criar(AMIGO);
    await semearTudo(AMIGO);
    expect(await contar(amigo)).toEqual({ trilhas: 0, compromissos: 0 });
  });

  it("o dono continua recebendo a rotina e as duas trilhas", async () => {
    const dono = await criar(DONO);
    await semearTudo(DONO);
    const c = await contar(dono);
    expect(c.trilhas).toBe(2);
    expect(c.compromissos).toBeGreaterThan(0);
  });
});
