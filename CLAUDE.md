# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md

## Commands

Run `nvm use 24` before any `npm` command.

```bash
# Development
npm run dev          # Start dev server (binds 0.0.0.0)
npm run build        # Production build
npm run lint         # ESLint

# Database
npm run db:generate  # Generate Drizzle migration files from schema changes
npm run db:migrate   # Apply pending migrations (uses DATABASE_URL_UNPOOLED)
npm run db:push      # Push schema directly without migration files (dev only)
npm run db:studio    # Open Drizzle Studio GUI
npm run db:seed      # Seed database (loads .env.local automatically)
```

There are no tests configured in this project.

The database is hosted on Supabase (not a local Docker Postgres) — `DATABASE_URL`/`DATABASE_URL_UNPOOLED` in `.env.local` point at it directly. Don't check for or start a local Docker Postgres container. To apply schema changes, run `npm run db:push` (it targets Supabase directly); don't assume `docker compose` is running.

### Database backup

Backups are plain-SQL `pg_dump`s run via Docker against `DATABASE_URL_UNPOOLED`, saved to `./backups/` — no local Postgres/`pg_dump` install needed. The Supabase project runs **PostgreSQL 17.6**, so use the matching `postgres:17-alpine` image. Run `--user "$(id -u):$(id -g)"` so output files are owned by the host user, not root.

When asked to "do a db backup" (or similar), produce **both** of these, using the same timestamp for the pair:
- **Full** — every schema (includes Supabase-managed `auth`/`storage`/etc.): `backups/backup_<YYYYMMDD_HHMMSS>.sql`
- **Public only** — just this app's own tables (`public` schema): `backups/backup_public_<YYYYMMDD_HHMMSS>.sql`

```bash
mkdir -p backups
TS=$(date +%Y%m%d_%H%M%S)
docker run --rm --env-file .env.local --user "$(id -u):$(id -g)" -v "$(pwd)/backups:/backups" postgres:17-alpine \
  sh -c "pg_dump \"\$DATABASE_URL_UNPOOLED\" -f /backups/backup_${TS}.sql"
docker run --rm --env-file .env.local --user "$(id -u):$(id -g)" -v "$(pwd)/backups:/backups" postgres:17-alpine \
  sh -c "pg_dump \"\$DATABASE_URL_UNPOOLED\" --schema=public -f /backups/backup_public_${TS}.sql"
```

`--env-file .env.local` passes `DATABASE_URL_UNPOOLED` into the container without ever printing the credential in a command line or tool output.

## Architecture

**Discipleship Journey** — a registration and check-in system for Victory Iloilo church. Participants register for discipleship classes; admins check them in per session.

### Stack
- **Next.js 16 App Router** with React 19 — all pages under `src/app/`
- **Drizzle ORM** on PostgreSQL — schema in `src/db/schema/index.ts`, client in `src/db/index.ts`
- **JWT sessions** via `jose` — implementation in `src/lib/auth.ts`, stored in `dj_session` cookie (12h expiry, HS256)
- **Tailwind CSS 4** for styling

### Data model
Twelve tables:
- `participants` — registrants with personal info, life stage, discipler/VG leader refs, baptism status, walk-in flag, etc. Notable fields: `preferredNameOnId` (used on printed ID cards), `registrationFee` (categories A–D), `isWalkIn`, `deletedAt` (soft-delete), `batchId` (FK to `batches`), `email`, `worshipServiceRegistered`, `isDoneWithVictoryWeekend`, `victoryDate` (age min 13 enforced at registration)
- `disciplers` — people who disciple participants; referenced by `participants.disciplerId`
- `victoryGroupLeaders` — VG leaders with personal info; referenced by `participants.vgLeaderId`
- `victoryGroups` — VG schedules (place, day, time, frequency) owned by a `victoryGroupLeader`
- `batches` — class batch periods with `classStartDate`/`classEndDate`/`registrationStartDate`, `isDefault` flag; used to scope sessions and reports
- `classSessions` — scheduled sessions (supports `isVictoryDay`, `allowsWalkIn`, and `batchId` FK)
- `checkIns` — attendance junction: `participantId × classSessionId`
- `users` — admin accounts with hashed passwords (bcryptjs); roles: `admin_volunteer`, `developer`
- `loginLogs` — audit log for login attempts
- `featureFlags` — key/boolean table for runtime feature toggles (e.g. `qr_checkin`, `sms_sender`)
- `smsMessageTemplates` — reusable SMS message templates with `title` and `message` body
- `smsApiKeys` — Traccer SMS API keys with `name`, `apiKey`, `endpoint`, `isDefault` flag

### Route sections
- `src/app/register/` — public registration form (with review page) + success page; minimum age 13 enforced
- `src/app/admin/` — check-in workflow for `admin_volunteer` role; includes `QrScanner.tsx` (uses `html5-qrcode`, gated by `qr_checkin` feature flag); filtered by batch
- `src/app/participants/` — participant list (table view, filterable by Victory Weekend done/not done), detail (`[id]`), edit (`[id]/edit`), deleted list, and print IDs (`print-ids/`)
- `src/app/sessions/` — session list, new session, edit (`[id]/edit`), and batch management (`batches/`)
- `src/app/manage-vg-leaders/` — `developer`-role-only VG leader management: leader list + edit (`leaders/[id]/edit`, includes their Victory Groups), reports (`report/`, `vg-report/`)
- `src/app/sms-sender/` — SMS blast tool (gated by `sms_sender` feature flag); select session, pick/edit message template, send via Traccer API; sub-route `message-templates/` for template CRUD
- `src/app/report/` — reporting dashboards: `checkins`, `class-category`, `demographics`, `funnel`, `registrations` (per worship service), `remittance` (AR summary with date range), `collection-monitoring`; all filtered by batch
- `src/app/devops-admin/` — `developer`-role-only area: participants, class-sessions, check-ins, disciplers, VG groups/leaders, login-logs, data tools, batches CRUD
- `src/app/login/` — login page; Server Actions handle auth

### Patterns
**Auth gating pattern** — any page that requires login:
```ts
const session = await getSession();
if (!session) redirect("/");
```
Role checks: `session.role === "developer"` for developer-only pages. `!!session` for any logged-in user.

**Mutations use Server Actions**, not API routes. Each page route folder contains an `actions.ts` with `'use server'` functions (e.g., `src/app/register/actions.ts`, `src/app/admin/actions.ts`). Database queries are written directly in Drizzle inside these action files.

**API routes** (`src/app/api/`) exist only for:
- `health` — health check
- `keep-alive` — pings the DB to prevent idle connection drops
- `disciplers` — autocomplete search
- `vg-leaders` — autocomplete search
- `participants/export` — Excel export via `xlsx`
- `sessions/[id]/export` — per-session Excel export
- `devops-admin/export` — full data export for developers
- `sms/` — SMS API key management (CRUD) and proxy to Traccer SMS endpoint
- `report/remittance` — remittance report data endpoint

**Auth flow:** `src/lib/auth.ts` exports `getSession()` (reads + verifies cookie) and `setSessionCookie()` / `clearSessionCookie()`. Pages call `getSession()` at the top to gate access; login/logout are Server Actions in `src/app/login/actions.ts`. Role `developer` gets access to `devops-admin` and `manage-vg-leaders`; `admin_volunteer` gets access to `admin`, `participants`, `sessions`, and `report`. `src/proxy.ts` (Next.js 16's replacement for `middleware.ts`) additionally enforces `developer`-only access to `/manage-vg-leaders/*` and a few other paths at the request level, independent of each page's own `getSession()` check.

**QR codes** — two libraries serve different purposes:
- `react-qr-code` (v2.2+) generates QR SVGs; value format is `dj:participant:{id}`. Used in `src/app/participants/[id]/edit/ParticipantQrCode.tsx` and `src/app/participants/print-ids/PrintIdsClient.tsx`.
- `html5-qrcode` (v2.3+) scans via camera; used in `src/app/admin/QrScanner.tsx` during check-in. Gated by the `qr_checkin` feature flag.

**Shared components** (`src/components/`):
- `Breadcrumbs` — renders a breadcrumb nav; accepts `items: { label, href? }[]`. Safe to import in client components.
- `NavigationProgress` — top-of-page loading bar; mounted once in `src/app/layout.tsx`.
- `DatePickerField` — controlled date input wrapper.
- `SubmitButton` — form submit button with loading state.
- `PageLoader` — full-page loading indicator.
- `DisciplerAutocomplete` / `DisciplerFields` — autocomplete + field set for discipler selection.
- `VgLeaderAutocomplete` / `VgLeaderFields` — autocomplete + field set for VG leader selection.

**Path alias:** `@/*` maps to `src/*`.

### Environment variables
- `DATABASE_URL` — pooled connection (used by the app at runtime)
- `DATABASE_URL_UNPOOLED` — direct connection (used by Drizzle migrations)
- `SESSION_SECRET` — JWT signing secret
