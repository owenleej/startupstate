"use client";

import { useState } from "react";
import {
  matchResources,
  generateEmailDraft,
  type MatchMode,
  type ResourceMatch,
  type EmailDraft,
} from "@/app/company/matchActions";
import NewsletterSignup from "./NewsletterSignup";

// ── Goal definitions (aligned with resource topic tags) ───────────────────────

const GOALS = [
  {
    value: "Start a Business",
    label: "Set up my business",
    description: "Formation, licensing, legal structure, business plan",
    emoji: "🏗️",
    color: "hover:border-blue-400 hover:bg-blue-50/50 group-hover:text-blue-800",
    activeColor: "border-blue-400 bg-blue-50 text-blue-800",
  },
  {
    value: "Funding",
    label: "Get funding",
    description: "Grants, loans, pitch competitions, investors",
    emoji: "💰",
    color: "hover:border-emerald-400 hover:bg-emerald-50/50 group-hover:text-emerald-800",
    activeColor: "border-emerald-400 bg-emerald-50 text-emerald-800",
  },
  {
    value: "Late Stage Growth",
    label: "Grow & scale",
    description: "Expand operations, enter new markets, scale the team",
    emoji: "📈",
    color: "hover:border-violet-400 hover:bg-violet-50/50 group-hover:text-violet-800",
    activeColor: "border-violet-400 bg-violet-50 text-violet-800",
  },
  {
    value: "Marketing and Sales",
    label: "Grow customers",
    description: "Marketing, sales, go-to-market, customer acquisition",
    emoji: "📣",
    color: "hover:border-orange-400 hover:bg-orange-50/50 group-hover:text-orange-800",
    activeColor: "border-orange-400 bg-orange-50 text-orange-800",
  },
  {
    value: "International Trade",
    label: "Go international",
    description: "Export, global markets, trade programs",
    emoji: "🌍",
    color: "hover:border-cyan-400 hover:bg-cyan-50/50 group-hover:text-cyan-800",
    activeColor: "border-cyan-400 bg-cyan-50 text-cyan-800",
  },
  {
    value: "Taxes and Finance",
    label: "Taxes & finance",
    description: "Tax incentives, accounting, R&D credits, compliance",
    emoji: "🧾",
    color: "hover:border-amber-400 hover:bg-amber-50/50 group-hover:text-amber-800",
    activeColor: "border-amber-400 bg-amber-50 text-amber-800",
  },
  {
    value: "Entrepreneurship Communities",
    label: "Find my community",
    description: "Accelerators, networks, mentors, co-working",
    emoji: "🤝",
    color: "hover:border-pink-400 hover:bg-pink-50/50 group-hover:text-pink-800",
    activeColor: "border-pink-400 bg-pink-50 text-pink-800",
  },
  {
    value: "Close or Exit a Business",
    label: "Exit or close",
    description: "Acquisition, wind-down, succession planning",
    emoji: "🏁",
    color: "hover:border-zinc-400 hover:bg-zinc-50/50 group-hover:text-zinc-800",
    activeColor: "border-zinc-400 bg-zinc-100 text-zinc-800",
  },
] as const;

// ── Mode selector ─────────────────────────────────────────────────────────────

function ModeSelector({
  onSelect,
  onClose,
}: {
  onSelect: (mode: MatchMode) => void;
  onClose: () => void;
}) {
  const [selectedGoal, setSelectedGoal] = useState<string | null>(null);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden">
        {/* Header */}
        <div className="px-6 pt-5 pb-4 border-b border-zinc-100 flex items-start justify-between">
          <div>
            <h2 className="text-base font-extrabold text-zinc-900 mb-1">Utah built 200+ programs for businesses like yours.</h2>
            <p className="text-sm text-zinc-500">Grants, loans, training, expert mentorship — most people never know they exist. Let AI match you to the ones you actually qualify for, right now.</p>
          </div>
          <button onClick={onClose} className="text-zinc-400 hover:text-zinc-700 p-1 rounded-lg hover:bg-zinc-100 transition-colors mt-0.5 ml-3 flex-shrink-0">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="px-6 py-4 space-y-4">
          <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wide">What are you focused on right now?</p>
          {/* Specific goal grid */}
          <div className="grid grid-cols-2 gap-2">
            {GOALS.map((goal) => {
              const active = selectedGoal === goal.value;
              return (
                <button
                  key={goal.value}
                  onClick={() => setSelectedGoal(active ? null : goal.value)}
                  className={`group flex items-start gap-3 p-3 rounded-xl border-2 text-left transition-all ${
                    active ? goal.activeColor : `border-zinc-100 ${goal.color}`
                  }`}
                >
                  <span className="text-xl leading-none mt-0.5 flex-shrink-0">{goal.emoji}</span>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-zinc-900 leading-tight">{goal.label}</p>
                    <p className="text-xs text-zinc-400 mt-0.5 leading-tight">{goal.description}</p>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Divider */}
          <div className="flex items-center gap-3">
            <div className="flex-1 h-px bg-zinc-100" />
            <span className="text-xs text-zinc-400">or</span>
            <div className="flex-1 h-px bg-zinc-100" />
          </div>

          {/* General match */}
          <button
            onClick={() => onSelect("general")}
            className="w-full flex items-center gap-3 p-3 rounded-xl border-2 border-transparent transition-all text-left hover:shadow-md"
            style={{ background: "linear-gradient(white, white) padding-box, linear-gradient(135deg, #7c3aed, #a855f7, #ec4899) border-box" }}
          >
            <span className="text-xl">✦</span>
            <div>
              <p className="text-sm font-semibold text-zinc-900">Surprise me — show my best matches</p>
              <p className="text-xs text-zinc-400 mt-0.5">AI scans all 200+ programs and surfaces the top opportunities across every category</p>
            </div>
          </button>
        </div>

        {/* Footer CTA */}
        <div className="px-6 pb-5">
          <button
            onClick={() => {
              if (selectedGoal) onSelect({ goal: selectedGoal });
            }}
            disabled={!selectedGoal}
            className="btn-ai w-full py-3 text-sm"
          >
            {selectedGoal
              ? `✦ Find my free resources →`
              : "Select a focus area above"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Loading skeleton ──────────────────────────────────────────────────────────

function LoadingSkeleton({ mode }: { mode: MatchMode }) {
  const label =
    mode === "general"
      ? "Scanning all 200+ free programs for your best opportunities…"
      : `Digging through 200+ programs to find free help for: ${GOALS.find((g) => g.value === (mode as { goal: string }).goal)?.label.toLowerCase() ?? "your goal"}…`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden">
        <div className="px-6 py-5 border-b border-zinc-100 flex items-center gap-3">
          <div className="w-8 h-8 bg-emerald-100 rounded-xl flex items-center justify-center flex-shrink-0">
            <svg className="w-4 h-4 text-emerald-600 animate-spin" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
            </svg>
          </div>
          <div>
            <p className="text-sm font-semibold text-zinc-900">Finding your matches…</p>
            <p className="text-xs text-zinc-400">{label}</p>
          </div>
        </div>
        <div className="p-6 space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="rounded-2xl border border-zinc-100 p-5 space-y-3 animate-pulse">
              <div className="h-4 bg-zinc-100 rounded-full w-3/4" />
              <div className="h-3 bg-zinc-100 rounded-full w-full" />
              <div className="h-3 bg-zinc-100 rounded-full w-5/6" />
              <div className="flex gap-2 mt-2">
                <div className="h-8 bg-zinc-100 rounded-xl w-28" />
                <div className="h-8 bg-zinc-100 rounded-xl w-36" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Email draft section ───────────────────────────────────────────────────────

function EmailDraftSection({
  companyId,
  resourceId,
  opportunityHeadline,
}: {
  companyId: number;
  resourceId: number;
  opportunityHeadline: string;
}) {
  const [state, setState] = useState<"idle" | "loading" | "done" | "error">("idle");
  const [draft, setDraft] = useState<EmailDraft | null>(null);
  const [copied, setCopied] = useState(false);

  async function generate() {
    setState("loading");
    const result = await generateEmailDraft(companyId, resourceId, opportunityHeadline);
    if (result.draft) {
      setDraft(result.draft);
      setState("done");
    } else {
      setState("error");
    }
  }

  function copy() {
    if (!draft) return;
    const text = `To: ${draft.recipient_email}\nSubject: ${draft.subject}\n\n${draft.body}`;
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  }

  if (state === "idle") {
    return (
      <button
        onClick={generate}
        className="btn-ai flex items-center gap-1.5 text-xs px-3 py-1.5"
        style={{ borderRadius: "0.5rem" }}
      >
        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
        </svg>
        ✦ Draft email with AI
      </button>
    );
  }

  if (state === "loading") {
    return (
      <div className="flex items-center gap-2 text-xs text-zinc-400 py-1">
        <svg className="w-3.5 h-3.5 animate-spin" viewBox="0 0 24 24" fill="none">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
        </svg>
        Drafting your email…
      </div>
    );
  }

  if (state === "error") {
    return (
      <button onClick={generate} className="text-xs text-red-500 hover:text-red-700">
        Failed — tap to retry
      </button>
    );
  }

  if (!draft) return null;

  return (
    <div className="mt-3 rounded-xl border border-blue-100 bg-blue-50/40 overflow-hidden">
      <div className="px-4 py-3 border-b border-blue-100 space-y-1.5">
        <div className="flex items-baseline gap-2">
          <span className="text-xs font-medium text-zinc-400 w-14 shrink-0">To:</span>
          <span className="text-xs text-zinc-700">{draft.recipient_email}</span>
        </div>
        <div className="flex items-baseline gap-2">
          <span className="text-xs font-medium text-zinc-400 w-14 shrink-0">Subject:</span>
          <span className="text-xs font-medium text-zinc-800">{draft.subject}</span>
        </div>
      </div>
      <div className="px-4 py-3">
        <pre className="text-xs text-zinc-700 whitespace-pre-wrap font-sans leading-relaxed">{draft.body}</pre>
      </div>
      <div className="px-4 pb-3 flex items-center gap-2">
        <button
          onClick={copy}
          className={`flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg transition-all ${
            copied
              ? "bg-emerald-100 text-emerald-700"
              : "bg-white border border-zinc-200 text-zinc-600 hover:border-blue-300 hover:text-blue-700"
          }`}
        >
          {copied ? (
            <>
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
              Copied!
            </>
          ) : (
            <>
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
              Copy to clipboard
            </>
          )}
        </button>
        <span className="text-xs text-zinc-400">Paste into your email client to send</span>
      </div>
    </div>
  );
}

// ── Resource match card ───────────────────────────────────────────────────────

function MatchCard({
  match,
  companyId,
  index,
}: {
  match: ResourceMatch;
  companyId: number;
  index: number;
}) {
  const rankBadge = [
    { label: "Best match", cls: "bg-emerald-500 text-white" },
    { label: "Strong match", cls: "bg-blue-500 text-white" },
    { label: "Good match", cls: "bg-violet-500 text-white" },
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
          <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wide">How to claim it</p>
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

        <div className="flex flex-wrap items-center gap-2 pt-1">
          {/* Always show resource link when available */}
          {match.action_url && (
            <a
              href={match.action_url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 text-xs font-semibold bg-zinc-900 hover:bg-zinc-700 text-white px-3 py-2 rounded-xl transition-colors"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
              {match.action_type === "email" ? "Learn more" : match.action_label}
            </a>
          )}
          {/* Only offer email draft when emailing is the required action */}
          {(match.action_type === "email" || match.action_type === "both") && match.action_email && (
            <EmailDraftSection
              companyId={companyId}
              resourceId={match.resource_id}
              opportunityHeadline={match.opportunity_headline}
            />
          )}
        </div>
      </div>
    </div>
  );
}

// ── Results view ──────────────────────────────────────────────────────────────

function ResultsView({
  matches,
  mode,
  companyId,
  companyName,
  isLoggedIn,
  initialSubscribed,
  onBack,
  onClose,
}: {
  matches: ResourceMatch[];
  mode: MatchMode;
  companyId: number;
  companyName: string;
  isLoggedIn: boolean;
  initialSubscribed: boolean;
  onBack: () => void;
  onClose: () => void;
}) {
  const modeLabel =
    mode === "general"
      ? "Best overall matches"
      : `Resources for: ${GOALS.find((g) => g.value === (mode as { goal: string }).goal)?.label ?? (mode as { goal: string }).goal}`;

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
              <p className="text-sm font-bold text-zinc-900">{modeLabel}</p>
              <p className="text-xs text-zinc-400">{matches.length} resources selected from 200+ programs</p>
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
            <MatchCard key={match.resource_id} match={match} companyId={companyId} index={i} />
          ))}
        </div>

        <div className="px-6 py-4 border-t border-zinc-100 space-y-3">
          <NewsletterSignup
            companyId={companyId}
            companyName={companyName}
            isLoggedIn={isLoggedIn}
            initialSubscribed={initialSubscribed}
            variant="inline"
          />
          <div className="flex items-center justify-between">
            <p className="text-xs text-zinc-400">AI-generated — verify details directly with each program</p>
            <button onClick={onBack} className="text-xs text-zinc-500 hover:text-zinc-800 font-medium transition-colors">
              Try a different focus →
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Error view ────────────────────────────────────────────────────────────────

function ErrorView({ message, onBack }: { message: string; onBack: () => void }) {
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

// ── Root component ────────────────────────────────────────────────────────────

type Stage = "select" | "loading" | "results" | "error";

export default function ResourceMatchModal({
  companyId,
  companyName,
  isLoggedIn = true,
  initialSubscribed = false,
  onClose,
}: {
  companyId: number;
  companyName: string;
  isLoggedIn?: boolean;
  initialSubscribed?: boolean;
  onClose: () => void;
}) {
  const [stage, setStage] = useState<Stage>("select");
  const [mode, setMode] = useState<MatchMode>("general");
  const [matches, setMatches] = useState<ResourceMatch[]>([]);
  const [errorMsg, setErrorMsg] = useState("");

  async function runMatch(selectedMode: MatchMode) {
    setMode(selectedMode);
    setStage("loading");
    const result = await matchResources(companyId, selectedMode);
    if (result.matches) {
      setMatches(result.matches);
      setStage("results");
    } else {
      setErrorMsg(result.error ?? "Something went wrong.");
      setStage("error");
    }
  }

  if (stage === "select") return <ModeSelector onSelect={runMatch} onClose={onClose} />;
  if (stage === "loading") return <LoadingSkeleton mode={mode} />;
  if (stage === "error") return <ErrorView message={errorMsg} onBack={() => setStage("select")} />;
  return (
    <ResultsView
      matches={matches}
      mode={mode}
      companyId={companyId}
      companyName={companyName}
      isLoggedIn={isLoggedIn}
      initialSubscribed={initialSubscribed}
      onBack={() => setStage("select")}
      onClose={onClose}
    />
  );
}
