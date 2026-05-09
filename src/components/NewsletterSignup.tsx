"use client";

import { useState } from "react";
import {
  subscribeToResourceNewsletter,
  unsubscribeFromResourceNewsletter,
} from "@/app/company/actions";

export default function NewsletterSignup({
  companyId,
  companyName,
  initialSubscribed = false,
  isLoggedIn = true,
  variant = "card",
}: {
  companyId: number;
  companyName: string;
  initialSubscribed?: boolean;
  /** When false, show a login prompt instead of the toggle */
  isLoggedIn?: boolean;
  /** card = standalone box, inline = compact single-line row */
  variant?: "card" | "inline";
}) {
  const [subscribed, setSubscribed] = useState(initialSubscribed);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function toggle() {
    setLoading(true);
    setError(null);
    const result = subscribed
      ? await unsubscribeFromResourceNewsletter(companyId)
      : await subscribeToResourceNewsletter(companyId);
    setLoading(false);
    if (result.error) {
      setError(result.error);
    } else {
      setSubscribed((s) => !s);
    }
  }

  // ── Not logged in ─────────────────────────────────────────────────────────────
  if (!isLoggedIn) {
    if (variant === "inline") {
      return (
        <div className="flex items-center gap-3 w-full px-4 py-3 rounded-2xl border-2 border-zinc-100 bg-zinc-50 opacity-60">
          <div className="flex-shrink-0 w-9 h-9 rounded-xl bg-zinc-100 flex items-center justify-center">
            <svg className="w-4 h-4 text-zinc-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-zinc-500">Get a monthly resource digest</p>
            <p className="text-xs text-zinc-400 mt-0.5"><a href="/login" className="underline hover:text-zinc-600">Sign in</a> to subscribe</p>
          </div>
        </div>
      );
    }
    return (
      <div className="rounded-2xl border-2 border-zinc-100 bg-zinc-50 p-5 opacity-70">
        <div className="flex items-start gap-4">
          <div className="flex-shrink-0 w-10 h-10 rounded-xl bg-zinc-100 border border-zinc-200 flex items-center justify-center">
            <svg className="w-5 h-5 text-zinc-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-zinc-500">Get a monthly resource digest</p>
            <p className="text-xs text-zinc-400 mt-1 leading-relaxed">
              <a href="/login" className="underline hover:text-zinc-600">Sign in</a> to subscribe to monthly resource matches for <span className="font-medium">{companyName}</span>.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // ── Inline variant ───────────────────────────────────────────────────────────
  if (variant === "inline") {
    return (
      <div className="flex flex-col gap-1">
        <button
          onClick={toggle}
          disabled={loading}
          className={`flex items-center gap-3 w-full px-4 py-3 rounded-2xl border-2 text-left transition-all ${
            subscribed
              ? "border-emerald-400 bg-emerald-50"
              : "border-zinc-200 bg-white hover:border-zinc-300"
          } disabled:opacity-50`}
        >
          <div className={`flex-shrink-0 w-9 h-9 rounded-xl flex items-center justify-center transition-colors ${
            subscribed ? "bg-emerald-500" : "bg-zinc-100"
          }`}>
            {loading ? (
              <svg className="w-4 h-4 animate-spin text-zinc-400" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
              </svg>
            ) : subscribed ? (
              <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            ) : (
              <svg className="w-4 h-4 text-zinc-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <p className={`text-sm font-semibold ${subscribed ? "text-emerald-800" : "text-zinc-900"}`}>
              {subscribed ? "✓ You're on the list" : "🔔 Get matched when new programs open up"}
            </p>
            <p className="text-xs text-zinc-400 mt-0.5">
              {subscribed
                ? "We'll scan new programs monthly and surface the ones that fit your company."
                : "Utah adds new programs constantly. We'll match them to your company and alert you when something worth applying for shows up."}
            </p>
          </div>
          {subscribed && (
            <span className="text-xs text-zinc-400 flex-shrink-0 hover:text-zinc-600">
              Unsubscribe
            </span>
          )}
        </button>
        {error && <p className="text-xs text-red-600 px-1">{error}</p>}
      </div>
    );
  }

  // ── Card variant ─────────────────────────────────────────────────────────────
  return (
    <div className={`rounded-2xl border-2 p-5 transition-all ${
      subscribed ? "border-emerald-200 bg-emerald-50" : "border-zinc-200 bg-zinc-50"
    }`}>
      <div className="flex items-start gap-4">
        <div className={`flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center ${
          subscribed ? "bg-emerald-500" : "bg-white border border-zinc-200"
        }`}>
          <svg
            className={`w-5 h-5 ${subscribed ? "text-white" : "text-zinc-500"}`}
            fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
          </svg>
        </div>

        <div className="flex-1 min-w-0">
          {subscribed ? (
            <>
              <p className="text-sm font-bold text-emerald-800">You&apos;re on the list ✓</p>
              <p className="text-xs text-emerald-700 mt-1 leading-relaxed">
                Each month we&apos;ll scan Utah&apos;s 200+ programs and surface the best matches for <span className="font-medium">{companyName}</span> — grants, loans, training, expert mentorship. Most founders never find these. You will.
              </p>
            </>
          ) : (
            <>
              <p className="text-sm font-bold text-zinc-900">Most founders never find these programs.</p>
              <p className="text-xs text-zinc-500 mt-1 leading-relaxed">
                Utah has 200+ resources built for businesses — grants, loans, training, expert mentorship. We&apos;ll match <span className="font-medium">{companyName}</span> monthly and alert you when something relevant shows up.
              </p>
            </>
          )}
        </div>
      </div>

      <div className="mt-4 flex items-center gap-3">
        <button
          onClick={toggle}
          disabled={loading}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-colors disabled:opacity-50 ${
            subscribed
              ? "bg-white border border-emerald-200 text-emerald-700 hover:bg-emerald-100"
              : "bg-zinc-900 hover:bg-zinc-700 text-white"
          }`}
        >
          {loading ? (
            <>
              <svg className="w-3.5 h-3.5 animate-spin" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
              </svg>
              Saving…
            </>
          ) : subscribed ? (
            "Unsubscribe"
          ) : (
            <>
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
              </svg>
              Yes, match me monthly — it&apos;s free
            </>
          )}
        </button>
        {error && <p className="text-xs text-red-600">{error}</p>}
      </div>
    </div>
  );
}
