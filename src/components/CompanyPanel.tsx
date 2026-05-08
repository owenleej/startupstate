"use client";

import type { Company } from "./MapClient";

const SECTION_STYLES: Record<string, { text: string; bg: string }> = {
  "B2B Software":     { text: "#1D4ED8", bg: "#DBEAFE" },
  "FinTech":          { text: "#065F46", bg: "#D1FAE5" },
  "Consumer":         { text: "#92400E", bg: "#FEF3C7" },
  "Bio/Medical Tech": { text: "#991B1B", bg: "#FEE2E2" },
  "Security":         { text: "#5B21B6", bg: "#EDE9FE" },
  "Energy":           { text: "#9A3412", bg: "#FFEDD5" },
  "Marketplaces":     { text: "#9D174D", bg: "#FCE7F3" },
};

function Pill({ children }: { children: React.ReactNode }) {
  return (
    <span className="text-xs font-medium px-2.5 py-1 bg-zinc-100 text-zinc-600 rounded-lg">
      {children}
    </span>
  );
}

export default function CompanyPanel({
  company,
  onClose,
}: {
  company: Company | null;
  onClose: () => void;
}) {
  const ss = company?.section ? SECTION_STYLES[company.section] : null;

  return (
    <div
      className={`absolute top-0 right-0 h-full w-[380px] z-20 flex flex-col bg-white shadow-2xl transition-transform duration-300 ease-out ${
        company ? "translate-x-0" : "translate-x-full"
      }`}
    >
      {company && (
        <>
          {/* Top bar */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-100">
            {ss && company.section ? (
              <span
                className="text-xs font-semibold px-2.5 py-1 rounded-full"
                style={{ color: ss.text, backgroundColor: ss.bg }}
              >
                {company.section}
              </span>
            ) : (
              <div />
            )}
            <button
              onClick={onClose}
              className="text-zinc-400 hover:text-zinc-700 p-1.5 rounded-xl hover:bg-zinc-100 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Company header */}
          <div className="px-5 pt-5 pb-4 border-b border-zinc-100">
            <h2 className="text-2xl font-bold text-zinc-900 leading-tight mb-3">
              {company.name}
            </h2>
            <div className="flex flex-wrap gap-2">
              {company.stage && <Pill>{company.stage}</Pill>}
              {company.employees && <Pill>{company.employees} employees</Pill>}
              {company.utah_county && <Pill>📍 {company.utah_county} County</Pill>}
              {company.product_type && <Pill>{company.product_type}</Pill>}
            </div>
          </div>

          {/* Body */}
          <div className="flex-1 overflow-y-auto px-5 py-5 space-y-5">
            {company.description && (
              <p className="text-sm text-zinc-600 leading-relaxed">{company.description}</p>
            )}

            {/* Links */}
            <div className="flex gap-2 flex-wrap">
              {company.website && (
                <a
                  href={company.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 text-xs font-medium text-zinc-600 hover:text-blue-600 bg-zinc-100 hover:bg-blue-50 px-3 py-2 rounded-xl transition-colors"
                >
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
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
                  className="flex items-center gap-1.5 text-xs font-medium text-zinc-600 hover:text-blue-600 bg-zinc-100 hover:bg-blue-50 px-3 py-2 rounded-xl transition-colors"
                >
                  <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
                  </svg>
                  LinkedIn
                </a>
              )}
            </div>
          </div>

          {/* CTA */}
          <div className="px-5 py-4 border-t border-zinc-100 bg-zinc-50/80">
            <button className="w-full bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-white font-semibold rounded-2xl py-3.5 text-sm transition-colors shadow-sm">
              Find Matching Resources →
            </button>
          </div>
        </>
      )}
    </div>
  );
}
