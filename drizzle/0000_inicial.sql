CREATE TYPE "public"."area_id" AS ENUM('aulas', 'provas', 'estudos', 'estagio', 'pessoal');--> statement-breakpoint
CREATE TYPE "public"."assessment_kind" AS ENUM('prova', 'entrega', 'trabalho', 'apresentacao');--> statement-breakpoint
CREATE TYPE "public"."exception_kind" AS ENUM('cancelada', 'movida');--> statement-breakpoint
CREATE TYPE "public"."notification_status" AS ENUM('agendada', 'enviada', 'cancelada', 'falhou');--> statement-breakpoint
CREATE TYPE "public"."notification_target" AS ENUM('evento', 'avaliacao', 'sessao', 'lembrete');--> statement-breakpoint
CREATE TYPE "public"."reminder_repeat" AS ENUM('nunca', 'diario', 'semanal', 'mensal');--> statement-breakpoint
CREATE TYPE "public"."study_session_status" AS ENUM('pendente', 'feita');--> statement-breakpoint
CREATE TABLE "absences" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"subject_id" uuid NOT NULL,
	"data" date NOT NULL,
	"quantidade" smallint DEFAULT 1 NOT NULL,
	"nota" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "accounts" (
	"user_id" text NOT NULL,
	"type" text NOT NULL,
	"provider" text NOT NULL,
	"provider_account_id" text NOT NULL,
	"refresh_token" text,
	"access_token" text,
	"expires_at" integer,
	"token_type" text,
	"scope" text,
	"id_token" text,
	"session_state" text,
	CONSTRAINT "accounts_provider_provider_account_id_pk" PRIMARY KEY("provider","provider_account_id")
);
--> statement-breakpoint
CREATE TABLE "areas" (
	"id" "area_id" PRIMARY KEY NOT NULL,
	"nome" text NOT NULL,
	"cor" text NOT NULL,
	"fundo" text NOT NULL,
	"texto" text NOT NULL,
	"ordem" smallint NOT NULL
);
--> statement-breakpoint
CREATE TABLE "assessments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"tipo" "assessment_kind" NOT NULL,
	"titulo" text NOT NULL,
	"subject_id" uuid,
	"entrega_em" timestamp with time zone NOT NULL,
	"peso" numeric(5, 2),
	"nota" numeric(5, 2),
	"anotacoes" text,
	"concluida_em" timestamp with time zone,
	"lembrar_min" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "calendar_tokens" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"token" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"revogado_em" timestamp with time zone,
	CONSTRAINT "calendar_tokens_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "checklist_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"assessment_id" uuid NOT NULL,
	"texto" text NOT NULL,
	"feito" boolean DEFAULT false NOT NULL,
	"posicao" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "event_exceptions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"event_id" uuid NOT NULL,
	"data" date NOT NULL,
	"tipo" "exception_kind" NOT NULL,
	"novo_inicio" timestamp with time zone,
	"nova_duracao_min" integer,
	"motivo" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"titulo" text NOT NULL,
	"area_id" "area_id" NOT NULL,
	"subject_id" uuid,
	"local" text,
	"notas" text,
	"inicio" timestamp with time zone NOT NULL,
	"duracao_min" integer NOT NULL,
	"dia_inteiro" boolean DEFAULT false NOT NULL,
	"fuso" text DEFAULT 'America/Sao_Paulo' NOT NULL,
	"dias_semana" smallint[],
	"repete_desde" date,
	"repete_ate" date,
	"lembrar_min" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "notifications" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"alvo_tipo" "notification_target" NOT NULL,
	"alvo_id" text NOT NULL,
	"ocorrencia" date,
	"enviar_em" timestamp with time zone NOT NULL,
	"titulo" text NOT NULL,
	"corpo" text,
	"qstash_message_id" text,
	"status" "notification_status" DEFAULT 'agendada' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "push_subscriptions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"endpoint" text NOT NULL,
	"p256dh" text NOT NULL,
	"auth" text NOT NULL,
	"aparelho" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "push_subscriptions_endpoint_unique" UNIQUE("endpoint")
);
--> statement-breakpoint
CREATE TABLE "reminders" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"texto" text NOT NULL,
	"quando" timestamp with time zone NOT NULL,
	"repetir" "reminder_repeat" DEFAULT 'nunca' NOT NULL,
	"area_id" "area_id",
	"concluido" boolean DEFAULT false NOT NULL,
	"concluido_em" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sessions" (
	"session_token" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"expires" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "settings" (
	"user_id" text PRIMARY KEY NOT NULL,
	"fuso" text DEFAULT 'America/Sao_Paulo' NOT NULL,
	"aviso_min" integer DEFAULT 10 NOT NULL,
	"periodo_inicio" date,
	"periodo_fim" date,
	"horarios_estudo" jsonb,
	"areas_no_feed" "area_id"[] DEFAULT ARRAY['aulas','provas','estudos','estagio','pessoal']::area_id[] NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "study_sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"track_id" uuid NOT NULL,
	"week_id" uuid NOT NULL,
	"data" date NOT NULL,
	"tipo" text NOT NULL,
	"conteudo" text NOT NULL,
	"status" "study_session_status" DEFAULT 'pendente' NOT NULL,
	"feita_em" timestamp with time zone,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "study_tracks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"slug" text NOT NULL,
	"nome" text NOT NULL,
	"inicio" date NOT NULL,
	"fim" date NOT NULL,
	"fases" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"marcos" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "study_weeks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"track_id" uuid NOT NULL,
	"numero" smallint NOT NULL,
	"inicio" date NOT NULL,
	"fase" smallint NOT NULL,
	"tema" text NOT NULL,
	"parte" text DEFAULT '' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "subjects" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"nome" text NOT NULL,
	"sigla" text NOT NULL,
	"professor" text,
	"sala" text,
	"limite_faltas" smallint DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text,
	"email" text,
	"email_verified" timestamp with time zone,
	"image" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
ALTER TABLE "absences" ADD CONSTRAINT "absences_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "absences" ADD CONSTRAINT "absences_subject_id_subjects_id_fk" FOREIGN KEY ("subject_id") REFERENCES "public"."subjects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "accounts" ADD CONSTRAINT "accounts_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "assessments" ADD CONSTRAINT "assessments_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "assessments" ADD CONSTRAINT "assessments_subject_id_subjects_id_fk" FOREIGN KEY ("subject_id") REFERENCES "public"."subjects"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "calendar_tokens" ADD CONSTRAINT "calendar_tokens_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "checklist_items" ADD CONSTRAINT "checklist_items_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "checklist_items" ADD CONSTRAINT "checklist_items_assessment_id_assessments_id_fk" FOREIGN KEY ("assessment_id") REFERENCES "public"."assessments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "event_exceptions" ADD CONSTRAINT "event_exceptions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "event_exceptions" ADD CONSTRAINT "event_exceptions_event_id_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "events" ADD CONSTRAINT "events_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "events" ADD CONSTRAINT "events_subject_id_subjects_id_fk" FOREIGN KEY ("subject_id") REFERENCES "public"."subjects"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "push_subscriptions" ADD CONSTRAINT "push_subscriptions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reminders" ADD CONSTRAINT "reminders_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "settings" ADD CONSTRAINT "settings_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "study_sessions" ADD CONSTRAINT "study_sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "study_sessions" ADD CONSTRAINT "study_sessions_track_id_study_tracks_id_fk" FOREIGN KEY ("track_id") REFERENCES "public"."study_tracks"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "study_sessions" ADD CONSTRAINT "study_sessions_week_id_study_weeks_id_fk" FOREIGN KEY ("week_id") REFERENCES "public"."study_weeks"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "study_tracks" ADD CONSTRAINT "study_tracks_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "study_weeks" ADD CONSTRAINT "study_weeks_track_id_study_tracks_id_fk" FOREIGN KEY ("track_id") REFERENCES "public"."study_tracks"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "subjects" ADD CONSTRAINT "subjects_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "absences_subject_data_uq" ON "absences" USING btree ("subject_id","data");--> statement-breakpoint
CREATE INDEX "assessments_user_entrega_idx" ON "assessments" USING btree ("user_id","entrega_em");--> statement-breakpoint
CREATE INDEX "checklist_assessment_idx" ON "checklist_items" USING btree ("assessment_id");--> statement-breakpoint
CREATE UNIQUE INDEX "event_exceptions_event_data_uq" ON "event_exceptions" USING btree ("event_id","data");--> statement-breakpoint
CREATE INDEX "events_user_inicio_idx" ON "events" USING btree ("user_id","inicio");--> statement-breakpoint
CREATE INDEX "notifications_status_enviar_idx" ON "notifications" USING btree ("status","enviar_em");--> statement-breakpoint
CREATE UNIQUE INDEX "notifications_alvo_uq" ON "notifications" USING btree ("alvo_tipo","alvo_id","enviar_em");--> statement-breakpoint
CREATE INDEX "reminders_user_quando_idx" ON "reminders" USING btree ("user_id","quando");--> statement-breakpoint
CREATE UNIQUE INDEX "study_sessions_track_data_uq" ON "study_sessions" USING btree ("track_id","data");--> statement-breakpoint
CREATE UNIQUE INDEX "study_tracks_user_slug_uq" ON "study_tracks" USING btree ("user_id","slug");--> statement-breakpoint
CREATE UNIQUE INDEX "study_weeks_track_numero_uq" ON "study_weeks" USING btree ("track_id","numero");--> statement-breakpoint
CREATE INDEX "subjects_user_idx" ON "subjects" USING btree ("user_id");