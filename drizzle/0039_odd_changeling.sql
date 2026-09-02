ALTER TABLE "events" ADD COLUMN "share_token" text;--> statement-breakpoint
ALTER TABLE "events" ADD CONSTRAINT "events_share_token_unique" UNIQUE("share_token");