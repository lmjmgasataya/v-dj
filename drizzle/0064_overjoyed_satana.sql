ALTER TABLE "l113_schedules" ADD COLUMN "semester" integer;--> statement-breakpoint
ALTER TABLE "l113_teacher_evaluations" ADD COLUMN "liked" text;--> statement-breakpoint
ALTER TABLE "l113_teacher_evaluations" ADD COLUMN "improvement" text;--> statement-breakpoint
-- Existing rows: every class so far is Semester 1; the old single answer moves to "liked".
UPDATE "l113_schedules" SET "semester" = 1 WHERE "is_break" = false;--> statement-breakpoint
UPDATE "l113_teacher_evaluations" SET "liked" = "feedback" WHERE "feedback" IS NOT NULL;
