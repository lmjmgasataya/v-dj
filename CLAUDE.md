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

Local Postgres runs via Docker:
```bash
docker compose up -d  # Starts postgres:16 on :5432 and Adminer on :8080
```

## Architecture

**Discipleship Journey** — a registration and check-in system for Victory Iloilo church. Participants register for discipleship classes; admins check them in per session.

### Stack
- **Next.js 16 App Router** with React 19 — all pages under `src/app/`
- **Drizzle ORM** on PostgreSQL — schema in `src/db/schema/index.ts`, client in `src/db/index.ts`
- **JWT sessions** via `jose` — implementation in `src/lib/auth.ts`, stored in `dj_session` cookie (12h expiry, HS256)
- **Tailwind CSS 4** for styling

### Data model
Eight tables:
- `participants` — registrants with personal info, life stage, discipler/VG leader refs, baptism status, walk-in flag, etc.
- `disciplers` — people who disciple participants; referenced by `participants.disciplerId`
- `victoryGroupLeaders` — VG leaders with personal info; referenced by `participants.vgLeaderId`
- `victoryGroups` — VG schedules (place, day, time, frequency) owned by a `victoryGroupLeader`
- `classSessions` — scheduled sessions (supports `isVictoryDay` and `allowsWalkIn` flags)
- `checkIns` — attendance junction: `participantId × classSessionId`
- `users` — admin accounts with hashed passwords (bcryptjs); roles: `admin_volunteer`, `developer`
- `loginLogs` — audit log for login attempts
- `featureFlags` — key/boolean table for runtime feature toggles (e.g. new datepicker UI)

### Route sections
- `src/app/register/` — public registration form + success page
- `src/app/admin/` — check-in workflow for `admin_volunteer` role
- `src/app/participants/` — participant list, detail (`[id]`), edit (`[id]/edit`), and deleted list
- `src/app/sessions/` — session list, new session, and edit (`[id]/edit`)
- `src/app/vg-leaders/` — VG leader list, new (`new`), and edit (`[id]/edit`)
- `src/app/report/` — reporting dashboards: `checkins`, `class-category`, `demographics`, `funnel`, `registrations`
- `src/app/devops-admin/` — `developer`-role-only area: participants, class-sessions, check-ins, disciplers, VG groups/leaders, login-logs, data tools
- `src/app/login/` — login page; Server Actions handle auth

### Patterns
**Mutations use Server Actions**, not API routes. Each page route folder contains an `actions.ts` with `'use server'` functions (e.g., `src/app/register/actions.ts`, `src/app/admin/actions.ts`). Database queries are written directly in Drizzle inside these action files.

**API routes** (`src/app/api/`) exist only for:
- `health` — health check
- `keep-alive` — pings the DB to prevent idle connection drops
- `disciplers` — autocomplete search
- `vg-leaders` — autocomplete search
- `participants/export` — Excel export via `xlsx`
- `sessions/[id]/export` — per-session Excel export
- `devops-admin/export` — full data export for developers

**Auth flow:** `src/lib/auth.ts` exports `getSession()` (reads + verifies cookie) and `setSessionCookie()` / `clearSessionCookie()`. Pages call `getSession()` at the top to gate access; login/logout are Server Actions in `src/app/login/actions.ts`. Role `developer` gets access to `devops-admin`; `admin_volunteer` gets access to `admin`, `participants`, `sessions`, `vg-leaders`, and `report`.

**Path alias:** `@/*` maps to `src/*`.

### Environment variables
- `DATABASE_URL` — pooled connection (used by the app at runtime)
- `DATABASE_URL_UNPOOLED` — direct connection (used by Drizzle migrations)
- `SESSION_SECRET` — JWT signing secret
