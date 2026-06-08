ALTER TABLE "participants" ADD COLUMN "vg_leader_id" integer;--> statement-breakpoint
UPDATE "participants" SET "vg_leader_id" = v."id" FROM "victory_group_leaders" v WHERE v."last_name" = "participants"."vg_leader_last_name" AND v."first_name" = "participants"."vg_leader_first_name";--> statement-breakpoint
ALTER TABLE "participants" ADD CONSTRAINT "participants_vg_leader_id_victory_group_leaders_id_fk" FOREIGN KEY ("vg_leader_id") REFERENCES "public"."victory_group_leaders"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "participants" DROP COLUMN "vg_leader_last_name";--> statement-breakpoint
ALTER TABLE "participants" DROP COLUMN "vg_leader_first_name";
