CREATE TYPE "public"."started_leading_vg" AS ENUM('before_this_year', 'this_year');--> statement-breakpoint
CREATE TABLE "event_registration_interns" (
	"id" serial PRIMARY KEY NOT NULL,
	"event_registration_id" integer NOT NULL,
	"intern_id" integer NOT NULL,
	CONSTRAINT "event_registration_interns_event_registration_id_intern_id_unique" UNIQUE("event_registration_id","intern_id")
);
--> statement-breakpoint
CREATE TABLE "event_registrations" (
	"id" serial PRIMARY KEY NOT NULL,
	"event_id" integer NOT NULL,
	"vg_leader_id" integer NOT NULL,
	"will_attend" boolean NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "event_registrations_event_id_vg_leader_id_unique" UNIQUE("event_id","vg_leader_id")
);
--> statement-breakpoint
CREATE TABLE "interns" (
	"id" serial PRIMARY KEY NOT NULL,
	"victory_group_id" integer NOT NULL,
	"last_name" text NOT NULL,
	"first_name" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "leadership_group_members" (
	"id" serial PRIMARY KEY NOT NULL,
	"leader_id" integer NOT NULL,
	"member_vg_leader_id" integer NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "leadership_group_members_leader_id_member_vg_leader_id_unique" UNIQUE("leader_id","member_vg_leader_id")
);
--> statement-breakpoint
ALTER TABLE "event_check_ins" ADD COLUMN "intern_id" integer;--> statement-breakpoint
ALTER TABLE "victory_group_leaders" ADD COLUMN "started_leading_vg" "started_leading_vg";--> statement-breakpoint
ALTER TABLE "victory_group_leaders" ADD COLUMN "is_leadership_group_leader" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "event_registration_interns" ADD CONSTRAINT "event_registration_interns_event_registration_id_event_registrations_id_fk" FOREIGN KEY ("event_registration_id") REFERENCES "public"."event_registrations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "event_registration_interns" ADD CONSTRAINT "event_registration_interns_intern_id_interns_id_fk" FOREIGN KEY ("intern_id") REFERENCES "public"."interns"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "event_registrations" ADD CONSTRAINT "event_registrations_event_id_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "event_registrations" ADD CONSTRAINT "event_registrations_vg_leader_id_victory_group_leaders_id_fk" FOREIGN KEY ("vg_leader_id") REFERENCES "public"."victory_group_leaders"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "interns" ADD CONSTRAINT "interns_victory_group_id_victory_groups_id_fk" FOREIGN KEY ("victory_group_id") REFERENCES "public"."victory_groups"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "leadership_group_members" ADD CONSTRAINT "leadership_group_members_leader_id_victory_group_leaders_id_fk" FOREIGN KEY ("leader_id") REFERENCES "public"."victory_group_leaders"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "leadership_group_members" ADD CONSTRAINT "leadership_group_members_member_vg_leader_id_victory_group_leaders_id_fk" FOREIGN KEY ("member_vg_leader_id") REFERENCES "public"."victory_group_leaders"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "event_check_ins" ADD CONSTRAINT "event_check_ins_intern_id_interns_id_fk" FOREIGN KEY ("intern_id") REFERENCES "public"."interns"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "event_check_ins_event_intern_idx" ON "event_check_ins" USING btree ("event_id","intern_id") WHERE "event_check_ins"."intern_id" is not null;--> statement-breakpoint
ALTER TABLE "victory_groups" DROP COLUMN "intern";