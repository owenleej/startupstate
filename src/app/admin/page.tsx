import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import AdminClient from "./AdminClient";

export default async function AdminPage() {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const isAdmin = user.app_metadata?.role === "admin";
  if (!isAdmin) redirect("/");

  const [
    { data: companies, error: cErr },
    { data: resources, error: rErr },
    { data: claims, error: clErr },
  ] = await Promise.all([
    supabase.from("companies").select("*").order("name"),
    supabase.from("resources").select("*").order("title"),
    supabase
      .from("company_claims")
      .select("*, companies(name, website)")
      .order("created_at", { ascending: false }),
  ]);

  if (cErr) throw new Error(cErr.message);
  if (rErr) throw new Error(rErr.message);
  if (clErr) throw new Error(clErr.message);

  return <AdminClient companies={companies ?? []} resources={resources ?? []} claims={claims ?? []} />;
}
