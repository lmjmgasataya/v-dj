ALTER TYPE "public"."event_audience" ADD VALUE 'leadership_group_leader';--> statement-breakpoint
ALTER TABLE "events" ADD COLUMN "start_time" text;--> statement-breakpoint
ALTER TABLE "events" ADD COLUMN "end_time" text;