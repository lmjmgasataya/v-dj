CREATE TABLE "feature_flags" (
	"key" text PRIMARY KEY NOT NULL,
	"enabled" boolean DEFAULT true NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "victory_group_leaders" ALTER COLUMN "age" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "victory_group_leaders" ALTER COLUMN "gender" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "participants" ADD COLUMN "vg_leader_id" integer;--> statement-breakpoint
ALTER TABLE "participants" ADD CONSTRAINT "participants_vg_leader_id_victory_group_leaders_id_fk" FOREIGN KEY ("vg_leader_id") REFERENCES "public"."victory_group_leaders"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "check_ins_class_session_id_idx" ON "check_ins" USING btree ("class_session_id");--> statement-breakpoint
CREATE INDEX "check_ins_checked_in_at_idx" ON "check_ins" USING btree ("checked_in_at");--> statement-breakpoint
CREATE INDEX "class_sessions_session_date_idx" ON "class_sessions" USING btree ("session_date");--> statement-breakpoint
CREATE INDEX "participants_report_idx" ON "participants" USING btree ("deleted_at","is_walk_in","created_at");--> statement-breakpoint
ALTER TABLE "participants" DROP COLUMN "vg_leader_last_name";--> statement-breakpoint
ALTER TABLE "participants" DROP COLUMN "vg_leader_first_name";--> statement-breakpoint
ALTER TABLE "victory_group_leaders" ADD CONSTRAINT "victory_group_leaders_last_name_first_name_mobile_number_unique" UNIQUE("last_name","first_name","mobile_number");