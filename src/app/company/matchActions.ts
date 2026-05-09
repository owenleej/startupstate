"use server";

import { createClient } from "@/lib/supabase/server";
import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

// ── Types ─────────────────────────────────────────────────────────────────────

export type MatchMode = "general" | { goal: string };

export type ResourceMatch = {
  resource_id: number;
  resource_title: string;
  opportunity_headline: string;
  why_match: string;
  action_items: string[];
  action_type: "url" | "email" | "both";
  action_url: string | null;
  action_email: string | null;
  action_label: string;
};

export type EmailDraft = {
  subject: string;
  body: string;
  recipient_name: string | null;
  recipient_email: string;
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function compactResource(r: {
  id: number;
  title: string | null;
  description: string | null;
  communities: string[] | null;
  industries: string[] | null;
  topics: string[] | null;
  locations: string[] | null;
  link: string | null;
  email: string | null;
}) {
  return {
    id: r.id,
    title: r.title,
    description: r.description?.slice(0, 300),
    communities: r.communities,
    industries: r.industries,
    topics: r.topics,
    locations: r.locations?.slice(0, 5).concat(
      (r.locations?.length ?? 0) > 5 ? [`+${(r.locations?.length ?? 0) - 5} more`] : []
    ),
    link: r.link,
    email: r.email,
  };
}

function compactCompany(c: Record<string, unknown>) {
  return {
    name: c.name,
    description: c.description,
    website: c.website,
    stage: c.stage,
    employees: c.employees,
    section: c.section,
    industry: c.industry,
    product_type: c.product_type,
    founded_year: c.founded_year,
    utah_county: c.utah_county,
    is_rural: c.is_rural,
    founder_demographics: c.founder_demographics,
    top_needs: c.top_needs,
    actively_fundraising: c.actively_fundraising,
    has_international_ops: c.has_international_ops,
  };
}

// ── Match resources ───────────────────────────────────────────────────────────

export async function matchResources(
  companyId: number,
  mode: MatchMode,
): Promise<{ matches: ResourceMatch[] | null; error: string | null }> {
  const supabase = await createClient();

  const [{ data: company, error: companyErr }, { data: resources, error: resourcesErr }] =
    await Promise.all([
      supabase.from("companies").select("*").eq("id", companyId).single(),
      supabase
        .from("resources")
        .select("id, title, description, communities, industries, topics, locations, link, email"),
    ]);

  if (companyErr || !company) return { matches: null, error: "Could not load company." };
  if (resourcesErr || !resources) return { matches: null, error: "Could not load resources." };

  const modeInstruction =
    mode === "general"
      ? `Find the best overall resource matches for this company. Consider their sector, stage, founder
         demographics, county, and industry when ranking. Prioritize resources where the company has a
         strong overlap across multiple criteria.`
      : `The founder has told you their specific goal right now: "${mode.goal}".
         Focus ONLY on resources that directly help with this goal.
         Filter the resource list to those whose topics or description relate to "${mode.goal}".
         Rank by how concretely and immediately each resource helps the founder achieve this goal given
         their current stage (${company.stage ?? "unknown"}), sector (${company.section ?? "unknown"}),
         and county (${company.utah_county ?? "unknown"}).
         Be very specific about what the founder should do to use the resource toward this goal.`;

  const prompt = `You are an expert Utah startup advisor helping founders discover state resources they're eligible for.

## Company profile
${JSON.stringify(compactCompany(company as Record<string, unknown>), null, 2)}

## Task
${modeInstruction}

From the list of ${resources.length} resources below, identify the TOP 3 that represent the most valuable,
actionable opportunities for this specific company RIGHT NOW. Focus on resources that feel like a genuine
opportunity waiting to be claimed — not generic ones that apply to everyone.

Rank by specificity of fit and immediacy of value. Prefer resources with emails (direct human contact) when
the company is early stage. Prefer resources with links (online forms/applications) when they're more mature.

## Available resources
${JSON.stringify(resources.map(compactResource), null, 2)}

## Response format
Return ONLY a valid JSON object with this exact shape — no markdown, no explanation:
{
  "matches": [
    {
      "resource_id": <number — must match an id from the list above>,
      "resource_title": "<exact title from the resource>",
      "opportunity_headline": "<one punchy sentence: what is the concrete opportunity here — e.g. 'Get up to $50K in non-dilutive funding for your hardware prototype'>",
      "why_match": "<2-3 sentences explaining specifically why THIS company is a great fit for THIS resource, referencing specific company attributes>",
      "action_items": ["<specific step 1>", "<specific step 2>"],
      "action_type": "url" | "email" | "both",
      "action_url": "<url or null>",
      "action_email": "<email or null>",
      "action_label": "<short CTA label, e.g. 'Apply online' or 'Email program director'>"
    }
  ]
}`;

  try {
    const msg = await client.messages.create({
      model: "claude-opus-4-5",
      max_tokens: 2048,
      messages: [{ role: "user", content: prompt }],
    });

    const raw = msg.content[0].type === "text" ? msg.content[0].text.trim() : "";
    const text = raw.replace(/^```[a-z]*\n?/i, "").replace(/```\s*$/i, "").trim();
    const parsed = JSON.parse(text);
    const matches: ResourceMatch[] = (parsed.matches ?? []).slice(0, 3);
    return { matches, error: null };
  } catch (e) {
    console.error("matchResources error:", e);
    return { matches: null, error: "Matching failed — please try again." };
  }
}

// ── Generate email draft ──────────────────────────────────────────────────────

export async function generateEmailDraft(
  companyId: number,
  resourceId: number,
  opportunityHeadline: string,
): Promise<{ draft: EmailDraft | null; error: string | null }> {
  const supabase = await createClient();

  const [{ data: company }, { data: resource }] = await Promise.all([
    supabase.from("companies").select("*").eq("id", companyId).single(),
    supabase.from("resources").select("*").eq("id", resourceId).single(),
  ]);

  if (!company || !resource) return { draft: null, error: "Could not load data." };

  const prompt = `You are writing a professional, warm outreach email on behalf of a Utah startup founder.

## Company (the sender)
${JSON.stringify(compactCompany(company as Record<string, unknown>), null, 2)}

## Resource / Program (the recipient)
Title: ${resource.title}
Description: ${resource.description}
Email: ${resource.email ?? "unknown"}
Link: ${resource.link ?? "none"}
Topics: ${JSON.stringify(resource.topics)}
Communities: ${JSON.stringify(resource.communities)}

## Opportunity
${opportunityHeadline}

## Instructions
Write a concise, genuine outreach email from the founder of ${company.name} to this program.
- Tone: professional but human — not a template, not generic
- Length: 150-220 words
- Open with a one-sentence hook about what the company does
- Explain specifically why they are reaching out to THIS program (reference the program by name)
- Note any relevant eligibility factors (founder demographics, county, stage, industry)
- End with a clear, low-friction ask (a call, a quick response, an application review)
- Do NOT use placeholders like [Your Name] — use the company name as the sender identity

Return ONLY a valid JSON object:
{
  "subject": "<email subject line>",
  "recipient_name": "<first name of recipient if inferable from resource, else null>",
  "recipient_email": "${resource.email ?? ""}",
  "body": "<full email body as plain text with \\n for line breaks>"
}`;

  try {
    const msg = await client.messages.create({
      model: "claude-opus-4-5",
      max_tokens: 1024,
      messages: [{ role: "user", content: prompt }],
    });

    const raw = msg.content[0].type === "text" ? msg.content[0].text.trim() : "";
    const text = raw.replace(/^```[a-z]*\n?/i, "").replace(/```\s*$/i, "").trim();
    const draft: EmailDraft = JSON.parse(text);
    return { draft, error: null };
  } catch (e) {
    console.error("generateEmailDraft error:", e);
    return { draft: null, error: "Could not generate draft — please try again." };
  }
}
