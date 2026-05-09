"use client";

import type { Company } from "./MapClient";
import type { InvestorMatch } from "@/app/investor/matchActions";

const SECTION_COLORS: Record<string, string> = {
  "B2B Software":     "#3B82F6",
  "FinTech":          "#10B981",
  "Consumer":         "#F59E0B",
  "Bio/Medical Tech": "#EF4444",
  "Security":         "#8B5CF6",
  "Energy":           "#F97316",
  "Marketplaces":     "#EC4899",
};

function SectionDot({ section }: { section: string | null }) {
  const color = section && SECTION_COLORS[section] ? SECTION_COLORS[section] : "#6B7280";
  return <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: color }} />;
}

function SkeletonCard() {
  return (
    <div className="px-4 py-3 border-b border-zinc-100 animate-pulse">
      <div className="flex items-start gap-3">
        <div className="w-8 h-8 rounded-lg bg-zinc-100 flex-shrink-0 mt-0.5" />
        <div className="flex-1 space-y-2 pt-1">
          <div className="h-3.5 bg-zinc-100 rounded-full w-3/4" />
          <div className="h-3 bg-zinc-100 rounded-full w-1/2" />
          <div className="h-3 bg-zinc-100 rounded-full w-full" />
          <div className="h-3 bg-zinc-100 rounded-full w-5/6" />
        </div>
      </div>
    </div>
  );
}

export type ResolvedMatch = {
  company: Company;
  match_reason: string;
  rank: number;
};

function resolveMatches(matches: InvestorMatch[], companies: Company[]): ResolvedMatch[] {
  const byId = new Map(companies.map((c) => [c.id, c]));
  return matches
    .map((m, i) => {
      const company = byId.get(m.company_id);
      if (!company) return null;
      return { company, match_reason: m.match_reason, rank: i + 1 };
    })
    .filter((m): m is ResolvedMatch => m !== null);
}

export default function InvestorMatchesSidebar({
  matches,
  allCompanies,
  loading,
  error,
  filterActive,
  selectedCompanyId,
  visibleIds,
  followedIds,
  onSelect,
  onFollowToggle,
  onClose,
  onRegenerate,
  onToggleFilter,
}: {
  matches: InvestorMatch[] | null;
  allCompanies: Company[];
  loading: boolean;
  error: string | null;
  filterActive: boolean;
  selectedCompanyId: number | null;
  visibleIds: Set<number>;
  followedIds: Set<number>;
  onSelect: (company: Company) => void;
  onFollowToggle: (companyId: number, follow: boolean) => void;
  onClose: () => void;
  onRegenerate: () => void;
  onToggleFilter: () => void;
}) {
  const resolved = matches ? resolveMatches(matches, allCompanies) : [];

  return (
    <div className="absolute top-0 left-0 h-full w-[380px] z-20 flex flex-col bg-white shadow-2xl">

      {/* Header */}
      <div className="px-4 py-3.5 border-b border-zinc-100 flex-shrink-0">
        <div className="flex items-center justify-between mb-2.5">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-violet-600 flex items-center justify-center flex-shrink-0">
              <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
              </svg>
            </div>
            <div>
              <p className="text-sm font-bold text-zinc-900 leading-tight">Investor Matches</p>
              {!loading && matches && (
                <p className="text-xs text-zinc-400 leading-tight">{resolved.length} companies selected by AI</p>
              )}
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-zinc-400 hover:text-zinc-700 p-1.5 rounded-lg hover:bg-zinc-100 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Filter toggle */}
        <button
          onClick={onToggleFilter}
          disabled={loading || !matches}
          className={`w-full flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold border-2 transition-all ${
            filterActive
              ? "border-violet-500 bg-violet-50 text-violet-800"
              : "border-zinc-200 bg-zinc-50 text-zinc-500 hover:border-zinc-300 disabled:opacity-40"
          }`}
        >
          <span className={`w-4 h-4 rounded-md border-2 flex items-center justify-center flex-shrink-0 transition-colors ${
            filterActive ? "bg-violet-600 border-violet-600" : "border-zinc-300"
          }`}>
            {filterActive && (
              <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            )}
          </span>
          {filterActive ? "Map filtered to these companies" : "Filter map to these companies"}
        </button>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto">
        {loading && (
          <>
            <div className="px-4 py-3 border-b border-zinc-100 bg-violet-50/50">
              <div className="flex items-center gap-2 text-xs text-violet-700">
                <svg className="w-3.5 h-3.5 animate-spin flex-shrink-0" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                </svg>
                Analyzing {allCompanies.length} companies against your profile…
              </div>
            </div>
            {Array.from({ length: 8 }).map((_, i) => <SkeletonCard key={i} />)}
          </>
        )}

        {error && !loading && (
          <div className="px-4 py-6 text-center">
            <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-3">
              <svg className="w-5 h-5 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <p className="text-sm text-zinc-600 mb-3">{error}</p>
            <button
              onClick={onRegenerate}
              className="text-xs font-semibold text-violet-600 hover:text-violet-800 bg-violet-50 hover:bg-violet-100 px-3 py-1.5 rounded-lg transition-colors"
            >
              Try again
            </button>
          </div>
        )}

        {!loading && !error && resolved.map((m) => {
          const isSelected = m.company.id === selectedCompanyId;
          const isVisible = visibleIds.has(m.company.id);
          const isTop = m.rank <= 3;
          const isFollowing = followedIds.has(m.company.id);
          const seekingFunding = !!m.company.seeking_funding;

          return (
            <div
              key={m.company.id}
              className={`border-b border-zinc-100 ${!isVisible && filterActive ? "opacity-40" : ""} ${
                isSelected ? "bg-violet-50 border-l-2 border-l-violet-500" : ""
              }`}
            >
              <button
                onClick={() => onSelect(m.company)}
                className={`w-full text-left transition-colors group ${
                  isTop ? "px-4 pt-4 pb-2" : "px-4 pt-3 pb-1.5"
                } ${isSelected ? "" : isTop ? "hover:bg-violet-50/40" : "hover:bg-zinc-50"}`}
              >
                {/* Top 3: stacked layout */}
                {isTop ? (
                  <div className="flex flex-col gap-2">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <div className={`flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold ${
                          m.rank === 1 ? "bg-violet-600 text-white" :
                          m.rank === 2 ? "bg-violet-400 text-white" :
                          "bg-violet-300 text-white"
                        }`}>
                          {m.rank}
                        </div>
                        <SectionDot section={m.company.section} />
                        <p className="text-sm font-bold text-zinc-900 truncate">{m.company.name}</p>
                      </div>
                      <svg className={`w-3.5 h-3.5 flex-shrink-0 transition-colors ${isSelected ? "text-violet-500" : "text-zinc-200 group-hover:text-zinc-400"}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                      </svg>
                    </div>
                    <div className="flex items-center gap-2 flex-wrap">
                      {m.company.stage && (
                        <span className="text-[11px] font-semibold px-2 py-0.5 bg-zinc-100 text-zinc-500 rounded-lg">{m.company.stage}</span>
                      )}
                      {m.company.section && (
                        <span className="text-[11px] font-semibold px-2 py-0.5 bg-zinc-100 text-zinc-500 rounded-lg">{m.company.section}</span>
                      )}
                      {seekingFunding && (
                        <span className="text-[11px] font-bold px-2 py-0.5 bg-emerald-100 text-emerald-700 rounded-lg flex items-center gap-1">
                          <span>💰</span> Seeking funding
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-zinc-600 leading-relaxed">{m.match_reason}</p>
                  </div>
                ) : (
                  /* Ranks 4–10: compact inline layout */
                  <div className="flex items-start gap-3">
                    <div className="flex-shrink-0 w-5 h-5 rounded-full bg-zinc-100 flex items-center justify-center text-[10px] font-bold text-zinc-400 mt-0.5">
                      {m.rank}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 mb-0.5 flex-wrap">
                        <SectionDot section={m.company.section} />
                        <p className="text-sm font-semibold text-zinc-800 truncate">{m.company.name}</p>
                        {seekingFunding && (
                          <span className="text-[10px] font-bold px-1.5 py-0.5 bg-emerald-100 text-emerald-700 rounded-md flex items-center gap-0.5 flex-shrink-0">
                            💰 Seeking funding
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-1.5 mb-1">
                        {m.company.stage && <span className="text-xs text-zinc-400">{m.company.stage}</span>}
                        {m.company.stage && m.company.section && <span className="text-zinc-200 text-xs">·</span>}
                        {m.company.section && <span className="text-xs text-zinc-400">{m.company.section}</span>}
                      </div>
                      <p className="text-xs text-zinc-500 leading-relaxed">{m.match_reason}</p>
                    </div>
                    <svg className={`w-3.5 h-3.5 flex-shrink-0 mt-0.5 transition-colors ${isSelected ? "text-violet-500" : "text-zinc-200 group-hover:text-zinc-400"}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                )}
              </button>

              {/* Follow button row */}
              <div className="px-4 pb-3">
                <button
                  onClick={(e) => { e.stopPropagation(); onFollowToggle(m.company.id, !isFollowing); }}
                  className={`flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg transition-all ${
                    isFollowing
                      ? "bg-violet-100 text-violet-700 hover:bg-red-50 hover:text-red-600"
                      : "bg-zinc-100 text-zinc-500 hover:bg-violet-50 hover:text-violet-700"
                  }`}
                >
                  {isFollowing ? (
                    <>
                      <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
                      </svg>
                      Following
                    </>
                  ) : (
                    <>
                      <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                      </svg>
                      Follow company
                    </>
                  )}
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Footer */}
      {!loading && (matches || error) && (
        <div className="px-4 py-3 border-t border-zinc-100 flex-shrink-0">
          <button
            onClick={onRegenerate}
            className="w-full flex items-center justify-center gap-2 text-xs font-semibold text-zinc-500 hover:text-violet-700 hover:bg-violet-50 py-2 rounded-xl transition-colors border border-zinc-200 hover:border-violet-200"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Regenerate matches
          </button>
          <p className="text-[10px] text-zinc-300 text-center mt-2">AI-generated · based on your saved investor profile</p>
        </div>
      )}
    </div>
  );
}
