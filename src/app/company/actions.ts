"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import Anthropic from "@anthropic-ai/sdk";

// ── Constants mirroring resource tags ────────────────────────────────────────

const RESOURCE_INDUSTRIES = [
  "Aerospace and Defense",
  "Agriculture",
  "Arts and Entertainment and Recreation",
  "Consumer Packaged Goods",
  "Financial Services",
  "Hospitality and Food Services",
  "Life Sciences and Healthcare",
  "Manufacturing",
  "Other",
  "Software and Information Technology",
];

const RESOURCE_TOPICS = [
  "Close or Exit a Business",
  "Entrepreneurship Communities",
  "Funding",
  "International Trade",
  "Late Stage Growth",
  "Marketing and Sales",
  "Other",
  "Relocate a Business to Utah",
  "Start a Business",
  "Taxes and Finance",
];

// Counties considered rural in Utah
const RURAL_COUNTIES = new Set([
  "Beaver", "Carbon", "Daggett", "Duchesne", "Emery", "Garfield", "Grand",
  "Juab", "Kane", "Millard", "Morgan", "Piute", "Rich", "San Juan",
  "Sanpete", "Sevier", "Tooele", "Uintah", "Wasatch", "Wayne",
]);

// ── Types ─────────────────────────────────────────────────────────────────────

export type AddCompanyInput = {
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
  hiring: boolean;
  careers_url: string;
};

// ── AI enrichment ─────────────────────────────────────────────────────────────

async function enrich(input: AddCompanyInput): Promise<{
  industry: string | null;
  top_needs: string[];
  has_international_ops: boolean;
  actively_fundraising: boolean;
}> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    // Graceful fallback: derive what we can deterministically
    return {
      industry: null,
      top_needs: [],
      has_international_ops: false,
      actively_fundraising: ["Series A", "Series B", "Series C", "Series D+", "Seed", "Pre-Seed"].includes(input.stage ?? ""),
    };
  }

  const client = new Anthropic({ apiKey });

  const prompt = `You are classifying a Utah startup for a resource-matching database.

Company: ${input.name}
Website: ${input.website || "not provided"}
Description: ${input.description || "not provided"}
Sector: ${input.section || "not provided"}
Stage: ${input.stage || "not provided"}
Employees: ${input.employees || "not provided"}

Based on the above, return a JSON object with exactly these keys:
- "industry": one value from this list (pick the best match): ${JSON.stringify(RESOURCE_INDUSTRIES)}
- "top_needs": array of 1-3 values from this list that best describe what this company likely needs: ${JSON.stringify(RESOURCE_TOPICS)}
- "has_international_ops": boolean — true if the company likely has or needs international trade/operations
- "actively_fundraising": boolean — true if the stage suggests they are actively raising

Return ONLY valid JSON, no explanation.`;

  try {
    const msg = await client.messages.create({
      model: "claude-opus-4-5",
      max_tokens: 256,
      messages: [{ role: "user", content: prompt }],
    });

    const text = msg.content[0].type === "text" ? msg.content[0].text : "";
    const json = JSON.parse(text.trim());

    return {
      industry: RESOURCE_INDUSTRIES.includes(json.industry) ? json.industry : null,
      top_needs: Array.isArray(json.top_needs)
        ? json.top_needs.filter((t: string) => RESOURCE_TOPICS.includes(t))
        : [],
      has_international_ops: !!json.has_international_ops,
      actively_fundraising: !!json.actively_fundraising,
    };
  } catch {
    return {
      industry: null,
      top_needs: [],
      has_international_ops: false,
      actively_fundraising: false,
    };
  }
}

// ── Server action ─────────────────────────────────────────────────────────────

export async function addMyCompany(
  input: AddCompanyInput,
): Promise<{ error: string | null; id: number | null }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "You must be logged in to add a company.", id: null };

  // Deterministic enrichment (done before insert so we have county)
  const is_rural = input.utah_county ? RURAL_COUNTIES.has(input.utah_county) : null;

  // AI enrichment (non-blocking on failure)
  const enriched = await enrich(input);

  const { data, error } = await supabase
    .from("companies")
    .insert([
      {
        name: input.name,
        address: input.address || null,
        description: input.description || null,
        website: input.website || null,
        linkedin_url: input.linkedin_url || null,
        stage: input.stage,
        employees: input.employees,
        section: input.section,
        lat: input.lat,
        lng: input.lng,
        utah_county: input.utah_county,
        product_type: input.product_type,
        founded_year: input.founded_year,
        founder_demographics: input.founder_demographics.length ? input.founder_demographics : null,
        seeking_funding: input.seeking_funding,
        investor_contact_email: input.investor_contact_email || null,
        hiring: input.hiring,
        careers_url: input.careers_url || null,
        is_rural,
        industry: enriched.industry,
        top_needs: enriched.top_needs.length ? enriched.top_needs : null,
        has_international_ops: enriched.has_international_ops,
        actively_fundraising: enriched.actively_fundraising,
        enriched_at: new Date().toISOString(),
        status: "pending",
        owner_id: user.id,
      },
    ])
    .select("id")
    .single();

  if (error) return { error: error.message, id: null };

  // Add creator as owner in company_members
  await supabase
    .from("company_members")
    .insert({ company_id: data.id, user_id: user.id, role: "owner" });

  revalidatePath("/");
  return { error: null, id: data.id };
}

// ── Update owned company ───────────────────────────────────────────────────────

export async function updateMyCompany(
  id: number,
  input: AddCompanyInput,
): Promise<{ error: string | null }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "You must be logged in." };

  // Must be a verified member to edit
  const { data: membership } = await supabase
    .from("company_members")
    .select("id, verified")
    .eq("company_id", id)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!membership || !membership.verified) {
    return { error: "Editing will be available once your claim is verified." };
  }

  // Re-derive deterministic enrichment if county changed
  const is_rural = input.utah_county ? RURAL_COUNTIES.has(input.utah_county) : null;

  // Re-run AI enrichment only if description/section changed meaningfully
  const enriched = await enrich(input);

  const { error } = await supabase
    .from("companies")
    .update({
      name: input.name,
      address: input.address || null,
      description: input.description || null,
      website: input.website || null,
      linkedin_url: input.linkedin_url || null,
      stage: input.stage,
      employees: input.employees,
      section: input.section,
      lat: input.lat,
      lng: input.lng,
      utah_county: input.utah_county,
      product_type: input.product_type,
      founded_year: input.founded_year,
      founder_demographics: input.founder_demographics.length ? input.founder_demographics : null,
      seeking_funding: input.seeking_funding,
      investor_contact_email: input.investor_contact_email || null,
      hiring: input.hiring,
      careers_url: input.careers_url || null,
      is_rural,
      industry: enriched.industry,
      top_needs: enriched.top_needs.length ? enriched.top_needs : null,
      has_international_ops: enriched.has_international_ops,
      actively_fundraising: enriched.actively_fundraising,
      enriched_at: new Date().toISOString(),
    })
    .eq("id", id);

  if (error) return { error: error.message };

  revalidatePath("/");
  return { error: null };
}

// ── Newsletter subscription ────────────────────────────────────────────────────

export async function setNewsletterSubscription(
  companyId: number,
  subscribed: boolean,
): Promise<{ error: string | null }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated." };

  const { data: membership } = await supabase
    .from("company_members")
    .select("id, verified")
    .eq("company_id", companyId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!membership || !membership.verified) return { error: "Newsletter subscription will be available once your claim is verified." };

  const { error } = await supabase
    .from("companies")
    .update({
      newsletter_subscribed: subscribed,
      newsletter_subscribed_at: subscribed ? new Date().toISOString() : null,
    })
    .eq("id", companyId);

  if (error) return { error: error.message };
  return { error: null };
}
