CREATE TYPE "public"."day_of_week" AS ENUM('Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday');--> statement-breakpoint
CREATE TYPE "public"."vg_frequency" AS ENUM('Weekly', 'Every other week', 'Once a month', 'Others');--> statement-breakpoint
CREATE TABLE "victory_groups" (
	"id" serial PRIMARY KEY NOT NULL,
	"vg_leader_id" integer NOT NULL,
	"place" text NOT NULL,
	"day" "day_of_week" NOT NULL,
	"time" text NOT NULL,
	"frequency" "vg_frequency" NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"deleted_at" timestamp
);
--> statement-breakpoint
ALTER TABLE "victory_groups" ADD CONSTRAINT "victory_groups_vg_leader_id_victory_group_leaders_id_fk" FOREIGN KEY ("vg_leader_id") REFERENCES "public"."victory_group_leaders"("id") ON DELETE no action ON UPDATE no action;