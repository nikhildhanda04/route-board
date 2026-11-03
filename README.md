# RouteBoard

School bus boarding and parent alerts. A driver taps a child's name at the
stop; every guardian gets an SMS within seconds, and the transport desk sees
the whole fleet on one sheet.

Pre-pilot. No hardware, no parent app.

## What it does

Four moments make up a school day, and the product is shaped around them:
boarded at the stop, reached school, boarded for home, got off at the stop.
Each is one tap, one row in an append-only event log, and one SMS per guardian.

- **Admin** — students with CSV import, route and stop planner on a map, buses,
  staff, schedule, message log, and today's exceptions.
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
npm run db:migrate
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
npm run db:verify     # RLS actually refuses cross-tenant reads
```

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
