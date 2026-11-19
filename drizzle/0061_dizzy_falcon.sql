ALTER TABLE "l113_schedules" ALTER COLUMN "teacher_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "l113_teacher_evaluations" ALTER COLUMN "teacher_id" SET NOT NULL;--> statement-breakpoint
CREATE INDEX "l113_schedules_teacher_id_idx" ON "l113_schedules" USING btree ("teacher_id");--> statement-breakpoint
ALTER TABLE "l113_schedules" DROP COLUMN "teacher";--> statement-breakpoint
ALTER TABLE "l113_teacher_evaluations" DROP COLUMN "teacher";