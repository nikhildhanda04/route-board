"use client";

import { useActionState, useState } from "react";
import { loginAction, type LoginState } from "./actions";

export default function LoginPage() {
  const [state, formAction, pending] = useActionState<LoginState, FormData>(loginAction, null);
  // Controlled, not uncontrolled: React 19 resets a <form action={fn}> after
  // any action that returns normally (our {error: ...} included, since it
  // never throws) — without this, a failed attempt silently wipes the
  // identifier field along with the password.
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");

  return (
    <main className="min-h-screen grid place-items-center px-4 py-10">
      <div className="w-full max-w-sm">
        <div className="font-narrow font-bold uppercase tracking-[0.14em] text-blue mb-4">RouteBoard</div>

        <form action={formAction} className="chart">
          <div className="chart-head px-4 py-2.5">Sign in</div>
          <div className="p-5">
            <p className="text-[0.875rem] text-pencil mb-5">
              Transport desk and driver accounts. Parents never sign in — they get an SMS.
            </p>

            <div className="mb-4">
              <label htmlFor="identifier" className="field-label">Email or phone</label>
              <input
                id="identifier"
                name="identifier"
                autoComplete="username"
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                className="field"
                placeholder="transport@yourschool.example"
              />
            </div>

            <div className="mb-5">
              <label htmlFor="password" className="field-label">Password</label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="field"
              />
            </div>

            {state?.error && (
              <p role="alert" className="typed text-[0.8125rem] text-red bg-red-2 border border-red px-3 py-2 mb-5">
                {state.error}
              </p>
            )}

            <button type="submit" disabled={pending} className="btn w-full">
              {pending ? "Signing in…" : "Sign in"}
            </button>
          </div>
        </form>
      </div>
    </main>
  );
}
