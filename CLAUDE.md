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
Five core tables:
- `participants` — registrants with ~60 fields (personal info, life stage, discipler info, baptism status, etc.)
- `disciplers` — the people who lead participants; referenced by participants
- `classSessions` — scheduled sessions (supports `isVictoryDay` and `allowsWalkIn` flags)
- `checkIns` — attendance junction: `participantId × classSessionId`
- `users` — admin accounts with hashed passwords (bcryptjs); roles: `admin_volunteer`, `developer`
- `loginLogs` — audit log for login attempts

### Patterns
**Mutations use Server Actions**, not API routes. Each page route folder contains an `actions.ts` with `'use server'` functions (e.g., `src/app/register/actions.ts`, `src/app/admin/actions.ts`). Database queries are written directly in Drizzle inside these action files.

**API routes** (`src/app/api/`) exist only for: health check, disciplers autocomplete, and Excel exports (using `xlsx`).

**Auth flow:** `src/lib/auth.ts` exports `getSession()` (reads + verifies cookie) and `setSessionCookie()` / `clearSessionCookie()`. Pages call `getSession()` at the top to gate access; login/logout are Server Actions in `src/app/login/actions.ts`.

**Path alias:** `@/*` maps to `src/*`.

### Environment variables
- `DATABASE_URL` — pooled connection (used by the app at runtime)
- `DATABASE_URL_UNPOOLED` — direct connection (used by Drizzle migrations)
- `SESSION_SECRET` — JWT signing secret
