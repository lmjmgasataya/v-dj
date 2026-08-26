CREATE TABLE "leadership_113_batches" (
	"id" serial PRIMARY KEY NOT NULL,
	"batch_name" text NOT NULL,
	"actual" integer NOT NULL,
	"goal" integer NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "vg_convergence_attendance" (
	"id" serial PRIMARY KEY NOT NULL,
	"label" text NOT NULL,
	"event_date" date NOT NULL,
	"attendees" integer NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "vg_report_snapshots" (
	"id" serial PRIMARY KEY NOT NULL,
	"label" text NOT NULL,
	"as_of_date" date NOT NULL,
	"data" jsonb NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "vg_report_snapshots_label_unique" UNIQUE("label")
);
