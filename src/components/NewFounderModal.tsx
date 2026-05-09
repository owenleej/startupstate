"use client";

import { useState } from "react";
import {
  matchResourcesForNewFounder,
  subscribeNewFounder,
  type NewFounderProfile,
  type NewFounderResourceMatch,
} from "@/app/newfounder/actions";

// ── Data ──────────────────────────────────────────────────────────────────────

const INDUSTRIES = [
  { value: "Software and Information Technology", label: "Software / Tech", emoji: "💻" },
  { value: "Life Sciences and Healthcare", label: "Health / Life Sciences", emoji: "🧬" },
  { value: "Consumer Packaged Goods", label: "Consumer Products", emoji: "🛍️" },
  { value: "Manufacturing", label: "Manufacturing", emoji: "🏭" },
  { value: "Agriculture", label: "Agriculture", emoji: "🌾" },
  { value: "Financial Services", label: "Finance / Fintech", emoji: "💳" },
  { value: "Hospitality and Food Services", label: "Food / Hospitality", emoji: "🍽️" },
  { value: "Arts and Entertainment and Recreation", label: "Arts / Entertainment", emoji: "🎨" },
  { value: "Aerospace and Defense", label: "Aerospace / Defense", emoji: "🚀" },
  { value: "Other", label: "Something else", emoji: "✨" },
];

const JOURNEY_STAGES = [
  {
    value: "Explore",
    label: "Just exploring",
    description: "I have an idea but haven't taken formal steps yet",
    emoji: "🔭",
  },
  {
    value: "Launch",
    label: "Ready to launch",
    description: "I'm ready to formally start — register, license, get first funding",
    emoji: "🚀",
  },
  {
    value: "Build",
    label: "Building",
    description: "I've started and need help growing customers, hiring, or raising capital",
    emoji: "🏗️",
  },
];

const UTAH_COUNTIES = [
  "Beaver", "Box Elder", "Cache", "Carbon", "Daggett", "Davis", "Duchesne",
  "Emery", "Garfield", "Grand", "Iron", "Juab", "Kane", "Millard", "Morgan",
  "Piute", "Rich", "Salt Lake", "San Juan", "Sanpete", "Sevier", "Summit",
  "Tooele", "Uintah", "Utah", "Wasatch", "Washington", "Wayne", "Weber",
];

// ── Step 1: Questions ─────────────────────────────────────────────────────────

function QuestionsStep({
  onNext,
  onClose,
}: {
  onNext: (profile: NewFounderProfile) => void;
  onClose: () => void;
}) {
  const [industry, setIndustry] = useState<string | null>(null);
  const [journeyStage, setJourneyStage] = useState<string | null>(null);
  const [utahCounty, setUtahCounty] = useState<string | null>(null);

  const canContinue = !!industry && !!journeyStage;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden">
        <div className="px-6 pt-6 pb-4 border-b border-zinc-100 flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <div className="w-6 h-6 bg-emerald-100 rounded-lg flex items-center justify-center flex-shrink-0">
                <svg className="w-3.5 h-3.5 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <span className="text-xs font-semibold text-emerald-700 uppercase tracking-wide">New Founder Resources</span>
            </div>
            <h2 className="text-base font-bold text-zinc-900">Let&apos;s find the right resources for you</h2>
            <p className="text-sm text-zinc-500 mt-0.5">Answer a couple of questions and we&apos;ll surface the best Utah programs to help you get started.</p>
          </div>
          <button onClick={onClose} className="text-zinc-400 hover:text-zinc-700 p-1 rounded-lg hover:bg-zinc-100 transition-colors ml-4 flex-shrink-0 mt-0.5">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="px-6 py-5 space-y-6 max-h-[60vh] overflow-y-auto">
          {/* Industry */}
          <div>
            <p className="text-sm font-semibold text-zinc-800 mb-3">What kind of business are you thinking about?</p>
            <div className="grid grid-cols-2 gap-2">
              {INDUSTRIES.map((ind) => (
                <button
                  key={ind.value}
                  onClick={() => setIndustry(ind.value === industry ? null : ind.value)}
                  className={`flex items-center gap-2.5 p-3 rounded-xl border-2 text-left transition-all ${
                    industry === ind.value
                      ? "border-emerald-400 bg-emerald-50"
                      : "border-zinc-100 hover:border-zinc-300 hover:bg-zinc-50"
                  }`}
                >
                  <span className="text-lg leading-none flex-shrink-0">{ind.emoji}</span>
                  <span className={`text-xs font-medium leading-tight ${industry === ind.value ? "text-emerald-900" : "text-zinc-700"}`}>
                    {ind.label}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Journey stage */}
          <div>
            <p className="text-sm font-semibold text-zinc-800 mb-3">Where are you in your entrepreneur journey?</p>
            <div className="space-y-2">
              {JOURNEY_STAGES.map((stage) => (
                <button
                  key={stage.value}
                  onClick={() => setJourneyStage(stage.value === journeyStage ? null : stage.value)}
                  className={`w-full flex items-start gap-3 p-3 rounded-xl border-2 text-left transition-all ${
                    journeyStage === stage.value
                      ? "border-emerald-400 bg-emerald-50"
                      : "border-zinc-100 hover:border-zinc-300 hover:bg-zinc-50"
                  }`}
                >
                  <span className="text-lg leading-none flex-shrink-0 mt-0.5">{stage.emoji}</span>
                  <div>
                    <p className={`text-sm font-semibold ${journeyStage === stage.value ? "text-emerald-900" : "text-zinc-800"}`}>
                      {stage.label}
                    </p>
                    <p className="text-xs text-zinc-400 mt-0.5">{stage.description}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* County (optional) */}
          <div>
            <p className="text-sm font-semibold text-zinc-800 mb-1">
              Which county are you in? <span className="text-zinc-400 font-normal">(optional)</span>
            </p>
            <p className="text-xs text-zinc-400 mb-3">Helps us find local programs near you.</p>
            <select
              value={utahCounty ?? ""}
              onChange={(e) => setUtahCounty(e.target.value || null)}
              className="w-full border border-zinc-200 rounded-xl px-3 py-2.5 text-sm text-zinc-800 bg-white focus:outline-none focus:border-emerald-400 transition-colors"
            >
              <option value="">Select a county…</option>
              {UTAH_COUNTIES.map((c) => (
                <option key={c} value={c}>{c} County</option>
              ))}
            </select>
          </div>
        </div>

        <div className="px-6 pb-6 pt-4 border-t border-zinc-100">
          <button
            onClick={() => {
              if (industry && journeyStage) {
                onNext({ industry, journeyStage, utahCounty });
              }
            }}
            disabled={!canContinue}
            className="w-full bg-emerald-600 hover:bg-emerald-500 disabled:bg-zinc-100 disabled:text-zinc-400 text-white font-semibold rounded-xl py-3 text-sm transition-colors shadow-sm disabled:shadow-none"
          >
            {canContinue ? "Find my resources →" : "Select your industry and stage above"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Loading ───────────────────────────────────────────────────────────────────

function LoadingStep() {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden">
        <div className="px-6 py-5 border-b border-zinc-100 flex items-center gap-3">
          <div className="w-8 h-8 bg-emerald-100 rounded-xl flex items-center justify-center flex-shrink-0">
            <svg className="w-4 h-4 text-emerald-600 animate-spin" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
            </svg>
          </div>
          <div>
            <p className="text-sm font-semibold text-zinc-900">Scanning 200+ programs…</p>
            <p className="text-xs text-zinc-400">Finding the best resources for where you are right now</p>
          </div>
        </div>
        <div className="p-6 space-y-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="rounded-2xl border border-zinc-100 p-5 space-y-3 animate-pulse">
              <div className="h-4 bg-zinc-100 rounded-full w-3/4" />
              <div className="h-3 bg-zinc-100 rounded-full w-full" />
              <div className="h-3 bg-zinc-100 rounded-full w-5/6" />
              <div className="flex gap-2 mt-2">
                <div className="h-8 bg-zinc-100 rounded-xl w-28" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Resource card ─────────────────────────────────────────────────────────────

function ResourceCard({ match, index }: { match: NewFounderResourceMatch; index: number }) {
  const rankBadge = [
    { label: "Top pick", cls: "bg-emerald-500 text-white" },
    { label: "Great fit", cls: "bg-blue-500 text-white" },
    { label: "Strong match", cls: "bg-violet-500 text-white" },
    { label: "Worth exploring", cls: "bg-amber-500 text-white" },
  ][index] ?? { label: "Match", cls: "bg-zinc-400 text-white" };

  return (
    <div className="rounded-2xl border border-zinc-100 overflow-hidden">
      <div className="px-5 py-4 bg-zinc-50/60 border-b border-zinc-100">
        <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${rankBadge.cls}`}>
          {rankBadge.label}
        </span>
        <p className="text-sm font-bold text-zinc-900 mt-2 leading-snug">{match.opportunity_headline}</p>
        <p className="text-xs text-zinc-400 mt-0.5 font-medium">{match.resource_title}</p>
      </div>
      <div className="px-5 py-4 space-y-4">
        <p className="text-sm text-zinc-600 leading-relaxed">{match.why_match}</p>
        <div className="space-y-2">
          <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wide">How to get started</p>
          <ul className="space-y-1.5">
            {match.action_items.map((item, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-zinc-700">
                <span className="mt-0.5 flex-shrink-0 w-4 h-4 rounded-full bg-zinc-900 text-white text-[10px] font-bold flex items-center justify-center">
                  {i + 1}
                </span>
                {item}
              </li>
            ))}
          </ul>
        </div>
        {match.action_url && (
          <a
            href={match.action_url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-xs font-semibold bg-zinc-900 hover:bg-zinc-700 text-white px-3 py-2 rounded-xl transition-colors"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
            </svg>
            {match.action_label}
          </a>
        )}
      </div>
    </div>
  );
}

// ── Newsletter signup (inline, no company required) ───────────────────────────

function NewsletterCapture({ profile }: { profile: NewFounderProfile }) {
  const [email, setEmail] = useState("");
  const [state, setState] = useState<"idle" | "loading" | "done" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");

  async function subscribe() {
    if (!email.trim()) return;
    setState("loading");
    const result = await subscribeNewFounder(email.trim(), profile);
    if (result.error) {
      setErrorMsg(result.error);
      setState("error");
    } else {
      setState("done");
    }
  }

  if (state === "done") {
    return (
      <div className="flex items-center gap-3 px-4 py-3 rounded-2xl border-2 border-emerald-400 bg-emerald-50">
        <div className="w-8 h-8 bg-emerald-500 rounded-xl flex items-center justify-center flex-shrink-0">
          <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <div>
          <p className="text-sm font-semibold text-emerald-800">You&apos;re subscribed!</p>
          <p className="text-xs text-emerald-700 mt-0.5">We&apos;ll send new founder resources to your inbox each month.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border-2 border-zinc-200 bg-zinc-50 px-4 py-4">
      <div className="flex items-start gap-3 mb-3">
        <div className="w-8 h-8 bg-zinc-100 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5">
          <svg className="w-4 h-4 text-zinc-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
          </svg>
        </div>
        <div>
          <p className="text-sm font-semibold text-zinc-900">Get a new founder newsletter</p>
          <p className="text-xs text-zinc-500 mt-0.5">We&apos;ll share resources, programs, and tips for aspiring Utah entrepreneurs — monthly, no spam.</p>
        </div>
      </div>
      <div className="flex gap-2">
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") subscribe(); }}
          placeholder="your@email.com"
          className="flex-1 border border-zinc-200 rounded-xl px-3 py-2 text-sm text-zinc-800 bg-white focus:outline-none focus:border-emerald-400 transition-colors placeholder-zinc-400"
        />
        <button
          onClick={subscribe}
          disabled={!email.trim() || state === "loading"}
          className="bg-emerald-600 hover:bg-emerald-500 disabled:bg-zinc-200 disabled:text-zinc-400 text-white text-xs font-semibold px-4 py-2 rounded-xl transition-colors whitespace-nowrap"
        >
          {state === "loading" ? "Saving…" : "Subscribe"}
        </button>
      </div>
      {state === "error" && <p className="text-xs text-red-600 mt-2 px-1">{errorMsg}</p>}
    </div>
  );
}

// ── Results ───────────────────────────────────────────────────────────────────

function ResultsStep({
  matches,
  profile,
  onBack,
  onClose,
}: {
  matches: NewFounderResourceMatch[];
  profile: NewFounderProfile;
  onBack: () => void;
  onClose: () => void;
}) {
  const stageName = { Explore: "Exploring", Launch: "Launching", Build: "Building" }[profile.journeyStage] ?? profile.journeyStage;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col">
        <div className="px-6 py-4 border-b border-zinc-100 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={onBack}
              className="text-zinc-400 hover:text-zinc-700 p-1 rounded-lg hover:bg-zinc-100 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <div>
              <p className="text-sm font-bold text-zinc-900">Resources for your journey: {stageName}</p>
              <p className="text-xs text-zinc-400">{matches.length} programs selected from 200+ across Utah</p>
            </div>
          </div>
          <button onClick={onClose} className="text-zinc-400 hover:text-zinc-700 p-1 rounded-lg hover:bg-zinc-100 transition-colors">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
          {matches.map((match, i) => (
            <ResourceCard key={match.resource_id} match={match} index={i} />
          ))}
        </div>

        <div className="px-6 py-4 border-t border-zinc-100 space-y-3">
          <NewsletterCapture profile={profile} />
          <div className="flex items-center justify-between">
            <p className="text-xs text-zinc-400">AI-generated — verify details directly with each program</p>
            <button onClick={onBack} className="text-xs text-zinc-500 hover:text-zinc-800 font-medium transition-colors">
              Start over →
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Error ─────────────────────────────────────────────────────────────────────

function ErrorStep({ message, onBack }: { message: string; onBack: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-8 text-center">
        <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg className="w-6 h-6 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        </div>
        <p className="text-sm text-zinc-700 mb-6">{message}</p>
        <button
          onClick={onBack}
          className="bg-zinc-900 hover:bg-zinc-700 text-white font-semibold rounded-xl px-5 py-2.5 text-sm transition-colors"
        >
          Try again
        </button>
      </div>
    </div>
  );
}

// ── Root ──────────────────────────────────────────────────────────────────────

type Step = "questions" | "loading" | "results" | "error";

export default function NewFounderModal({ onClose }: { onClose: () => void }) {
  const [step, setStep] = useState<Step>("questions");
  const [profile, setProfile] = useState<NewFounderProfile | null>(null);
  const [matches, setMatches] = useState<NewFounderResourceMatch[]>([]);
  const [errorMsg, setErrorMsg] = useState("");

  async function handleNext(p: NewFounderProfile) {
    setProfile(p);
    setStep("loading");
    const result = await matchResourcesForNewFounder(p);
    if (result.matches) {
      setMatches(result.matches);
      setStep("results");
    } else {
      setErrorMsg(result.error ?? "Something went wrong.");
      setStep("error");
    }
  }

  if (step === "questions") return <QuestionsStep onNext={handleNext} onClose={onClose} />;
  if (step === "loading") return <LoadingStep />;
  if (step === "error") return <ErrorStep message={errorMsg} onBack={() => setStep("questions")} />;
  return (
    <ResultsStep
      matches={matches}
      profile={profile!}
      onBack={() => setStep("questions")}
      onClose={onClose}
    />
  );
}
