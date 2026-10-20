CREATE TYPE "public"."flashcard_mode" AS ENUM('dia', 'aleatorio');--> statement-breakpoint
CREATE TYPE "public"."flashcard_origin" AS ENUM('aula', 'erro');--> statement-breakpoint
CREATE TYPE "public"."flashcard_result" AS ENUM('acertou', 'errou');--> statement-breakpoint
CREATE TABLE "flashcard_answers" (
	"id" uuid PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"card_id" uuid NOT NULL,
	"data" date NOT NULL,
	"respondida_em" timestamp with time zone NOT NULL,
	"resultado" "flashcard_result" NOT NULL,
	"modo" "flashcard_mode" NOT NULL,
	"caixa_antes" smallint NOT NULL,
	"caixa_depois" smallint NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "flashcards" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"chave" text NOT NULL,
	"trilha" text NOT NULL,
	"tema" text NOT NULL,
	"frente" text NOT NULL,
	"verso" text NOT NULL,
	"codigo" text,
	"origem" "flashcard_origin" NOT NULL,
	"criado_em" date NOT NULL,
	"caixa" smallint DEFAULT 1 NOT NULL,
	"proxima_em" date,
	"suspenso" boolean DEFAULT false NOT NULL,
	"acertos" integer DEFAULT 0 NOT NULL,
	"erros" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "settings" ADD COLUMN "limite_cards" smallint DEFAULT 20 NOT NULL;--> statement-breakpoint
ALTER TABLE "flashcard_answers" ADD CONSTRAINT "flashcard_answers_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "flashcard_answers" ADD CONSTRAINT "flashcard_answers_card_id_flashcards_id_fk" FOREIGN KEY ("card_id") REFERENCES "public"."flashcards"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "flashcards" ADD CONSTRAINT "flashcards_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "flashcard_answers_user_data_idx" ON "flashcard_answers" USING btree ("user_id","data");--> statement-breakpoint
CREATE UNIQUE INDEX "flashcards_user_chave_uq" ON "flashcards" USING btree ("user_id","chave");