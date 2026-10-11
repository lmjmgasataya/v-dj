CREATE TABLE "session_vgl_check_ins" (
	"id" serial PRIMARY KEY NOT NULL,
	"vg_leader_id" integer NOT NULL,
	"class_session_id" integer NOT NULL,
	"checked_in_at" timestamp DEFAULT now() NOT NULL,
	"remarks" text,
	"status" "check_in_status" DEFAULT 'On-time' NOT NULL,
	"method" "check_in_method" DEFAULT 'Search' NOT NULL,
	CONSTRAINT "session_vgl_check_ins_vg_leader_id_class_session_id_unique" UNIQUE("vg_leader_id","class_session_id")
);
--> statement-breakpoint
ALTER TABLE "class_sessions" ADD COLUMN "vgl_only" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "session_vgl_check_ins" ADD CONSTRAINT "session_vgl_check_ins_vg_leader_id_victory_group_leaders_id_fk" FOREIGN KEY ("vg_leader_id") REFERENCES "public"."victory_group_leaders"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "session_vgl_check_ins" ADD CONSTRAINT "session_vgl_check_ins_class_session_id_class_sessions_id_fk" FOREIGN KEY ("class_session_id") REFERENCES "public"."class_sessions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "session_vgl_check_ins_class_session_id_idx" ON "session_vgl_check_ins" USING btree ("class_session_id");