import { createClient } from "@/lib/supabase/server";

/** Fetches public rows; requires GRANT + RLS policies for the `anon` role as needed. */
export async function getCompaniesAndResources() {
  const supabase = await createClient();

  const [companies, resources] = await Promise.all([
    supabase.from("companies").select("*").limit(25),
    supabase.from("resources").select("*").limit(25),
  ]);

  return { companies, resources };
}
