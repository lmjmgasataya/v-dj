CREATE TABLE "l113_topics" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "l113_topics_name_unique" UNIQUE("name")
);
--> statement-breakpoint
ALTER TABLE "l113_schedules" ALTER COLUMN "teacher_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "l113_schedules" ADD COLUMN "topic_id" integer;--> statement-breakpoint
ALTER TABLE "l113_schedules" ADD COLUMN "is_break" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "l113_schedules" ADD COLUMN "remarks" text;--> statement-breakpoint
ALTER TABLE "l113_schedules" ADD CONSTRAINT "l113_schedules_topic_id_l113_topics_id_fk" FOREIGN KEY ("topic_id") REFERENCES "public"."l113_topics"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
-- Backfill: existing topic names become rows in l113_topics.
INSERT INTO "l113_topics" ("name")
SELECT DISTINCT trim("topic") FROM "l113_schedules" WHERE trim("topic") <> ''
ON CONFLICT ("name") DO NOTHING;--> statement-breakpoint
UPDATE "l113_schedules" s SET "topic_id" = t."id" FROM "l113_topics" t WHERE t."name" = trim(s."topic");
