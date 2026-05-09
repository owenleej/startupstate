"use client";

import { useState, useTransition } from "react";
import { createClient } from "@/lib/supabase/client";

// ── Shared constants ──────────────────────────────────────────────────────────

const STAGES = ["Bootstrapped", "Pre-Seed", "Seed", "Series A", "Series B", "Series C", "Series D+"];
const EMPLOYEE_BUCKETS = ["2-10", "11-50", "51-200", "201-500", "501-1K", "1K-5K"];
const SECTIONS = ["B2B Software", "FinTech", "Consumer", "Bio/Medical Tech", "Security", "Energy", "Marketplaces", "Agriculture", "Manufacturing"];
const STATUSES = ["approved", "pending", "rejected"];
const PRODUCT_TYPES = ["Software", "Physical Product", "Services", "Marketplace"];
const FOUNDER_DEMOGRAPHICS = ["Women", "Veteran", "Student", "Multicultural", "New American", "Rural"];

const RESOURCE_COMMUNITIES = ["Any", "Multicultural", "New American", "Rural", "Student", "Veteran", "Women"];
const RESOURCE_INDUSTRIES = [
  "Aerospace and Defense", "Agriculture", "Arts and Entertainment and Recreation",
  "Consumer Packaged Goods", "Financial Services", "Hospitality and Food Services",
  "Life Sciences and Healthcare", "Manufacturing", "Other", "Software and Information Technology",
];
const RESOURCE_TOPICS = [
  "Close or Exit a Business", "Entrepreneurship Communities", "Funding", "International Trade",
  "Late Stage Growth", "Marketing and Sales", "Other", "Relocate a Business to Utah",
  "Start a Business", "Taxes and Finance",
];
const RESOURCE_LOCATIONS = [
  "Beaver", "Box Elder", "Cache", "Carbon", "Daggett", "Davis", "Duchesne", "Emery",
  "Garfield", "Grand", "Iron", "Juab", "Kane", "Millard", "Morgan", "Piute", "Rich",
  "Salt Lake", "San Juan", "Sanpete", "Sevier", "Summit", "Tooele", "Uintah",
  "Utah", "Wasatch", "Washington", "Wayne", "Weber",
];

// ── Types ─────────────────────────────────────────────────────────────────────

type Company = {
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
  status: string;
  founded_year: number | null;
  industry: string | null;
  is_rural: boolean | null;
  has_international_ops: boolean | null;
  top_needs: string[] | null;
  founder_demographics: string[] | null;
  actively_fundraising: boolean | null;
  seeking_funding: boolean;
  investor_contact_email: string | null;
  hiring: boolean;
  careers_url: string | null;
  newsletter_subscribed: boolean;
};

type Resource = {
  id: number;
  title: string | null;
  description: string | null;
  communities: string[] | null;
  industries: string[] | null;
  locations: string[] | null;
  topics: string[] | null;
  link: string | null;
  email: string | null;
};

type Claim = {
  id: number;
  created_at: string;
  company_id: number;
  user_id: string;
  email: string;
  status: string;
  method: string;
  companies: { name: string | null; website: string | null } | null;
};

type CompanyForm = Omit<Company, "id">;
type ResourceForm = Omit<Resource, "id">;

// ── Geocoding ─────────────────────────────────────────────────────────────────

const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN!;

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
  const county = feature.context
    ?.find((c: { id: string; text: string }) => c.id.startsWith("district.") || c.id.startsWith("county."))
    ?.text?.replace(" County", "") ?? null;
  return { lat, lng, county };
}

// ── Shared UI primitives ──────────────────────────────────────────────────────

function Field({ label, children, hint }: { label: string; children: React.ReactNode; hint?: string }) {
  return (
    <div>
      <label className="block text-xs font-medium text-zinc-400 mb-1">{label}</label>
      {children}
      {hint && <p className="text-xs text-zinc-500 mt-1">{hint}</p>}
    </div>
  );
}

const inputCls = "w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-blue-500 transition-colors";
const selectCls = `${inputCls} appearance-none`;

function MultiSelect({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: string[];
  value: string[];
  onChange: (v: string[]) => void;
}) {
  function toggle(opt: string) {
    onChange(value.includes(opt) ? value.filter((v) => v !== opt) : [...value, opt]);
  }
  return (
    <Field label={label}>
      <div className="flex flex-wrap gap-1.5 p-2 rounded-lg border border-zinc-700 bg-zinc-800 min-h-[40px]">
        {options.map((opt) => (
          <button
            key={opt}
            type="button"
            onClick={() => toggle(opt)}
            className={`px-2 py-0.5 rounded-md text-xs font-medium transition-colors ${
              value.includes(opt)
                ? "bg-blue-600 text-white"
                : "bg-zinc-700 text-zinc-300 hover:bg-zinc-600"
            }`}
          >
            {opt}
          </button>
        ))}
      </div>
    </Field>
  );
}

// ── Delete confirmation modal ─────────────────────────────────────────────────

function DeleteModal({
  name,
  onConfirm,
  onClose,
}: {
  name: string;
  onConfirm: () => void;
  onClose: () => void;
}) {
  const [pending, startTransition] = useTransition();
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-zinc-900 border border-zinc-700 rounded-2xl shadow-2xl w-full max-w-sm p-6">
        <h3 className="text-base font-semibold text-white mb-2">Delete?</h3>
        <p className="text-sm text-zinc-400 mb-6">
          <span className="text-white font-medium">{name}</span> will be permanently removed.
        </p>
        <div className="flex justify-end gap-3">
          <button onClick={onClose} className="px-4 py-2 rounded-lg text-sm text-zinc-400 hover:text-white transition-colors">
            Cancel
          </button>
          <button
            onClick={() => startTransition(onConfirm)}
            disabled={pending}
            className="px-4 py-2 rounded-lg bg-red-600 hover:bg-red-500 text-white text-sm font-semibold transition-colors disabled:opacity-50"
          >
            {pending ? "Deleting…" : "Delete"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Company form modal ────────────────────────────────────────────────────────

const EMPTY_COMPANY: CompanyForm = {
  name: "", address: "", description: "", website: "", linkedin_url: "",
  stage: null, employees: null, section: null, lat: null, lng: null,
  utah_county: null, product_type: null, status: "approved",
  founded_year: null, industry: null, is_rural: null,
  has_international_ops: null, top_needs: [], founder_demographics: [],
  actively_fundraising: null, seeking_funding: false, investor_contact_email: null,
  hiring: false, careers_url: null,
  newsletter_subscribed: false,
};

function CompanyFormModal({
  initial,
  onSave,
  onClose,
}: {
  initial: CompanyForm | null;
  onSave: (v: CompanyForm) => Promise<void>;
  onClose: () => void;
}) {
  const [form, setForm] = useState<CompanyForm>(initial ?? EMPTY_COMPANY);
  const [geocoding, setGeocoding] = useState(false);
  const [geocoded, setGeocoded] = useState(!!initial?.lat);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function set<K extends keyof CompanyForm>(key: K, value: CompanyForm[K]) {
    setForm((f) => ({ ...f, [key]: value }));
    if (key === "address") setGeocoded(false);
  }

  async function handleGeocode() {
    if (!form.address) return;
    setGeocoding(true);
    setError(null);
    try {
      const result = await geocodeAddress(form.address);
      if (result) {
        setForm((f) => ({ ...f, lat: result.lat, lng: result.lng, utah_county: result.county ?? f.utah_county }));
        setGeocoded(true);
      } else {
        setError("Could not geocode that address. Check it or enter coordinates manually.");
      }
    } finally {
      setGeocoding(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name?.trim()) { setError("Name is required."); return; }
    if (!form.lat || !form.lng) { setError("Coordinates are required — geocode the address or enter them manually."); return; }
    setSaving(true);
    setError(null);
    try { await onSave(form); } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed.");
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-zinc-900 border border-zinc-700 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800">
          <h2 className="text-base font-semibold text-white">{initial ? "Edit Company" : "Add Company"}</h2>
          <button onClick={onClose} className="text-zinc-400 hover:text-white transition-colors">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Field label="Company name *">
              <input className={inputCls} value={form.name ?? ""} onChange={(e) => set("name", e.target.value)} placeholder="Acme Inc." />
            </Field>
            <Field label="Website">
              <input className={inputCls} value={form.website ?? ""} onChange={(e) => set("website", e.target.value)} placeholder="https://acme.com" />
            </Field>
          </div>

          <Field label="Address" hint="Enter a Utah address — lat/lng and county fill automatically on geocode.">
            <div className="flex gap-2">
              <input
                className={inputCls}
                value={form.address ?? ""}
                onChange={(e) => set("address", e.target.value)}
                onBlur={() => { if (form.address && !geocoded && !form.lat) handleGeocode(); }}
                placeholder="123 Main St, Salt Lake City, UT"
              />
              <button type="button" onClick={handleGeocode} disabled={geocoding || !form.address}
                className="px-3 py-2 rounded-lg bg-zinc-700 hover:bg-zinc-600 text-white text-sm font-medium transition-colors disabled:opacity-40 whitespace-nowrap">
                {geocoding ? "…" : geocoded ? "✓ Done" : "Geocode"}
              </button>
            </div>
          </Field>

          <div className="grid grid-cols-3 gap-4">
            <Field label="Latitude">
              <input className={inputCls} type="number" step="any" value={form.lat ?? ""} onChange={(e) => set("lat", e.target.value ? Number(e.target.value) : null)} placeholder="40.7608" />
            </Field>
            <Field label="Longitude">
              <input className={inputCls} type="number" step="any" value={form.lng ?? ""} onChange={(e) => set("lng", e.target.value ? Number(e.target.value) : null)} placeholder="-111.8910" />
            </Field>
            <Field label="Utah County">
              <input className={inputCls} value={form.utah_county ?? ""} onChange={(e) => set("utah_county", e.target.value || null)} placeholder="Salt Lake" />
            </Field>
          </div>

          <Field label="Description">
            <textarea className={`${inputCls} resize-none`} rows={3} value={form.description ?? ""} onChange={(e) => set("description", e.target.value)} placeholder="What does this company do?" />
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
              <input className={inputCls} type="number" min={1900} max={new Date().getFullYear()} value={form.founded_year ?? ""} onChange={(e) => set("founded_year", e.target.value ? Number(e.target.value) : null)} placeholder="2020" />
            </Field>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Field label="Product type">
              <select className={selectCls} value={form.product_type ?? ""} onChange={(e) => set("product_type", e.target.value || null)}>
                <option value="">— Select —</option>
                {PRODUCT_TYPES.map((s) => <option key={s}>{s}</option>)}
              </select>
            </Field>
            <Field label="LinkedIn URL">
              <input className={inputCls} value={form.linkedin_url ?? ""} onChange={(e) => set("linkedin_url", e.target.value || null)} placeholder="https://linkedin.com/company/…" />
            </Field>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Field label="Status">
              <select className={selectCls} value={form.status} onChange={(e) => set("status", e.target.value)}>
                {STATUSES.map((s) => <option key={s}>{s}</option>)}
              </select>
            </Field>
            <Field label="Rural">
              <select className={selectCls} value={form.is_rural == null ? "" : String(form.is_rural)} onChange={(e) => set("is_rural", e.target.value === "" ? null : e.target.value === "true")}>
                <option value="">— Unknown —</option>
                <option value="true">Yes</option>
                <option value="false">No</option>
              </select>
            </Field>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Field label="International ops">
              <select className={selectCls} value={form.has_international_ops == null ? "" : String(form.has_international_ops)} onChange={(e) => set("has_international_ops", e.target.value === "" ? null : e.target.value === "true")}>
                <option value="">— Unknown —</option>
                <option value="true">Yes</option>
                <option value="false">No</option>
              </select>
            </Field>
            <Field label="Actively fundraising">
              <select className={selectCls} value={form.actively_fundraising == null ? "" : String(form.actively_fundraising)} onChange={(e) => set("actively_fundraising", e.target.value === "" ? null : e.target.value === "true")}>
                <option value="">— Unknown —</option>
                <option value="true">Yes</option>
                <option value="false">No</option>
              </select>
            </Field>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Field label="Seeking funding (investor matching)">
              <select className={selectCls} value={String(form.seeking_funding)} onChange={(e) => set("seeking_funding", e.target.value === "true")}>
                <option value="false">No</option>
                <option value="true">Yes</option>
              </select>
            </Field>
            <Field label="Investor contact email">
              <input className={inputCls} type="email" value={form.investor_contact_email ?? ""} onChange={(e) => set("investor_contact_email", e.target.value || null)} placeholder="founder@company.com" />
            </Field>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Field label="Currently hiring">
              <select className={selectCls} value={String(form.hiring)} onChange={(e) => set("hiring", e.target.value === "true")}>
                <option value="false">No</option>
                <option value="true">Yes</option>
              </select>
            </Field>
            <Field label="Careers page URL">
              <input className={inputCls} type="url" value={form.careers_url ?? ""} onChange={(e) => set("careers_url", e.target.value || null)} placeholder="https://company.com/careers" />
            </Field>
          </div>

          <MultiSelect label="Founder demographics" options={FOUNDER_DEMOGRAPHICS} value={form.founder_demographics ?? []} onChange={(v) => set("founder_demographics", v)} />
          <MultiSelect label="Top needs" options={RESOURCE_TOPICS} value={form.top_needs ?? []} onChange={(v) => set("top_needs", v)} />

          {error && <p className="rounded-lg border border-red-800 bg-red-950 px-3 py-2 text-sm text-red-300">{error}</p>}
        </form>

        <div className="px-6 py-4 border-t border-zinc-800 flex justify-end gap-3">
          <button type="button" onClick={onClose} className="px-4 py-2 rounded-lg text-sm text-zinc-400 hover:text-white transition-colors">Cancel</button>
          <button onClick={handleSubmit as unknown as React.MouseEventHandler} disabled={saving}
            className="px-5 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold transition-colors disabled:opacity-50">
            {saving ? "Saving…" : initial ? "Save changes" : "Add company"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Resource form modal ───────────────────────────────────────────────────────

const EMPTY_RESOURCE: ResourceForm = {
  title: "", description: "", link: "", email: "",
  communities: [], industries: [], locations: [], topics: [],
};

function ResourceFormModal({
  initial,
  onSave,
  onClose,
}: {
  initial: ResourceForm | null;
  onSave: (v: ResourceForm) => Promise<void>;
  onClose: () => void;
}) {
  const [form, setForm] = useState<ResourceForm>(initial ?? EMPTY_RESOURCE);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function set<K extends keyof ResourceForm>(key: K, value: ResourceForm[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.title?.trim()) { setError("Title is required."); return; }
    setSaving(true);
    setError(null);
    try { await onSave(form); } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed.");
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-zinc-900 border border-zinc-700 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800">
          <h2 className="text-base font-semibold text-white">{initial ? "Edit Resource" : "Add Resource"}</h2>
          <button onClick={onClose} className="text-zinc-400 hover:text-white transition-colors">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
          <Field label="Title *">
            <input className={inputCls} value={form.title ?? ""} onChange={(e) => set("title", e.target.value)} placeholder="Resource name" />
          </Field>

          <Field label="Description">
            <textarea className={`${inputCls} resize-none`} rows={4} value={form.description ?? ""} onChange={(e) => set("description", e.target.value)} placeholder="What does this resource offer?" />
          </Field>

          <div className="grid grid-cols-2 gap-4">
            <Field label="Link">
              <input className={inputCls} value={form.link ?? ""} onChange={(e) => set("link", e.target.value || null)} placeholder="https://…" />
            </Field>
            <Field label="Email">
              <input className={inputCls} type="email" value={form.email ?? ""} onChange={(e) => set("email", e.target.value || null)} placeholder="contact@example.com" />
            </Field>
          </div>

          <MultiSelect label="Communities" options={RESOURCE_COMMUNITIES} value={form.communities ?? []} onChange={(v) => set("communities", v)} />
          <MultiSelect label="Industries" options={RESOURCE_INDUSTRIES} value={form.industries ?? []} onChange={(v) => set("industries", v)} />
          <MultiSelect label="Topics" options={RESOURCE_TOPICS} value={form.topics ?? []} onChange={(v) => set("topics", v)} />
          <MultiSelect label="Locations (counties)" options={RESOURCE_LOCATIONS} value={form.locations ?? []} onChange={(v) => set("locations", v)} />

          {error && <p className="rounded-lg border border-red-800 bg-red-950 px-3 py-2 text-sm text-red-300">{error}</p>}
        </form>

        <div className="px-6 py-4 border-t border-zinc-800 flex justify-end gap-3">
          <button type="button" onClick={onClose} className="px-4 py-2 rounded-lg text-sm text-zinc-400 hover:text-white transition-colors">Cancel</button>
          <button onClick={handleSubmit as unknown as React.MouseEventHandler} disabled={saving}
            className="px-5 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold transition-colors disabled:opacity-50">
            {saving ? "Saving…" : initial ? "Save changes" : "Add resource"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main admin client ─────────────────────────────────────────────────────────

export default function AdminClient({
  companies: initialCompanies,
  resources: initialResources,
  claims: initialClaims,
}: {
  companies: Company[];
  resources: Resource[];
  claims: Claim[];
}) {
  const supabase = createClient();
  const [tab, setTab] = useState<"companies" | "resources" | "claims">("companies");
  const [claims, setClaims] = useState<Claim[]>(initialClaims);
  const [toast, setToast] = useState<string | null>(null);

  // Companies state
  const [companies, setCompanies] = useState<Company[]>(initialCompanies);
  const [companySearch, setCompanySearch] = useState("");
  const [editingCompany, setEditingCompany] = useState<Company | null | "new">(null);
  const [deletingCompany, setDeletingCompany] = useState<Company | null>(null);

  // Resources state
  const [resources, setResources] = useState<Resource[]>(initialResources);
  const [resourceSearch, setResourceSearch] = useState("");
  const [editingResource, setEditingResource] = useState<Resource | null | "new">(null);
  const [deletingResource, setDeletingResource] = useState<Resource | null>(null);

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  }

  // ── Company CRUD ────────────────────────────────────────────────────────────
  async function saveCompany(values: CompanyForm) {
    if (editingCompany === "new") {
      const { data, error } = await supabase.from("companies").insert([values]).select().single();
      if (error) throw new Error(error.message);
      setCompanies((prev) => [...prev, data].sort((a, b) => (a.name ?? "").localeCompare(b.name ?? "")));
      showToast("Company added.");
    } else if (editingCompany) {
      const { error } = await supabase.from("companies").update(values).eq("id", editingCompany.id);
      if (error) throw new Error(error.message);
      setCompanies((prev) => prev.map((c) => c.id === editingCompany.id ? { ...c, ...values } : c));
      showToast("Company saved.");
    }
    setEditingCompany(null);
  }

  async function deleteCompany(company: Company) {
    const { error } = await supabase.from("companies").delete().eq("id", company.id);
    if (error) { showToast(`Error: ${error.message}`); return; }
    setCompanies((prev) => prev.filter((c) => c.id !== company.id));
    setDeletingCompany(null);
    showToast("Company deleted.");
  }

  // ── Resource CRUD ───────────────────────────────────────────────────────────
  async function saveResource(values: ResourceForm) {
    if (editingResource === "new") {
      const { data, error } = await supabase.from("resources").insert([values]).select().single();
      if (error) throw new Error(error.message);
      setResources((prev) => [...prev, data].sort((a, b) => (a.title ?? "").localeCompare(b.title ?? "")));
      showToast("Resource added.");
    } else if (editingResource) {
      const { error } = await supabase.from("resources").update(values).eq("id", editingResource.id);
      if (error) throw new Error(error.message);
      setResources((prev) => prev.map((r) => r.id === editingResource.id ? { ...r, ...values } : r));
      showToast("Resource saved.");
    }
    setEditingResource(null);
  }

  async function deleteResource(resource: Resource) {
    const { error } = await supabase.from("resources").delete().eq("id", resource.id);
    if (error) { showToast(`Error: ${error.message}`); return; }
    setResources((prev) => prev.filter((r) => r.id !== resource.id));
    setDeletingResource(null);
    showToast("Resource deleted.");
  }

  const filteredCompanies = companies.filter(
    (c) => !companySearch || c.name?.toLowerCase().includes(companySearch.toLowerCase()),
  );
  const filteredResources = resources.filter(
    (r) => !resourceSearch || r.title?.toLowerCase().includes(resourceSearch.toLowerCase()),
  );

  return (
    <div className="min-h-screen bg-zinc-950 text-white">
      {/* Top bar */}
      <header className="border-b border-zinc-800 bg-zinc-900 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0" style={{backgroundColor: "#C1440E"}}>
            <svg className="w-6 h-6 text-white" viewBox="0 0 100 100" fill="none" stroke="currentColor" strokeWidth={8} strokeLinejoin="round" strokeLinecap="round">
              <path d="M15 10 L65 10 L65 42 L85 42 L85 90 L15 90 Z" />
            </svg>
          </div>
          <span className="font-semibold text-base">The Startup State</span>
          <span className="text-zinc-600">/</span>
          <span className="text-sm text-zinc-400">Admin</span>
        </div>
        <a href="/" className="text-sm text-zinc-400 hover:text-white transition-colors">← Back to map</a>
      </header>

      <div className="px-6 py-6 max-w-7xl mx-auto">
        {/* Tabs */}
        <div className="flex gap-1 mb-6 bg-zinc-900 border border-zinc-800 rounded-xl p-1 w-fit">
          {(["companies", "resources", "claims"] as const).map((t) => {
            const pendingClaims = claims.filter((c) => c.status === "pending" && c.method === "manual").length;
            const label =
              t === "companies" ? `Companies (${companies.length})` :
              t === "resources" ? `Resources (${resources.length})` :
              `Claims (${claims.length})${pendingClaims > 0 ? ` · ${pendingClaims} pending` : ""}`;
            return (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  tab === t ? "bg-zinc-700 text-white" : "text-zinc-400 hover:text-white"
                }`}
              >
                {label}
              </button>
            );
          })}
        </div>

        {/* ── Companies tab ── */}
        {tab === "companies" && (
          <>
            <div className="flex items-center justify-between gap-4 mb-4">
              <input type="text" value={companySearch} onChange={(e) => setCompanySearch(e.target.value)}
                placeholder="Search companies…"
                className="rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-blue-500 transition-colors w-64" />
              <button onClick={() => setEditingCompany("new")}
                className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold transition-colors whitespace-nowrap">
                + Add company
              </button>
            </div>
            <div className="rounded-xl border border-zinc-800 overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-zinc-800 bg-zinc-900">
                    {["Name", "Sector", "Stage", "Employees", "County", "Status", "Flags", "Coords", ""].map((h) => (
                      <th key={h} className="text-left px-4 py-3 text-xs font-medium text-zinc-400 uppercase tracking-wide">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filteredCompanies.map((company, i) => (
                    <tr key={company.id} className={`border-b border-zinc-800/60 hover:bg-zinc-800/40 transition-colors ${i % 2 ? "bg-zinc-900/30" : ""}`}>
                      <td className="px-4 py-3">
                        <div className="font-medium text-white">{company.name}</div>
                        {company.website && <div className="text-xs text-zinc-500 truncate max-w-[180px]">{company.website}</div>}
                      </td>
                      <td className="px-4 py-3 text-zinc-300">{company.section ?? <span className="text-zinc-600">—</span>}</td>
                      <td className="px-4 py-3 text-zinc-300">{company.stage ?? <span className="text-zinc-600">—</span>}</td>
                      <td className="px-4 py-3 text-zinc-300">{company.employees ?? <span className="text-zinc-600">—</span>}</td>
                      <td className="px-4 py-3 text-zinc-300">{company.utah_county ?? <span className="text-zinc-600">—</span>}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${
                          company.status === "approved" ? "bg-emerald-900/60 text-emerald-300" :
                          company.status === "pending" ? "bg-amber-900/60 text-amber-300" :
                          "bg-red-900/60 text-red-300"
                        }`}>{company.status}</span>
                      </td>
                      <td className="px-4 py-3 text-xs text-zinc-400">
                        <div className="flex flex-wrap gap-1">
                          {company.seeking_funding && <span className="px-1.5 py-0.5 rounded bg-violet-900/60 text-violet-300">💰</span>}
                          {company.actively_fundraising && <span className="px-1.5 py-0.5 rounded bg-amber-900/60 text-amber-300">🚀</span>}
                          {company.newsletter_subscribed && <span className="px-1.5 py-0.5 rounded bg-zinc-700 text-zinc-300">📧</span>}
                          {company.has_international_ops && <span className="px-1.5 py-0.5 rounded bg-blue-900/60 text-blue-300">🌐</span>}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-xs text-zinc-500">
                        {company.lat && company.lng
                          ? `${company.lat.toFixed(4)}, ${company.lng.toFixed(4)}`
                          : <span className="text-red-500/70">Missing</span>}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2 justify-end">
                          <button onClick={() => setEditingCompany(company)}
                            className="text-zinc-400 hover:text-white transition-colors text-xs px-2.5 py-1 rounded-lg hover:bg-zinc-700">Edit</button>
                          <button onClick={() => setDeletingCompany(company)}
                            className="text-zinc-400 hover:text-red-400 transition-colors text-xs px-2.5 py-1 rounded-lg hover:bg-zinc-700">Delete</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {filteredCompanies.length === 0 && (
                    <tr><td colSpan={9} className="px-4 py-12 text-center text-zinc-500">No companies found.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </>
        )}

        {/* ── Resources tab ── */}
        {tab === "resources" && (
          <>
            <div className="flex items-center justify-between gap-4 mb-4">
              <input type="text" value={resourceSearch} onChange={(e) => setResourceSearch(e.target.value)}
                placeholder="Search resources…"
                className="rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-blue-500 transition-colors w-64" />
              <button onClick={() => setEditingResource("new")}
                className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold transition-colors whitespace-nowrap">
                + Add resource
              </button>
            </div>
            <div className="rounded-xl border border-zinc-800 overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-zinc-800 bg-zinc-900">
                    {["Title", "Topics", "Communities", "Locations", "Link", ""].map((h) => (
                      <th key={h} className="text-left px-4 py-3 text-xs font-medium text-zinc-400 uppercase tracking-wide">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filteredResources.map((resource, i) => (
                    <tr key={resource.id} className={`border-b border-zinc-800/60 hover:bg-zinc-800/40 transition-colors ${i % 2 ? "bg-zinc-900/30" : ""}`}>
                      <td className="px-4 py-3 max-w-[220px]">
                        <div className="font-medium text-white leading-snug">{resource.title}</div>
                      </td>
                      <td className="px-4 py-3 text-xs text-zinc-400 max-w-[160px]">
                        {resource.topics?.join(", ") ?? <span className="text-zinc-600">—</span>}
                      </td>
                      <td className="px-4 py-3 text-xs text-zinc-400">
                        {resource.communities?.join(", ") ?? <span className="text-zinc-600">—</span>}
                      </td>
                      <td className="px-4 py-3 text-xs text-zinc-400 max-w-[140px] truncate">
                        {resource.locations?.length
                          ? resource.locations.length === RESOURCE_LOCATIONS.length
                            ? "All counties"
                            : resource.locations.slice(0, 3).join(", ") + (resource.locations.length > 3 ? ` +${resource.locations.length - 3}` : "")
                          : <span className="text-zinc-600">—</span>}
                      </td>
                      <td className="px-4 py-3 text-xs">
                        {resource.link
                          ? <a href={resource.link} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:text-blue-300 truncate max-w-[140px] block transition-colors">
                              {resource.link.replace(/^https?:\/\//, "")}
                            </a>
                          : <span className="text-zinc-600">—</span>}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2 justify-end">
                          <button onClick={() => setEditingResource(resource)}
                            className="text-zinc-400 hover:text-white transition-colors text-xs px-2.5 py-1 rounded-lg hover:bg-zinc-700">Edit</button>
                          <button onClick={() => setDeletingResource(resource)}
                            className="text-zinc-400 hover:text-red-400 transition-colors text-xs px-2.5 py-1 rounded-lg hover:bg-zinc-700">Delete</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {filteredResources.length === 0 && (
                    <tr><td colSpan={6} className="px-4 py-12 text-center text-zinc-500">No resources found.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </>
        )}

        {/* ── Claims tab ── */}
        {tab === "claims" && (
          <div className="rounded-xl border border-zinc-800 overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-zinc-800 bg-zinc-900">
                  {["Company", "Claimant email", "Method", "Status", "Submitted", ""].map((h) => (
                    <th key={h} className="text-left px-4 py-3 text-xs font-medium text-zinc-400 uppercase tracking-wide">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {claims.map((claim, i) => (
                  <tr key={claim.id} className={`border-b border-zinc-800/60 hover:bg-zinc-800/40 transition-colors ${i % 2 ? "bg-zinc-900/30" : ""}`}>
                    <td className="px-4 py-3">
                      <div className="font-medium text-white">{claim.companies?.name ?? `Company #${claim.company_id}`}</div>
                      {claim.companies?.website && (
                        <div className="text-xs text-zinc-500">{claim.companies.website}</div>
                      )}
                    </td>
                    <td className="px-4 py-3 text-zinc-300">{claim.email}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${
                        claim.method === "email_otp" ? "bg-blue-900/60 text-blue-300" : "bg-zinc-700 text-zinc-300"
                      }`}>
                        {claim.method === "email_otp" ? "Email OTP" : "Manual"}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${
                        claim.status === "verified" || claim.status === "approved" ? "bg-emerald-900/60 text-emerald-300" :
                        claim.status === "pending" ? "bg-amber-900/60 text-amber-300" :
                        "bg-red-900/60 text-red-300"
                      }`}>
                        {claim.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-zinc-500">
                      {new Date(claim.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3">
                      {claim.status === "pending" && claim.method === "manual" && (
                        <div className="flex items-center gap-2 justify-end">
                          <button
                            onClick={async () => {
                              const { error } = await supabase
                                .from("company_claims")
                                .update({ status: "approved", reviewed_at: new Date().toISOString() })
                                .eq("id", claim.id);
                              if (error) { showToast(`Error: ${error.message}`); return; }
                              // Verify the membership (row was created at claim time)
                              await supabase
                                .from("company_members")
                                .upsert(
                                  { company_id: claim.company_id, user_id: claim.user_id, role: "member", verified: true },
                                  { onConflict: "company_id,user_id" },
                                );
                              // Set owner_id if not already set
                              await supabase
                                .from("companies")
                                .update({ owner_id: claim.user_id })
                                .eq("id", claim.company_id)
                                .is("owner_id", null);
                              setClaims((prev) => prev.map((c) => c.id === claim.id ? { ...c, status: "approved" } : c));
                              showToast("Claim approved.");
                            }}
                            className="text-emerald-400 hover:text-emerald-300 transition-colors text-xs px-2.5 py-1 rounded-lg hover:bg-zinc-700"
                          >
                            Approve
                          </button>
                          <button
                            onClick={async () => {
                              const { error } = await supabase
                                .from("company_claims")
                                .update({ status: "rejected", reviewed_at: new Date().toISOString() })
                                .eq("id", claim.id);
                              if (error) { showToast(`Error: ${error.message}`); return; }
                              setClaims((prev) => prev.map((c) => c.id === claim.id ? { ...c, status: "rejected" } : c));
                              showToast("Claim rejected.");
                            }}
                            className="text-red-400 hover:text-red-300 transition-colors text-xs px-2.5 py-1 rounded-lg hover:bg-zinc-700"
                          >
                            Reject
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
                {claims.length === 0 && (
                  <tr><td colSpan={6} className="px-4 py-12 text-center text-zinc-500">No claims yet.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modals */}
      {editingCompany !== null && (
        <CompanyFormModal
          initial={editingCompany === "new" ? null : { ...editingCompany }}
          onSave={saveCompany}
          onClose={() => setEditingCompany(null)}
        />
      )}
      {deletingCompany && (
        <DeleteModal name={deletingCompany.name ?? "this company"} onConfirm={() => deleteCompany(deletingCompany)} onClose={() => setDeletingCompany(null)} />
      )}
      {editingResource !== null && (
        <ResourceFormModal
          initial={editingResource === "new" ? null : { ...editingResource }}
          onSave={saveResource}
          onClose={() => setEditingResource(null)}
        />
      )}
      {deletingResource && (
        <DeleteModal name={deletingResource.title ?? "this resource"} onConfirm={() => deleteResource(deletingResource)} onClose={() => setDeletingResource(null)} />
      )}

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-zinc-800 border border-zinc-700 text-white text-sm font-medium px-4 py-2.5 rounded-xl shadow-xl">
          {toast}
        </div>
      )}
    </div>
  );
}
