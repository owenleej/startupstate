"use server";

import { createClient } from "@/lib/supabase/server";

export async function followCompany(
  companyId: number,
): Promise<{ error: string | null }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated." };

  const { error } = await supabase
    .from("investor_follows")
    .insert({ investor_user_id: user.id, company_id: companyId });

  if (error) return { error: error.message };
  return { error: null };
}

export async function unfollowCompany(
  companyId: number,
): Promise<{ error: string | null }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated." };

  const { error } = await supabase
    .from("investor_follows")
    .delete()
    .eq("investor_user_id", user.id)
    .eq("company_id", companyId);

  if (error) return { error: error.message };
  return { error: null };
}
