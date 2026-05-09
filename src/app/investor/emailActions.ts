"use server";

import { createClient } from "@/lib/supabase/server";
import Anthropic from "@anthropic-ai/sdk";

export type InvestorEmailDraft = {
  to: string;
  subject: string;
  body: string;
};

export async function generateInvestorOutreach(
  companyId: number,
): Promise<{ draft: InvestorEmailDraft | null; error?: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { draft: null, error: "Not authenticated." };

  // Fetch investor profile
  const { data: profile } = await supabase
    .from("investor_profiles")
    .select("*")
    .eq("user_id", user.id)
    .maybeSingle();

  if (!profile) return { draft: null, error: "No investor profile found." };

  // Fetch company
  const { data: company } = await supabase
    .from("companies")
    .select("name, description, stage, section, employees, website, product_type, founded_year, utah_county, investor_contact_email, seeking_funding")
    .eq("id", companyId)
    .maybeSingle();

  if (!company) return { draft: null, error: "Company not found." };

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return { draft: null, error: "AI drafting is not configured." };

  const investorName = profile.display_name ?? "An investor";
  const firmName = profile.firm_name ?? null;
  const senderName = firmName ? `${investorName} at ${firmName}` : investorName;

  const prompt = `You are drafting a professional investor outreach email on behalf of an investor to a startup's investor relations contact.

INVESTOR:
- Name: ${investorName}
- Firm: ${firmName ?? "Independent / Angel"}
- Bio: ${profile.bio ?? "Not provided"}
- Investment thesis: ${profile.investment_thesis ?? "Not provided"}
- Preferred stages: ${(profile.preferred_stages ?? []).join(", ") || "Open to all"}
- Preferred sectors: ${(profile.preferred_sectors ?? []).join(", ") || "Open to all"}
- Typical check size: ${[profile.check_size_min, profile.check_size_max].filter(Boolean).join(" – ") || "Not specified"}
- Leads rounds: ${profile.leads_rounds ? "Yes" : "No"}

COMPANY:
- Name: ${company.name}
- Stage: ${company.stage ?? "Unknown"}
- Sector: ${company.section ?? "Unknown"}
- Employees: ${company.employees ?? "Unknown"}
- Founded: ${company.founded_year ?? "Unknown"}
- Product type: ${company.product_type ?? "Unknown"}
- Location: ${company.utah_county ? `${company.utah_county} County, Utah` : "Utah"}
- Actively seeking investment: ${company.seeking_funding ? "Yes — this company is actively raising" : "Not specified"}
- Description: ${company.description ?? "Not provided"}

Write a concise, warm, professional investor outreach email. The email should:
1. Introduce ${senderName} and their investment focus naturally
2. Show genuine knowledge of the company — reference specific details (stage, sector, what they do)
3. Explain clearly why this investor and company are a good fit to explore together
4. ${company.seeking_funding ? "Acknowledge that the company is actively raising — frame this as timely and direct about exploring a potential investment." : "Be direct about intent — express interest in a brief introductory call to explore fit."}
5. Be 3–4 short paragraphs max. No fluff, no generic phrases like "I came across your company"
6. Close with the investor's name${firmName ? ` and firm (${firmName})` : ""}

Return ONLY valid JSON (no markdown fences) with this shape:
{ "subject": "...", "body": "..." }`;

  const client = new Anthropic({ apiKey });

  try {
    const msg = await client.messages.create({
      model: "claude-opus-4-5",
      max_tokens: 1024,
      messages: [{ role: "user", content: prompt }],
    });

    const raw = msg.content[0].type === "text" ? msg.content[0].text : "";
    const cleaned = raw.replace(/^```[a-z]*\n?/i, "").replace(/```\s*$/i, "").trim();
    const parsed = JSON.parse(cleaned);

    return {
      draft: {
        to: company.investor_contact_email ?? "",
        subject: parsed.subject ?? "",
        body: parsed.body ?? "",
      },
    };
  } catch (e) {
    console.error("Investor email draft error:", e);
    return { draft: null, error: "Failed to generate email. Please try again." };
  }
}
