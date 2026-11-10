CREATE INDEX "auto_journey_steps_participant_id_idx" ON "auto_journey_steps" USING btree ("participant_id");--> statement-breakpoint
CREATE INDEX "auto_journey_steps_class_session_id_idx" ON "auto_journey_steps" USING btree ("class_session_id");--> statement-breakpoint
CREATE INDEX "event_check_ins_vg_leader_id_idx" ON "event_check_ins" USING btree ("vg_leader_id");--> statement-breakpoint
CREATE INDEX "event_check_ins_intern_id_idx" ON "event_check_ins" USING btree ("intern_id");--> statement-breakpoint
CREATE INDEX "event_registrations_vg_leader_id_idx" ON "event_registrations" USING btree ("vg_leader_id");--> statement-breakpoint
CREATE INDEX "intern_event_registrations_intern_id_idx" ON "intern_event_registrations" USING btree ("intern_id");--> statement-breakpoint
CREATE INDEX "interns_victory_group_id_idx" ON "interns" USING btree ("victory_group_id");--> statement-breakpoint
CREATE INDEX "leadership_group_members_member_idx" ON "leadership_group_members" USING btree ("member_vg_leader_id");--> statement-breakpoint
CREATE INDEX "login_logs_logged_at_idx" ON "login_logs" USING btree ("logged_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "login_logs_user_id_idx" ON "login_logs" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "participants_vg_leader_id_idx" ON "participants" USING btree ("vg_leader_id");--> statement-breakpoint
CREATE INDEX "participants_discipler_id_idx" ON "participants" USING btree ("discipler_id");--> statement-breakpoint
CREATE INDEX "sms_logs_participant_id_idx" ON "sms_logs" USING btree ("participant_id");--> statement-breakpoint
CREATE INDEX "sms_logs_created_at_idx" ON "sms_logs" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "victory_group_leaders_own_vg_leader_id_idx" ON "victory_group_leaders" USING btree ("own_vg_leader_id");--> statement-breakpoint
CREATE INDEX "victory_groups_vg_leader_id_idx" ON "victory_groups" USING btree ("vg_leader_id");