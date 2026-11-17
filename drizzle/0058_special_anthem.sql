ALTER TABLE "victory_group_leaders" ADD COLUMN "started_leading_vg_year" integer;--> statement-breakpoint
-- Every answer so far was given in 2026 (the question was added Sep 2026).
UPDATE "victory_group_leaders" SET "started_leading_vg_year" = 2026 WHERE "started_leading_vg" IS NOT NULL;
