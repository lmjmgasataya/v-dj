CREATE TYPE "public"."check_in_status" AS ENUM('On-time', 'Late', 'Absent');--> statement-breakpoint
ALTER TABLE "check_ins" ADD COLUMN "status" "check_in_status" DEFAULT 'On-time' NOT NULL;