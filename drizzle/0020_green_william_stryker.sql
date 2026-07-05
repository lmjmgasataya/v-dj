CREATE INDEX "class_sessions_batch_id_idx" ON "class_sessions" USING btree ("batch_id");--> statement-breakpoint
CREATE INDEX "participants_batch_id_idx" ON "participants" USING btree ("batch_id");