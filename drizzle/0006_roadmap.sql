CREATE TYPE "public"."roadmap_assessment_kind" AS ENUM('simulado', 'prova', 'entrega');--> statement-breakpoint
CREATE TYPE "public"."roadmap_gate_kind" AS ENUM('exam', 'project');--> statement-breakpoint
CREATE TYPE "public"."roadmap_pricing" AS ENUM('free', 'paid');--> statement-breakpoint
CREATE TABLE "roadmap_assessments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"phase_id" uuid NOT NULL,
	"posicao" smallint NOT NULL,
	"data" date,
	"tipo" "roadmap_assessment_kind" NOT NULL,
	"titulo" text NOT NULL,
	"formato" text NOT NULL,
	"preco_texto" text NOT NULL,
	"nota" text NOT NULL,
	"opcional" boolean DEFAULT false NOT NULL
);
--> statement-breakpoint
CREATE TABLE "roadmap_domains" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"phase_id" uuid NOT NULL,
	"posicao" smallint NOT NULL,
	"rotulo" text NOT NULL,
	"peso" smallint
);
--> statement-breakpoint
CREATE TABLE "roadmap_phases" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"trail_id" uuid NOT NULL,
	"posicao" smallint NOT NULL,
	"slug" text NOT NULL,
	"nome" text NOT NULL,
	"curto" text NOT NULL,
	"semanas" text NOT NULL,
	"inicio" date NOT NULL,
	"fim" date NOT NULL,
	"cor" text NOT NULL,
	"cor_texto" text NOT NULL,
	"cor_suave" text NOT NULL,
	"portao" text NOT NULL,
	"portao_nome" text NOT NULL,
	"portao_data" date NOT NULL,
	"portao_formato" text NOT NULL,
	"portao_tipo" "roadmap_gate_kind" NOT NULL,
	"custo" text,
	"dica" text,
	"dominios_titulo" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "roadmap_practice" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"phase_id" uuid NOT NULL,
	"posicao" smallint NOT NULL,
	"titulo" text NOT NULL,
	"cadencia" text NOT NULL,
	"meta" smallint NOT NULL,
	"fonte" text
);
--> statement-breakpoint
CREATE TABLE "roadmap_practice_progress" (
	"user_id" text NOT NULL,
	"practice_id" uuid NOT NULL,
	"contagem" integer DEFAULT 0 NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "roadmap_practice_progress_user_id_practice_id_pk" PRIMARY KEY("user_id","practice_id")
);
--> statement-breakpoint
CREATE TABLE "roadmap_requirement_progress" (
	"user_id" text NOT NULL,
	"requirement_id" uuid NOT NULL,
	"feito" boolean DEFAULT false NOT NULL,
	"feito_em" timestamp with time zone,
	CONSTRAINT "roadmap_requirement_progress_user_id_requirement_id_pk" PRIMARY KEY("user_id","requirement_id")
);
--> statement-breakpoint
CREATE TABLE "roadmap_requirements" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"phase_id" uuid NOT NULL,
	"posicao" smallint NOT NULL,
	"rotulo" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "roadmap_resources" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"phase_id" uuid NOT NULL,
	"posicao" smallint NOT NULL,
	"titulo" text NOT NULL,
	"fornecedor" text NOT NULL,
	"preco" "roadmap_pricing" NOT NULL,
	"preco_texto" text NOT NULL,
	"idioma" text NOT NULL,
	"nota" text NOT NULL,
	"url" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "roadmap_trails" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" text NOT NULL,
	"nome" text NOT NULL,
	"titulo" text NOT NULL,
	"sobre" text NOT NULL,
	"inicio" date NOT NULL,
	"meta" text NOT NULL,
	"meta_nota" text,
	"semana_zero_rotulo" text,
	"semana_zero_inicio" date,
	"semana_zero_fim" date,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "roadmap_trails_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
ALTER TABLE "roadmap_assessments" ADD CONSTRAINT "roadmap_assessments_phase_id_roadmap_phases_id_fk" FOREIGN KEY ("phase_id") REFERENCES "public"."roadmap_phases"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "roadmap_domains" ADD CONSTRAINT "roadmap_domains_phase_id_roadmap_phases_id_fk" FOREIGN KEY ("phase_id") REFERENCES "public"."roadmap_phases"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "roadmap_phases" ADD CONSTRAINT "roadmap_phases_trail_id_roadmap_trails_id_fk" FOREIGN KEY ("trail_id") REFERENCES "public"."roadmap_trails"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "roadmap_practice" ADD CONSTRAINT "roadmap_practice_phase_id_roadmap_phases_id_fk" FOREIGN KEY ("phase_id") REFERENCES "public"."roadmap_phases"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "roadmap_practice_progress" ADD CONSTRAINT "roadmap_practice_progress_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "roadmap_practice_progress" ADD CONSTRAINT "roadmap_practice_progress_practice_id_roadmap_practice_id_fk" FOREIGN KEY ("practice_id") REFERENCES "public"."roadmap_practice"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "roadmap_requirement_progress" ADD CONSTRAINT "roadmap_requirement_progress_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "roadmap_requirement_progress" ADD CONSTRAINT "roadmap_requirement_progress_requirement_id_roadmap_requirements_id_fk" FOREIGN KEY ("requirement_id") REFERENCES "public"."roadmap_requirements"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "roadmap_requirements" ADD CONSTRAINT "roadmap_requirements_phase_id_roadmap_phases_id_fk" FOREIGN KEY ("phase_id") REFERENCES "public"."roadmap_phases"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "roadmap_resources" ADD CONSTRAINT "roadmap_resources_phase_id_roadmap_phases_id_fk" FOREIGN KEY ("phase_id") REFERENCES "public"."roadmap_phases"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "roadmap_assessments_phase_posicao_uq" ON "roadmap_assessments" USING btree ("phase_id","posicao");--> statement-breakpoint
CREATE UNIQUE INDEX "roadmap_domains_phase_posicao_uq" ON "roadmap_domains" USING btree ("phase_id","posicao");--> statement-breakpoint
CREATE UNIQUE INDEX "roadmap_phases_trail_posicao_uq" ON "roadmap_phases" USING btree ("trail_id","posicao");--> statement-breakpoint
CREATE UNIQUE INDEX "roadmap_practice_phase_posicao_uq" ON "roadmap_practice" USING btree ("phase_id","posicao");--> statement-breakpoint
CREATE UNIQUE INDEX "roadmap_requirements_phase_posicao_uq" ON "roadmap_requirements" USING btree ("phase_id","posicao");--> statement-breakpoint
CREATE UNIQUE INDEX "roadmap_resources_phase_posicao_uq" ON "roadmap_resources" USING btree ("phase_id","posicao");