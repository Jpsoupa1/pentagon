ALTER TYPE "public"."roadmap_gate_kind" ADD VALUE 'milestone';--> statement-breakpoint
CREATE TABLE "roadmap_breaks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"trail_id" uuid NOT NULL,
	"posicao" smallint NOT NULL,
	"rotulo" text NOT NULL,
	"inicio" date NOT NULL,
	"fim" date NOT NULL,
	"cor" text NOT NULL,
	"trilha_ligada_id" uuid
);
--> statement-breakpoint
ALTER TABLE "roadmap_trails" ADD COLUMN "subtitulo" text;--> statement-breakpoint
ALTER TABLE "roadmap_trails" ADD COLUMN "icone" text DEFAULT 'pentagono' NOT NULL;--> statement-breakpoint
ALTER TABLE "roadmap_trails" ADD COLUMN "numeros" jsonb DEFAULT '[]'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "roadmap_trails" ADD COLUMN "rotulo_inicio" text DEFAULT 'Começo' NOT NULL;--> statement-breakpoint
ALTER TABLE "roadmap_breaks" ADD CONSTRAINT "roadmap_breaks_trail_id_roadmap_trails_id_fk" FOREIGN KEY ("trail_id") REFERENCES "public"."roadmap_trails"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "roadmap_breaks" ADD CONSTRAINT "roadmap_breaks_trilha_ligada_id_roadmap_trails_id_fk" FOREIGN KEY ("trilha_ligada_id") REFERENCES "public"."roadmap_trails"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "roadmap_breaks_trail_posicao_uq" ON "roadmap_breaks" USING btree ("trail_id","posicao");