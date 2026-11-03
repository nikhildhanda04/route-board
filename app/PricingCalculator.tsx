"use client";

import { useMemo, useState } from "react";

/**
 * Every figure here is the visitor's own, except the two defaults: the
 * published Meta utility rate to +91 (₹0.1150 + 18% GST) and 22 school days.
 * The SMS rate is an input rather than a claim, because aggregator pricing is
 * negotiated per account and we are not going to quote someone else's.
 */
const WA_RATE = 0.115 * 1.18;
const INFRA_PER_STUDENT = 1.5;
const SCHOOL_DAYS = 22;

/*
  Planning the routes is a setup cost, not a monthly one. Normalising a
  school's addresses and naming the stops they fall into runs once over the
  whole roll — about 250 model tokens per child across both jobs — plus
  roughly 40,000 for reading the route sheet the school already keeps.
  Afterwards only what changed gets re-planned, taken here as a tenth of the
  roll once a term.

  The model and geocoding rates are inputs for the same reason the message rate
  is: both are published per provider, in dollars, and move — so neither is
  baked in here as a claim.
*/
const PLAN_TOKENS_PER_CHILD = 250;
const PLAN_TOKENS_FIXED = 40_000;
const REPLAN_SHARE = 0.1;
const REPLANS_PER_YEAR = 3;

export default function PricingCalculator() {
  const [students, setStudents] = useState(1500);
  const [pricePerStudent, setPricePerStudent] = useState(50);
  const [messagesPerDay, setMessagesPerDay] = useState(4);
  const [rate, setRate] = useState(0.18);
  const [bothGuardians, setBothGuardians] = useState(false);
  const [planning, setPlanning] = useState(true);
  const [tokenRate, setTokenRate] = useState(250);
  const [geoRate, setGeoRate] = useState(0.42);

  const r = useMemo(() => {
    const messages = students * messagesPerDay * SCHOOL_DAYS * (bothGuardians ? 2 : 1);
    const messaging = messages * rate;
    const infra = students * INFRA_PER_STUDENT;

    const planTokens = students * PLAN_TOKENS_PER_CHILD + PLAN_TOKENS_FIXED;
    const setup = planning ? (planTokens / 1e6) * tokenRate + students * geoRate : 0;
    const replanYear = planning
      ? REPLANS_PER_YEAR * students * REPLAN_SHARE *
        ((PLAN_TOKENS_PER_CHILD / 1e6) * tokenRate + geoRate)
      : 0;
    // Spread over a year so the margin below tells the truth about a one-time bill.
    const plan = (setup + replanYear) / 12;

    const cost = messaging + infra + plan;
    const revenue = students * pricePerStudent;
    const profit = revenue - cost;
    return {
      messages, messaging, infra, planTokens, setup, plan, cost, revenue, profit,
      margin: revenue ? (profit / revenue) * 100 : 0,
      perStudent: students ? cost / students : 0,
    };
  }, [students, pricePerStudent, messagesPerDay, rate, bothGuardians, planning, tokenRate, geoRate]);

  const inr = (n: number) => "₹" + Math.round(n).toLocaleString("en-IN");

  return (
    <div className="chart">
      <div className="chart-head px-4 py-2.5 flex items-baseline justify-between">
        <span>Cost sheet · per month</span>
        <span className="typed text-[0.6875rem] text-pencil normal-case tracking-normal">
          {r.messages.toLocaleString("en-IN")} messages
        </span>
      </div>

      <div className="grid sm:grid-cols-2">
        <Field
          label="Children on buses"
          value={students.toLocaleString("en-IN")}
          className="border-b border-blue-3"
        >
          <input
            type="range" min={100} max={10000} step={100} value={students}
            onChange={(e) => setStudents(Number(e.target.value))}
            className="w-full" aria-label="Children on buses"
          />
        </Field>
        <Field
          label="You charge, per child"
          value={`₹${pricePerStudent}`}
          className="border-b border-blue-3 sm:rule-y-bold"
        >
          <input
            type="range" min={10} max={120} step={5} value={pricePerStudent}
            onChange={(e) => setPricePerStudent(Number(e.target.value))}
            className="w-full" aria-label="Price charged per child per month"
          />
        </Field>
        <Field
          label="Delivered cost per message"
          value={`₹${rate.toFixed(4)}`}
          className="border-b border-blue-3"
        >
          <input
            type="range" min={0.05} max={0.5} step={0.005} value={rate}
            onChange={(e) => setRate(Number(e.target.value))}
            className="w-full" aria-label="Delivered cost per message"
          />
          <button
            type="button"
            onClick={() => setRate(Number(WA_RATE.toFixed(4)))}
            className="stamp text-blue underline underline-offset-2 mt-2 hover:text-ink"
          >
            Use the WhatsApp rate · ₹{WA_RATE.toFixed(4)}
          </button>
        </Field>
        <div className="p-4 border-b border-blue-3 sm:rule-y-bold flex flex-col gap-3 justify-center">
          <div>
            <div className="stamp text-pencil mb-1.5">Messages per child, per day</div>
            <div className="flex">
              {[2, 4, 6].map((n) => (
                <button
                  key={n}
                  type="button"
                  aria-pressed={messagesPerDay === n}
                  onClick={() => setMessagesPerDay(n)}
                  className={`typed text-[0.8125rem] px-3.5 py-1.5 border border-blue-2 -ml-px first:ml-0 transition-colors ${
                    messagesPerDay === n ? "bg-blue text-sheet" : "bg-sheet text-pencil hover:bg-blue-4"
                  }`}
                >
                  {n}
                </button>
              ))}
            </div>
          </div>
          <label className="flex items-center gap-2 text-[0.875rem] text-pencil">
            <input
              type="checkbox" checked={bothGuardians}
              onChange={(e) => setBothGuardians(e.target.checked)}
              className="w-4 h-4"
            />
            Notify both parents <span className="text-faint">— doubles the bill</span>
          </label>
        </div>
      </div>

      {/* Planning is billed once, at setup, so it is kept visibly apart from
          the monthly figures rather than hidden inside them. */}
      <div className="bg-sheet-2">
        <div className="px-4 py-3 border-b border-blue-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-x-6 gap-y-2">
          <label className="flex items-center gap-2 text-[0.875rem] text-pencil">
            <input
              type="checkbox" checked={planning}
              onChange={(e) => setPlanning(e.target.checked)}
              className="w-4 h-4"
            />
            <span>
              Have RouteBoard plan the routes <span className="text-faint">— once, at setup</span>
            </span>
          </label>
          <span className="typed text-[0.6875rem] text-pencil">
            {planning
              ? `${Math.round(r.planTokens / 1000)}k tokens · ${students.toLocaleString("en-IN")} addresses`
              : "off — your own route sheet, typed in"}
          </span>
        </div>

        {planning && (
          <div className="grid sm:grid-cols-2">
            <Field
              label="Model rate · per million tokens"
              value={`₹${tokenRate}`}
              className="border-b border-blue-3"
            >
              <input
                type="range" min={20} max={1500} step={10} value={tokenRate}
                onChange={(e) => setTokenRate(Number(e.target.value))}
                className="w-full" aria-label="Model rate per million tokens"
              />
            </Field>
            <Field
              label="Geocoding · per address"
              value={`₹${geoRate.toFixed(2)}`}
              className="border-b border-blue-3 sm:rule-y-bold"
            >
              <input
                type="range" min={0} max={2} step={0.01} value={geoRate}
                onChange={(e) => setGeoRate(Number(e.target.value))}
                className="w-full" aria-label="Geocoding cost per address"
              />
            </Field>
          </div>
        )}

        <div className="grid grid-cols-2 border-b-2 border-blue">
          <Figure label="Planning · one-time" value={inr(r.setup)} />
          <Figure label="Planning / month" value={inr(r.plan)} className="rule-y-bold" />
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4">
        <Figure label="Messaging" value={inr(r.messaging)} />
        <Figure label="Infrastructure" value={inr(r.infra)} className="rule-y-bold" />
        <Figure label="Your cost / child" value={`₹${r.perStudent.toFixed(2)}`} className="sm:rule-y-bold border-t border-blue-3 sm:border-t-0" />
        <Figure
          label="Gross margin"
          value={`${Math.round(r.margin)}%`}
          className="rule-y-bold border-t border-blue-3 sm:border-t-0"
          tone={r.margin < 0 ? "bad" : "good"}
        />
      </div>

      <p className="px-4 py-3 border-t-2 border-blue bg-sheet-2 text-[0.75rem] leading-relaxed text-pencil">
        Messaging at ₹{rate.toFixed(4)} delivered over {SCHOOL_DAYS} school days. ₹{WA_RATE.toFixed(4)} is
        Meta&apos;s published utility rate to an Indian number including 18% GST; the SMS default of ₹0.18 is
        an assumption, not a quote — set your own aggregator&apos;s rate. Infrastructure is a ₹
        {INFRA_PER_STUDENT.toFixed(2)} per-child share of database and hosting, and volume discounts on
        messaging do not begin until roughly 25 million a month, so this stays linear at any school size.
        Planning is {PLAN_TOKENS_PER_CHILD} model tokens per child plus one geocoding lookup each, run once
        over the roll, and a tenth of the roll re-planned {REPLANS_PER_YEAR} times a year; both rates are
        assumptions you should replace with your provider&apos;s, and the monthly figure above is that
        one-time bill spread across twelve months so the margin accounts for it.
      </p>
    </div>
  );
}

function Field({ label, value, children, className = "" }: { label: string; value: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={`p-4 ${className}`}>
      <div className="flex items-baseline justify-between gap-3 mb-2.5">
        <span className="stamp text-pencil">{label}</span>
        <span className="typed text-[0.875rem] text-ink">{value}</span>
      </div>
      {children}
    </div>
  );
}

function Figure({ label, value, className = "", tone }: { label: string; value: string; className?: string; tone?: "good" | "bad" }) {
  return (
    <div className={`px-4 py-4 bg-sheet ${className}`}>
      <div className={`typed text-[1.375rem] leading-none ${tone === "bad" ? "text-red" : tone === "good" ? "text-blue" : "text-ink"}`}>
        {value}
      </div>
      <div className="stamp text-faint mt-2">{label}</div>
    </div>
  );
}
