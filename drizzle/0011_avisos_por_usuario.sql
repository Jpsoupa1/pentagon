DROP INDEX "notifications_alvo_uq";--> statement-breakpoint
CREATE UNIQUE INDEX "notifications_alvo_uq" ON "notifications" USING btree ("user_id","alvo_tipo","alvo_id","enviar_em");