CREATE TYPE "public"."lifestage" AS ENUM('Student (JHS/SHS)', 'Student (College)', 'Single', 'Married', 'Single Parent', 'Widow/Widower', 'Senior');--> statement-breakpoint
CREATE TABLE "check_ins" (
	"id" serial PRIMARY KEY NOT NULL,
	"participant_id" integer NOT NULL,
	"class_session_id" integer NOT NULL,
	"checked_in_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "check_ins_participant_id_class_session_id_unique" UNIQUE("participant_id","class_session_id")
);
--> statement-breakpoint
CREATE TABLE "class_sessions" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"session_date" date NOT NULL,
	"is_victory_day" boolean DEFAULT false NOT NULL
);
--> statement-breakpoint
CREATE TABLE "disciplers" (
	"id" serial PRIMARY KEY NOT NULL,
	"last_name" text NOT NULL,
	"first_name" text NOT NULL,
	"mobile_number" text NOT NULL,
	"messenger_name" text,
	CONSTRAINT "disciplers_last_name_first_name_mobile_number_unique" UNIQUE("last_name","first_name","mobile_number")
);
--> statement-breakpoint
CREATE TABLE "participants" (
	"id" serial PRIMARY KEY NOT NULL,
	"last_name" text NOT NULL,
	"first_name" text NOT NULL,
	"middle_initial" text,
	"mobile_number" text NOT NULL,
	"facebook_messenger_name" text,
	"lifestage" "lifestage" NOT NULL,
	"age" integer NOT NULL,
	"gender" text NOT NULL,
	"service_attending" text NOT NULL,
	"completed_one2one" boolean NOT NULL,
	"will_undergo_water_baptism" boolean NOT NULL,
	"previous_church" text NOT NULL,
	"preferred_name_on_id" text NOT NULL,
	"discipler_last_name" text NOT NULL,
	"discipler_first_name" text NOT NULL,
	"discipler_mobile_number" text NOT NULL,
	"discipler_messenger_name" text,
	"confirmed_readiness" boolean NOT NULL,
	"acknowledgement_receipt_number" text NOT NULL,
	"registration_fee" text NOT NULL,
	"admin_volunteer_name" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"deleted_at" timestamp
);
--> statement-breakpoint
ALTER TABLE "check_ins" ADD CONSTRAINT "check_ins_participant_id_participants_id_fk" FOREIGN KEY ("participant_id") REFERENCES "public"."participants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "check_ins" ADD CONSTRAINT "check_ins_class_session_id_class_sessions_id_fk" FOREIGN KEY ("class_session_id") REFERENCES "public"."class_sessions"("id") ON DELETE no action ON UPDATE no action;