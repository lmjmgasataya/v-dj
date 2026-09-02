CREATE TABLE "intern_event_registrations" (
	"id" serial PRIMARY KEY NOT NULL,
	"event_id" integer NOT NULL,
	"intern_id" integer NOT NULL,
	"will_attend" boolean NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "intern_event_registrations_event_id_intern_id_unique" UNIQUE("event_id","intern_id")
);
--> statement-breakpoint
ALTER TABLE "intern_event_registrations" ADD CONSTRAINT "intern_event_registrations_event_id_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "intern_event_registrations" ADD CONSTRAINT "intern_event_registrations_intern_id_interns_id_fk" FOREIGN KEY ("intern_id") REFERENCES "public"."interns"("id") ON DELETE no action ON UPDATE no action;