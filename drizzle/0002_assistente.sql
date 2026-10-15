CREATE TYPE "public"."assistant_action_kind" AS ENUM('alterado', 'criado', 'concluido', 'apagado');--> statement-breakpoint
CREATE TYPE "public"."assistant_action_status" AS ENUM('feita', 'proposta', 'desfeita', 'descartada');--> statement-breakpoint
CREATE TYPE "public"."assistant_entity" AS ENUM('evento', 'excecao', 'lembrete', 'sessao', 'avaliacao', 'falta');--> statement-breakpoint
CREATE TYPE "public"."assistant_reply" AS ENUM('pendente', 'acoes', 'consulta', 'fora_do_escopo', 'erro');--> statement-breakpoint
CREATE TABLE "assistant_actions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"run_id" uuid NOT NULL,
	"user_id" text NOT NULL,
	"ordem" smallint NOT NULL,
	"tipo" "assistant_action_kind" NOT NULL,
	"status" "assistant_action_status" DEFAULT 'feita' NOT NULL,
	"entidade" "assistant_entity" NOT NULL,
	"entidade_id" text NOT NULL,
	"antes" jsonb,
	"depois" jsonb,
	"descricao" jsonb NOT NULL,
	"conflitos" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"conflito_decisao" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"atualizada_em" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "assistant_runs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"texto" text NOT NULL,
	"tipo" "assistant_reply" DEFAULT 'pendente' NOT NULL,
	"resumo" text,
	"ignorou_parte" boolean DEFAULT false NOT NULL,
	"consulta" jsonb,
	"falhas" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"modelo" text NOT NULL,
	"tokens_entrada" integer DEFAULT 0 NOT NULL,
	"tokens_saida" integer DEFAULT 0 NOT NULL,
	"tokens_cache_escrita" integer DEFAULT 0 NOT NULL,
	"tokens_cache_leitura" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "study_sessions" ADD COLUMN "hora_inicio" text;--> statement-breakpoint
ALTER TABLE "assistant_actions" ADD CONSTRAINT "assistant_actions_run_id_assistant_runs_id_fk" FOREIGN KEY ("run_id") REFERENCES "public"."assistant_runs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "assistant_actions" ADD CONSTRAINT "assistant_actions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "assistant_runs" ADD CONSTRAINT "assistant_runs_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "assistant_actions_run_idx" ON "assistant_actions" USING btree ("run_id","ordem");--> statement-breakpoint
CREATE INDEX "assistant_runs_user_criado_idx" ON "assistant_runs" USING btree ("user_id","created_at");