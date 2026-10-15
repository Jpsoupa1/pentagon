import { sql } from "drizzle-orm";
import {
  boolean,
  date,
  index,
  integer,
  jsonb,
  numeric,
  pgEnum,
  pgTable,
  primaryKey,
  smallint,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import type { AdapterAccountType } from "next-auth/adapters";
import { areaIds, assessmentKinds, repeticoes, type HorariosEstudo } from "../../lib/dominio";

export type { AreaId, HorarioEstudo, HorariosEstudo } from "../../lib/dominio";

const tz = { withTimezone: true, mode: "date" } as const;
const criadoEm = () => timestamp("created_at", tz).notNull().defaultNow();
const atualizadoEm = () =>
  timestamp("updated_at", tz)
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date());
const dono = () =>
  text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" });

// ---------------------------------------------------------------- Auth.js

export const users = pgTable("users", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  name: text("name"),
  email: text("email").unique(),
  emailVerified: timestamp("email_verified", tz),
  image: text("image"),
  createdAt: criadoEm(),
});

export const accounts = pgTable(
  "accounts",
  {
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    type: text("type").$type<AdapterAccountType>().notNull(),
    provider: text("provider").notNull(),
    providerAccountId: text("provider_account_id").notNull(),
    refresh_token: text("refresh_token"),
    access_token: text("access_token"),
    expires_at: integer("expires_at"),
    token_type: text("token_type"),
    scope: text("scope"),
    id_token: text("id_token"),
    session_state: text("session_state"),
  },
  (t) => [primaryKey({ columns: [t.provider, t.providerAccountId] })],
);

export const sessions = pgTable("sessions", {
  sessionToken: text("session_token").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  expires: timestamp("expires", tz).notNull(),
});

// ---------------------------------------------------------------- Áreas (fixas, por seed)

export const areaEnum = pgEnum("area_id", areaIds);

export const areas = pgTable("areas", {
  id: areaEnum("id").primaryKey(),
  nome: text("nome").notNull(),
  cor: text("cor").notNull(),
  fundo: text("fundo").notNull(),
  texto: text("texto").notNull(),
  ordem: smallint("ordem").notNull(),
});

// ---------------------------------------------------------------- Agenda

export const subjects = pgTable(
  "subjects",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: dono(),
    nome: text("nome").notNull(),
    sigla: text("sigla").notNull(),
    professor: text("professor"),
    sala: text("sala"),
    limiteFaltas: smallint("limite_faltas").notNull().default(0),
    createdAt: criadoEm(),
    updatedAt: atualizadoEm(),
  },
  (t) => [index("subjects_user_idx").on(t.userId)],
);

/**
 * Compromisso único ou recorrente. `inicio` é o instante (UTC) da primeira ocorrência;
 * a hora local dela, no fuso `fuso`, vale para todas as repetições.
 * Recorrência semanal: `diasSemana` (0 = domingo ... 6 = sábado) entre `repeteDesde` e `repeteAte`.
 */
export const events = pgTable(
  "events",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: dono(),
    titulo: text("titulo").notNull(),
    areaId: areaEnum("area_id").notNull(),
    subjectId: uuid("subject_id").references(() => subjects.id, { onDelete: "set null" }),
    local: text("local"),
    notas: text("notas"),
    inicio: timestamp("inicio", tz).notNull(),
    duracaoMin: integer("duracao_min").notNull(),
    diaInteiro: boolean("dia_inteiro").notNull().default(false),
    fuso: text("fuso").notNull().default("America/Sao_Paulo"),
    diasSemana: smallint("dias_semana").array(),
    repeteDesde: date("repete_desde"),
    repeteAte: date("repete_ate"),
    lembrarMin: integer("lembrar_min"),
    createdAt: criadoEm(),
    updatedAt: atualizadoEm(),
  },
  (t) => [index("events_user_inicio_idx").on(t.userId, t.inicio)],
);

export const exceptionKindEnum = pgEnum("exception_kind", ["cancelada", "movida"]);

/** Uma ocorrência específica cancelada (feriado) ou movida (academia trocada num dia só). */
export const eventExceptions = pgTable(
  "event_exceptions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: dono(),
    eventId: uuid("event_id")
      .notNull()
      .references(() => events.id, { onDelete: "cascade" }),
    data: date("data").notNull(),
    tipo: exceptionKindEnum("tipo").notNull(),
    novoInicio: timestamp("novo_inicio", tz),
    novaDuracaoMin: integer("nova_duracao_min"),
    motivo: text("motivo"),
    createdAt: criadoEm(),
  },
  (t) => [uniqueIndex("event_exceptions_event_data_uq").on(t.eventId, t.data)],
);

export const absences = pgTable(
  "absences",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: dono(),
    subjectId: uuid("subject_id")
      .notNull()
      .references(() => subjects.id, { onDelete: "cascade" }),
    data: date("data").notNull(),
    quantidade: smallint("quantidade").notNull().default(1),
    nota: text("nota"),
    createdAt: criadoEm(),
  },
  (t) => [uniqueIndex("absences_subject_data_uq").on(t.subjectId, t.data)],
);

export const assessmentKindEnum = pgEnum("assessment_kind", assessmentKinds);

export const assessments = pgTable(
  "assessments",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: dono(),
    tipo: assessmentKindEnum("tipo").notNull(),
    titulo: text("titulo").notNull(),
    subjectId: uuid("subject_id").references(() => subjects.id, { onDelete: "set null" }),
    entregaEm: timestamp("entrega_em", tz).notNull(),
    peso: numeric("peso", { precision: 5, scale: 2, mode: "number" }),
    nota: numeric("nota", { precision: 5, scale: 2, mode: "number" }),
    anotacoes: text("anotacoes"),
    concluidaEm: timestamp("concluida_em", tz),
    lembrarMin: integer("lembrar_min"),
    createdAt: criadoEm(),
    updatedAt: atualizadoEm(),
  },
  (t) => [index("assessments_user_entrega_idx").on(t.userId, t.entregaEm)],
);

export const checklistItems = pgTable(
  "checklist_items",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: dono(),
    assessmentId: uuid("assessment_id")
      .notNull()
      .references(() => assessments.id, { onDelete: "cascade" }),
    texto: text("texto").notNull(),
    feito: boolean("feito").notNull().default(false),
    posicao: integer("posicao").notNull().default(0),
    createdAt: criadoEm(),
  },
  (t) => [index("checklist_assessment_idx").on(t.assessmentId)],
);

// ---------------------------------------------------------------- Estudos

export type FaseTrilha = { id: number; nome: string; curto: string; prova: string };
export type MarcoTrilha = { data: string; titulo: string; fase: number; prova?: boolean };

export const studyTracks = pgTable(
  "study_tracks",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: dono(),
    slug: text("slug").notNull(),
    nome: text("nome").notNull(),
    inicio: date("inicio").notNull(),
    fim: date("fim").notNull(),
    fases: jsonb("fases").$type<FaseTrilha[]>().notNull().default([]),
    marcos: jsonb("marcos").$type<MarcoTrilha[]>().notNull().default([]),
    createdAt: criadoEm(),
  },
  (t) => [uniqueIndex("study_tracks_user_slug_uq").on(t.userId, t.slug)],
);

export const studyWeeks = pgTable(
  "study_weeks",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    trackId: uuid("track_id")
      .notNull()
      .references(() => studyTracks.id, { onDelete: "cascade" }),
    numero: smallint("numero").notNull(),
    inicio: date("inicio").notNull(),
    fase: smallint("fase").notNull(),
    tema: text("tema").notNull(),
    parte: text("parte").notNull().default(""),
  },
  (t) => [uniqueIndex("study_weeks_track_numero_uq").on(t.trackId, t.numero)],
);

export const sessionStatusEnum = pgEnum("study_session_status", ["pendente", "feita"]);

export const studySessions = pgTable(
  "study_sessions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: dono(),
    trackId: uuid("track_id")
      .notNull()
      .references(() => studyTracks.id, { onDelete: "cascade" }),
    weekId: uuid("week_id")
      .notNull()
      .references(() => studyWeeks.id, { onDelete: "cascade" }),
    data: date("data").notNull(),
    tipo: text("tipo").notNull(),
    conteudo: text("conteudo").notNull(),
    status: sessionStatusEnum("status").notNull().default("pendente"),
    feitaEm: timestamp("feita_em", tz),
    updatedAt: atualizadoEm(),
  },
  (t) => [uniqueIndex("study_sessions_track_data_uq").on(t.trackId, t.data)],
);

// ---------------------------------------------------------------- Lembretes e avisos

export const repeatEnum = pgEnum("reminder_repeat", repeticoes);

export const reminders = pgTable(
  "reminders",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: dono(),
    texto: text("texto").notNull(),
    quando: timestamp("quando", tz).notNull(),
    repetir: repeatEnum("repetir").notNull().default("nunca"),
    areaId: areaEnum("area_id"),
    concluido: boolean("concluido").notNull().default(false),
    concluidoEm: timestamp("concluido_em", tz),
    createdAt: criadoEm(),
    updatedAt: atualizadoEm(),
  },
  (t) => [index("reminders_user_quando_idx").on(t.userId, t.quando)],
);

export const notificationTargetEnum = pgEnum("notification_target", [
  "evento",
  "avaliacao",
  "sessao",
  "lembrete",
]);
export const notificationStatusEnum = pgEnum("notification_status", [
  "agendada",
  "enviada",
  "cancelada",
  "falhou",
]);

export const notifications = pgTable(
  "notifications",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: dono(),
    alvoTipo: notificationTargetEnum("alvo_tipo").notNull(),
    alvoId: text("alvo_id").notNull(),
    ocorrencia: date("ocorrencia"),
    enviarEm: timestamp("enviar_em", tz).notNull(),
    titulo: text("titulo").notNull(),
    corpo: text("corpo"),
    qstashMessageId: text("qstash_message_id"),
    status: notificationStatusEnum("status").notNull().default("agendada"),
    createdAt: criadoEm(),
    updatedAt: atualizadoEm(),
  },
  (t) => [
    index("notifications_status_enviar_idx").on(t.status, t.enviarEm),
    uniqueIndex("notifications_alvo_uq").on(t.alvoTipo, t.alvoId, t.enviarEm),
  ],
);

export const pushSubscriptions = pgTable("push_subscriptions", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: dono(),
  endpoint: text("endpoint").notNull().unique(),
  p256dh: text("p256dh").notNull(),
  auth: text("auth").notNull(),
  aparelho: text("aparelho"),
  createdAt: criadoEm(),
});

// ---------------------------------------------------------------- Ajustes

export const settings = pgTable("settings", {
  userId: text("user_id")
    .primaryKey()
    .references(() => users.id, { onDelete: "cascade" }),
  fuso: text("fuso").notNull().default("America/Sao_Paulo"),
  avisoMin: integer("aviso_min").notNull().default(10),
  periodoInicio: date("periodo_inicio"),
  periodoFim: date("periodo_fim"),
  horariosEstudo: jsonb("horarios_estudo").$type<HorariosEstudo>(),
  areasNoFeed: areaEnum("areas_no_feed")
    .array()
    .notNull()
    .default(sql`ARRAY['aulas','provas','estudos','estagio','pessoal']::area_id[]`),
  updatedAt: atualizadoEm(),
});

export const calendarTokens = pgTable("calendar_tokens", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: dono(),
  token: text("token").notNull().unique(),
  createdAt: criadoEm(),
  revogadoEm: timestamp("revogado_em", tz),
});
