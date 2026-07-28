ALTER TYPE "public"."user_role" ADD VALUE 'vg_leader';--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "vg_leader_id" integer;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "must_change_password" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_vg_leader_id_victory_group_leaders_id_fk" FOREIGN KEY ("vg_leader_id") REFERENCES "public"."victory_group_leaders"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_vg_leader_id_unique" UNIQUE("vg_leader_id");