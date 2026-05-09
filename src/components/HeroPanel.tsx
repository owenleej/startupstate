"use client";

import { useEffect, useState } from "react";

const DISMISS_KEY = "hero_panel_dismissed_v1";
const NUDGE_DISMISS_KEY = "hero_nudge_dismissed_v1";

// ── Full hero panel (unauthenticated users) ───────────────────────────────────

export function HeroPanel({
  onStartAsBusiness,
  onStartAsFounder,
  onDismiss,
}: {
  onStartAsBusiness: () => void;
  onStartAsFounder: () => void;
  onDismiss?: () => void;
}) {
  const [dismissed, setDismissed] = useState(true); // start hidden to avoid flash
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const wasDismissed = localStorage.getItem(DISMISS_KEY) === "1";
    setDismissed(wasDismissed);
    setMounted(true);
  }, []);

  function dismiss() {
    localStorage.setItem(DISMISS_KEY, "1");
    setDismissed(true);
    onDismiss?.();
  }

  if (!mounted || dismissed) return null;

  return (
    <div
      className="absolute left-4 z-20 flex flex-col"
      style={{ top: "72px", bottom: "24px", width: "370px" }}
    >
      <div className="flex flex-col h-full bg-zinc-900/95 backdrop-blur-md border border-zinc-700/60 rounded-2xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="relative px-6 pt-6 pb-4 border-b border-zinc-800/80 flex-shrink-0">
          <button
            onClick={dismiss}
            className="absolute top-4 right-4 text-zinc-500 hover:text-zinc-300 transition-colors"
            aria-label="Dismiss"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>

          <div className="flex items-center gap-2.5 mb-3">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{ backgroundColor: "#C1440E" }}>
              <svg className="w-5 h-5 text-white" viewBox="0 0 100 100" fill="none" stroke="currentColor" strokeWidth={8} strokeLinejoin="round" strokeLinecap="round">
                <path d="M15 10 L65 10 L65 42 L85 42 L85 90 L15 90 Z" />
              </svg>
            </div>
            <span className="text-white font-bold tracking-tight text-base">The Startup State</span>
          </div>

          <p className="text-zinc-100 font-semibold text-lg leading-snug">
            Utah built an ecosystem.<br />
            <span className="text-zinc-400 font-normal text-sm">Here&apos;s how to plug in.</span>
          </p>
        </div>

        {/* Track cards */}
        <div className="flex-1 overflow-y-auto px-4 py-4 flex flex-col gap-3">
          {/* Track 1 — Aspiring founder */}
          <div className="rounded-xl border border-zinc-700/60 bg-zinc-800/60 p-4 hover:border-zinc-600/80 transition-colors group">
            <div className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-lg bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center flex-shrink-0 text-lg">
                🏗️
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-white font-semibold text-sm">Thinking about starting a business?</p>
                <p className="text-zinc-400 text-xs mt-1 leading-relaxed">
                  Utah has 200+ free programs — grants, mentorship, incubators — designed for people exactly where you are.
                </p>
                <button
                  onClick={onStartAsFounder}
                  className="mt-3 w-full flex items-center justify-center gap-1.5 px-3 py-2 bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white text-xs font-semibold rounded-lg transition-colors"
                >
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                  Explore free resources →
                </button>
              </div>
            </div>
          </div>

          {/* Track 2 — Business owner */}
          <div className="rounded-xl border border-zinc-700/60 bg-zinc-800/60 p-4 hover:border-zinc-600/80 transition-colors">
            <div className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-lg bg-blue-500/15 border border-blue-500/30 flex items-center justify-center flex-shrink-0 text-lg">
                🏢
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-white font-semibold text-sm">Already running a business?</p>
                <p className="text-zinc-400 text-xs mt-1 leading-relaxed">
                  Add or claim your company, then let our AI scan every state program to find the ones you actually qualify for.
                </p>
                <button
                  onClick={onStartAsBusiness}
                  className="mt-3 w-full flex items-center justify-center gap-1.5 px-3 py-2 bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-white text-xs font-semibold rounded-lg transition-colors"
                >
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                  </svg>
                  Add or claim your company →
                </button>
              </div>
            </div>
          </div>

          {/* Track 3 — Investor */}
          <div className="rounded-xl border border-zinc-700/60 bg-zinc-800/60 p-4 hover:border-zinc-600/80 transition-colors">
            <div className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-lg bg-violet-500/15 border border-violet-500/30 flex items-center justify-center flex-shrink-0 text-lg">
                📈
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-white font-semibold text-sm">Looking to invest in Utah?</p>
                <p className="text-zinc-400 text-xs mt-1 leading-relaxed">
                  Build an investor profile and our AI will surface the Utah startups that match your thesis — stage, sector, and more.
                </p>
                <a
                  href="/login"
                  className="mt-3 w-full flex items-center justify-center gap-1.5 px-3 py-2 bg-violet-600 hover:bg-violet-500 active:bg-violet-700 text-white text-xs font-semibold rounded-lg transition-colors"
                >
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                  </svg>
                  Set up investor profile →
                </a>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-zinc-800/80 flex-shrink-0">
          <button
            onClick={dismiss}
            className="w-full text-xs text-zinc-500 hover:text-zinc-300 transition-colors"
          >
            Just explore the map →
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Floating nudge (logged-in, no companies, no investor profile) ─────────────

export function HeroNudge({
  onAddCompany,
  onSetupInvestor,
}: {
  onAddCompany: () => void;
  onSetupInvestor: () => void;
}) {
  const [dismissed, setDismissed] = useState(true);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const wasDismissed = localStorage.getItem(NUDGE_DISMISS_KEY) === "1";
    setDismissed(wasDismissed);
    setMounted(true);
  }, []);

  function dismiss() {
    localStorage.setItem(NUDGE_DISMISS_KEY, "1");
    setDismissed(true);
  }

  if (!mounted || dismissed) return null;

  return (
    <div className="absolute bottom-6 left-4 z-20 w-72">
      <div className="bg-zinc-900/95 backdrop-blur-md border border-zinc-700/60 rounded-2xl shadow-2xl overflow-hidden">
        <div className="px-4 py-3 flex items-start gap-3">
          <div className="text-xl flex-shrink-0 mt-0.5">✨</div>
          <div className="flex-1 min-w-0">
            <p className="text-white font-semibold text-sm">Get more out of the map</p>
            <p className="text-zinc-400 text-xs mt-0.5 leading-relaxed">
              Add your company to unlock AI resource matching — 200+ free Utah programs, filtered for you.
            </p>
            <div className="flex gap-2 mt-2.5">
              <button
                onClick={onAddCompany}
                className="flex-1 px-2.5 py-1.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold rounded-lg transition-colors"
              >
                Add company
              </button>
              <button
                onClick={onSetupInvestor}
                className="flex-1 px-2.5 py-1.5 bg-zinc-700 hover:bg-zinc-600 text-zinc-200 text-xs font-semibold rounded-lg transition-colors"
              >
                I&apos;m an investor
              </button>
            </div>
          </div>
          <button
            onClick={dismiss}
            className="text-zinc-500 hover:text-zinc-300 transition-colors flex-shrink-0 -mt-0.5 -mr-0.5"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}
