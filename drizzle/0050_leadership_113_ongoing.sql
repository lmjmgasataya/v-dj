CREATE TYPE "public"."leadership_113_status" AS ENUM('yes', 'no', 'ongoing');--> statement-breakpoint
ALTER TABLE "victory_group_leaders" ALTER COLUMN "graduate_of_leadership_113" SET DATA TYPE "public"."leadership_113_status" USING (CASE "graduate_of_leadership_113" WHEN true THEN 'yes' WHEN false THEN 'no' END)::"public"."leadership_113_status";
