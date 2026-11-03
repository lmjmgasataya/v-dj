# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

Installable as a PWA ("DJ Check-in", `start_url` `/admin`), used mostly on phones at the venue and on desktop for admin and reporting.

## Users

All four groups are in scope for design work:

- **Check-in volunteers** (`admin_volunteer`): check participants in at class sessions, usually on a phone at the door, often with a queue waiting. They also manage participants, sessions and batches, and read reports.
- **Registrants**: people aged 13 and up, often first-timers, joining a Discipleship Journey batch. They don't open `/register` themselves (it needs a volunteer login). At the registration table, on a volunteer's laptop or tablet, the form is handed back and forth: the registrant types their own details, their One2One discipler fills in the discipler part, and the admin volunteer finishes payment (receipt number, their own name) and the review step. Walk-ins register at the session.
- **VG leaders**: Victory Group leaders who use the VGL Portal (`/vg-portal`) to claim their record, sign in, keep their profile up to date, and register and check in for events. Many are not comfortable with technology.
- **Lead pastors and developers** (`lead_pastor`, `developer`): read the VG leader, snapshot, Discipleship Journey and L113 reports. Developers also manage all data, feature flags and exports in `/devops-admin`. Lead pastors get read-only access to leader lists and profiles.

## Product Purpose

Victory Iloilo's internal system for running the Discipleship Journey: registering participants into class batches, checking them in to each session, tracking who has finished which steps, and giving pastors an accurate picture of their VG leaders and the leadership pipeline (through Leadership 113). It works when check-in is fast and reliable at the door, registration is easy to finish, and the reports can be trusted for pastoral decisions.

## Positioning

It is built around Victory Iloilo's own discipleship model, not a generic event or attendance tool: batches with repeating class names and make-up rules, fee categories A–D, Victory Day and Victory Weekend, the worship-service order (9AM, 11AM, 2PM, 4PM, 6PM Mandurriao; 10AM, 1PM Lapaz), discipler and VG leader relationships, and Discipleship Journey steps marked automatically from attendance.

## Operating Context

- Class sessions run with volunteers checking people in on their own phones. Check-in uses search or a QR scan of the participant's printed ID card (`dj:participant:{id}`), with an optional confirmation popup, automatic On-time/Late marking, and table assignment.
- Venue internet is weak. Offline check-in (`offline_checkin`) queues check-ins locally and syncs them later, and `checkin_timeout_fallback` saves locally when a request is slow.
- Devices are often low-end Android phones.
- Printed ID cards come from `/participants/print-ids`.
- Participants and leaders are reached by SMS through the Traccer API (blasts, templates, event reminders).
- Events for VG leaders, Leadership Group leaders and interns have their own registration, check-in and SMS reminders (`/event-registration`).

## Capabilities and Constraints

- **Stack (existing):** Next.js 16 App Router, React 19, Tailwind CSS 4, Drizzle on Supabase Postgres. Mutations go through Server Actions.
- **New UI behind a feature flag:** any redesigned UI ships behind a feature flag so it can be switched on and off, with the current UI working until then. Flags are app-wide booleans in the `feature_flags` table, toggled from the `/devops-admin` overview (listed in `FLAG_GROUPS`). Each portal gets its own new-UI flag (for example check-in/admin, registration, VGL Portal, reports), so each can be proven and rolled back separately.
- **Roles and gating:** `admin_volunteer`, `lead_pastor` and `developer`, enforced both in pages and in `src/proxy.ts`. VG leaders sign in separately in the VGL Portal.
- **Language:** English. No other language has been requested.
- **Terminology** (use as-is): Discipleship Journey (DJ), batch, class session, Victory Day, Victory Weekend, Victory Group (VG), VG leader (VGL), Leadership Group leader (LGL), discipler, intern, Leadership 113 (L113), fee categories A–D, walk-in, check-in statuses On-time, Late and Absent (15+ minutes late, which doesn't count as attendance).

## Brand Commitments

- Keep the Victory blue `#00428E` and the DJ logo (`public/dj-logo.png`).
- Nothing else about the current look is binding.
- **Familiar over novel, app-wide.** Redesigns use the standard, familiar style of their category (a check-in screen should look like a check-in app), not a themed or invented visual world. The polish bar is Planning Center Check-Ins and Luma's event check-in: match how carefully they're made, without copying them. (Chosen 2026-11-03 for `/admin`; applies to registration, the VGL Portal and reports too.)

## Evidence on Hand

- Logo: `public/dj-logo.png`.
- Real operational data: participants, sessions, check-ins and VG leaders in the production database.
- None of the following exist: testimonials, usage statistics or external claims. Don't invent them.

## Product Principles

1. **The door never waits on the network.** Check-in has to keep working, and keep feeling instant, on weak connections and slow phones.
2. **Designed for the phone in a volunteer's hand.** Low-end Android at venue conditions is the baseline, not an edge case.
3. **The VGL Portal is for people who don't like apps.** Each flow does one clear thing, in plain words, with as few steps as possible.
4. **Reports must be trustworthy.** Pastors make decisions from them, so they follow the attendance rules and service order exactly.
5. **Change is switchable.** New UI arrives behind a flag, next to the old one, until it has been proven.

## Accessibility & Inclusion

- The VGL Portal serves less tech-savvy leaders, some of them older, so readability and simple, forgiving flows come first there.
- Everything must stay usable on low-end Android devices.
- No formal standard (for example WCAG level) has been set yet.
