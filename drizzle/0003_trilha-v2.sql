CREATE TYPE "public"."study_error_origin" AS ENUM('revisao_semanal', 'pratica');--> statement-breakpoint
CREATE TYPE "public"."study_session_kind" AS ENUM('conteudo', 'pratica', 'revisao_semanal', 'projeto', 'revisao_espacada');--> statement-breakpoint
CREATE TYPE "public"."study_session_shift" AS ENUM('manha', 'tarde', 'noite');--> statement-breakpoint
CREATE TABLE "study_errors" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"data" date NOT NULL,
	"tema" text NOT NULL,
	"errei" text NOT NULL,
	"correto" text NOT NULL,
	"revisar_em" date NOT NULL,
	"origem" "study_error_origin",
	"session_id" uuid,
	"reincidencias" smallint DEFAULT 0 NOT NULL,
	"resolvido_em" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "study_reviews" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"week_id" uuid NOT NULL,
	"etapas" jsonb DEFAULT '[false,false,false,false]'::jsonb NOT NULL,
	"nota" smallint,
	"pontos_fracos" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
DROP INDEX "study_sessions_track_data_uq";--> statement-breakpoint
ALTER TABLE "study_sessions" ADD COLUMN "turno" "study_session_shift" DEFAULT 'manha' NOT NULL;--> statement-breakpoint
ALTER TABLE "study_sessions" ADD COLUMN "categoria" "study_session_kind" DEFAULT 'conteudo' NOT NULL;--> statement-breakpoint
ALTER TABLE "study_sessions" ADD COLUMN "permite_sobreposicao" boolean DEFAULT false NOT NULL;--> statement-breakpoint
-- Versão 1 para 2: cada sessão que já existe ganha o turno e a categoria da versão 2, com o status
-- preservado. Na semana zero, segunda a quinta continuam à tarde; a Reposição de sexta da semana zero
-- fica sem turno próprio (tarde) e o seed a remove.
UPDATE "study_sessions" AS s SET
	"turno" = (CASE
		WHEN extract(dow from s."data") = 0 THEN 'noite'
		WHEN extract(dow from s."data") BETWEEN 1 AND 5 AND w."numero" = 0 THEN 'tarde'
		ELSE 'manha' END)::"study_session_shift",
	"categoria" = (CASE extract(dow from s."data")::int
		WHEN 0 THEN 'revisao_espacada'
		WHEN 5 THEN 'revisao_semanal'
		WHEN 6 THEN 'projeto'
		ELSE 'conteudo' END)::"study_session_kind",
	"permite_sobreposicao" = (extract(dow from s."data") BETWEEN 1 AND 5 AND w."numero" <> 0)
FROM "study_weeks" AS w
WHERE w."id" = s."week_id";--> statement-breakpoint
ALTER TABLE "study_errors" ADD CONSTRAINT "study_errors_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "study_errors" ADD CONSTRAINT "study_errors_session_id_study_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."study_sessions"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "study_reviews" ADD CONSTRAINT "study_reviews_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "study_reviews" ADD CONSTRAINT "study_reviews_week_id_study_weeks_id_fk" FOREIGN KEY ("week_id") REFERENCES "public"."study_weeks"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "study_errors_user_revisar_idx" ON "study_errors" USING btree ("user_id","revisar_em");--> statement-breakpoint
CREATE UNIQUE INDEX "study_reviews_user_week_uq" ON "study_reviews" USING btree ("user_id","week_id");--> statement-breakpoint
CREATE UNIQUE INDEX "study_sessions_track_data_turno_uq" ON "study_sessions" USING btree ("track_id","data","turno");