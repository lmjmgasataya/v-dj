CREATE TABLE "batches" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"class_start_date" date NOT NULL,
	"class_end_date" date NOT NULL,
	"registration_start_date" date,
	"is_default" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "participants" ADD COLUMN "batch_id" integer;--> statement-breakpoint
ALTER TABLE "participants" ADD CONSTRAINT "participants_batch_id_batches_id_fk" FOREIGN KEY ("batch_id") REFERENCES "public"."batches"("id") ON DELETE no action ON UPDATE no action;