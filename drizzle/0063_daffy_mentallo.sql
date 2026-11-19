ALTER TABLE "l113_schedules" ALTER COLUMN "topic_id" SET NOT NULL;--> statement-breakpoint
CREATE INDEX "l113_schedules_topic_id_idx" ON "l113_schedules" USING btree ("topic_id");--> statement-breakpoint
ALTER TABLE "l113_schedules" DROP COLUMN "topic";