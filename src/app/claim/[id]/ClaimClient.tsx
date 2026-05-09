"use client";

import { useActionState } from "react";
import { submitClaim, verifyOtp, type ClaimState } from "../actions";

type Company = {
  id: number;
  name: string | null;
  website: string | null;
  description: string | null;
  section: string | null;
};

const SECTION_COLORS: Record<string, string> = {
  "B2B Software": "#3B82F6",
  "FinTech": "#10B981",
  "Consumer": "#F59E0B",
  "Bio/Medical Tech": "#EF4444",
  "Security": "#8B5CF6",
  "Energy": "#F97316",
  "Marketplaces": "#EC4899",
};

function extractDomain(url: string | null) {
  if (!url) return null;
  try {
    return new URL(url.startsWith("http") ? url : `https://${url}`).hostname.replace(/^www\./, "");
  } catch { return null; }
}

export default function ClaimClient({ company }: { company: Company }) {
  const [claimState, claimAction, claimPending] = useActionState<ClaimState, FormData>(submitClaim, null);
  const [otpState, otpAction, otpPending] = useActionState<ClaimState, FormData>(verifyOtp, null);

  const color = company.section ? (SECTION_COLORS[company.section] ?? "#6B7280") : "#6B7280";
  const domain = extractDomain(company.website);
  const activeState = otpState ?? claimState;
  const isDone = activeState && "step" in activeState && activeState.step === "done";

  return (
    <div className="min-h-screen bg-zinc-950 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Back link */}
        <a href="/" className="inline-flex items-center gap-1.5 text-sm text-zinc-500 hover:text-zinc-300 transition-colors mb-6">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
          Back to map
        </a>

        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden shadow-xl">
          {/* Company header */}
          <div className="px-6 pt-6 pb-5 border-b border-zinc-800">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold text-lg flex-shrink-0" style={{ backgroundColor: color }}>
                {company.name?.[0]?.toUpperCase() ?? "?"}
              </div>
              <div>
                <h1 className="text-base font-semibold text-white leading-tight">{company.name}</h1>
                {domain && <p className="text-xs text-zinc-500">{domain}</p>}
              </div>
            </div>
            {company.description && (
              <p className="text-sm text-zinc-400 leading-relaxed line-clamp-2">{company.description}</p>
            )}
          </div>

          <div className="px-6 py-6">
            {/* Done state */}
            {isDone && (
              <div className="text-center">
                <div className="w-14 h-14 bg-emerald-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-7 h-7 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <h2 className="text-lg font-semibold text-white mb-2">Claim verified!</h2>
                <p className="text-sm text-zinc-400 mb-6">
                  {"step" in activeState && activeState.step === "done" ? activeState.message : ""}
                </p>
                <a href="/" className="inline-block px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold rounded-xl transition-colors">
                  Back to map
                </a>
              </div>
            )}

            {/* Manual review state */}
            {!isDone && activeState && "step" in activeState && activeState.step === "manual" && (
              <div className="text-center">
                <div className="w-14 h-14 bg-amber-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-7 h-7 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <h2 className="text-lg font-semibold text-white mb-2">Request submitted</h2>
                <p className="text-sm text-zinc-400 mb-6">{activeState.message}</p>
                <a href="/" className="inline-block px-5 py-2.5 bg-zinc-700 hover:bg-zinc-600 text-white text-sm font-semibold rounded-xl transition-colors">
                  Back to map
                </a>
              </div>
            )}

            {/* OTP entry state */}
            {!isDone && activeState && "step" in activeState && activeState.step === "otp" && (
              <>
                <div className="mb-5">
                  <h2 className="text-base font-semibold text-white mb-1">Check your email</h2>
                  <p className="text-sm text-zinc-400">
                    We sent a 6-digit code to <span className="text-white font-medium">{activeState.email}</span>. Enter it below to verify your claim.
                  </p>
                </div>
                <form action={otpAction} className="space-y-4">
                  <input type="hidden" name="claim_id" value={activeState.claimId} />
                  <div>
                    <label className="block text-xs font-medium text-zinc-400 mb-1.5">Verification code</label>
                    <input
                      name="otp"
                      type="text"
                      inputMode="numeric"
                      maxLength={6}
                      autoFocus
                      placeholder="000000"
                      className="w-full rounded-xl border border-zinc-700 bg-zinc-800 px-4 py-3 text-2xl font-bold text-white text-center tracking-[0.5em] placeholder-zinc-600 focus:outline-none focus:border-blue-500 transition-colors"
                    />
                  </div>
                  {otpState && "error" in otpState && (
                    <p className="rounded-lg border border-red-800 bg-red-950 px-3 py-2 text-sm text-red-300">{otpState.error}</p>
                  )}
                  <button
                    type="submit"
                    disabled={otpPending}
                    className="w-full py-2.5 bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold rounded-xl transition-colors disabled:opacity-50"
                  >
                    {otpPending ? "Verifying…" : "Verify code"}
                  </button>
                </form>
              </>
            )}

            {/* Initial email form */}
            {!isDone && (!activeState || "error" in activeState) && !(activeState && "step" in activeState) && (
              <>
                <div className="mb-5">
                  <h2 className="text-base font-semibold text-white mb-1">Claim this company</h2>
                  <p className="text-sm text-zinc-400">
                    Enter your work email. If it matches <span className="text-white">{domain ?? "the company domain"}</span>, we'll send you a verification code. Otherwise your request will be reviewed manually.
                  </p>
                </div>
                <form action={claimAction} className="space-y-4">
                  <input type="hidden" name="company_id" value={company.id} />
                  <div>
                    <label className="block text-xs font-medium text-zinc-400 mb-1.5">Work email</label>
                    <input
                      name="email"
                      type="email"
                      required
                      autoFocus
                      placeholder={domain ? `you@${domain}` : "you@company.com"}
                      className="w-full rounded-xl border border-zinc-700 bg-zinc-800 px-4 py-2.5 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-blue-500 transition-colors"
                    />
                  </div>
                  {activeState && "error" in activeState && (
                    <p className="rounded-lg border border-red-800 bg-red-950 px-3 py-2 text-sm text-red-300">{activeState.error}</p>
                  )}
                  <button
                    type="submit"
                    disabled={claimPending}
                    className="w-full py-2.5 bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold rounded-xl transition-colors disabled:opacity-50"
                  >
                    {claimPending ? "Sending…" : "Continue"}
                  </button>
                </form>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
