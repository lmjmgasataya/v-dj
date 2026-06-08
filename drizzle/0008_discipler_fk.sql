ALTER TABLE "participants" ADD COLUMN "discipler_id" integer;--> statement-breakpoint
UPDATE "participants" SET "discipler_id" = d."id" FROM "disciplers" d WHERE d."last_name" = "participants"."discipler_last_name" AND d."first_name" = "participants"."discipler_first_name" AND d."mobile_number" = "participants"."discipler_mobile_number";--> statement-breakpoint
ALTER TABLE "participants" ADD CONSTRAINT "participants_discipler_id_disciplers_id_fk" FOREIGN KEY ("discipler_id") REFERENCES "public"."disciplers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "participants" DROP COLUMN "discipler_last_name";--> statement-breakpoint
ALTER TABLE "participants" DROP COLUMN "discipler_first_name";--> statement-breakpoint
ALTER TABLE "participants" DROP COLUMN "discipler_mobile_number";--> statement-breakpoint
ALTER TABLE "participants" DROP COLUMN "discipler_messenger_name";
