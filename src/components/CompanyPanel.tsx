"use client";

import { useState } from "react";
import type { Company } from "./MapClient";
import ResourceMatchModal from "./ResourceMatchModal";
import { generateInvestorOutreach, type InvestorEmailDraft } from "@/app/investor/emailActions";

const SECTION_STYLES: Record<string, { text: string; bg: string; accent: string }> = {
  "B2B Software":     { text: "#1D4ED8", bg: "#DBEAFE", accent: "#3B82F6" },
  "FinTech":          { text: "#065F46", bg: "#D1FAE5", accent: "#10B981" },
  "Consumer":         { text: "#92400E", bg: "#FEF3C7", accent: "#F59E0B" },
  "Bio/Medical Tech": { text: "#991B1B", bg: "#FEE2E2", accent: "#EF4444" },
  "Security":         { text: "#5B21B6", bg: "#EDE9FE", accent: "#8B5CF6" },
  "Energy":           { text: "#9A3412", bg: "#FFEDD5", accent: "#F97316" },
  "Marketplaces":     { text: "#9D174D", bg: "#FCE7F3", accent: "#EC4899" },
};

function extractDomain(url: string | null): string | null {
  if (!url) return null;
  try {
    const u = new URL(url.startsWith("http") ? url : `https://${url}`);
    return u.hostname.replace(/^www\./, "");
  } catch {
    return null;
  }
}

const LOGODEV_TOKEN = process.env.NEXT_PUBLIC_LOGODEV_TOKEN ?? "";

function CompanyLogo({ company, size = 72 }: { company: Company; size?: number }) {
  const [imgFailed, setImgFailed] = useState(false);
  const domain = extractDomain(company.website);
  const accent = company.section ? (SECTION_STYLES[company.section]?.accent ?? "#6B7280") : "#6B7280";
  const initial = company.name.trim()[0]?.toUpperCase() ?? "?";
  const px = `${size}px`;

  if (domain && !imgFailed && LOGODEV_TOKEN) {
    const src = `https://img.logo.dev/${domain}?token=${LOGODEV_TOKEN}&size=128&format=webp`;
    return (
      <div
        className="rounded-2xl border border-zinc-200 bg-white flex items-center justify-center overflow-hidden flex-shrink-0 shadow-sm"
        style={{ width: px, height: px }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={src}
          alt={`${company.name} logo`}
          width={size}
          height={size}
          className="w-full h-full object-contain p-2"
          onError={() => setImgFailed(true)}
        />
      </div>
    );
  }

  return (
    <div
      className="rounded-2xl flex items-center justify-center flex-shrink-0 shadow-sm text-white font-bold"
      style={{ backgroundColor: accent, width: px, height: px, fontSize: size * 0.38 }}
    >
      {initial}
    </div>
  );
}

function SectionPill({ section }: { section: string }) {
  const ss = SECTION_STYLES[section];
  if (!ss) return null;
  return (
    <span className="text-xs font-semibold px-3 py-1 rounded-full" style={{ color: ss.text, backgroundColor: ss.bg }}>
      {section}
    </span>
  );
}

function Pill({ children }: { children: React.ReactNode }) {
  return (
    <span className="text-xs font-medium px-3 py-1.5 bg-zinc-100 text-zinc-600 rounded-xl">
      {children}
    </span>
  );
}

// ── Single company view ───────────────────────────────────────────────────────

function InvestorEmailSection({ companyId, recipientEmail }: { companyId: number; recipientEmail: string }) {
  const [stage, setStage] = useState<"idle" | "loading" | "done" | "error">("idle");
  const [draft, setDraft] = useState<InvestorEmailDraft | null>(null);
  const [errorMsg, setErrorMsg] = useState("");
  const [copiedEmail, setCopiedEmail] = useState(false);
  const [copiedFull, setCopiedFull] = useState(false);

  async function generate() {
    setStage("loading");
    const result = await generateInvestorOutreach(companyId);
    if (result.draft) {
      setDraft(result.draft);
      setStage("done");
    } else {
      setErrorMsg(result.error ?? "Something went wrong.");
      setStage("error");
    }
  }

  function copyEmail() {
    navigator.clipboard.writeText(recipientEmail);
    setCopiedEmail(true);
    setTimeout(() => setCopiedEmail(false), 2000);
  }

  function copyFull() {
    if (!draft) return;
    navigator.clipboard.writeText(`To: ${draft.to}\nSubject: ${draft.subject}\n\n${draft.body}`);
    setCopiedFull(true);
    setTimeout(() => setCopiedFull(false), 2500);
  }

  if (stage === "idle") {
    return (
      <button
        onClick={generate}
        className="w-full flex items-center justify-center gap-2 bg-zinc-800 hover:bg-zinc-700 text-white font-semibold rounded-2xl py-3.5 text-sm transition-colors shadow-sm"
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
        </svg>
        Draft Investor Email
      </button>
    );
  }

  if (stage === "loading") {
    return (
      <div className="w-full flex items-center justify-center gap-2 bg-zinc-100 rounded-2xl py-3.5 text-sm text-zinc-400">
        <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
        </svg>
        Drafting your email…
      </div>
    );
  }

  if (stage === "error") {
    return (
      <button onClick={generate} className="w-full flex items-center justify-center gap-2 bg-red-50 text-red-600 hover:bg-red-100 font-semibold rounded-2xl py-3 text-sm transition-colors">
        Failed — tap to retry
      </button>
    );
  }

  // Done — show the draft
  return (
    <div className="rounded-2xl border border-zinc-200 overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 bg-zinc-50 border-b border-zinc-200 space-y-2">
        {/* To row with copyable email */}
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-zinc-400 w-14 shrink-0">To:</span>
          <button
            onClick={copyEmail}
            className={`flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-lg border transition-all ${
              copiedEmail
                ? "bg-emerald-50 border-emerald-300 text-emerald-700"
                : "bg-white border-zinc-200 text-zinc-700 hover:border-emerald-300 hover:text-emerald-700"
            }`}
          >
            {copiedEmail ? (
              <>
                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
                Copied!
              </>
            ) : (
              <>
                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
                {recipientEmail}
              </>
            )}
          </button>
        </div>
        {/* Subject */}
        <div className="flex items-baseline gap-2">
          <span className="text-xs font-semibold text-zinc-400 w-14 shrink-0">Subject:</span>
          <span className="text-xs font-semibold text-zinc-800 leading-snug">{draft?.subject}</span>
        </div>
      </div>

      {/* Body */}
      <div className="px-4 py-3 max-h-56 overflow-y-auto">
        <pre className="text-xs text-zinc-700 whitespace-pre-wrap font-sans leading-relaxed">{draft?.body}</pre>
      </div>

      {/* Actions */}
      <div className="px-4 py-3 border-t border-zinc-100 flex items-center gap-2 bg-zinc-50/60">
        <button
          onClick={copyFull}
          className={`flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg transition-all ${
            copiedFull
              ? "bg-emerald-100 text-emerald-700"
              : "bg-white border border-zinc-200 text-zinc-600 hover:border-zinc-800 hover:text-zinc-900"
          }`}
        >
          {copiedFull ? (
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
              Copy full email
            </>
          )}
        </button>
        <span className="text-xs text-zinc-400">Paste into your email client to send</span>
        <button
          onClick={() => { setStage("idle"); setDraft(null); }}
          className="ml-auto text-xs text-zinc-400 hover:text-zinc-600 transition-colors"
        >
          Regenerate
        </button>
      </div>
    </div>
  );
}

function CopyEmailBadge({ email }: { email: string }) {
  const [copied, setCopied] = useState(false);
  function copy() {
    navigator.clipboard.writeText(email);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }
  return (
    <button
      onClick={copy}
      title="Copy investor contact email"
      className={`flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-xl border-2 transition-all ${
        copied
          ? "border-emerald-400 bg-emerald-50 text-emerald-700"
          : "border-emerald-200 bg-emerald-50 text-emerald-700 hover:border-emerald-400 hover:bg-emerald-100"
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
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
          </svg>
          {email}
        </>
      )}
    </button>
  );
}

function SingleView({
  company,
  onClose,
  isLoggedIn,
  isOwner,
  memberVerified,
  isInvestor,
  isFollowing,
  onFollowToggle,
}: {
  company: Company;
  onClose: () => void;
  isLoggedIn: boolean;
  isOwner: boolean;
  memberVerified: boolean;
  isInvestor: boolean;
  isFollowing: boolean;
  onFollowToggle: (follow: boolean) => void;
}) {
  const ss = company.section ? SECTION_STYLES[company.section] : null;
  const [showMatch, setShowMatch] = useState(false);

  return (
    <>
      {/* Top bar */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-100">
        <div className="flex items-center gap-2">
          {isOwner ? (
            <>
              <span className="text-xs font-semibold px-3 py-1 rounded-full bg-blue-50 text-blue-700">My Company</span>
              {company.status && company.status !== "approved" && (
                <span className={`text-xs font-semibold px-3 py-1 rounded-full ${
                  company.status === "pending" ? "bg-amber-50 text-amber-700" : "bg-red-50 text-red-700"
                }`}>
                  {company.status === "pending" ? "⏳ Pending review" : "Rejected"}
                </span>
              )}
            </>
          ) : ss && company.section ? (
            <SectionPill section={company.section} />
          ) : null}
        </div>
        <button
          onClick={onClose}
          className="text-zinc-400 hover:text-zinc-700 p-2 rounded-xl hover:bg-zinc-100 transition-colors"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Company header */}
      <div className="px-6 pt-6 pb-5 border-b border-zinc-100">
        <div className="flex items-start gap-5 mb-4">
          <CompanyLogo company={company} size={72} />
          <div className="flex-1 min-w-0 pt-1">
            <h2 className="text-2xl font-bold text-zinc-900 leading-tight">{company.name}</h2>
            {extractDomain(company.website) && (
              <p className="text-sm text-zinc-400 mt-1">{extractDomain(company.website)}</p>
            )}
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {company.stage && <Pill>{company.stage}</Pill>}
          {company.employees && <Pill>{company.employees} employees</Pill>}
          {company.utah_county && <Pill>📍 {company.utah_county} County</Pill>}
          {company.product_type && <Pill>{company.product_type}</Pill>}
          {company.seeking_funding && (
            <span className="text-xs font-bold px-3 py-1.5 bg-emerald-100 text-emerald-700 rounded-xl flex items-center gap-1.5">
              💰 Seeking funding
            </span>
          )}
          {company.investor_contact_email && (
            <CopyEmailBadge email={company.investor_contact_email} />
          )}
          {company.hiring && (
            <span className="text-xs font-bold px-3 py-1.5 bg-emerald-600 text-white rounded-xl flex items-center gap-1.5">
              💼 We&apos;re Hiring
            </span>
          )}
        </div>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto px-6 py-6 space-y-6">
        {company.description && (
          <p className="text-sm text-zinc-600 leading-relaxed">{company.description}</p>
        )}

        <div className="flex gap-2 flex-wrap">
          {company.website && (
            <a
              href={company.website}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 text-sm font-medium text-zinc-600 hover:text-blue-600 bg-zinc-100 hover:bg-blue-50 px-4 py-2 rounded-xl transition-colors"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
              Website
            </a>
          )}
          {company.linkedin_url && (
            <a
              href={company.linkedin_url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 text-sm font-medium text-zinc-600 hover:text-blue-600 bg-zinc-100 hover:bg-blue-50 px-4 py-2 rounded-xl transition-colors"
            >
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
              </svg>
              LinkedIn
            </a>
          )}
          {company.hiring && company.careers_url && (
            <a
              href={company.careers_url.startsWith("http") ? company.careers_url : `https://${company.careers_url}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 text-sm font-medium text-emerald-700 hover:text-emerald-900 bg-emerald-50 hover:bg-emerald-100 px-4 py-2 rounded-xl transition-colors border border-emerald-200"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
              View Open Roles
            </a>
          )}
        </div>
      </div>

      {/* CTA footer */}
      <div className="px-6 py-5 border-t border-zinc-100 bg-zinc-50/60">
        {isOwner ? (
          <div className="flex flex-col gap-3">
            {/* Company pending admin approval notice */}
            {company.status === "pending" && (
              <div className="flex items-start gap-2 bg-amber-50 border border-amber-100 rounded-xl px-4 py-3 text-xs text-amber-700">
                <svg className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Your company is pending admin review and won't appear on the map until approved.
              </div>
            )}

            {/* Membership verification pending notice */}
            {!memberVerified && (
              <div className="flex items-start gap-2 bg-amber-50 border border-amber-100 rounded-xl px-4 py-3 text-xs text-amber-700">
                <svg className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
                Verification pending — editing is locked until your claim is approved.
              </div>
            )}

            {/* Edit — only when verified */}
            {memberVerified ? (
              <a
                href={`/company/${company.id}/edit`}
                className="w-full flex items-center justify-center gap-2 bg-zinc-800 hover:bg-zinc-700 text-white font-semibold rounded-2xl py-3.5 text-sm transition-colors shadow-sm"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
                Edit Company
              </a>
            ) : (
              <div className="w-full flex items-center justify-center gap-2 bg-zinc-100 text-zinc-400 font-semibold rounded-2xl py-3.5 text-sm cursor-not-allowed select-none">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
                Edit locked — verification pending
              </div>
            )}

            {/* Match with resources — always available */}
            <button
              onClick={() => setShowMatch(true)}
              className="w-full flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white font-semibold rounded-2xl py-3.5 text-sm transition-colors shadow-sm"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
              </svg>
              Match with State Resources
            </button>
            {showMatch && (
              <ResourceMatchModal companyId={company.id} companyName={company.name} memberVerified={memberVerified} onClose={() => setShowMatch(false)} />
            )}
          </div>
        ) : isInvestor ? (
          /* Investor viewing someone else's company */
          <div className="flex flex-col gap-3">
            {company.seeking_funding && (
              <div className="flex items-start gap-2 bg-emerald-50 border border-emerald-100 rounded-xl px-4 py-3 text-xs text-emerald-700">
                <span className="text-base leading-none flex-shrink-0">💰</span>
                This company is actively seeking funding and investors.
              </div>
            )}
            <button
              onClick={() => onFollowToggle(!isFollowing)}
              className={`w-full flex items-center justify-center gap-2 font-semibold rounded-2xl py-3.5 text-sm transition-colors ${
                isFollowing
                  ? "bg-violet-100 text-violet-700 hover:bg-red-50 hover:text-red-600 border border-violet-200 hover:border-red-200"
                  : "bg-violet-600 hover:bg-violet-500 text-white shadow-sm"
              }`}
            >
              {isFollowing ? (
                <>
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
                  </svg>
                  Following — unfollow
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                  </svg>
                  Follow this company
                </>
              )}
            </button>
            <p className="text-[11px] text-zinc-400 text-center leading-relaxed">
              {isFollowing
                ? "You'll be notified of updates and funding announcements."
                : "Get notified when this company updates their profile or seeks funding."}
            </p>
            <InvestorEmailSection
              companyId={company.id}
              recipientEmail={company.investor_contact_email ?? ""}
            />
            <div className="border-t border-zinc-100 pt-3">
              <a
                href={`/claim/${company.id}`}
                className="w-full flex items-center justify-center gap-2 bg-zinc-100 hover:bg-zinc-200 text-zinc-600 hover:text-zinc-800 font-semibold rounded-2xl py-2.5 text-sm transition-colors"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
                Claim this company
              </a>
            </div>
          </div>
        ) : isLoggedIn ? (
          <a
            href={`/claim/${company.id}`}
            className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-white font-semibold rounded-2xl py-3.5 text-sm transition-colors shadow-sm"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
            Claim this company
          </a>
        ) : (
          <a
            href="/login"
            className="w-full flex items-center justify-center gap-2 bg-zinc-800 hover:bg-zinc-700 text-white font-semibold rounded-2xl py-3.5 text-sm transition-colors shadow-sm"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
            </svg>
            Sign in or create an account to claim it
          </a>
        )}
      </div>
    </>
  );
}

// ── Cluster list view ─────────────────────────────────────────────────────────

function ClusterView({
  companies,
  onSelect,
  onClose,
}: {
  companies: Company[];
  onSelect: (c: Company) => void;
  onClose: () => void;
}) {
  return (
    <>
      <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-100">
        <span className="text-base font-semibold text-zinc-800">
          {companies.length} companies
        </span>
        <button
          onClick={onClose}
          className="text-zinc-400 hover:text-zinc-700 p-2 rounded-xl hover:bg-zinc-100 transition-colors"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <div className="flex-1 overflow-y-auto divide-y divide-zinc-100">
        {companies.map((company) => (
          <button
            key={company.id}
            onClick={() => onSelect(company)}
            className="w-full flex items-center gap-4 px-6 py-4 hover:bg-zinc-50 transition-colors text-left"
          >
            <CompanyLogo company={company} size={44} />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-zinc-900 truncate">{company.name}</p>
              <div className="flex items-center gap-2 mt-1 flex-wrap">
                {company.section && <SectionPill section={company.section} />}
                {company.stage && (
                  <span className="text-xs text-zinc-400">{company.stage}</span>
                )}
              </div>
            </div>
            <svg className="w-4 h-4 text-zinc-300 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
            </svg>
          </button>
        ))}
      </div>
    </>
  );
}

// ── Panel shell ───────────────────────────────────────────────────────────────

export default function CompanyPanel({
  company,
  cluster,
  onSelectCompany,
  onClose,
  isLoggedIn = false,
  isOwner = false,
  memberVerified = false,
  isInvestor = false,
  isFollowing = false,
  onFollowToggle = () => {},
}: {
  company: Company | null;
  cluster: Company[] | null;
  onSelectCompany: (c: Company) => void;
  onClose: () => void;
  isLoggedIn?: boolean;
  isOwner?: boolean;
  memberVerified?: boolean;
  isInvestor?: boolean;
  isFollowing?: boolean;
  onFollowToggle?: (follow: boolean) => void;
}) {
  const open = !!(company || cluster);

  return (
    <>
      {/* Backdrop — dims the map to push focus to the panel */}
      <div
        className={`absolute inset-0 z-10 bg-black transition-opacity duration-300 pointer-events-none ${
          open ? "opacity-40" : "opacity-0"
        }`}
      />
      {/* Clickable backdrop area (left of panel) to dismiss */}
      {open && (
        <div
          className="absolute inset-0 z-10"
          style={{ right: "520px" }}
          onClick={onClose}
        />
      )}

      {/* Panel */}
      <div
        className={`absolute top-0 right-0 h-full w-[520px] z-20 flex flex-col bg-white shadow-2xl transition-transform duration-300 ease-out ${
          open ? "translate-x-0" : "translate-x-full"
        }`}
      >
        {company && (
          <SingleView
            company={company}
            onClose={onClose}
            isLoggedIn={isLoggedIn}
            isOwner={isOwner}
            memberVerified={memberVerified}
            isInvestor={isInvestor}
            isFollowing={isFollowing}
            onFollowToggle={onFollowToggle}
          />
        )}
        {cluster && !company && (
          <ClusterView companies={cluster} onSelect={onSelectCompany} onClose={onClose} />
        )}
      </div>
    </>
  );
}
