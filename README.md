# Discipleship Journey

Registration and check-in system for Victory Iloilo discipleship classes.

## Stack

- **Next.js 16** App Router · **React 19**
- **Drizzle ORM** on PostgreSQL
- **Tailwind CSS 4**
- JWT sessions via `jose` (`dj_session` cookie)

## Local setup

```bash
# 1. Start Postgres
docker compose up -d        # postgres:16 on :5432, Adminer on :8080

# 2. Copy and fill in env
cp .env.example .env.local  # set DATABASE_URL, DATABASE_URL_UNPOOLED, SESSION_SECRET

# 3. Apply schema
nvm use 24
npm install
npm run db:migrate

# 4. (Optional) seed data
npm run db:seed

# 5. Run dev server
npm run dev                 # http://localhost:3000
```

## Commands

```bash
npm run dev           # dev server (binds 0.0.0.0)
npm run build         # production build
npm run lint          # ESLint

npm run db:generate   # generate migration files from schema changes
npm run db:migrate    # apply pending migrations (DATABASE_URL_UNPOOLED)
npm run db:push       # push schema without migration files (dev only)
npm run db:studio     # Drizzle Studio GUI
npm run db:seed       # seed database
```

## Features

- **Public registration** — multi-step form with review page; walk-ins supported; minimum age 13
- **Admin check-in** — volunteers check participants in per session; batch-filtered; optional QR scan (`qr_checkin` flag)
- **Participant management** — table view, search, Victory Weekend done/not-done filter, edit, soft-delete
- **Batch management** — class batches scope sessions, check-in, and all reports; default batch auto-selected
- **Session management** — create/edit class sessions with Victory Day, walk-in, and batch assignment
- **VG Leaders** — manage Victory Group leaders and their group schedules
- **SMS sender** — blast SMS to a session's participants via Traccer API; reusable message templates; API key CRUD; gated by `sms_sender` feature flag
- **Reports** — check-ins, registrations (per worship service), demographics, funnel, class-category, remittance (AR summary with date range), collection monitoring; all batch-scoped
- **Developer admin** — full data access, exports, batches CRUD, and login audit logs (`developer` role)
- **Feature flags** — runtime toggles stored in the `feature_flags` table (e.g. `qr_checkin`, `sms_sender`)

## Future ideas

- **Live participant counter** — a client component polling `SELECT COUNT(*) FROM participants` every 5–10s via a lightweight API route. Simple polling is sufficient (no WebSockets needed). Display on the admin dashboard or registration success page.

## Roles

| Role | Access |
|---|---|
| `admin_volunteer` | Check-in, participants, sessions, VG leaders, reports |
| `developer` | Everything above + devops-admin area + exports |
