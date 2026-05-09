"use client";

import { useState } from "react";
import { addMyCompany } from "@/app/company/actions";
import NewsletterSignup from "./NewsletterSignup";

// ── Constants ─────────────────────────────────────────────────────────────────

const STAGES = ["Bootstrapped", "Pre-Seed", "Seed", "Series A", "Series B", "Series C", "Series D+"];
const EMPLOYEE_BUCKETS = ["2-10", "11-50", "51-200", "201-500", "501-1K", "1K-5K"];
const SECTIONS = ["B2B Software", "FinTech", "Consumer", "Bio/Medical Tech", "Security", "Energy", "Marketplaces"];
const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN!;

// Aligned with resource community tags so matching works
const FOUNDER_DEMOGRAPHICS = [
  { value: "Women", label: "Woman-founded", emoji: "👩" },
  { value: "Veteran", label: "Veteran-founded", emoji: "🎖️" },
  { value: "Multicultural", label: "Multicultural / BIPOC founder", emoji: "🌍" },
  { value: "New American", label: "Immigrant / New American founder", emoji: "🗽" },
  { value: "Student", label: "Student founder", emoji: "🎓" },
  { value: "Rural", label: "Rural founder", emoji: "🌾" },
];

// ── Geocoding ─────────────────────────────────────────────────────────────────

async function geocodeAddress(address: string): Promise<{ lat: number; lng: number; county: string | null } | null> {
  if (!address.trim()) return null;
  const query = encodeURIComponent(`${address}, Utah, USA`);
  const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${query}.json?access_token=${MAPBOX_TOKEN}&country=US&limit=1`;
  const res = await fetch(url);
  if (!res.ok) return null;
  const data = await res.json();
  const feature = data.features?.[0];
  if (!feature) return null;
  const [lng, lat] = feature.center;
  const county =
    feature.context
      ?.find((c: { id: string; text: string }) => c.id.startsWith("district.") || c.id.startsWith("county."))
      ?.text?.replace(" County", "") ?? null;
  return { lat, lng, county };
}

// ── UI primitives ─────────────────────────────────────────────────────────────

function Field({ label, children, hint }: { label: string; children: React.ReactNode; hint?: string }) {
  return (
    <div>
      <label className="block text-xs font-medium text-zinc-500 mb-1">{label}</label>
      {children}
      {hint && <p className="text-xs text-zinc-400 mt-1">{hint}</p>}
    </div>
  );
}

const inputCls =
  "w-full rounded-xl border border-zinc-200 bg-white px-3 py-2.5 text-sm text-zinc-900 placeholder-zinc-400 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/30 transition-colors";
const selectCls = `${inputCls} appearance-none`;

// ── Form type ─────────────────────────────────────────────────────────────────

type Form = {
  name: string;
  address: string;
  description: string;
  website: string;
  linkedin_url: string;
  stage: string | null;
  employees: string | null;
  section: string | null;
  lat: number | null;
  lng: number | null;
  utah_county: string | null;
  product_type: string | null;
  founded_year: number | null;
  founder_demographics: string[];
  seeking_funding: boolean;
  investor_contact_email: string;
};

const EMPTY: Form = {
  name: "", address: "", description: "", website: "", linkedin_url: "",
  stage: null, employees: null, section: null, lat: null, lng: null,
  utah_county: null, product_type: null, founded_year: null,
  founder_demographics: [], seeking_funding: false, investor_contact_email: "",
};

// ── Modal ─────────────────────────────────────────────────────────────────────

export default function AddCompanyModal({ onClose }: { onClose: () => void }) {
  const [form, setForm] = useState<Form>(EMPTY);
  const [geocoding, setGeocoding] = useState(false);
  const [geocoded, setGeocoded] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [newCompanyId, setNewCompanyId] = useState<number | null>(null);

  function set<K extends keyof Form>(key: K, value: Form[K]) {
    setForm((f) => ({ ...f, [key]: value }));
    if (key === "address") setGeocoded(false);
  }

  function toggleDemographic(val: string) {
    setForm((f) => ({
      ...f,
      founder_demographics: f.founder_demographics.includes(val)
        ? f.founder_demographics.filter((v) => v !== val)
        : [...f.founder_demographics, val],
    }));
  }

  async function handleGeocode() {
    if (!form.address) return;
    setGeocoding(true);
    setError(null);
    try {
      const result = await geocodeAddress(form.address);
      if (result) {
        setForm((f) => ({
          ...f,
          lat: result.lat,
          lng: result.lng,
          utah_county: result.county ?? f.utah_county,
        }));
        setGeocoded(true);
      } else {
        setError("Couldn't geocode that address — double-check it and try again.");
      }
    } finally {
      setGeocoding(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim()) { setError("Company name is required."); return; }
    if (!form.lat || !form.lng) {
      setError("We need an address to place your company on the map. Geocode your address above.");
      return;
    }
    setSaving(true);
    setError(null);
    const result = await addMyCompany(form);
    if (result.error) {
      setError(result.error);
      setSaving(false);
    } else {
      setNewCompanyId(result.id);
      setDone(true);
    }
  }

  // ── Success state ──────────────────────────────────────────────────────────
  if (done) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-8">
          <div className="text-center mb-6">
            <div className="w-14 h-14 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-7 h-7 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h2 className="text-xl font-bold text-zinc-900 mb-2">Submitted for review!</h2>
            <p className="text-sm text-zinc-500">
              Your company has been added to the review queue. Once approved by an admin it will appear on the map.
            </p>
          </div>

          {newCompanyId && (
            <div className="mb-6">
              <NewsletterSignup
                companyId={newCompanyId}
                companyName={form.name}
                variant="card"
              />
            </div>
          )}

          <button
            onClick={onClose}
            className="w-full bg-zinc-900 hover:bg-zinc-700 text-white font-semibold rounded-xl py-3 text-sm transition-colors"
          >
            Done
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-100">
          <div>
            <h2 className="text-base font-bold text-zinc-900">Add my company</h2>
            <p className="text-xs text-zinc-400 mt-0.5">Your submission will be reviewed before appearing on the map</p>
          </div>
          <button onClick={onClose} className="text-zinc-400 hover:text-zinc-700 p-1 rounded-lg hover:bg-zinc-100 transition-colors">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto px-6 py-5 space-y-5">

          {/* Basic info */}
          <div className="grid grid-cols-2 gap-4">
            <Field label="Company name *">
              <input
                className={inputCls}
                value={form.name}
                onChange={(e) => set("name", e.target.value)}
                placeholder="Acme Inc."
                autoFocus
              />
            </Field>
            <Field label="Website">
              <input
                className={inputCls}
                value={form.website}
                onChange={(e) => set("website", e.target.value)}
                placeholder="https://acme.com"
              />
            </Field>
          </div>

          <Field label="Utah address *" hint="Used to place your pin on the map. Enter a street address and click Geocode.">
            <div className="flex gap-2">
              <input
                className={inputCls}
                value={form.address}
                onChange={(e) => set("address", e.target.value)}
                onBlur={() => { if (form.address && !geocoded && !form.lat) handleGeocode(); }}
                placeholder="123 Main St, Salt Lake City, UT"
              />
              <button
                type="button"
                onClick={handleGeocode}
                disabled={geocoding || !form.address}
                className="px-3 py-2 rounded-xl border border-zinc-200 bg-zinc-50 hover:bg-zinc-100 text-zinc-700 text-sm font-medium transition-colors disabled:opacity-40 whitespace-nowrap"
              >
                {geocoding ? "…" : geocoded ? "✓ Done" : "Geocode"}
              </button>
            </div>
          </Field>

          <Field label="Description">
            <textarea
              className={`${inputCls} resize-none`}
              rows={3}
              value={form.description}
              onChange={(e) => set("description", e.target.value)}
              placeholder="What does your company do?"
            />
          </Field>

          <div className="grid grid-cols-2 gap-4">
            <Field label="Sector">
              <select className={selectCls} value={form.section ?? ""} onChange={(e) => set("section", e.target.value || null)}>
                <option value="">— Select —</option>
                {SECTIONS.map((s) => <option key={s}>{s}</option>)}
              </select>
            </Field>
            <Field label="Stage">
              <select className={selectCls} value={form.stage ?? ""} onChange={(e) => set("stage", e.target.value || null)}>
                <option value="">— Select —</option>
                {STAGES.map((s) => <option key={s}>{s}</option>)}
              </select>
            </Field>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Field label="Employees">
              <select className={selectCls} value={form.employees ?? ""} onChange={(e) => set("employees", e.target.value || null)}>
                <option value="">— Select —</option>
                {EMPLOYEE_BUCKETS.map((s) => <option key={s}>{s}</option>)}
              </select>
            </Field>
            <Field label="Founded year">
              <input
                className={inputCls}
                type="number"
                min={1900}
                max={new Date().getFullYear()}
                value={form.founded_year ?? ""}
                onChange={(e) => set("founded_year", e.target.value ? Number(e.target.value) : null)}
                placeholder="2020"
              />
            </Field>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Field label="Product type">
              <input
                className={inputCls}
                value={form.product_type ?? ""}
                onChange={(e) => set("product_type", e.target.value || null)}
                placeholder="SaaS, Hardware…"
              />
            </Field>
            <Field label="LinkedIn URL">
              <input
                className={inputCls}
                value={form.linkedin_url}
                onChange={(e) => set("linkedin_url", e.target.value)}
                placeholder="https://linkedin.com/company/…"
              />
            </Field>
          </div>

          {/* Founder demographics — resource matching section */}
          <div className="rounded-2xl border border-blue-100 bg-blue-50/60 p-4 space-y-3">
            <div>
              <p className="text-sm font-semibold text-zinc-800">Founder background</p>
              <p className="text-xs text-zinc-500 mt-0.5">
                Optional — helps us match your company with programs and resources designed for your community.
                Select all that apply.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              {FOUNDER_DEMOGRAPHICS.map(({ value, label, emoji }) => {
                const active = form.founder_demographics.includes(value);
                return (
                  <button
                    key={value}
                    type="button"
                    onClick={() => toggleDemographic(value)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-sm font-medium border transition-all ${
                      active
                        ? "bg-blue-600 border-blue-600 text-white shadow-sm"
                        : "bg-white border-zinc-200 text-zinc-600 hover:border-blue-300 hover:text-blue-700"
                    }`}
                  >
                    <span>{emoji}</span>
                    {label}
                    {active && (
                      <svg className="w-3.5 h-3.5 ml-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Seeking funding + investor contact */}
          <div className="space-y-3">
            <button
              type="button"
              onClick={() => set("seeking_funding", !form.seeking_funding)}
              className={`flex items-center gap-3 w-full px-4 py-3 rounded-2xl border-2 text-left transition-all ${
                form.seeking_funding
                  ? "border-emerald-400 bg-emerald-50"
                  : "border-zinc-200 bg-white hover:border-zinc-300"
              }`}
            >
              <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center flex-shrink-0 transition-colors ${
                form.seeking_funding ? "bg-emerald-600 border-emerald-600" : "border-zinc-300"
              }`}>
                {form.seeking_funding && (
                  <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                )}
              </div>
              <div>
                <p className="text-sm font-semibold text-zinc-900">Currently seeking funding / investors</p>
                <p className="text-xs text-zinc-400 mt-0.5">Let investors on the platform know you're actively looking for investment</p>
              </div>
            </button>
            <div>
              <label className="block text-xs font-medium text-zinc-600 mb-1">
                Investor contact email <span className="text-zinc-400">(optional)</span>
              </label>
              <input
                type="email"
                value={form.investor_contact_email}
                onChange={(e) => set("investor_contact_email", e.target.value)}
                placeholder="invest@yourcompany.com"
                className="w-full border border-zinc-200 rounded-xl px-3 py-2 text-sm text-zinc-900 placeholder-zinc-400 focus:outline-none focus:border-emerald-400 focus:ring-1 focus:ring-emerald-100 transition-colors"
              />
              <p className="text-xs text-zinc-400 mt-1">Shown as a clickable badge so investors can contact you directly</p>
            </div>
          </div>

          {error && (
            <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          )}
        </form>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-zinc-100 flex items-center justify-between gap-3">
          <p className="text-xs text-zinc-400">
            Submissions are reviewed within 24–48 hours
          </p>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-sm text-zinc-500 hover:text-zinc-800 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit as unknown as React.MouseEventHandler}
              disabled={saving}
              className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-white text-sm font-semibold transition-colors disabled:opacity-50 shadow-sm flex items-center gap-2"
            >
              {saving ? (
                <>
                  <svg className="w-3.5 h-3.5 animate-spin" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                  </svg>
                  Submitting…
                </>
              ) : "Submit for review"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
