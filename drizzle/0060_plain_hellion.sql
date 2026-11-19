CREATE TABLE "l113_teachers" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "l113_teachers_name_unique" UNIQUE("name")
);
--> statement-breakpoint
ALTER TABLE "l113_schedules" ADD COLUMN "teacher_id" integer;--> statement-breakpoint
ALTER TABLE "l113_teacher_evaluations" ADD COLUMN "teacher_id" integer;--> statement-breakpoint
ALTER TABLE "l113_schedules" ADD CONSTRAINT "l113_schedules_teacher_id_l113_teachers_id_fk" FOREIGN KEY ("teacher_id") REFERENCES "public"."l113_teachers"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "l113_teacher_evaluations" ADD CONSTRAINT "l113_teacher_evaluations_teacher_id_l113_teachers_id_fk" FOREIGN KEY ("teacher_id") REFERENCES "public"."l113_teachers"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
-- Backfill: existing free-text teacher names become rows in l113_teachers.
INSERT INTO "l113_teachers" ("name")
SELECT DISTINCT trim("teacher") FROM "l113_schedules" WHERE trim("teacher") <> ''
UNION
SELECT DISTINCT trim("teacher") FROM "l113_teacher_evaluations" WHERE trim("teacher") <> ''
ON CONFLICT ("name") DO NOTHING;--> statement-breakpoint
UPDATE "l113_schedules" s SET "teacher_id" = t."id" FROM "l113_teachers" t WHERE t."name" = trim(s."teacher");--> statement-breakpoint
UPDATE "l113_teacher_evaluations" e SET "teacher_id" = t."id" FROM "l113_teachers" t WHERE t."name" = trim(e."teacher");
