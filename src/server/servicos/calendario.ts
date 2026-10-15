import "server-only";
import { randomBytes } from "node:crypto";
import { and, asc, eq, isNull } from "drizzle-orm";
import { horariosComPadrao } from "@/lib/estudos";
import { addDias, hojeLocal } from "@/lib/tempo";
import { urlPublica } from "../avisos/agendador";
import { gerarCalendario } from "../calendario/ics";
import {
  eventosDeAvaliacoes,
  eventosDeCompromissos,
  eventosDeFeriados,
} from "../calendario/agenda";
import { eventosDaTrilha } from "../calendario/trilha";
import { db } from "../db";
import { assessments, calendarTokens, studySessions, studyWeeks, subjects } from "../db/schema";
import { obterAjustes } from "./ajustes";
import { obterTrilha } from "./estudos";
import { compromissos } from "./agenda";

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
  // Compromissos de 30 dias atrás até um ano à frente, só das áreas escolhidas em Ajustes.
  const areas = new Set(ajustes.areasNoFeed);
  const hoje = hojeLocal(new Date(), ajustes.fuso);
  const intervalo = { de: addDias(hoje, -30), ate: addDias(hoje, 365) };
  const c = await compromissos(t.userId, intervalo);
  const proprios = eventosDeCompromissos(
    c.ocorrencias.filter((o) => areas.has(o.areaId)),
    {
      fuso: ajustes.fuso,
      avisoPadrao: ajustes.avisoMin,
      lembrarPorEvento: new Map(c.eventos.map((e) => [e.id, e.lembrarMin])),
    },
  );
  const avaliacoes = areas.has("provas")
    ? await db()
        .select({
          id: assessments.id,
          tipo: assessments.tipo,
          titulo: assessments.titulo,
          sigla: subjects.sigla,
          entregaEm: assessments.entregaEm,
          lembrarMin: assessments.lembrarMin,
        })
        .from(assessments)
        .leftJoin(subjects, eq(subjects.id, assessments.subjectId))
        .where(and(eq(assessments.userId, t.userId), isNull(assessments.concluidaEm)))
    : [];
  return gerarCalendario({
    nome: "Pentagon",
    fuso: ajustes.fuso,
    eventos: [
      ...proprios,
      ...eventosDeFeriados(c.feriados),
      ...eventosDeAvaliacoes(avaliacoes, ajustes.fuso, ajustes.avisoMin),
      ...(trilha && areas.has("estudos")
        ? eventosDaTrilha({
            sessoes,
            fases: trilha.fases,
            marcos: trilha.marcos,
            horarios: horariosComPadrao(ajustes.horariosEstudo),
            avisoMin: ajustes.avisoMin,
            urlApp: urlPublica() ?? undefined,
          })
        : []),
    ],
  });
}
