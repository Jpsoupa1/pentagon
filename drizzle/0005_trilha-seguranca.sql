ALTER TABLE "study_tracks" ALTER COLUMN "fim" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "events" ADD COLUMN "track_id" uuid;--> statement-breakpoint
ALTER TABLE "study_tracks" ADD COLUMN "fase_atual" smallint;--> statement-breakpoint
ALTER TABLE "events" ADD CONSTRAINT "events_track_id_study_tracks_id_fk" FOREIGN KEY ("track_id") REFERENCES "public"."study_tracks"("id") ON DELETE set null ON UPDATE no action;