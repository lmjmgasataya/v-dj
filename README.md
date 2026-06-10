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

- **Public registration** — participants fill out a form; walk-ins are supported
- **Admin check-in** — volunteers check participants in per session
- **Participant management** — list, search, edit, soft-delete
- **Session management** — create/edit class sessions with Victory Day and walk-in flags
- **VG Leaders** — manage Victory Group leaders and their group schedules
- **Reports** — check-ins, registrations, demographics, funnel, and class-category dashboards
- **Developer admin** — full data access, exports, and login audit logs (`developer` role)
- **Feature flags** — runtime toggles stored in the `feature_flags` table

## Roles

| Role | Access |
|---|---|
| `admin_volunteer` | Check-in, participants, sessions, VG leaders, reports |
| `developer` | Everything above + devops-admin area + exports |
