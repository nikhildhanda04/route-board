import Link from "next/link";
import PricingCalculator from "./PricingCalculator";
import LeadForm from "./leads/LeadForm";
import { Cell, Sheet, BusIcon, SmsIcon, StopIcon, TickIcon } from "@/components/chart";
import ParentProof from "@/components/parent-proof";
import Reveal from "@/components/reveal";
import RouteCityOrDiagram from "@/components/route-city";

/*
  Demonstration data. Synthetic, and labelled as such on the page — the chart
  is the real component the admin dashboard renders, filled with a plausible
  Tuesday rather than a real school's. No claim on this page rests on it.
*/
const MOMENTS = ["I · Boarded", "II · At school", "III · Left school", "IV · Dropped"];

type Row = { route: string; bus: string; cells: { code: string; note: string; state: "printed" | "pencilled" | "filled" | "struck" }[] };

const ROWS: Row[] = [
  {
    route: "Jayanagar 4th Block",
    bus: "KA-01-AB-5521",
    cells: [
      { code: "32 / 32", note: "07:42", state: "filled" },
      { code: "32", note: "08:15", state: "filled" },
      { code: "32 / 32", note: "15:05", state: "filled" },
      { code: "32", note: "15:48", state: "filled" },
    ],
  },
  {
    route: "Banashankari II Stage",
    bus: "KA-01-AB-5522",
    cells: [
      { code: "27 / 28", note: "07:51", state: "filled" },
      { code: "27", note: "08:22", state: "filled" },
      { code: "27 / 27", note: "15:05", state: "filled" },
      { code: "19 / 27", note: "on route", state: "pencilled" },
    ],
  },
  {
    route: "Wilson Garden",
    bus: "KA-01-AB-5530",
    cells: [
      { code: "1 absent", note: "Aarav S.", state: "struck" },
      { code: "40", note: "08:09", state: "filled" },
      { code: "40 / 40", note: "15:04", state: "filled" },
      { code: "—", note: "15:40", state: "printed" },
    ],
  },
  {
    route: "Koramangala 8th Block",
    bus: "KA-01-AB-5544",
    cells: [
      { code: "35 / 35", note: "07:38", state: "filled" },
      { code: "35", note: "08:11", state: "filled" },
      { code: "35 / 35", note: "15:06", state: "filled" },
      { code: "—", note: "15:52", state: "printed" },
    ],
  },
];

export default function LandingPage() {
  return (
    <>
      <header className="border-b-2 border-blue bg-sheet">
        <div className="max-w-6xl mx-auto px-5 sm:px-8 h-16 flex items-center justify-between gap-8">
          <Link href="/" className="font-narrow font-bold uppercase tracking-[0.14em] text-[0.9375rem] text-blue">
            RouteBoard
          </Link>
          <nav className="hidden sm:flex items-center gap-8 stamp text-pencil">
            <a href="#moments" className="hover:text-blue">How it works</a>
            <a href="#record" className="hover:text-blue">The record</a>
            <a href="#routes" className="hover:text-blue">Routes</a>
            <a href="#cost" className="hover:text-blue">What it costs</a>
          </nav>
          <div className="flex items-center gap-4">
            <Link href="/login" className="stamp text-pencil hover:text-blue">Sign in</Link>
            <a href="#pilot" className="stamp bg-blue text-sheet px-3 py-2 hover:bg-ink transition-colors">
              Request a pilot
            </a>
          </div>
        </div>
      </header>

      <main>
        {/* ------------------------------------------------------- hero */}
        {/*
          The hero answers the parent's question, because the parent's question
          is what the school is buying. The proof beside it is the product's own
          parent surface at full size, not a picture of a product.
        */}
        <section className="bg-sheet border-b-2 border-blue">
          <div className="max-w-6xl mx-auto px-5 sm:px-8 pt-16 sm:pt-24 pb-20 sm:pb-28">
          <div className="grid lg:grid-cols-[1.05fr_minmax(0,0.95fr)] gap-x-16 gap-y-14 items-center">
            <div>
              <Reveal>
              <h1 className="font-narrow font-bold uppercase text-[clamp(2.75rem,7vw,5rem)] leading-[0.9] tracking-[-0.025em] text-balance">
                Know your child
                <br />
                is <span className="marked">on the bus</span>
              </h1>
              </Reveal>

              <Reveal delay={0.12}>
              <p className="mt-8 text-[1.1875rem] leading-relaxed text-pencil max-w-[44ch]">
                RouteBoard tracks every school bus live and texts every parent the moment their child
                boards, reaches school and is dropped home — within seconds, in one SMS.
              </p>
              </Reveal>

              <Reveal delay={0.22} className="mt-10 flex flex-wrap items-center gap-5">
                <a href="#pilot" className="btn py-3.5 px-7 text-[0.8125rem]">Request a pilot</a>
                <a href="#moments" className="stamp text-blue hover:text-ink underline underline-offset-[6px] decoration-blue-2">
                  See the four moments
                </a>
              </Reveal>
            </div>

            <Reveal delay={0.3}>
              <ParentProof />
            </Reveal>
            </div>

            {/* The three objections a transport head raises, answered across
                the foot of the hero rather than crowding the headline. */}
            <ul className="mt-16 sm:mt-20 grid sm:grid-cols-3 gap-y-8 gap-x-10 border-t border-blue-3 pt-8">
              {[
                ["Nothing to install", "Parents get a plain SMS — no app, no smartphone needed"],
                ["Nothing to fit", "No cards, no readers, no trackers bolted to a bus"],
                ["Works without signal", "Taps queue on the driver's phone and send themselves"],
              ].map(([h, d], i) => (
                <li key={h}>
                  <Reveal delay={i * 0.08}>
                    <div className="stamp text-blue">{h}</div>
                    <div className="text-[0.9375rem] leading-relaxed text-pencil mt-2">{d}</div>
                  </Reveal>
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* ----------------------------------------------- the office view */}
        <section className="max-w-6xl mx-auto px-5 sm:px-8 pt-20 sm:pt-28 pb-20 sm:pb-28">
          <Reveal className="max-w-[52ch] mb-10 sm:mb-12">
            <h2 className="font-narrow font-bold uppercase text-[clamp(1.75rem,4vw,2.75rem)] leading-[0.95] tracking-[-0.02em] text-balance">
              Every bus, every child, on one sheet
            </h2>
            <p className="mt-5 text-[1.0625rem] leading-relaxed text-pencil">
              While parents get their own child, the transport desk gets the whole day: who is on which
              bus, which bus is still out, and the one child the office needs to call about.
            </p>
          </Reveal>

          <Reveal delay={0.08} cells>
          <Sheet
            title="Today · all routes"
            meta="Tue 4 Nov · demonstration data"
            action={<span className="stamp text-red">1 exception</span>}
          >
            <div className="overflow-x-auto">
              <div className="min-w-[46rem]">
                <div className="grid grid-cols-[minmax(13rem,1.4fr)_repeat(4,minmax(0,1fr))]">
                  <div className="stamp text-pencil px-4 py-2 bg-sheet-2 border-b border-blue-3">Route / bus</div>
                  {MOMENTS.map((m) => (
                    <div key={m} className="stamp text-pencil px-3 py-2 bg-sheet-2 border-b border-blue-3 rule-y-bold">
                      {m}
                    </div>
                  ))}

                  {ROWS.map((row, r) => (
                    <div key={row.route} className="contents">
                      <div className={`px-4 py-5 flex flex-col justify-center bg-sheet ${r > 0 ? "rule-x" : ""}`}>
                        <div className="font-medium text-[1.0625rem] leading-tight">{row.route}</div>
                        <div className="typed text-[0.75rem] text-faint mt-1.5">{row.bus}</div>
                      </div>
                      {row.cells.map((c, i) => (
                        <Cell
                          key={i}
                          state={c.state}
                          code={c.code}
                          note={c.note}
                          index={r * 4 + i}
                          size="lg"
                          className={`rule-y-bold ${r > 0 ? "rule-x" : ""}`}
                        />
                      ))}
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <footer className="px-4 py-3 border-t-2 border-blue bg-sheet-2 flex flex-wrap items-center gap-x-6 gap-y-2">
              <Legend swatch="bg-blue-4 border-blue-2" label="Tapped and sent" />
              <Legend swatch="bg-bus-3 border-bus" label="On route now" />
              <Legend swatch="bg-red-2 border-red" label="Not on the bus" />
              <Legend swatch="bg-sheet border-blue-3" label="Not yet" />
            </footer>
          </Sheet>
          </Reveal>
        </section>

        {/* --------------------------------------------- the red cell */}
        <section id="record" className="border-y-2 border-blue bg-blue text-sheet">
          <div className="max-w-6xl mx-auto px-5 sm:px-8 py-20 sm:py-28 grid lg:grid-cols-[1fr_1.1fr] gap-12 lg:gap-20 items-center">
            <Reveal>
              <div className="bg-sheet text-ink border-2 border-sheet max-w-sm">
                <div className="stamp bg-red-2 text-red px-3 py-1.5 border-b-2 border-red">
                  Wilson Garden · I · Boarded
                </div>
                <div className="px-5 py-7">
                  <div className="struck typed text-[1.75rem] leading-none">1 absent</div>
                  <div className="stamp text-pencil mt-3">Aarav Sharma · VII-B · 07:50</div>
                </div>
                <div className="border-t border-blue-3 px-5 py-4 flex gap-3">
                  <SmsIcon className="w-4 h-4 text-blue shrink-0 mt-0.5" />
                  <p className="typed text-[0.8125rem] leading-snug">
                    Aarav did not board the bus at Jayanagar 4th Block today.
                  </p>
                </div>
                <div className="stamp text-faint px-5 pb-4">Sent 07:50 · delivered 07:50</div>
              </div>
            </Reveal>

            <Reveal delay={0.12}>
              <h2 className="font-narrow font-bold uppercase text-[clamp(1.75rem,4vw,2.75rem)] leading-[0.95] tracking-[-0.02em] text-balance">
                One cell on this chart
                <br />
                is worth the whole system
              </h2>
              <p className="mt-6 text-[1.0625rem] leading-relaxed text-blue-3 max-w-[52ch]">
                A parent will forgive a late arrival notice. They will not forgive silence when their child
                was not on the bus. So the one message that cannot fail is the one nobody else sends: the
                driver closes a stop, a name is still untapped, and the message goes out before the bus has
                left the kerb.
              </p>
              <p className="mt-4 text-[1.0625rem] leading-relaxed text-blue-3 max-w-[52ch]">
                It is queued in the database, not fired off and forgotten — so a dead zone, a provider
                outage or a dropped connection delays it by a minute instead of losing it. Every attempt is
                logged with its result, which is what you point at when a parent says they heard nothing.
              </p>
            </Reveal>
          </div>
        </section>

        {/* ------------------------------------------------- the moments */}
        <section id="moments" className="max-w-6xl mx-auto px-5 sm:px-8 py-20 sm:py-28">
          <Reveal>
          <h2 className="font-narrow font-bold uppercase text-[clamp(1.75rem,4vw,2.75rem)] leading-[0.95] tracking-[-0.02em] max-w-[18ch] text-balance">
            Four moments, and nothing in between
          </h2>
          <p className="mt-5 text-[1.0625rem] leading-relaxed text-pencil max-w-[58ch]">
            The whole product is four taps a day. Each one writes a cell on the chart and sends one SMS —
            and the numbering is the day&apos;s own order, not a feature list.
          </p>
          </Reveal>

          <div className="chart mt-12 grid sm:grid-cols-2 lg:grid-cols-4">
            {[
              {
                n: "I",
                t: "Boarded",
                time: "07:42",
                icon: <StopIcon className="w-4 h-4" />,
                d: "At the stop, the driver taps the name on a roster of the children who board there. The parent knows before the bus pulls away.",
              },
              {
                n: "II",
                t: "At school",
                time: "08:15",
                icon: <TickIcon className="w-4 h-4" />,
                d: "One tap ends the morning trip and clears every parent on it at once. Nobody taps forty names twice.",
              },
              {
                n: "III",
                t: "Left school",
                time: "15:05",
                icon: <BusIcon className="w-4 h-4" />,
                d: "The same roster, reversed. The SMS carries a link to a live map of the bus that expires with the trip.",
              },
              {
                n: "IV",
                t: "Dropped",
                time: "15:48",
                icon: <StopIcon className="w-4 h-4" />,
                d: "The day closes. Anyone the driver never tapped is recorded as unaccounted and messaged — never quietly dropped.",
              },
            ].map((m, i) => (
              <Reveal
                key={m.n}
                as="article"
                delay={i * 0.09}
                className={`p-6 sm:p-8 bg-sheet ${i > 0 ? "rule-y-bold" : ""} border-b border-blue-3 sm:border-b-0`}>
                <div className="flex items-baseline justify-between text-blue">
                  <span className="font-narrow font-bold text-2xl leading-none">{m.n}</span>
                  <span className="typed text-[0.6875rem] text-faint">{m.time}</span>
                </div>
                <div className="flex items-center gap-2 mt-4 text-blue">
                  {m.icon}
                  <h3 className="stamp text-ink">{m.t}</h3>
                </div>
                <p className="mt-3.5 text-[0.9375rem] leading-relaxed text-pencil">{m.d}</p>
              </Reveal>
            ))}
          </div>
        </section>

        {/* --------------------------------------------- what the school gets */}
        <section className="max-w-6xl mx-auto px-5 sm:px-8 pb-20 sm:pb-28">
          <Reveal>
          <Sheet title="What it changes at the transport desk" meta="For the person who signs">
            {[
              {
                h: "The phone stops ringing",
                d: "Every call to the office is a parent asking a question the chart already answered. They get the answer on their own phone, at the moment it becomes true, without asking anyone.",
              },
              {
                h: "There is a record, not a recollection",
                d: "Attendance per trip, per stop, per day, written by the taps themselves. The log is append-only: a correction is a new entry, never an edit — because the day you need to read it is the day somebody disputes it.",
              },
              {
                h: "Nothing to buy and nothing to install",
                d: "No cards, no readers, no fitting out buses. The driver opens a link and adds it to their home screen; taps queue on the phone and send themselves when signal returns. Parents install nothing at all.",
              },
              {
                h: "Your data is not reachable from another school's login",
                d: "Every row carries its school, and the database itself refuses to return rows from another one — the check sits below the application, where a bug in our code cannot step around it.",
              },
            ].map((r, i) => (
              <Reveal
                key={r.h}
                delay={i * 0.06}
                className={`grid sm:grid-cols-[minmax(0,1fr)_minmax(0,1.9fr)] gap-x-10 gap-y-2.5 px-5 sm:px-8 py-7 bg-sheet ${i > 0 ? "rule-x" : ""}`}
              >
                <h3 className="font-narrow font-semibold uppercase tracking-[0.04em] text-[0.9375rem] text-blue text-balance">
                  {r.h}
                </h3>
                <p className="text-[0.9375rem] leading-relaxed text-pencil max-w-[62ch]">{r.d}</p>
              </Reveal>
            ))}
          </Sheet>
          </Reveal>
        </section>

        {/* ------------------------------------------------- the routes */}
        {/*
          The second half of the product, and the page used to describe it in
          four columns of prose. It is a spatial transformation, so it is drawn
          instead: the same sixteen homes in all three panels, with only the
          decisions about them changing.
        */}
        <section id="routes" className="border-y-2 border-blue bg-sheet-2">
          <div className="max-w-6xl mx-auto px-5 sm:px-8 py-20 sm:py-28">
            <Reveal className="max-w-[54ch] mb-10 sm:mb-12">
              <div className="stamp text-blue mb-4">The other half of the product</div>
              <h2 className="font-narrow font-bold uppercase text-[clamp(1.75rem,4vw,2.75rem)] leading-[0.95] tracking-[-0.02em] text-balance">
                It also plans the routes
              </h2>
              <p className="mt-5 text-[1.0625rem] leading-relaxed text-pencil">
                Not just messages. Hand over the student list you already keep and RouteBoard turns six
                hundred addresses into stops, stops into routes no bus is overloaded on, and a time against
                every one of them.
              </p>
            </Reveal>

            <Reveal delay={0.08}>
              <Sheet
                title="Addresses in, route sheet out"
                meta="drawn live"
                action={<span className="stamp text-pencil">Illustration · II &amp; III in build</span>}
              >
                <RouteCityOrDiagram />
                <div className="grid sm:grid-cols-3 border-t-2 border-blue">
                  {[
                    ["Model", "Reads an address for its locality and landmark, then names the stop its children fall into."],
                    ["Algorithm", "Splits stops across your buses against real capacities and orders each run. It can prove the limits hold; a model cannot."],
                    ["You", "A draft is a draft. Drag the order, move a child, in the planner you already use."],
                  ].map(([who, what], i) => (
                    <Reveal
                      key={who}
                      as="article"
                      delay={i * 0.08}
                      className={`px-5 py-5 bg-sheet ${i > 0 ? "sm:rule-y-bold" : ""} ${i > 0 ? "border-t border-blue-3 sm:border-t-0" : ""}`}
                    >
                      <div className="stamp text-blue">{who}</div>
                      <p className="mt-2 text-[0.9375rem] leading-relaxed text-pencil">{what}</p>
                    </Reveal>
                  ))}
                </div>
                <footer className="px-5 py-4 border-t-2 border-blue bg-sheet-2">
                  <p className="text-[0.8125rem] leading-relaxed text-pencil max-w-[80ch]">
                    Any address the geocoder was unsure of lands in a review list on the map rather than
                    quietly inside a route — a child placed four kilometres from home produces a plan that
                    looks correct and sends a bus to the wrong kerb.
                  </p>
                </footer>
              </Sheet>
            </Reveal>
          </div>
        </section>

        {/* ------------------------------------------------------ cost */}
        <section id="cost" className="border-t-2 border-blue bg-sheet-2">
          <div className="max-w-6xl mx-auto px-5 sm:px-8 py-20 sm:py-28">
            <div className="grid lg:grid-cols-[1fr_1.4fr] gap-12 lg:gap-20 items-start">
              <Reveal>
                <h2 className="font-narrow font-bold uppercase text-[clamp(1.75rem,4vw,2.75rem)] leading-[0.95] tracking-[-0.02em] text-balance">
                  What you collect,
                  <br />
                  and what is left
                </h2>
                <p className="mt-5 text-[1.0625rem] leading-relaxed text-pencil max-w-[46ch]">
                  Schools charge a transport fee already. The sheet puts the whole arithmetic in one place:
                  what comes in from the children on buses, what the service costs to run every month, and
                  what stays with the school.
                </p>
                <p className="mt-4 text-[0.9375rem] leading-relaxed text-pencil max-w-[46ch]">
                  No per-bus fee and no hardware line. The running cost is the messages, the hosting behind
                  them and the upkeep — nothing that scales with how many buses you own. Planning the routes
                  is a separate charge, paid once at setup, so it is kept out of the monthly margin.
                </p>
                <p className="mt-4 text-[0.9375rem] leading-relaxed text-pencil max-w-[46ch]">
                  Move the figures to your own school. We have not set a published price yet, which is
                  exactly why the arithmetic is on the page instead of a quote form.
                </p>
              </Reveal>
              <Reveal delay={0.12}>
                <PricingCalculator />
              </Reveal>
            </div>
          </div>
        </section>

        {/* ----------------------------------------------------- pilot */}
        <section id="pilot" className="border-t-2 border-blue">
          <div className="max-w-6xl mx-auto px-5 sm:px-8 py-20 sm:py-28 grid lg:grid-cols-[1fr_1.1fr] gap-12 lg:gap-20">
            <Reveal>
              <h2 className="font-narrow font-bold uppercase text-[clamp(1.75rem,4vw,2.75rem)] leading-[0.95] tracking-[-0.02em] text-balance">
                Run it on one route first
              </h2>
              <p className="mt-5 text-[1.0625rem] leading-relaxed text-pencil max-w-[46ch]">
                Fifteen minutes, no commitment. Bring a rough count of children on buses and we will show
                you the driver&apos;s screen, the message a parent receives, and the live map behind the link.
              </p>
              <p className="mt-6 typed text-[0.8125rem] text-pencil">
                RouteBoard is pre-pilot. There are no customer logos on this page because there are no
                customers yet — only a working system and the arithmetic above.
              </p>
            </Reveal>
            <Reveal delay={0.12}>
              <LeadForm />
            </Reveal>
          </div>
        </section>
      </main>

      <footer className="border-t-2 border-blue bg-sheet">
        <div className="max-w-6xl mx-auto px-5 sm:px-8 py-8 flex flex-wrap items-center justify-between gap-3 stamp text-faint">
          <span>RouteBoard · school bus boarding &amp; parent alerts</span>
          <span className="typed normal-case tracking-normal text-[0.6875rem]">
            Bengaluru · built by Nikhil Dhanda
          </span>
        </div>
      </footer>
    </>
  );
}

function Legend({ swatch, label }: { swatch: string; label: string }) {
  return (
    <span className="flex items-center gap-2 stamp text-pencil">
      <span className={`w-3.5 h-3.5 border ${swatch}`} aria-hidden />
      {label}
    </span>
  );
}
