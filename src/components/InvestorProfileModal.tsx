"use client";

import { useState } from "react";
import { upsertInvestorProfile, type InvestorProfile, type InvestorProfileInput } from "@/app/investor/actions";

const STAGES = [
  "Pre-Seed",
  "Seed",
  "Series A",
  "Series B",
  "Series C",
  "Series D+",
  "Bootstrapped",
];

const SECTORS = [
  "B2B Software",
  "FinTech",
  "Consumer",
  "Bio/Medical Tech",
  "Security",
  "Energy",
  "Marketplaces",
];

const CHECK_SIZES = [
  "Under $25K",
  "$25K–$100K",
  "$100K–$500K",
  "$500K–$1M",
  "$1M–$5M",
  "$5M+",
];

function TogglePill({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`px-3 py-1.5 rounded-xl text-xs font-semibold border-2 transition-all ${
        active
          ? "border-violet-500 bg-violet-50 text-violet-800"
          : "border-zinc-200 bg-white text-zinc-600 hover:border-zinc-300"
      }`}
    >
      {label}
    </button>
  );
}

export default function InvestorProfileModal({
  existing,
  onClose,
  onSaved,
  onFindMatches,
}: {
  existing: InvestorProfile | null;
  onClose: () => void;
  onSaved: (profile: InvestorProfileInput) => void;
  onFindMatches?: (input: InvestorProfileInput) => void;
}) {
  const [displayName, setDisplayName] = useState(existing?.display_name ?? "");
  const [firmName, setFirmName] = useState(existing?.firm_name ?? "");
  const [bio, setBio] = useState(existing?.bio ?? "");
  const [thesis, setThesis] = useState(existing?.investment_thesis ?? "");
  const [stages, setStages] = useState<string[]>(existing?.preferred_stages ?? []);
  const [sectors, setSectors] = useState<string[]>(existing?.preferred_sectors ?? []);
  const [checkMin, setCheckMin] = useState(existing?.check_size_min ?? "");
  const [checkMax, setCheckMax] = useState(existing?.check_size_max ?? "");
  const [leadsRounds, setLeadsRounds] = useState(existing?.leads_rounds ?? false);
  const [emailSubscribed, setEmailSubscribed] = useState(existing?.email_subscribed ?? false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  function toggleStage(s: string) {
    setStages((prev) => prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s]);
  }
  function toggleSector(s: string) {
    setSectors((prev) => prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s]);
  }

  async function handleSave() {
    setSaving(true);
    setError(null);
    const input: InvestorProfileInput = {
      display_name: displayName,
      firm_name: firmName,
      bio,
      investment_thesis: thesis,
      preferred_stages: stages,
      preferred_sectors: sectors,
      check_size_min: checkMin,
      check_size_max: checkMax,
      leads_rounds: leadsRounds,
      email_subscribed: emailSubscribed,
    };
    const result = await upsertInvestorProfile(input);
    setSaving(false);
    if (result.error) {
      setError(result.error);
    } else {
      setSaved(true);
      onSaved(input);
      setTimeout(onClose, 900);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xl max-h-[90vh] flex flex-col overflow-hidden">

        {/* Header */}
        <div className="px-6 pt-5 pb-4 border-b border-zinc-100 flex items-start justify-between flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-violet-600 flex items-center justify-center flex-shrink-0">
              <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
              </svg>
            </div>
            <div>
              <h2 className="text-base font-bold text-zinc-900">
                {existing ? "Edit Investor Profile" : "Create Investor Profile"}
              </h2>
              <p className="text-xs text-zinc-500 mt-0.5">Help us match you with Utah startups worth funding</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-zinc-400 hover:text-zinc-700 p-1 rounded-lg hover:bg-zinc-100 transition-colors mt-0.5"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">

          {/* Basic info */}
          <div className="space-y-3">
            <h3 className="text-xs font-semibold text-zinc-400 uppercase tracking-wide">About you</h3>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-zinc-600 mb-1">Your name</label>
                <input
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="Jane Smith"
                  className="w-full border border-zinc-200 rounded-xl px-3 py-2 text-sm text-zinc-900 placeholder-zinc-400 focus:outline-none focus:border-violet-400 focus:ring-1 focus:ring-violet-200 transition-colors"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-zinc-600 mb-1">Firm / fund name <span className="text-zinc-400">(optional)</span></label>
                <input
                  type="text"
                  value={firmName}
                  onChange={(e) => setFirmName(e.target.value)}
                  placeholder="Beehive Ventures"
                  className="w-full border border-zinc-200 rounded-xl px-3 py-2 text-sm text-zinc-900 placeholder-zinc-400 focus:outline-none focus:border-violet-400 focus:ring-1 focus:ring-violet-200 transition-colors"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-zinc-600 mb-1">Short bio <span className="text-zinc-400">(optional)</span></label>
              <textarea
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                rows={2}
                placeholder="Angel investor focused on Utah's B2B SaaS ecosystem…"
                className="w-full border border-zinc-200 rounded-xl px-3 py-2 text-sm text-zinc-900 placeholder-zinc-400 focus:outline-none focus:border-violet-400 focus:ring-1 focus:ring-violet-200 transition-colors resize-none"
              />
            </div>
          </div>

          {/* Investment thesis */}
          <div className="space-y-2">
            <h3 className="text-xs font-semibold text-zinc-400 uppercase tracking-wide">Investment thesis</h3>
            <textarea
              value={thesis}
              onChange={(e) => setThesis(e.target.value)}
              rows={3}
              placeholder="What kinds of companies do you invest in? What do you look for? What problems are you excited about?"
              className="w-full border border-zinc-200 rounded-xl px-3 py-2 text-sm text-zinc-900 placeholder-zinc-400 focus:outline-none focus:border-violet-400 focus:ring-1 focus:ring-violet-200 transition-colors resize-none"
            />
          </div>

          {/* Stages */}
          <div className="space-y-2">
            <h3 className="text-xs font-semibold text-zinc-400 uppercase tracking-wide">Preferred stages</h3>
            <div className="flex flex-wrap gap-2">
              {STAGES.map((s) => (
                <TogglePill key={s} label={s} active={stages.includes(s)} onClick={() => toggleStage(s)} />
              ))}
            </div>
          </div>

          {/* Sectors */}
          <div className="space-y-2">
            <h3 className="text-xs font-semibold text-zinc-400 uppercase tracking-wide">Preferred sectors</h3>
            <div className="flex flex-wrap gap-2">
              {SECTORS.map((s) => (
                <TogglePill key={s} label={s} active={sectors.includes(s)} onClick={() => toggleSector(s)} />
              ))}
            </div>
          </div>

          {/* Check size */}
          <div className="space-y-2">
            <h3 className="text-xs font-semibold text-zinc-400 uppercase tracking-wide">Typical check size</h3>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-zinc-600 mb-1">Minimum</label>
                <select
                  value={checkMin}
                  onChange={(e) => setCheckMin(e.target.value)}
                  className="w-full border border-zinc-200 rounded-xl px-3 py-2 text-sm text-zinc-900 focus:outline-none focus:border-violet-400 transition-colors bg-white"
                >
                  <option value="">Select…</option>
                  {CHECK_SIZES.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-zinc-600 mb-1">Maximum</label>
                <select
                  value={checkMax}
                  onChange={(e) => setCheckMax(e.target.value)}
                  className="w-full border border-zinc-200 rounded-xl px-3 py-2 text-sm text-zinc-900 focus:outline-none focus:border-violet-400 transition-colors bg-white"
                >
                  <option value="">Select…</option>
                  {CHECK_SIZES.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
            </div>
          </div>

          {/* Lead rounds */}
          <div>
            <button
              type="button"
              onClick={() => setLeadsRounds((v) => !v)}
              className={`flex items-center gap-3 w-full px-4 py-3 rounded-2xl border-2 text-left transition-all ${
                leadsRounds
                  ? "border-violet-400 bg-violet-50"
                  : "border-zinc-200 bg-white hover:border-zinc-300"
              }`}
            >
              <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center flex-shrink-0 transition-colors ${
                leadsRounds ? "bg-violet-600 border-violet-600" : "border-zinc-300"
              }`}>
                {leadsRounds && (
                  <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                )}
              </div>
              <div>
                <p className="text-sm font-semibold text-zinc-900">I lead rounds</p>
                <p className="text-xs text-zinc-400 mt-0.5">I'm willing to set terms and anchor a round, not just co-invest</p>
              </div>
            </button>
          </div>

          {/* Email digest */}
          <div>
            <button
              type="button"
              onClick={() => setEmailSubscribed((v) => !v)}
              className={`flex items-center gap-3 w-full px-4 py-3 rounded-2xl border-2 text-left transition-all ${
                emailSubscribed
                  ? "border-emerald-400 bg-emerald-50"
                  : "border-zinc-200 bg-white hover:border-zinc-300"
              }`}
            >
              <div className={`flex-shrink-0 w-9 h-9 rounded-xl flex items-center justify-center transition-colors ${
                emailSubscribed ? "bg-emerald-500" : "bg-zinc-100"
              }`}>
                {emailSubscribed ? (
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
                <p className={`text-sm font-semibold ${emailSubscribed ? "text-emerald-800" : "text-zinc-900"}`}>
                  {emailSubscribed ? "Subscribed to investor digest ✓" : "Subscribe to investor email digest"}
                </p>
                <p className="text-xs text-zinc-400 mt-0.5 leading-relaxed">
                  {emailSubscribed
                    ? "We'll email you when companies matching your profile seek funding or post updates."
                    : "Get notified about new companies that match your thesis and alerts when followed companies seek funding."}
                </p>
              </div>
              {emailSubscribed && (
                <span className="text-xs text-zinc-400 flex-shrink-0 hover:text-zinc-600">Unsubscribe</span>
              )}
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-zinc-100 flex-shrink-0 space-y-2">
          {/* Primary: Find matches (saves first) */}
          {onFindMatches && (
            <button
              onClick={async () => {
                const input: InvestorProfileInput = {
                  display_name: displayName,
                  firm_name: firmName,
                  bio,
                  investment_thesis: thesis,
                  preferred_stages: stages,
                  preferred_sectors: sectors,
                  check_size_min: checkMin,
                  check_size_max: checkMax,
                  leads_rounds: leadsRounds,
                  email_subscribed: emailSubscribed,
                };
                setSaving(true);
                setError(null);
                const result = await upsertInvestorProfile(input);
                setSaving(false);
                if (result.error) { setError(result.error); return; }
                onSaved(input);
                onFindMatches(input);
                onClose();
              }}
              disabled={saving || saved}
              className="w-full flex items-center justify-center gap-2 bg-violet-600 hover:bg-violet-500 disabled:opacity-60 text-white font-semibold rounded-xl py-3 text-sm transition-all shadow-sm"
            >
              {saving ? (
                <>
                  <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
                  </svg>
                  Saving…
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                  </svg>
                  {existing ? "Save & find matching companies" : "Create profile & find matches"}
                </>
              )}
            </button>
          )}

          <div className="flex items-center gap-3">
            <button
              onClick={handleSave}
              disabled={saving || saved}
              className={`flex-1 flex items-center justify-center gap-2 font-semibold rounded-xl py-2.5 text-sm transition-all ${
                saved
                  ? "bg-emerald-500 text-white"
                  : onFindMatches
                  ? "bg-zinc-100 hover:bg-zinc-200 text-zinc-700 disabled:opacity-60"
                  : "bg-violet-600 hover:bg-violet-500 disabled:opacity-60 text-white shadow-sm"
              }`}
            >
              {saved ? (
                <>
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                  Saved!
                </>
              ) : saving ? (
                <>
                  <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
                  </svg>
                  Saving…
                </>
              ) : existing ? (
                "Save only"
              ) : (
                "Create investor profile"
              )}
            </button>
            <button
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl text-sm font-medium text-zinc-500 hover:text-zinc-800 hover:bg-zinc-100 transition-colors"
            >
              Cancel
            </button>
          </div>
          {error && <p className="text-xs text-red-600 pt-1">{error}</p>}
        </div>
      </div>
    </div>
  );
}
