ALTER TABLE "victory_group_leaders" ALTER COLUMN "mobile_number" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "pin_hash" text;--> statement-breakpoint
ALTER TABLE "victory_group_leaders" ADD COLUMN "profile_completed" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "users" DROP COLUMN "security_question";--> statement-breakpoint
ALTER TABLE "users" DROP COLUMN "security_answer_hash";