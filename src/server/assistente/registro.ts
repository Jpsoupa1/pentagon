import "server-only";
import { and, asc, eq, sql } from "drizzle-orm";
import type { AreaId } from "@/lib/dominio";
import { DIAS_CURTOS, dataCurta, horaLocal, partesLocais } from "@/lib/tempo";
import { db } from "../db";
import {
  absences,
  assessments,
  assistantActions,
  checklistItems,
  eventExceptions,
  events,
  reminders,
  studySessions,
  type ConflitoDaAcao,
  type DescricaoDaAcao,
  type entidadesDoAssistente,
} from "../db/schema";
import { Conflito, NaoEncontrado } from "../erros";

export type Entidade = (typeof entidadesDoAssistente)[number];
export type Foto = Record<string, unknown>;

/** Linha do banco como JSON (datas viram texto ISO), do jeito que fica em `antes`/`depois`. */
export function fotografar<T extends object>(linha: T | null | undefined): Foto | null {
  return linha ? (JSON.parse(JSON.stringify(linha)) as Foto) : null;
}

const CAMPOS_DE_DATA = new Set([
  "inicio",
  "novoInicio",
  "quando",
  "concluidoEm",
  "feitaEm",
  "entregaEm",
  "concluidaEm",
  "createdAt",
  "updatedAt",
]);

/** Volta a foto para valores que o Drizzle aceita (texto ISO de volta para Date). */
function paraLinha(foto: Foto) {
  const linha: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(foto)) {
    if (k.startsWith("_")) continue;
    linha[k] = CAMPOS_DE_DATA.has(k) && typeof v === "string" ? new Date(v) : v;
  }
  return linha;
}

const IGNORAR_NA_COMPARACAO = new Set(["updatedAt", "createdAt"]);

/** Compara duas fotos pelo conteúdo (o jsonb do Postgres não guarda a ordem das chaves). */
export function mesmasFotos(a: Foto | null, b: Foto | null): boolean {
  if (!a || !b) return a === b;
  const chaves = new Set([...Object.keys(a), ...Object.keys(b)]);
  for (const k of chaves) {
    if (IGNORAR_NA_COMPARACAO.has(k) || k.startsWith("_")) continue;
    if (JSON.stringify(a[k] ?? null) !== JSON.stringify(b[k] ?? null)) return false;
  }
  return true;
}

// ---------------------------------------------------------------- Leitura do estado atual

/** Chave da exceção: `<eventId>:<data>`. */
export const chaveExcecao = (eventId: string, data: string) => `${eventId}:${data}`;

export async function fotoAtual(
  userId: string,
  entidade: Entidade,
  id: string,
): Promise<Foto | null> {
  switch (entidade) {
    case "evento": {
      const [e] = await db()
        .select()
        .from(events)
        .where(and(eq(events.id, id), eq(events.userId, userId)));
      if (!e) return null;
      const excecoes = await db()
        .select()
        .from(eventExceptions)
        .where(eq(eventExceptions.eventId, id))
        .orderBy(asc(eventExceptions.data));
      return { ...fotografar(e), _excecoes: fotografar(excecoes) };
    }
    case "excecao": {
      const [eventId, data] = [id.slice(0, 36), id.slice(37)];
      const [x] = await db()
        .select()
        .from(eventExceptions)
        .where(
          and(
            eq(eventExceptions.userId, userId),
            eq(eventExceptions.eventId, eventId),
            eq(eventExceptions.data, data),
          ),
        );
      return fotografar(x);
    }
    case "lembrete": {
      const [r] = await db()
        .select()
        .from(reminders)
        .where(and(eq(reminders.id, id), eq(reminders.userId, userId)));
      return fotografar(r);
    }
    case "sessao": {
      const [s] = await db()
        .select()
        .from(studySessions)
        .where(and(eq(studySessions.id, id), eq(studySessions.userId, userId)));
      return fotografar(s);
    }
    case "avaliacao": {
      const [a] = await db()
        .select()
        .from(assessments)
        .where(and(eq(assessments.id, id), eq(assessments.userId, userId)));
      if (!a) return null;
      const itens = await db()
        .select()
        .from(checklistItems)
        .where(eq(checklistItems.assessmentId, id));
      return { ...fotografar(a), _checklist: fotografar(itens) };
    }
    case "falta": {
      const [f] = await db()
        .select()
        .from(absences)
        .where(and(eq(absences.id, id), eq(absences.userId, userId)));
      return fotografar(f);
    }
  }
}

// ---------------------------------------------------------------- Restaurar um estado

/**
 * Deixa o item como estava na foto: sem foto, o item deixa de existir; com foto, volta a ela
 * (recriando, se tinha sido apagado). Usado só pelo desfazer, com o estado "antes" gravado.
 */
async function restaurar(userId: string, entidade: Entidade, id: string, foto: Foto | null) {
  if (entidade === "excecao") {
    const eventId = id.slice(0, 36);
    const data = id.slice(37);
    await db()
      .delete(eventExceptions)
      .where(
        and(
          eq(eventExceptions.userId, userId),
          eq(eventExceptions.eventId, eventId),
          eq(eventExceptions.data, data),
        ),
      );
    if (foto)
      await db()
        .insert(eventExceptions)
        .values(paraLinha(foto) as never);
    return;
  }
  const tabela = {
    evento: events,
    lembrete: reminders,
    sessao: studySessions,
    avaliacao: assessments,
    falta: absences,
  }[entidade];
  const existe = await fotoAtual(userId, entidade, id);
  if (!foto) {
    if (existe)
      await db()
        .delete(tabela)
        .where(sql`${tabela.id} = ${id}`);
    return;
  }
  if (existe) {
    await db()
      .update(tabela)
      .set(paraLinha(foto) as never)
      .where(sql`${tabela.id} = ${id}`);
    return;
  }
  await db()
    .insert(tabela)
    .values(paraLinha(foto) as never);
  // O que foi apagado em cascata junto com o item volta também.
  const excecoes = (foto._excecoes as Foto[] | undefined) ?? [];
  if (excecoes.length)
    await db()
      .insert(eventExceptions)
      .values(excecoes.map((x) => paraLinha(x)) as never);
  const checklist = (foto._checklist as Foto[] | undefined) ?? [];
  if (checklist.length)
    await db()
      .insert(checklistItems)
      .values(checklist.map((x) => paraLinha(x)) as never);
}

/**
 * Desfaz uma ação já feita: confere se o item ainda está como a ação deixou e volta ao "antes".
 * Se ele mudou depois, avisa em vez de sobrescrever.
 */
export async function desfazerAcaoGravada(
  userId: string,
  acao: typeof assistantActions.$inferSelect,
) {
  const atual = await fotoAtual(userId, acao.entidade, acao.entidadeId);
  if (!mesmasFotos(atual, acao.depois ?? null)) {
    throw new Conflito(
      atual
        ? `"${acao.descricao.titulo}" mudou depois desta alteração. Não desfiz para não perder a mudança mais nova.`
        : `"${acao.descricao.titulo}" foi apagado depois desta alteração. Não há o que desfazer.`,
    );
  }
  await restaurar(userId, acao.entidade, acao.entidadeId, acao.antes ?? null);
  await db()
    .update(assistantActions)
    .set({ status: "desfeita", atualizadaEm: new Date() })
    .where(eq(assistantActions.id, acao.id));
}

// ---------------------------------------------------------------- Gravar

export async function gravarAcao(a: {
  runId: string;
  userId: string;
  tipo: "alterado" | "criado" | "concluido" | "apagado";
  status?: "feita" | "proposta";
  entidade: Entidade;
  entidadeId: string;
  antes: Foto | null;
  depois: Foto | null;
  descricao: DescricaoDaAcao;
  conflitos?: ConflitoDaAcao[];
}) {
  const [{ proxima }] = await db()
    .select({ proxima: sql<number>`coalesce(max(${assistantActions.ordem}), 0)::int + 1` })
    .from(assistantActions)
    .where(eq(assistantActions.runId, a.runId));
  const [gravada] = await db()
    .insert(assistantActions)
    .values({ ...a, ordem: proxima, status: a.status ?? "feita", conflitos: a.conflitos ?? [] })
    .returning();
  return gravada;
}

export async function obterAcao(userId: string, id: string) {
  const [a] = await db()
    .select()
    .from(assistantActions)
    .where(and(eq(assistantActions.id, id), eq(assistantActions.userId, userId)));
  if (!a) throw new NaoEncontrado("Ação");
  return a;
}

// ---------------------------------------------------------------- Textos dos cartões

/** "Qua, 15 out · 14:00–15:30" no fuso do usuário. */
export function quandoTexto(inicio: Date, fim: Date | null, fuso: string) {
  const p = partesLocais(inicio, fuso);
  const hora = fim ? `${p.hora}–${horaLocal(fim, fuso)}` : p.hora;
  return `${DIAS_CURTOS[p.diaSemana]}, ${dataCurta(p.data)} · ${hora}`;
}

export function diasTexto(dias: number[] | null) {
  if (!dias?.length) return null;
  if (dias.join() === "1,2,3,4,5") return "Seg a Sex";
  return dias.map((d) => DIAS_CURTOS[d]).join(", ");
}

export function descricao(
  areaId: AreaId | null,
  titulo: string,
  campos: DescricaoDaAcao["campos"],
): DescricaoDaAcao {
  return { areaId, titulo, campos };
}
