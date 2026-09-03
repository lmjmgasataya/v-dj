CREATE TYPE "public"."group_type" AS ENUM('victory_group', 'leadership_group');--> statement-breakpoint
ALTER TABLE "victory_groups" ADD COLUMN "type" "group_type" DEFAULT 'victory_group' NOT NULL;