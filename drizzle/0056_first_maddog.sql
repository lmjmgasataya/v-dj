CREATE TABLE "auto_journey_steps" (
	"id" serial PRIMARY KEY NOT NULL,
	"vg_leader_id" integer NOT NULL,
	"step" text NOT NULL,
	"participant_id" integer,
	"class_session_id" integer,
	"was_already_checked" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "auto_journey_steps_vg_leader_id_step_unique" UNIQUE("vg_leader_id","step")
);
--> statement-breakpoint
ALTER TABLE "auto_journey_steps" ADD CONSTRAINT "auto_journey_steps_vg_leader_id_victory_group_leaders_id_fk" FOREIGN KEY ("vg_leader_id") REFERENCES "public"."victory_group_leaders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "auto_journey_steps" ADD CONSTRAINT "auto_journey_steps_participant_id_participants_id_fk" FOREIGN KEY ("participant_id") REFERENCES "public"."participants"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "auto_journey_steps" ADD CONSTRAINT "auto_journey_steps_class_session_id_class_sessions_id_fk" FOREIGN KEY ("class_session_id") REFERENCES "public"."class_sessions"("id") ON DELETE set null ON UPDATE no action;