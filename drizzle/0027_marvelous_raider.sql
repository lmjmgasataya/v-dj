ALTER TABLE "users" ALTER COLUMN "username" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ALTER COLUMN "password_hash" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "security_question" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "security_answer_hash" text;