# RouteBoard

School bus boarding and parent alerts. A driver taps a child's name at the
stop; every guardian gets an SMS within seconds, and the transport desk sees
the whole fleet on one sheet.

Pre-pilot. No hardware, no parent app.

## What it does

Four moments make up a school day, and the product is shaped around them:
boarded at the stop, reached school, boarded for home, got off at the stop.
Each is one tap, one row in an append-only event log, and one SMS per guardian.

- **Admin** — students with CSV import, buses, staff, schedule, message log,
  today's exceptions, a route and stop planner on a map, and **route planning
  from where children live**: stops worked out from home coordinates, split
  across the fleet under real capacities, each run ordered and timed back from
  the bell. Nothing is written until the draft is accepted.
- **Driver** — installable PWA. Taps queue offline and replay, stamped with a
  client-generated id so a replay cannot double-notify. GPS fixes every 8s
  behind a screen wake lock.
- **Parent** — no login, nothing to install. One SMS, and a link to a live map
  that expires with the trip's service date.

## Stack

Next.js 16 (App Router) · React 19 · Tailwind 4 · Drizzle ORM · Neon Postgres ·
Leaflet · Motion. One deploy, no separate API server, no websocket server.

Authorization lives in the database: every tenant table carries `school_id` and
is under forced row-level security, so a bug in application code cannot read
another school's rows.

## Running it

```bash
npm install
cp .env.example .env.local        # fill in the values
npm run db:migrate drizzle/0000_*.sql   # one file at a time, oldest first
npm run db:setup-roles            # creates the restricted app role and RLS policies
npm run db:seed                   # one demo school, routes, students, a trip
npm run dev
```

The seed prints its own login credentials. With no SMS credentials set, messages
are logged to the console instead of sent.

## Checks

```bash
npm run check:sms     # every SMS body fits one 160-char segment at worst case
npm run check:gps     # fix-age arithmetic is clock-skew proof, thresholds hold
npm run check:flow    # every notifiable event has an outbox row that resolves
npm run check:routing # capacity, walking distance, ride ceiling and stop order hold
npm run check:city    # the landing page's drawn city is seeded and its buses use streets
npm run db:verify     # RLS actually refuses cross-tenant reads
```

## Deploying

Set these in the Vercel project before the first deploy: `DATABASE_URL`,
`MIGRATE_DATABASE_URL`, `AUTH_SECRET`, `CRON_SECRET`, `NEXT_PUBLIC_APP_URL`,
and the three `TWILIO_*` values when you have them. The build does not need a
database — every data route is dynamic — but every page does at runtime.

**The outbox needs a minute-level sweep, and Vercel's Hobby plan cannot give
it one.** Hobby allows a cron at most once a day, so `vercel.json` declares a
02:00 sweep and nothing more. The normal path does not depend on it: a driver
tap drains that school's outbox inline through `after()`, so a parent is
messaged within seconds. The cron exists for the ones that failed — a provider
outage, a rate limit — and a 24-hour retry window is not acceptable for those.

Until the project is on Pro, point an external scheduler at the endpoint every
minute or two:

```
GET https://<your-domain>/api/cron/outbox
Authorization: Bearer <CRON_SECRET>
```

On Pro, set the schedule in `vercel.json` back to `* * * * *` and drop the
external scheduler.

## Other scripts

```bash
npm run icons         # re-render the PWA icons from public/icon.svg
npm run form:doc      # regenerate docs/ONBOARDING-INTAKE.md from the form definition
npm run outbox        # show pending and failed messages
```

## Layout

```
app/            landing, /admin, /drive, /t/[token], /api
components/     the chart primitives the whole UI is built from
lib/            auth, notifications, templates, tracking refs, GPS thresholds
db/             schema and the per-school transaction helper
drizzle/        migrations
scripts/        seed, checks, icon build, onboarding form
docs/           onboarding intake questionnaire
demo/           early design exploration, superseded
```

`PRODUCT.md` records what the product is and what may never be claimed about
it. `DESIGN.md` records the design system.
