import "server-only";
import { randomBytes } from "node:crypto";
import { and, asc, eq, isNull } from "drizzle-orm";
import { horariosComPadrao } from "@/lib/estudos";
import { urlPublica } from "../avisos/agendador";
import { gerarCalendario } from "../calendario/ics";
import { eventosDaTrilha } from "../calendario/trilha";
import { db } from "../db";
import { calendarTokens, studySessions, studyWeeks } from "../db/schema";
import { obterAjustes } from "./ajustes";
import { obterTrilha } from "./estudos";

export async function tokenAtivo(userId: string) {
  const [t] = await db()
    .select({ token: calendarTokens.token, createdAt: calendarTokens.createdAt })
    .from(calendarTokens)
    .where(and(eq(calendarTokens.userId, userId), isNull(calendarTokens.revogadoEm)));
  return t ?? null;
}

export async function revogarTokens(userId: string) {
  await db()
    .update(calendarTokens)
    .set({ revogadoEm: new Date() })
    .where(and(eq(calendarTokens.userId, userId), isNull(calendarTokens.revogadoEm)));
}

/** Gera um endereço novo (token longo e aleatório) e invalida o anterior. */
export async function gerarToken(userId: string) {
  await revogarTokens(userId);
  const token = randomBytes(32).toString("base64url");
  await db().insert(calendarTokens).values({ userId, token });
  return { token };
}

/** Monta o .ics na hora a partir do banco. Devolve null se o token não vale. */
export async function feedPorToken(token: string) {
  const [t] = await db()
    .select({ userId: calendarTokens.userId })
    .from(calendarTokens)
    .where(and(eq(calendarTokens.token, token), isNull(calendarTokens.revogadoEm)));
  if (!t) return null;
  const [ajustes, trilha] = await Promise.all([obterAjustes(t.userId), obterTrilha(t.userId)]);
  const sessoes = trilha
    ? await db()
        .select({
          data: studySessions.data,
          tipo: studySessions.tipo,
          conteudo: studySessions.conteudo,
          semana: studyWeeks.numero,
          fase: studyWeeks.fase,
          tema: studyWeeks.tema,
          parte: studyWeeks.parte,
        })
        .from(studySessions)
        .innerJoin(studyWeeks, eq(studyWeeks.id, studySessions.weekId))
        .where(eq(studySessions.trackId, trilha.id))
        .orderBy(asc(studySessions.data))
    : [];
  return gerarCalendario({
    nome: "Pentagon",
    fuso: ajustes.fuso,
    eventos: trilha
      ? eventosDaTrilha({
          sessoes,
          fases: trilha.fases,
          marcos: trilha.marcos,
          horarios: horariosComPadrao(ajustes.horariosEstudo),
          avisoMin: ajustes.avisoMin,
          urlApp: urlPublica() ?? undefined,
        })
      : [],
  });
}
