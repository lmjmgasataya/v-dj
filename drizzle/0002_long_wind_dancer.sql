CREATE TABLE "login_logs" (
	"id" serial PRIMARY KEY NOT NULL,
	"username" text NOT NULL,
	"user_id" integer,
	"success" boolean NOT NULL,
	"ip_address" text,
	"user_agent" text,
	"logged_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "login_logs" ADD CONSTRAINT "login_logs_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;