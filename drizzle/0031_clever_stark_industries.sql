-- Disciplers → VG Leaders merge (see DISCIPLERS_MIGRATION.md)
-- 1. Backfill victory_group_leaders from disciplers: insert any discipler that doesn't already
--    match an existing VG leader on (last_name, first_name, mobile_number), case-insensitively
--    and trimmed. Duplicates from casing/mobile-number mismatches are not deduped here — per
--    product decision, those get cleaned up manually via the VG leaders admin UI afterward.
INSERT INTO "victory_group_leaders" ("last_name", "first_name", "mobile_number", "facebook_messenger_name")
SELECT d."last_name", d."first_name", d."mobile_number", d."messenger_name"
FROM "disciplers" d
WHERE NOT EXISTS (
  SELECT 1 FROM "victory_group_leaders" v
  WHERE lower(trim(v."last_name")) = lower(trim(d."last_name"))
    AND lower(trim(v."first_name")) = lower(trim(d."first_name"))
    AND trim(v."mobile_number") = trim(d."mobile_number")
);--> statement-breakpoint

-- 2. Drop the old FK (participants.discipler_id -> disciplers.id) *before* repointing values —
--    it must not still be validating against `disciplers` once we start writing
--    victory_group_leaders ids into that column.
ALTER TABLE "participants" DROP CONSTRAINT "participants_discipler_id_disciplers_id_fk";--> statement-breakpoint

-- 3. Repoint participants.discipler_id from the old disciplers.id to the matching
--    victory_group_leaders.id (the row inserted in step 1, or a pre-existing VG leader match).
--    Participants whose discipler_id was already a dangling reference (no matching disciplers
--    row — pre-existing bad data) fall back to NULL rather than blocking the migration.
UPDATE "participants" p
SET "discipler_id" = (
  SELECT v."id"
  FROM "disciplers" d
  JOIN "victory_group_leaders" v
    ON lower(trim(v."last_name")) = lower(trim(d."last_name"))
   AND lower(trim(v."first_name")) = lower(trim(d."first_name"))
   AND trim(v."mobile_number") = trim(d."mobile_number")
  WHERE d."id" = p."discipler_id"
  LIMIT 1
)
WHERE p."discipler_id" IS NOT NULL;--> statement-breakpoint

-- 4. Drop disciplers now that nothing references it.
ALTER TABLE "disciplers" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
DROP TABLE "disciplers" CASCADE;--> statement-breakpoint

-- 5. Add the new FK now that discipler_id values are all valid victory_group_leaders ids (or NULL).
ALTER TABLE "participants" ADD CONSTRAINT "participants_discipler_id_victory_group_leaders_id_fk" FOREIGN KEY ("discipler_id") REFERENCES "public"."victory_group_leaders"("id") ON DELETE no action ON UPDATE no action;
