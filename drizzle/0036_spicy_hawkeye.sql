CREATE TYPE "public"."event_audience" AS ENUM('vg_leader', 'intern');--> statement-breakpoint
CREATE TABLE "event_check_ins" (
	"id" serial PRIMARY KEY NOT NULL,
	"event_id" integer NOT NULL,
	"attendee_type" "event_audience" NOT NULL,
	"vg_leader_id" integer,
	"attendee_name" text NOT NULL,
	"checked_in_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "events" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"event_date" date NOT NULL,
	"is_done" boolean DEFAULT false NOT NULL,
	"audience" "event_audience"[] NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"deleted_at" timestamp
);
--> statement-breakpoint
ALTER TABLE "event_check_ins" ADD CONSTRAINT "event_check_ins_event_id_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "event_check_ins" ADD CONSTRAINT "event_check_ins_vg_leader_id_victory_group_leaders_id_fk" FOREIGN KEY ("vg_leader_id") REFERENCES "public"."victory_group_leaders"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "event_check_ins_event_leader_idx" ON "event_check_ins" USING btree ("event_id","vg_leader_id") WHERE "event_check_ins"."vg_leader_id" is not null;--> statement-breakpoint
CREATE INDEX "event_check_ins_event_id_idx" ON "event_check_ins" USING btree ("event_id");