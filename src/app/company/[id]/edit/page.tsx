import { createClient } from "@/lib/supabase/server";
import { redirect, notFound } from "next/navigation";
import EditClient from "./EditClient";

export default async function EditCompanyPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const companyId = Number(id);
  if (isNaN(companyId)) notFound();

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: company, error } = await supabase
    .from("companies")
    .select("*, newsletter_subscribed")
    .eq("id", companyId)
    .single();

  if (error || !company) notFound();

  // Must be a verified member to edit
  const { data: membership } = await supabase
    .from("company_members")
    .select("id, verified")
    .eq("company_id", companyId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!membership) redirect("/");
  if (!membership.verified) redirect("/"); // unverified = read-only

  return <EditClient company={company} />;
}
