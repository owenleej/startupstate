import { createClient } from "@/lib/supabase/server";
import MapClient, { type Company } from "@/components/MapClient";
import type { InvestorProfile } from "@/app/investor/actions";

const COMPANY_FIELDS =
  "id, name, description, website, linkedin_url, stage, employees, section, lat, lng, utah_county, product_type, owner_id, status, seeking_funding, investor_contact_email, hiring, careers_url";

export default async function Home() {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();

  // Fetch approved map companies + all companies owned by this user (any status) + investor profile in parallel
  const [{ data: approvedData }, { data: ownedData }, { data: investorData }, { data: followsData }] = await Promise.all([
    supabase
      .from("companies")
      .select(COMPANY_FIELDS)
      .eq("status", "approved")
      .not("lat", "is", null)
      .not("lng", "is", null)
      .order("name"),
    user
      ? supabase
          .from("companies")
          .select(`${COMPANY_FIELDS}, company_members!inner(user_id, verified)`)
          .eq("company_members.user_id", user.id)
          .order("created_at", { ascending: false })
      : Promise.resolve({ data: [] }),
    user
      ? supabase
          .from("investor_profiles")
          .select("*")
          .eq("user_id", user.id)
          .maybeSingle()
      : Promise.resolve({ data: null }),
    user
      ? supabase
          .from("investor_follows")
          .select("company_id")
          .eq("investor_user_id", user.id)
      : Promise.resolve({ data: [] }),
  ]);

  const isAdmin = user?.app_metadata?.role === "admin";
  const isLoggedIn = !!user;

  type RawOwned = Record<string, unknown> & { company_members: { verified: boolean }[] };

  const ownedCompanies = ((ownedData ?? []) as RawOwned[]).map((c) => {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { company_members, ...rest } = c;
    return { ...rest, member_verified: company_members?.[0]?.verified ?? false };
  }) as unknown as import("@/components/MapClient").Company[];

  return (
    <MapClient
      companies={(approvedData ?? []) as import("@/components/MapClient").Company[]}
      isAdmin={isAdmin}
      isLoggedIn={isLoggedIn}
      ownedCompanies={ownedCompanies}
      investorProfile={(investorData as InvestorProfile | null) ?? null}
      followedCompanyIds={new Set((followsData ?? []).map((f: { company_id: number }) => f.company_id))}
    />
  );
}
