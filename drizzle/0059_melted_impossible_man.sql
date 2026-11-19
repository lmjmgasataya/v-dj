CREATE TABLE "l113_batch_students" (
	"id" serial PRIMARY KEY NOT NULL,
	"batch_id" integer NOT NULL,
	"vg_leader_id" integer NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "l113_batch_students_batch_id_vg_leader_id_unique" UNIQUE("batch_id","vg_leader_id")
);
--> statement-breakpoint
CREATE TABLE "l113_batches" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"start_date" date NOT NULL,
	"end_date" date NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "l113_check_ins" (
	"id" serial PRIMARY KEY NOT NULL,
	"schedule_date_id" integer NOT NULL,
	"vg_leader_id" integer NOT NULL,
	"checked_in_at" timestamp DEFAULT now() NOT NULL,
	"status" "check_in_status" NOT NULL,
	"method" "check_in_method" DEFAULT 'Search' NOT NULL,
	CONSTRAINT "l113_check_ins_schedule_date_id_vg_leader_id_unique" UNIQUE("schedule_date_id","vg_leader_id")
);
--> statement-breakpoint
CREATE TABLE "l113_schedule_dates" (
	"id" serial PRIMARY KEY NOT NULL,
	"schedule_id" integer NOT NULL,
	"class_date" date NOT NULL,
	CONSTRAINT "l113_schedule_dates_schedule_id_class_date_unique" UNIQUE("schedule_id","class_date")
);
--> statement-breakpoint
CREATE TABLE "l113_schedules" (
	"id" serial PRIMARY KEY NOT NULL,
	"batch_id" integer NOT NULL,
	"topic" text NOT NULL,
	"teacher" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "l113_spiritual_disciplines" (
	"id" serial PRIMARY KEY NOT NULL,
	"batch_id" integer NOT NULL,
	"vg_leader_id" integer NOT NULL,
	"month" text NOT NULL,
	"chapters_read" integer NOT NULL,
	"days_read_four_chapters" integer NOT NULL,
	"people_led_to_christ" integer NOT NULL,
	"prayer_meetings_attended" integer NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "l113_spiritual_disciplines_batch_id_vg_leader_id_month_unique" UNIQUE("batch_id","vg_leader_id","month")
);
--> statement-breakpoint
CREATE TABLE "l113_student_evaluations" (
	"id" serial PRIMARY KEY NOT NULL,
	"schedule_id" integer NOT NULL,
	"vg_leader_id" integer NOT NULL,
	"score" double precision NOT NULL,
	"highest_possible_score" double precision NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "l113_student_evaluations_schedule_id_vg_leader_id_unique" UNIQUE("schedule_id","vg_leader_id")
);
--> statement-breakpoint
CREATE TABLE "l113_teacher_evaluations" (
	"id" serial PRIMARY KEY NOT NULL,
	"schedule_id" integer NOT NULL,
	"vg_leader_id" integer NOT NULL,
	"teacher" text NOT NULL,
	"prepared_rating" integer NOT NULL,
	"clarity_rating" integer NOT NULL,
	"responsiveness_rating" integer NOT NULL,
	"feedback" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "l113_teacher_evaluations_schedule_id_vg_leader_id_unique" UNIQUE("schedule_id","vg_leader_id")
);
--> statement-breakpoint
ALTER TABLE "l113_batch_students" ADD CONSTRAINT "l113_batch_students_batch_id_l113_batches_id_fk" FOREIGN KEY ("batch_id") REFERENCES "public"."l113_batches"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "l113_batch_students" ADD CONSTRAINT "l113_batch_students_vg_leader_id_victory_group_leaders_id_fk" FOREIGN KEY ("vg_leader_id") REFERENCES "public"."victory_group_leaders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "l113_check_ins" ADD CONSTRAINT "l113_check_ins_schedule_date_id_l113_schedule_dates_id_fk" FOREIGN KEY ("schedule_date_id") REFERENCES "public"."l113_schedule_dates"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "l113_check_ins" ADD CONSTRAINT "l113_check_ins_vg_leader_id_victory_group_leaders_id_fk" FOREIGN KEY ("vg_leader_id") REFERENCES "public"."victory_group_leaders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "l113_schedule_dates" ADD CONSTRAINT "l113_schedule_dates_schedule_id_l113_schedules_id_fk" FOREIGN KEY ("schedule_id") REFERENCES "public"."l113_schedules"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "l113_schedules" ADD CONSTRAINT "l113_schedules_batch_id_l113_batches_id_fk" FOREIGN KEY ("batch_id") REFERENCES "public"."l113_batches"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "l113_spiritual_disciplines" ADD CONSTRAINT "l113_spiritual_disciplines_batch_id_l113_batches_id_fk" FOREIGN KEY ("batch_id") REFERENCES "public"."l113_batches"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "l113_spiritual_disciplines" ADD CONSTRAINT "l113_spiritual_disciplines_vg_leader_id_victory_group_leaders_id_fk" FOREIGN KEY ("vg_leader_id") REFERENCES "public"."victory_group_leaders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "l113_student_evaluations" ADD CONSTRAINT "l113_student_evaluations_schedule_id_l113_schedules_id_fk" FOREIGN KEY ("schedule_id") REFERENCES "public"."l113_schedules"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "l113_student_evaluations" ADD CONSTRAINT "l113_student_evaluations_vg_leader_id_victory_group_leaders_id_fk" FOREIGN KEY ("vg_leader_id") REFERENCES "public"."victory_group_leaders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "l113_teacher_evaluations" ADD CONSTRAINT "l113_teacher_evaluations_schedule_id_l113_schedules_id_fk" FOREIGN KEY ("schedule_id") REFERENCES "public"."l113_schedules"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "l113_teacher_evaluations" ADD CONSTRAINT "l113_teacher_evaluations_vg_leader_id_victory_group_leaders_id_fk" FOREIGN KEY ("vg_leader_id") REFERENCES "public"."victory_group_leaders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "l113_batch_students_vg_leader_id_idx" ON "l113_batch_students" USING btree ("vg_leader_id");--> statement-breakpoint
CREATE INDEX "l113_check_ins_vg_leader_id_idx" ON "l113_check_ins" USING btree ("vg_leader_id");--> statement-breakpoint
CREATE INDEX "l113_schedules_batch_id_idx" ON "l113_schedules" USING btree ("batch_id");--> statement-breakpoint
CREATE INDEX "l113_spiritual_disciplines_vg_leader_id_idx" ON "l113_spiritual_disciplines" USING btree ("vg_leader_id");--> statement-breakpoint
CREATE INDEX "l113_student_evaluations_vg_leader_id_idx" ON "l113_student_evaluations" USING btree ("vg_leader_id");--> statement-breakpoint
CREATE INDEX "l113_teacher_evaluations_vg_leader_id_idx" ON "l113_teacher_evaluations" USING btree ("vg_leader_id");