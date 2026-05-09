"use server";

import { createClient } from "@/lib/supabase/server";
import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export type NewFounderProfile = {
  industry: string;
  journeyStage: string;
  utahCounty: string | null;
};

export type NewFounderResourceMatch = {
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

export async function matchResourcesForNewFounder(
  profile: NewFounderProfile,
): Promise<{ matches: NewFounderResourceMatch[] | null; error: string | null }> {
  const supabase = await createClient();

  const { data: resources, error: resourcesErr } = await supabase
    .from("resources")
    .select("id, title, description, communities, industries, topics, locations, link, email");

  if (resourcesErr || !resources) return { matches: null, error: "Could not load resources." };

  const RURAL_COUNTIES = new Set([
    "Beaver", "Carbon", "Daggett", "Duchesne", "Emery", "Garfield", "Grand",
    "Juab", "Kane", "Millard", "Morgan", "Piute", "Rich", "San Juan",
    "Sanpete", "Sevier", "Tooele", "Uintah", "Wasatch", "Wayne",
  ]);

  const isRural = profile.utahCounty ? RURAL_COUNTIES.has(profile.utahCounty) : false;

  const prompt = `You are an expert Utah startup advisor helping an aspiring entrepreneur discover the best state resources to help them get started building a company.

This person does NOT yet have a company — they are in the early stages of becoming a founder and need guidance on where to start.

## Aspiring Founder Profile
- Industry interest: ${profile.industry}
- Journey stage: ${profile.journeyStage}
- Utah county: ${profile.utahCounty ?? "Not specified"}
- Rural area: ${isRural ? "Yes" : "No"}

## Entrepreneur Journey Context
Utah has a structured entrepreneur journey with these phases:
1. Explore — validate your idea, find community, learn what it means to build a company
2. Launch — form your business, get licensed, access first funding
3. Build — hire, grow customers, access capital
4. Accelerate — scale operations, enter new markets, access growth capital

This person is in the "${profile.journeyStage}" phase. Surface resources that are most relevant to WHERE THEY ARE NOW, not where they'll be in 3 years.

## Priority topics for aspiring founders
Focus especially on resources with these topics (in priority order):
1. "Start a Business" — help them get formally started
2. "Entrepreneurship Communities" — connect them with mentors, accelerators, co-working spaces
3. "Funding" — early grants, competitions, loans available to new founders
4. "Marketing and Sales" — if they need to validate demand

Deprioritize: "Late Stage Growth", "International Trade", "Relocate a Business to Utah", "Close or Exit a Business"

## Task
From the ${resources.length} available resources, select the TOP 4 that represent the most concrete, immediately actionable opportunities for this aspiring founder.

Prioritize:
- Resources that serve their specific industry ("${profile.industry}")
- Resources in their county or region (${profile.utahCounty ?? "statewide"})
- Resources that match where they are in their journey ("${profile.journeyStage}")
- Resources with actual contact points (email or URL to apply)

## Available resources
${JSON.stringify(resources.map(compactResource), null, 2)}

## Response format
Return ONLY valid JSON — no markdown, no explanation:
{
  "matches": [
    {
      "resource_id": <number>,
      "resource_title": "<exact title>",
      "opportunity_headline": "<one concrete, specific sentence describing what's available — e.g. 'Free mentorship and co-working space for aspiring entrepreneurs in Salt Lake'>",
      "why_match": "<2-3 sentences explaining why this resource is perfect for someone in their exact situation — reference their industry, location, and stage>",
      "action_items": ["<specific step 1>", "<specific step 2>"],
      "action_type": "url" | "email" | "both",
      "action_url": "<url or null>",
      "action_email": "<email or null>",
      "action_label": "<short CTA — e.g. 'Explore the program' or 'Email the director'>"
    }
  ]
}`;

  try {
    const msg = await client.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 2048,
      messages: [{ role: "user", content: prompt }],
    });

    const raw = msg.content[0].type === "text" ? msg.content[0].text.trim() : "";
    const text = raw.replace(/^```[a-z]*\n?/i, "").replace(/```\s*$/i, "").trim();
    const parsed = JSON.parse(text);
    const matches: NewFounderResourceMatch[] = (parsed.matches ?? []).slice(0, 4);
    return { matches, error: null };
  } catch (e) {
    console.error("matchResourcesForNewFounder error:", e);
    return { matches: null, error: "Matching failed — please try again." };
  }
}

export async function subscribeNewFounder(
  email: string,
  profile: NewFounderProfile,
): Promise<{ error: string | null }> {
  const supabase = await createClient();
  const { error } = await supabase.from("new_founder_subscribers").upsert(
    {
      email: email.trim().toLowerCase(),
      industry: profile.industry,
      journey_stage: profile.journeyStage,
      utah_county: profile.utahCounty,
    },
    { onConflict: "email" },
  );
  if (error) return { error: "Could not subscribe — please try again." };
  return { error: null };
}
