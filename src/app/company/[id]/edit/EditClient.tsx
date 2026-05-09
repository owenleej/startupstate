"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { updateMyCompany } from "@/app/company/actions";
import NewsletterSignup from "@/components/NewsletterSignup";

// ── Constants ─────────────────────────────────────────────────────────────────

const STAGES = ["Bootstrapped", "Pre-Seed", "Seed", "Series A", "Series B", "Series C", "Series D+"];
const EMPLOYEE_BUCKETS = ["2-10", "11-50", "51-200", "201-500", "501-1K", "1K-5K"];
const SECTIONS = ["B2B Software", "FinTech", "Consumer", "Bio/Medical Tech", "Security", "Energy", "Marketplaces"];
const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN!;

const FOUNDER_DEMOGRAPHICS = [
  { value: "Women",         label: "Woman-founded",                  emoji: "👩" },
  { value: "Veteran",       label: "Veteran-founded",                emoji: "🎖️" },
  { value: "Multicultural", label: "Multicultural / BIPOC founder",  emoji: "🌍" },
  { value: "New American",  label: "Immigrant / New American founder", emoji: "🗽" },
  { value: "Student",       label: "Student founder",                emoji: "🎓" },
  { value: "Rural",         label: "Rural founder",                  emoji: "🌾" },
];

// ── Geocoding ─────────────────────────────────────────────────────────────────

async function geocodeAddress(
  address: string,
): Promise<{ lat: number; lng: number; county: string | null } | null> {
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
      ?.find((c: { id: string }) => c.id.startsWith("district.") || c.id.startsWith("county."))
      ?.text?.replace(" County", "") ?? null;
  return { lat, lng, county };
}

// ── UI primitives ─────────────────────────────────────────────────────────────

function Field({
  label,
  children,
  hint,
}: {
  label: string;
  children: React.ReactNode;
  hint?: string;
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-zinc-700 mb-1.5">{label}</label>
      {children}
      {hint && <p className="text-xs text-zinc-400 mt-1.5">{hint}</p>}
    </div>
  );
}

const inputCls =
  "w-full rounded-xl border border-zinc-200 bg-white px-3.5 py-2.5 text-sm text-zinc-900 placeholder-zinc-400 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/30 transition-colors";
const selectCls = `${inputCls} appearance-none`;

// ── Form type ─────────────────────────────────────────────────────────────────

type CompanyRow = {
  id: number;
  name: string | null;
  address: string | null;
  description: string | null;
  website: string | null;
  linkedin_url: string | null;
  stage: string | null;
  employees: string | null;
  section: string | null;
  lat: number | null;
  lng: number | null;
  utah_county: string | null;
  product_type: string | null;
  founded_year: number | null;
  founder_demographics: string[] | null;
  seeking_funding: boolean;
  investor_contact_email: string | null;
  status: string;
  newsletter_subscribed: boolean;
};

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

function companyToForm(c: CompanyRow): Form {
  return {
    name: c.name ?? "",
    address: c.address ?? "",
    description: c.description ?? "",
    website: c.website ?? "",
    linkedin_url: c.linkedin_url ?? "",
    stage: c.stage,
    employees: c.employees,
    section: c.section,
    lat: c.lat,
    lng: c.lng,
    utah_county: c.utah_county,
    product_type: c.product_type,
    founded_year: c.founded_year,
    founder_demographics: c.founder_demographics ?? [],
    seeking_funding: c.seeking_funding ?? false,
    investor_contact_email: c.investor_contact_email ?? "",
  };
}

// ── Main component ────────────────────────────────────────────────────────────

export default function EditClient({ company }: { company: CompanyRow }) {
  const router = useRouter();
  const [form, setForm] = useState<Form>(companyToForm(company));
  const [geocoding, setGeocoding] = useState(false);
  const [geocoded, setGeocoded] = useState(!!company.lat);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  function set<K extends keyof Form>(key: K, value: Form[K]) {
    setForm((f) => ({ ...f, [key]: value }));
    if (key === "address") setGeocoded(false);
    setSaved(false);
  }

  function toggleDemographic(val: string) {
    setForm((f) => ({
      ...f,
      founder_demographics: f.founder_demographics.includes(val)
        ? f.founder_demographics.filter((v) => v !== val)
        : [...f.founder_demographics, val],
    }));
    setSaved(false);
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
      setError("Coordinates are required — geocode your address or enter them manually.");
      return;
    }
    setSaving(true);
    setError(null);
    const result = await updateMyCompany(company.id, form);
    setSaving(false);
    if (result.error) {
      setError(result.error);
    } else {
      setSaved(true);
    }
  }

  const isPending = company.status === "pending";

  return (
    <div className="min-h-screen bg-zinc-50">
      {/* Top bar */}
      <header className="sticky top-0 z-10 bg-white border-b border-zinc-200 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.back()}
            className="text-zinc-400 hover:text-zinc-700 p-1.5 rounded-lg hover:bg-zinc-100 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <div>
            <h1 className="text-base font-bold text-zinc-900">Edit Company</h1>
            <p className="text-xs text-zinc-400 mt-0.5">{company.name}</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {isPending && (
            <span className="text-xs font-semibold px-3 py-1.5 rounded-full bg-amber-50 text-amber-700 border border-amber-100">
              ⏳ Pending review
            </span>
          )}
          {saved && (
            <span className="flex items-center gap-1.5 text-xs font-semibold text-emerald-700">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
              Saved
            </span>
          )}
          <button
            onClick={handleSubmit as unknown as React.MouseEventHandler}
            disabled={saving}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-semibold rounded-xl px-5 py-2.5 text-sm transition-colors shadow-sm"
          >
            {saving ? (
              <>
                <svg className="w-3.5 h-3.5 animate-spin" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                </svg>
                Saving…
              </>
            ) : "Save changes"}
          </button>
        </div>
      </header>

      {/* Form */}
      <form onSubmit={handleSubmit} className="max-w-2xl mx-auto px-6 py-8 space-y-8">

        {isPending && (
          <div className="flex items-start gap-3 bg-amber-50 border border-amber-100 rounded-2xl px-5 py-4 text-sm text-amber-700">
            <svg className="w-4 h-4 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Your company is pending admin review. You can update your details while you wait — changes will be visible once approved.
          </div>
        )}

        {/* Basic info */}
        <section className="space-y-5">
          <h2 className="text-sm font-semibold text-zinc-900 uppercase tracking-wide">Basic Info</h2>
          <div className="grid grid-cols-2 gap-5">
            <Field label="Company name *">
              <input
                className={inputCls}
                value={form.name}
                onChange={(e) => set("name", e.target.value)}
                placeholder="Acme Inc."
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

          <Field label="Description">
            <textarea
              className={`${inputCls} resize-none`}
              rows={4}
              value={form.description}
              onChange={(e) => set("description", e.target.value)}
              placeholder="What does your company do?"
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
        </section>

        <div className="border-t border-zinc-200" />

        {/* Location */}
        <section className="space-y-5">
          <h2 className="text-sm font-semibold text-zinc-900 uppercase tracking-wide">Location</h2>
          <Field
            label="Utah address"
            hint="Enter a street address and click Geocode to update your map pin."
          >
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
                className="px-4 py-2.5 rounded-xl border border-zinc-200 bg-white hover:bg-zinc-50 text-zinc-700 text-sm font-medium transition-colors disabled:opacity-40 whitespace-nowrap"
              >
                {geocoding ? "…" : geocoded ? "✓ Done" : "Geocode"}
              </button>
            </div>
          </Field>

          <div className="grid grid-cols-3 gap-4">
            <Field label="Latitude">
              <input
                className={inputCls}
                type="number"
                step="any"
                value={form.lat ?? ""}
                onChange={(e) => set("lat", e.target.value ? Number(e.target.value) : null)}
                placeholder="40.7608"
              />
            </Field>
            <Field label="Longitude">
              <input
                className={inputCls}
                type="number"
                step="any"
                value={form.lng ?? ""}
                onChange={(e) => set("lng", e.target.value ? Number(e.target.value) : null)}
                placeholder="-111.8910"
              />
            </Field>
            <Field label="Utah County">
              <input
                className={inputCls}
                value={form.utah_county ?? ""}
                onChange={(e) => set("utah_county", e.target.value || null)}
                placeholder="Salt Lake"
              />
            </Field>
          </div>
        </section>

        <div className="border-t border-zinc-200" />

        {/* Company details */}
        <section className="space-y-5">
          <h2 className="text-sm font-semibold text-zinc-900 uppercase tracking-wide">Company Details</h2>
          <div className="grid grid-cols-2 gap-5">
            <Field label="Sector">
              <select
                className={selectCls}
                value={form.section ?? ""}
                onChange={(e) => set("section", e.target.value || null)}
              >
                <option value="">— Select —</option>
                {SECTIONS.map((s) => <option key={s}>{s}</option>)}
              </select>
            </Field>
            <Field label="Stage">
              <select
                className={selectCls}
                value={form.stage ?? ""}
                onChange={(e) => set("stage", e.target.value || null)}
              >
                <option value="">— Select —</option>
                {STAGES.map((s) => <option key={s}>{s}</option>)}
              </select>
            </Field>
          </div>

          <div className="grid grid-cols-2 gap-5">
            <Field label="Employees">
              <select
                className={selectCls}
                value={form.employees ?? ""}
                onChange={(e) => set("employees", e.target.value || null)}
              >
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

          <Field label="Product type">
            <input
              className={inputCls}
              value={form.product_type ?? ""}
              onChange={(e) => set("product_type", e.target.value || null)}
              placeholder="SaaS, Hardware, Marketplace…"
            />
          </Field>
        </section>

        <div className="border-t border-zinc-200" />

        {/* Founder background */}
        <section className="space-y-4">
          <div>
            <h2 className="text-sm font-semibold text-zinc-900 uppercase tracking-wide">Founder Background</h2>
            <p className="text-xs text-zinc-500 mt-1">
              Helps us match you with programs and resources designed for your community. Select all that apply.
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
                  className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium border-2 transition-all ${
                    active
                      ? "bg-blue-600 border-blue-600 text-white shadow-sm"
                      : "bg-white border-zinc-200 text-zinc-600 hover:border-blue-300 hover:text-blue-700"
                  }`}
                >
                  <span>{emoji}</span>
                  {label}
                  {active && (
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </button>
              );
            })}
          </div>
        </section>

        {/* Seeking funding */}
        <section className="space-y-3">
          <div>
            <h2 className="text-sm font-semibold text-zinc-900 uppercase tracking-wide">Investor Visibility</h2>
            <p className="text-xs text-zinc-500 mt-1">Let investors on the platform know if you're open to funding conversations.</p>
          </div>
          <button
            type="button"
            onClick={() => setForm((f) => ({ ...f, seeking_funding: !f.seeking_funding }))}
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
              <p className="text-xs text-zinc-400 mt-0.5">Investors on the platform will see a badge and be notified if they follow your company</p>
            </div>
          </button>
          <div>
            <label className="block text-xs font-medium text-zinc-600 mb-1">
              Investor contact email <span className="text-zinc-400">(optional)</span>
            </label>
            <input
              type="email"
              value={form.investor_contact_email}
              onChange={(e) => setForm((f) => ({ ...f, investor_contact_email: e.target.value }))}
              placeholder="invest@yourcompany.com"
              className="w-full border border-zinc-200 rounded-xl px-3 py-2 text-sm text-zinc-900 placeholder-zinc-400 focus:outline-none focus:border-emerald-400 focus:ring-1 focus:ring-emerald-100 transition-colors"
            />
            <p className="text-xs text-zinc-400 mt-1">Shown as a clickable badge so investors can contact you directly</p>
          </div>
        </section>

        {error && (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        <div className="border-t border-zinc-200" />

        {/* Newsletter */}
        <section className="space-y-4">
          <div>
            <h2 className="text-sm font-semibold text-zinc-900 uppercase tracking-wide">Resource Digest</h2>
            <p className="text-xs text-zinc-500 mt-1">
              Stay matched — keeping your profile up to date means better matches every month.
            </p>
          </div>
          <NewsletterSignup
            companyId={company.id}
            companyName={company.name ?? "Your company"}
            initialSubscribed={company.newsletter_subscribed}
            variant="card"
          />
        </section>

        {/* Bottom save */}
        <div className="flex items-center justify-between pt-2 pb-8">
          <button
            type="button"
            onClick={() => router.back()}
            className="text-sm text-zinc-500 hover:text-zinc-800 transition-colors"
          >
            ← Back
          </button>
          <button
            type="submit"
            disabled={saving}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-semibold rounded-xl px-6 py-3 text-sm transition-colors shadow-sm"
          >
            {saving ? (
              <>
                <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                </svg>
                Saving…
              </>
            ) : "Save changes"}
          </button>
        </div>
      </form>
    </div>
  );
}
