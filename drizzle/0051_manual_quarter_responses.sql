CREATE TABLE "manual_quarter_responses" (
	"id" serial PRIMARY KEY NOT NULL,
	"quarter_label" text NOT NULL,
	"last_name" text NOT NULL,
	"first_name" text NOT NULL,
	"mobile_number" text,
	"responded_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "manual_quarter_responses_quarter_label_last_name_first_name_unique" UNIQUE("quarter_label","last_name","first_name")
);
