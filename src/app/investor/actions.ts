"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export type InvestorProfileInput = {
  display_name: string;
  firm_name: string;
  bio: string;
  investment_thesis: string;
  preferred_stages: string[];
  preferred_sectors: string[];
  check_size_min: string;
  check_size_max: string;
  leads_rounds: boolean;
  email_subscribed: boolean;
};

export type InvestorProfile = InvestorProfileInput & {
  id: number;
  user_id: string;
  created_at: string;
  updated_at: string;
};

export async function upsertInvestorProfile(
  input: InvestorProfileInput,
): Promise<{ error: string | null }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "You must be logged in." };

  const { error } = await supabase
    .from("investor_profiles")
    .upsert(
      {
        user_id: user.id,
        display_name: input.display_name || null,
        firm_name: input.firm_name || null,
        bio: input.bio || null,
        investment_thesis: input.investment_thesis || null,
        preferred_stages: input.preferred_stages.length ? input.preferred_stages : null,
        preferred_sectors: input.preferred_sectors.length ? input.preferred_sectors : null,
        check_size_min: input.check_size_min || null,
        check_size_max: input.check_size_max || null,
        leads_rounds: input.leads_rounds,
        email_subscribed: input.email_subscribed,
        email_subscribed_at: input.email_subscribed ? new Date().toISOString() : null,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id" },
    );

  if (error) return { error: error.message };

  revalidatePath("/");
  return { error: null };
}
