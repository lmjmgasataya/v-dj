CREATE TYPE "public"."user_role" AS ENUM('admin_volunteer', 'developer');--> statement-breakpoint
CREATE TABLE "users" (
	"id" serial PRIMARY KEY NOT NULL,
	"username" text NOT NULL,
	"password_hash" text NOT NULL,
	"name" text NOT NULL,
	"role" "user_role" DEFAULT 'admin_volunteer' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "users_username_unique" UNIQUE("username")
);
--> statement-breakpoint
ALTER TABLE "participants" ALTER COLUMN "mobile_number" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "participants" ALTER COLUMN "lifestage" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "participants" ALTER COLUMN "completed_one2one" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "participants" ALTER COLUMN "will_undergo_water_baptism" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "participants" ALTER COLUMN "previous_church" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "participants" ALTER COLUMN "preferred_name_on_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "participants" ALTER COLUMN "discipler_last_name" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "participants" ALTER COLUMN "discipler_first_name" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "participants" ALTER COLUMN "discipler_mobile_number" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "participants" ALTER COLUMN "confirmed_readiness" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "participants" ALTER COLUMN "acknowledgement_receipt_number" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "participants" ALTER COLUMN "registration_fee" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "participants" ALTER COLUMN "admin_volunteer_name" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "check_ins" ADD COLUMN "remarks" text;--> statement-breakpoint
ALTER TABLE "participants" ADD COLUMN "is_walk_in" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "participants" ADD COLUMN "vg_leader_last_name" text;--> statement-breakpoint
ALTER TABLE "participants" ADD COLUMN "vg_leader_first_name" text;--> statement-breakpoint
ALTER TABLE "participants" ADD COLUMN "victory_date" text;