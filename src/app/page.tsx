import { createClient } from "@/lib/supabase/server";
import MapClient, { type Company } from "@/components/MapClient";

export default async function Home() {
  const supabase = await createClient();

  const { data } = await supabase
    .from("companies")
    .select(
      "id, name, description, website, linkedin_url, stage, employees, section, lat, lng, utah_county, product_type",
    )
    .eq("status", "approved")
    .not("lat", "is", null)
    .not("lng", "is", null)
    .order("name");

  return <MapClient companies={(data ?? []) as Company[]} />;
}
