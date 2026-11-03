"use client";

import { useActionState } from "react";
import { submitLeadAction, type LeadState } from "./actions";
import { TickIcon } from "@/components/chart";

export default function LeadForm() {
  const [state, formAction, pending] = useActionState<LeadState, FormData>(submitLeadAction, null);

  if (state?.ok) {
    return (
      <div className="chart">
        <div className="chart-head px-4 py-2.5">Received</div>
        <div className="px-5 py-8 flex gap-4">
          <TickIcon className="w-6 h-6 text-blue shrink-0" />
          <div>
            <p className="font-medium">We will be in touch.</p>
            <p className="text-[0.9375rem] text-pencil mt-1.5 max-w-[42ch]">
              Reply to the email with a time that suits you and we will walk one of your routes through the
              system end to end.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <form action={formAction} className="chart">
      <div className="chart-head px-4 py-2.5 flex items-baseline justify-between">
        <span>Pilot request</span>
        <span className="typed text-[0.6875rem] text-pencil normal-case tracking-normal">No commitment</span>
      </div>

      <div className="p-5 space-y-4">
        <div>
          <label htmlFor="schoolName" className="field-label">School name</label>
          <input id="schoolName" name="schoolName" required className="field" />
        </div>
        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label htmlFor="contactName" className="field-label">Your name</label>
            <input id="contactName" name="contactName" required className="field" />
          </div>
          <div>
            <label htmlFor="phone" className="field-label">Phone <span className="text-faint">(optional)</span></label>
            <input id="phone" name="phone" inputMode="tel" placeholder="+91 " className="field" />
          </div>
        </div>
        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label htmlFor="email" className="field-label">Email</label>
            <input id="email" name="email" type="email" required className="field" />
          </div>
          <div>
            <label htmlFor="studentCount" className="field-label">Children on buses</label>
            <input id="studentCount" name="studentCount" type="number" min={0} placeholder="approx." className="field" />
          </div>
        </div>

        {state?.error && (
          <p role="alert" className="typed text-[0.8125rem] text-red bg-red-2 border border-red px-3 py-2">
            {state.error}
          </p>
        )}

        <button type="submit" disabled={pending} className="btn w-full">
          {pending ? "Sending…" : "Request a pilot"}
        </button>
      </div>
    </form>
  );
}
