# Disciplers → VG Leaders merge — migration plan

## Decision (2026-08-13)

Open questions 1 & 2 (below) are resolved: **repoint, don't delete.**

- The registration-time "discipler" picker stays. It's a distinct product concept from "VG
  leader" (mutually exclusive per participant via the `showVgLeader` toggle in
  `register/actions.ts`, and drives a different SMS template via
  `getDisciplerNotificationTemplate()`). What changes is only *where the person record lives*:
  `participants.disciplerId` keeps its own column and its own semantics, but its FK target moves
  from `disciplers.id` to `victoryGroupLeaders.id`.
  - This means the "Goal" section below is slightly stale: `participants.disciplerId` does **not**
    go away — only the `disciplers` *table* does. `disciplerId` and `vgLeaderId` remain two
    separate nullable FK columns on `participants`, both pointing at `victoryGroupLeaders`, because
    they encode two different roles a VG leader row can play for a given participant, not two
    different entity types.
- The SMS sender's "Disciplers" recipient tab stays as-is (not merged into the VG leaders tab,
  not deleted). `getDisciplersByBatch()` keeps its shape — `selectDistinct` on the referenced
  person, filtered by `participants.batchId` and `isNotNull(participants.disciplerId)` — it just
  joins against `victoryGroupLeaders` instead of `disciplers`. No new table needed: "who is a
  discipler in batch N" is fully derivable as "distinct `victoryGroupLeaders` rows referenced by
  `participants.disciplerId` within that batch," exactly the query that exists today.
- Practical consequence: every place that currently reads/writes `disciplerId` against the
  `disciplers` table gets **repointed** to `victoryGroupLeaders`, not removed. The checklist below
  is updated accordingly. The only things that still get *deleted* are the standalone
  `disciplers`-table CRUD/admin surfaces that have no equivalent once the table is gone (see
  checklist).

## Goal

Remove the `disciplers` table entirely. Every discipler-as-a-database-row becomes a
`victoryGroupLeaders` row. `participants.disciplerId` **stays** as a column (see Decision above)
but its FK target changes from `disciplers.id` to `victoryGroupLeaders.id`. `vgLeaderId` keeps
its existing meaning ("who leads this person's Victory Group") — the two columns continue to be
populated by mutually exclusive registration paths, they just now share one target table.

## How big is this, really?

Bigger than it looks at first glance — not because the data migration is hard, but because
"discipler" is a first-class concept sprinkled across **~25 files**: 2 schema tables/columns, 7
server-action files, 10 UI components/pages, 1 API route (+3 export routes), 2 nav/feature-flag
entries, and one existing-but-inconsistent "promote to VG leader" flow that this migration
effectively replaces and must reconcile with.

There **is** a strong precedent already in this codebase for exactly this shape of migration:
`drizzle/0008_discipler_fk.sql` did the same maneuver in reverse-ish direction (denormalized
discipler columns on `participants` → normalized `disciplerId` FK: backfill by matching
name+mobile, then drop the old columns). Reuse that pattern.

Rough sizing: **schema + data backfill is a half-day**; **rewiring every UI/action reference is
the bulk of the work**, roughly 1-2 days. Per the Decision above, the discipler-specific UI (its
own form section, its own SMS recipient tab) is *repointed*, not removed — only the standalone
`disciplers`-table admin CRUD page and the "promote to VG leader" flow get deleted outright, since
those have no equivalent once the table is gone.

## Data model today

```
disciplers                          victoryGroupLeaders
  id                                  id
  lastName        NOT NULL            lastName        NOT NULL
  firstName       NOT NULL            firstName       NOT NULL
  mobileNumber    NOT NULL            middleInitial
  messengerName                       nickname
                                       mobileNumber    nullable
  unique(lastName, firstName,         age
         mobileNumber)                gender
                                       lifestage (enum)
                                       serviceAttending
                                       facebookMessengerName   -- ~= disciplers.messengerName
                                       discipleshipJourneyCompleted
                                       graduateOfLeadership113
                                       ownVgLeaderName
                                       profileCompleted NOT NULL default false
                                       createdAt NOT NULL default now
                                       deletedAt         -- soft-delete; disciplers has none
                                       unique(lastName, firstName, mobileNumber)   -- same 3 cols

participants
  disciplerId  -> disciplers.id   (nullable FK, no onDelete)   -- retargets to victoryGroupLeaders.id
  vgLeaderId   -> victoryGroupLeaders.id   (nullable FK, already exists)
```

After the merge, both `disciplerId` and `vgLeaderId` are nullable FKs to the same
`victoryGroupLeaders` table — the column stays named `disciplerId` (not renamed) since it still
means "who discipled this participant," distinct from `vgLeaderId`'s "who leads this
participant's Victory Group."

Both tables share the **identical** 3-column unique constraint, which is what makes a
match-and-merge approach tractable, and also what will bite us on duplicates (see below).

## Migration steps

### 1. Backfill `victoryGroupLeaders` from `disciplers`

For every `disciplers` row, either:
- **Match found**: an existing `victoryGroupLeaders` row with the same `(lastName, firstName,
  mobileNumber)` — case-insensitively, trimmed (don't rely on exact string equality; existing
  data casing is inconsistent — see `promoteDisciplerToVgLeader`'s use of `toTitleCase()` before
  insert, which today's data may or may not already have). Reuse that row's `id`.
- **No match**: insert a new `victoryGroupLeaders` row: `lastName`, `firstName` (title-cased),
  `mobileNumber`, `facebookMessengerName: messengerName`. Leave the rest null / `profileCompleted:
  false` (mirrors what `promoteDisciplerToVgLeader` already does today).

Build a mapping (implicitly, via a join on the same 3 columns) rather than a separate scratch
table — see the actual applied SQL in `drizzle/0031_clever_stark_industries.sql`, which does this
as a correlated subquery instead of a temp table.

Note there's no "backfill `participants.vgLeaderId`" step here — that was part of an earlier,
abandoned version of this plan where `disciplerId` got folded into `vgLeaderId`. Per the Decision
above, `disciplerId` stays its own column, so this step doesn't apply. (Open question 4 below is
similarly moot for the same reason.)

### 2. Retarget the FK and drop the old table

`participants.discipler_id` is **not** dropped (see Decision above) — only its FK target changes.
**Order matters**: the old FK constraint must be dropped *before* the UPDATE that repoints
`discipler_id`, not after — while it's still active it validates new values against `disciplers`,
not `victory_group_leaders`, so writing a VG-leader id into the column fails against the old
constraint. (This bit the first live attempt — see "What actually happened" below.)

- `ALTER TABLE participants DROP CONSTRAINT participants_discipler_id_disciplers_id_fk;`
- `UPDATE participants SET discipler_id = (SELECT v.id FROM disciplers d JOIN victory_group_leaders v ON <3-col match> WHERE d.id = participants.discipler_id LIMIT 1) WHERE discipler_id IS NOT NULL;`
  (repoints existing `discipler_id` values from old `disciplers.id`s to the new
  `victoryGroupLeaders.id`s; falls back to `NULL` for any participant whose old `discipler_id` was
  already a dangling reference with no matching `disciplers` row — see below)
- `DROP TABLE disciplers CASCADE;`
- `ALTER TABLE participants ADD CONSTRAINT participants_discipler_id_victory_group_leaders_id_fk FOREIGN KEY (discipler_id) REFERENCES victory_group_leaders (id);`

Same backfill-verify-then-cutover shape as `0008_discipler_fk.sql`, just retargeting a FK instead
of dropping a column.

**What actually happened when this ran against Supabase (2026-08-13):** the first attempt (with
the UPDATE before the DROP CONSTRAINT) failed with `insert or update on table "participants"
violates foreign key constraint "participants_discipler_id_disciplers_id_fk" ... Key
(discipler_id)=(77) is not present in table "disciplers"` — confirming both the ordering bug above
*and* a pre-existing data-integrity issue: at least one participant's `discipler_id` was already a
dangling reference (pointing at a `disciplers` row that no longer exists) before this migration
ever ran. The corrected migration's `LIMIT 1` subquery naturally resolves that case to `NULL`
(discipler unknown) rather than blocking — acceptable since the reference was already broken.
Applied via `--single-transaction` psql runs, so the failed first attempt rolled back cleanly with
no partial effect; full and public-schema `pg_dump` backups were taken beforehand (see `backups/`).

### 3. Reconcile the existing "promote discipler" flow

`src/app/manage-vg-leaders/actions.ts::promoteDisciplerToVgLeader` and the "Promote Disciplers to
VG Leaders" UI in `manage-vg-leaders/page.tsx` become **dead code** the moment `disciplers` is
gone — this whole feature (nav entry, page, action) gets deleted, not migrated. Its matching
logic (name-only, no mobile number) is weaker than the DB unique constraint anyway — don't reuse
it for the bulk backfill in step 1; write step 1's matching explicitly with all 3 columns.

## Full checklist of touch points

**Schema** (`src/db/schema/index.ts`)
- [ ] Drop `disciplers` table definition + its `Discipler` type export.
- [ ] Retarget `participants.disciplerId`'s `.references()` from `disciplers.id` to
      `victoryGroupLeaders.id`. Column stays (name and all).
- [ ] Remove the now-unused `disciplers` import wherever referenced; replace `Discipler`-typed
      values with `VictoryGroupLeader` where the repointed code still needs a person shape.

**Server actions / queries**
- [ ] `src/app/register/actions.ts` — `upsertDiscipler()` keeps its shape but writes into
      `victoryGroupLeaders` instead (effectively becomes a copy of `upsertVgLeader()`, so consider
      collapsing them into one shared helper once repointed). The `!showVgLeader` path itself is
      unchanged.
- [ ] `src/app/participants/[id]/edit/actions.ts` — repoint its `upsertDiscipler()` twin the same way.
- [ ] `src/app/participants/[id]/edit/page.tsx` — repoint the `disciplers` left-join to
      `victoryGroupLeaders` (joined via `participants.disciplerId`), keep the data displayed.
- [ ] `src/app/participants/ParticipantList.tsx` — repoint the `disciplers` left-join the same way.
- [ ] `src/app/sessions/[id]/page.tsx` — repoint the `disciplers` left-join for attendee list.
- [ ] `src/app/sms-sender/actions.ts` — `getDisciplersByBatch()` keeps its shape and its own
      recipient tab; repoint its join from `disciplers` to `victoryGroupLeaders` (see Decision).
- [ ] `src/app/devops-admin/data/actions.ts` — remove the `"disciplers"` CSV import case (the raw
      table export/import goes away with the table; this is distinct from the per-participant
      discipler columns elsewhere, which are repointed, not removed).
- [ ] `src/app/devops-admin/data/page.tsx` — remove `disciplers` from row counts,
      `EXPORT_TABLES`, `IMPORT_TABLES`.
- [ ] `src/app/devops-admin/disciplers/actions.ts` + `page.tsx` — delete entirely (this was a CRUD
      admin page for the standalone `disciplers` table; once merged, those records are managed
      through the existing VG leaders devops-admin page instead).
- [ ] `src/app/manage-vg-leaders/actions.ts` — delete `promoteDisciplerToVgLeader` (no longer
      meaningful once there's no separate table to promote *from*).
- [ ] `src/app/manage-vg-leaders/page.tsx` — delete the "unlinked disciplers" promote UI.

**UI components**
- [ ] `src/components/DisciplerAutocomplete.tsx` — **delete now, independent of this migration**;
      confirmed dead code (unused anywhere).
- [ ] `src/components/DisciplerFields.tsx` — **keeps its UI as-is** (per Decision, the picker
      stays); just retype its `Discipler` import to `VictoryGroupLeader` to match the schema change.
      Its `/api/disciplers?q=` search call can stay pointed at the same route path (see API routes
      below) so this component needs no behavioral change, only the type import.
- [ ] `src/app/register/RegisterForm.tsx` — no removal; `DisciplerFields` usage and the "One2One
      Discipler Information" section stay as they are.
- [ ] `src/app/participants/[id]/edit/EditForm.tsx` — same, no removal.
- [ ] `src/app/participants/ParticipantTable.tsx` — keep the 3 "Discipler…" `Detail` rows, just
      sourced from the repointed join.
- [ ] `src/app/sessions/[id]/AttendeeList.tsx` — keep discipler props/display, repointed.
- [ ] `src/app/devops-admin/DevopsNav.tsx` — remove "Disciplers" nav link (the standalone admin
      CRUD page for the dropped table, not the participant-level discipler display).
- [ ] `src/app/devops-admin/page.tsx` — remove `autocomplete_disciplers` feature flag label (and
      the flag row itself via a data-tools cleanup, or just leave the flag key orphaned — cheap
      either way, but note it so it's not mysterious later).
- [ ] `src/app/manage-vg-leaders/ManageVgLeadersNav.tsx` — remove "Promote Disciplers" link.
- [ ] `src/app/manage-vg-leaders/layout.tsx` — update description copy.
- [ ] `src/app/page.tsx` — update home dashboard copy ("Promote disciplers and manage portal
      accounts" → something VG-leader-only; the promote flow is gone even though disciplers
      themselves aren't).
- [ ] `src/app/sms-sender/SmsSenderClient.tsx` — no removal; the `"disciplers"` `RecipientTab`
      entry (type/label map/tab loader/tab list) stays as its own tab.

**API routes / exports**
- [ ] `src/app/api/disciplers/route.ts` — **repoint, don't delete**; it's the live autocomplete
      endpoint behind `DisciplerFields.tsx`'s inline search (not dead code — that was
      `DisciplerAutocomplete.tsx`, a separate, unused component). Change its query to search
      `victoryGroupLeaders` instead of `disciplers`; the route path and response shape can stay
      the same so the component doesn't need to change.
- [ ] `src/app/api/participants/export/route.ts` — repoint the `disciplers` join to
      `victoryGroupLeaders`, keep the 4 "Discipler…" export columns.
- [ ] `src/app/api/sessions/[id]/export/route.ts` — repoint the `disciplers` join, keep the 3
      export columns.
- [ ] `src/app/api/devops-admin/export/route.ts` — remove the `"disciplers"` export case (the raw
      table export, same reasoning as the CSV import case above).

**Not affected** (confirmed via full-repo grep, no changes needed):
- `src/app/report/**` — no discipler references anywhere in reporting.
- `src/app/participants/print-ids/**` — no discipler references.
- `src/app/vg-portal/**` — already fully clean of discipler logic (confirmed while building the
  PIN-based portal redesign).
- `src/db/seed.ts`, `src/db/seed-users.ts` — no discipler references.

## Open questions to settle before writing code

1. ~~**What replaces the registration-time "discipler" choice?**~~ **RESOLVED (see Decision
   above):** same UI, repointed data source. `DisciplerFields`/`RegisterForm.tsx`/`EditForm.tsx`
   are unchanged in behavior; only their underlying data source (and the `Discipler` →
   `VictoryGroupLeader` type) moves.
2. ~~**SMS sender "Disciplers" tab**~~ **RESOLVED (see Decision above):** tab stays, sourced from
   `victoryGroupLeaders` via `participants.disciplerId` (not "all VG leaders" — still scoped to
   people actually referenced as a discipler).
3. ~~**Duplicate handling during backfill**~~ **RESOLVED (2026-08-13):** not worth engineering
   around. Match on all 3 columns as planned; anything that doesn't auto-match creates a new
   `victoryGroupLeaders` row, and any resulting duplicates get cleaned up manually via the existing
   VG leaders admin UI afterward rather than blocking the migration on a dedup pass.
4. ~~**`participants.vgLeaderId` already nullable and already populated for some rows**~~ **MOOT:**
   this was only a concern under the abandoned "fold `disciplerId` into `vgLeaderId`" plan. Since
   `disciplerId` stays its own column (Decision above), there's no vgLeaderId backfill step and
   nothing to conflict.

## Suggested order of operations — as actually done (2026-08-13)

1. ~~Run the duplicate/collision data review~~ — skipped, per Decision on open question 3.
2. ~~Decide open questions 1 & 2~~ — done, see Decision above.
3. Ship the UI/action/API repoints from the checklist — done first, verified with `npm run lint`
   and `npm run build` (both clean) before touching the live database.
4. Generate the schema-only diff with `drizzle-kit generate`, then hand-edit the resulting SQL to
   insert the backfill/repoint logic (steps 1-2 above) in the correct order — see
   `drizzle/0031_clever_stark_industries.sql`.
5. Take a full `pg_dump` backup (all schemas) and a `public`-schema-only `pg_dump`, both via a
   throwaway `postgres:17` Docker container against `DATABASE_URL_UNPOOLED` (no local Postgres
   needed) — saved under `backups/`.
6. Apply the migration directly with `psql -v ON_ERROR_STOP=1 --single-transaction -f
   drizzle/0031_clever_stark_industries.sql` via the same Docker container. **Not** via `npm run
   db:migrate` — this project's `drizzle.__drizzle_migrations` tracking table exists but has zero
   rows (schema has only ever been synced with `db:push`), so `migrate` tries to replay all prior
   migration files from scratch and fails/hangs. **Not** via `npm run db:push` either — push only
   diffs and syncs schema (DDL); it has no mechanism to run the backfill/repoint UPDATE, so it
   would drop `disciplers` and swap the FK target without migrating any data, silently orphaning
   every participant's discipler reference.
7. Delete `DisciplerAutocomplete.tsx` any time — it's unused today regardless of this migration
   (already done alongside the UI repoints in step 3).
