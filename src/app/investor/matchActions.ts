"use server";

import { createClient } from "@/lib/supabase/server";
import Anthropic from "@anthropic-ai/sdk";

export type InvestorMatch = {
  company_id: number;
  match_reason: string;
};

export async function matchCompaniesForInvestor(): Promise<{
  matches: InvestorMatch[] | null;
  error?: string;
}> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { matches: null, error: "Not authenticated." };

  // Fetch investor profile
  const { data: profile } = await supabase
    .from("investor_profiles")
    .select("*")
    .eq("user_id", user.id)
    .maybeSingle();

  if (!profile) return { matches: null, error: "No investor profile found. Please create one first." };

  // Fetch approved companies with relevant fields
  const { data: companies, error: cErr } = await supabase
    .from("companies")
    .select("id, name, stage, section, employees, description, product_type, founded_year, utah_county, seeking_funding")
    .eq("status", "approved");

  if (cErr || !companies?.length) return { matches: null, error: "Could not fetch companies." };

  // Compact company list for LLM
  const compactCompanies = companies.map((c) => ({
    id: c.id,
    name: c.name,
    stage: c.stage ?? "unknown",
    sector: c.section ?? "unknown",
    employees: c.employees ?? "unknown",
    product_type: c.product_type ?? null,
    county: c.utah_county ?? null,
    seeking_investment: c.seeking_funding ?? false,
    description: c.description ? c.description.slice(0, 200) : null,
  }));

  const investorSummary = {
    name: profile.display_name ?? "Investor",
    firm: profile.firm_name ?? null,
    thesis: profile.investment_thesis ?? null,
    bio: profile.bio ?? null,
    preferred_stages: profile.preferred_stages ?? [],
    preferred_sectors: profile.preferred_sectors ?? [],
    check_size: [profile.check_size_min, profile.check_size_max].filter(Boolean).join(" – ") || null,
    leads_rounds: profile.leads_rounds,
  };

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return { matches: null, error: "AI matching is not configured." };

  const client = new Anthropic({ apiKey });

  const prompt = `You are matching a Utah startup investor with companies from the Startupstate database.

INVESTOR PROFILE:
${JSON.stringify(investorSummary, null, 2)}

COMPANIES (${compactCompanies.length} total):
${JSON.stringify(compactCompanies, null, 2)}

Select the TOP 10 companies that best match this investor's profile, preferences, and thesis.
Consider: stage fit, sector alignment, check size compatibility, geographic interest, and thesis alignment.
If preferred_stages or preferred_sectors are empty, use the thesis/bio to infer preferences.
Give a meaningful ranking boost to companies where seeking_investment is true — these companies are actively looking for investors and represent immediate opportunities. Mention this signal explicitly in the match_reason when relevant.

Write the match_reason field differently based on rank:
- Ranks 1–3 (top matches): Write 3–4 sentences. Be specific about WHY this company is a strong fit for THIS investor. Reference concrete details from both the investor profile and the company (stage, sector, description, what problem they solve). Explain what makes the opportunity compelling and how it aligns with the investor's thesis or preferences.
- Ranks 4–10 (other matches): Write 1–2 sentences. Briefly note the primary reason for fit (stage match, sector alignment, etc.).

Important: Do NOT use the investor's personal name (display_name) anywhere in the match_reason text. If you need to refer to the investor, use the firm name (if provided) or generic phrasing like "this fund", "your thesis", "this portfolio", or "your investment focus".

Return ONLY a valid JSON array (no explanation, no markdown fences) with exactly this shape:
[
  { "company_id": <number>, "match_reason": "<detailed or brief reason depending on rank>" },
  ...
]

Order results from best fit to least fit. Return exactly 10 items (fewer only if fewer than 10 companies exist).`;

  try {
    const msg = await client.messages.create({
      model: "claude-opus-4-5",
      max_tokens: 1024,
      messages: [{ role: "user", content: prompt }],
    });

    const raw = msg.content[0].type === "text" ? msg.content[0].text : "";
    const cleaned = raw
      .replace(/^```[a-z]*\n?/i, "")
      .replace(/```\s*$/i, "")
      .trim();
    const parsed: InvestorMatch[] = JSON.parse(cleaned);

    // Validate IDs exist in the company list
    const validIds = new Set(companies.map((c) => c.id));
    const valid = parsed
      .filter((m) => typeof m.company_id === "number" && validIds.has(m.company_id) && m.match_reason)
      .slice(0, 10);

    return { matches: valid };
  } catch (e) {
    console.error("Investor match error:", e);
    return { matches: null, error: "AI matching failed. Please try again." };
  }
}
