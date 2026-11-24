CREATE TYPE "public"."arquivamento_tipo" AS ENUM('trilha_estudo', 'roadmap', 'cards', 'evento', 'erros');--> statement-breakpoint
CREATE TYPE "public"."plano_acao" AS ENUM('concluido', 'desfeito', 'inicio_marcado');--> statement-breakpoint
CREATE TYPE "public"."plano_grupo_check" AS ENUM('etapas', 'antes', 'entrega', 'recrutamento');--> statement-breakpoint
CREATE TYPE "public"."plano_origem" AS ENUM('tela', 'voz', 'inicio');--> statement-breakpoint
ALTER TYPE "public"."assistant_entity" ADD VALUE 'item_plano';--> statement-breakpoint
ALTER TYPE "public"."notification_target" ADD VALUE 'bloco';--> statement-breakpoint
ALTER TYPE "public"."notification_target" ADD VALUE 'folga';--> statement-breakpoint
CREATE TABLE "arquivamentos" (
	"user_id" text NOT NULL,
	"tipo" "arquivamento_tipo" NOT NULL,
	"chave" text NOT NULL,
	"arquivado_em" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "arquivamentos_user_id_tipo_chave_pk" PRIMARY KEY("user_id","tipo","chave")
);
--> statement-breakpoint
CREATE TABLE "plano_blocos" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"data" date NOT NULL,
	"bloco" text NOT NULL,
	"escolha" text,
	"codigo_estudado" text,
	"minutos" smallint DEFAULT 0 NOT NULL,
	"feito_em" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "plano_catalogo" (
	"id" smallint PRIMARY KEY DEFAULT 1 NOT NULL,
	"versao" integer NOT NULL,
	"padrao_entrega" jsonb NOT NULL,
	"recrutamento" jsonb NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "plano_catalogo_linha_unica" CHECK ("plano_catalogo"."id" = 1)
);
--> statement-breakpoint
CREATE TABLE "plano_checks" (
	"user_id" text NOT NULL,
	"codigo" text NOT NULL,
	"grupo" "plano_grupo_check" NOT NULL,
	"indice" smallint NOT NULL,
	"feito" boolean DEFAULT false NOT NULL,
	"feito_em" timestamp with time zone,
	CONSTRAINT "plano_checks_user_id_codigo_grupo_indice_pk" PRIMARY KEY("user_id","codigo","grupo","indice")
);
--> statement-breakpoint
CREATE TABLE "plano_contagens" (
	"user_id" text NOT NULL,
	"chave" text NOT NULL,
	"semana" date NOT NULL,
	"contagem" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "plano_contagens_user_id_chave_semana_pk" PRIMARY KEY("user_id","chave","semana")
);
--> statement-breakpoint
CREATE TABLE "plano_fases" (
	"numero" smallint PRIMARY KEY NOT NULL,
	"nome" text NOT NULL,
	"posicao" smallint NOT NULL
);
--> statement-breakpoint
CREATE TABLE "plano_folgas" (
	"user_id" text NOT NULL,
	"data" date NOT NULL,
	"minutos" smallint NOT NULL,
	"respondida_em" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "plano_folgas_user_id_data_pk" PRIMARY KEY("user_id","data"),
	CONSTRAINT "plano_folgas_minutos" CHECK ("plano_folgas"."minutos" IN (0, 60, 120, 180))
);
--> statement-breakpoint
CREATE TABLE "plano_historico" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"codigo" text NOT NULL,
	"acao" "plano_acao" NOT NULL,
	"em" timestamp with time zone DEFAULT now() NOT NULL,
	"origem" "plano_origem" NOT NULL
);
--> statement-breakpoint
CREATE TABLE "plano_itens" (
	"codigo" text PRIMARY KEY NOT NULL,
	"trilha" text NOT NULL,
	"fase" smallint,
	"posicao" smallint NOT NULL,
	"titulo" text NOT NULL,
	"estudar" text,
	"recurso" text,
	"criterio" text NOT NULL,
	"horas" numeric(4, 1) NOT NULL,
	"requisitos" text[] DEFAULT '{}'::text[] NOT NULL,
	"avaliacao" jsonb,
	"antes_de_comecar" text[] DEFAULT '{}'::text[] NOT NULL,
	"etapas" text[] DEFAULT '{}'::text[] NOT NULL,
	"entrega" boolean DEFAULT false NOT NULL,
	"opcional" boolean DEFAULT false NOT NULL,
	"ativo" boolean DEFAULT true NOT NULL
);
--> statement-breakpoint
CREATE TABLE "plano_progresso" (
	"user_id" text NOT NULL,
	"codigo" text NOT NULL,
	"concluido_em" timestamp with time zone NOT NULL,
	"nota_final" smallint,
	CONSTRAINT "plano_progresso_user_id_codigo_pk" PRIMARY KEY("user_id","codigo")
);
--> statement-breakpoint
CREATE TABLE "plano_tentativas" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"codigo" text NOT NULL,
	"nota" smallint NOT NULL,
	"aprovada" boolean NOT NULL,
	"feita_em" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "plano_tentativas_nota" CHECK ("plano_tentativas"."nota" BETWEEN 0 AND 100)
);
--> statement-breakpoint
CREATE TABLE "plano_trilhas" (
	"slug" text PRIMARY KEY NOT NULL,
	"nome" text NOT NULL,
	"bloco" text NOT NULL,
	"posicao" smallint NOT NULL
);
--> statement-breakpoint
ALTER TABLE "settings" ADD COLUMN "plano_iniciado_em" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "settings" ADD COLUMN "plano_migrado_em" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "settings" ADD COLUMN "blocos_plano" jsonb;--> statement-breakpoint
ALTER TABLE "settings" ADD COLUMN "pergunta_folga" text DEFAULT '07:40' NOT NULL;--> statement-breakpoint
ALTER TABLE "settings" ADD COLUMN "aviso_blocos_min" integer DEFAULT 5 NOT NULL;--> statement-breakpoint
ALTER TABLE "arquivamentos" ADD CONSTRAINT "arquivamentos_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "plano_blocos" ADD CONSTRAINT "plano_blocos_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "plano_checks" ADD CONSTRAINT "plano_checks_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "plano_contagens" ADD CONSTRAINT "plano_contagens_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "plano_folgas" ADD CONSTRAINT "plano_folgas_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "plano_historico" ADD CONSTRAINT "plano_historico_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "plano_progresso" ADD CONSTRAINT "plano_progresso_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "plano_tentativas" ADD CONSTRAINT "plano_tentativas_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "plano_blocos_user_data_bloco_uq" ON "plano_blocos" USING btree ("user_id","data","bloco");--> statement-breakpoint
CREATE INDEX "plano_historico_user_em_idx" ON "plano_historico" USING btree ("user_id","em");--> statement-breakpoint
CREATE INDEX "plano_tentativas_user_codigo_idx" ON "plano_tentativas" USING btree ("user_id","codigo");