CREATE TABLE "sms_logs" (
	"id" serial PRIMARY KEY NOT NULL,
	"recipient_name" text NOT NULL,
	"recipient_number" text NOT NULL,
	"message" text NOT NULL,
	"status" text NOT NULL,
	"participant_id" integer,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "class_sessions" ADD COLUMN "requires_victory_day" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "sms_logs" ADD CONSTRAINT "sms_logs_participant_id_participants_id_fk" FOREIGN KEY ("participant_id") REFERENCES "public"."participants"("id") ON DELETE set null ON UPDATE no action;