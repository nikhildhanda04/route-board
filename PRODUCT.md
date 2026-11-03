# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Primary buyer and admin user: the **school principal or transport head** at an
Indian private school running its own bus fleet. Desktop, at a desk, between
other work. Their job is to stop fielding parent phone calls, to know which
child was not on a bus before a parent does, and to be able to answer an
incident with a record rather than a memory.

Two further user roles, neither of whom buys:

- **Drivers and bus attendants** — a phone in one hand, a moving bus, poor
  signal, often limited literacy in English. Their entire job in the product is
  tapping names on a roster at a stop. Nothing else may compete with that.
- **Parents** — never log in, install nothing. They receive an SMS and
  sometimes tap one link. Many are on cheap phones with weak data.

## Product Purpose

Answer one question for a parent, four times a day, without anyone making a
phone call: *did my child get on the bus, and where is it now?* The school's
side of the same fact is a liability record — attendance per trip, per stop,
per day, that nobody hand-maintains.

Success is a pilot school where the office stops receiving "is the bus here
yet" calls and a principal opens the exceptions screen every morning.

## Positioning

Boarding is captured by a **driver tapping names on a roster**, not by RFID
cards, readers, or any hardware — so a school can start the week it says yes.
Parents are reached on **SMS**, so there is no app for a parent to install,
update, or fail to open. A competitor selling hardware cannot truthfully claim
a same-week start; one selling a parent app cannot claim zero install.

## Operating Context

Four moments define a school day, and the whole product is shaped around them:
boarded at the stop (~07:42), reached school (~08:15), boarded for home
(~15:05), got off at the stop (~15:48). Everything the product shows is a read
over an append-only event log of those taps.

- Admin work is desk work: CSV import of several hundred students, a map where
  stops get dropped and dragged into order, children assigned to stops.
- Driver work happens on a moving bus in a dead zone; taps queue locally and
  replay, stamped with a client-generated id so a replay cannot double-notify.
- Parent contact is one SMS per event per guardian, plus a link that expires
  with the trip's service date.

## Capabilities and Constraints

Built and working: multi-tenant schema with forced row-level security,
append-only `trip_events`, admin (students, CSV import, route/stop planner,
buses, staff, schedule, message log, today's exceptions dashboard), installable
driver PWA with an offline tap queue and GPS, parent live-tracking page on a
tokenless signed-short-ref URL, durable outbox draining to SMS with retries.

Constraints that bind design:

- **Cost is messaging.** Roughly ₹0.1357 delivered per SMS. Every notification
  body is written to fit one 160-character segment; the tracking link is a
  44-character ref, not a signed token, for exactly this reason.
- **Offline is normal, not an edge case** on the driver surface.
- One Next.js deploy, Neon Postgres, no separate API server, no websocket
  server. Authorization lives in the database.
- Guardian count, not student count, drives the bill — one primary number per
  student by default.

Open: pricing (₹40–60/student/month is a target, not a published price) and
whether WhatsApp becomes a second channel later. Nothing about either may be
stated as fact on a public surface.

## Brand Commitments

Name: **RouteBoard** (binding). Audience is Indian schools; copy is English;
money is ₹. No existing logo, typeface, or palette is binding — the warm-paper
comps in `demo/` are prior exploration, explicitly released as anti-reference
for this pass.

## Evidence on Hand

Permitted on public surfaces:

- **Real screenshots of the running app** — admin exceptions dashboard, driver
  roster, parent tracking page. These are the hero imagery, not illustration.
- **The cost maths** — ₹11.94 per student per month at four messages a day to
  one guardian over 22 school days, and the live pricing calculator in
  `app/PricingCalculator.tsx`.
- **The mechanism itself** — how it works, what the school gets out of it, and
  why a parent ends up trusting it.

Does not exist and must never be fabricated: customer logos, named schools,
testimonials, user counts, uptime figures, funding, awards, press, "trusted by"
anything. The product is pre-pilot.

## Product Principles

1. **One question, answered four times a day.** Any screen that does not help
   answer *was my child on the bus* is a candidate for deletion.
2. **The driver's tap is the product.** It is the one action a child's safety
   depends on; it survives dead zones, replays, and bad phones.
3. **Silence is the unforgivable failure.** A late notice is forgivable; no
   notice when a child did not board is not. Delivery is durable and visible.
4. **Nothing to install, on either end.** No hardware for the school, no app
   for the parent.
5. **The record is append-only and says so.** Corrections are new events;
   history is never edited, because an incident is when it gets read.

## Accessibility & Inclusion

Driver surface is used one-handed, in motion, in sunlight, by people who may
read little English: tap targets large, state legible without reading, color
never the only signal. Parent surface must be usable on a low-end Android
browser over 3G with no app and no account.
