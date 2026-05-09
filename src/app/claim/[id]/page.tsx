import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import ClaimClient from "./ClaimClient";

export default async function ClaimPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect(`/login?next=/claim/${id}`);

  const { data: company, error } = await supabase
    .from("companies")
    .select("id, name, website, description, section, owner_id")
    .eq("id", id)
    .single();

  if (error || !company) redirect("/");

  if (company.owner_id) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center p-4">
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-8 max-w-md w-full text-center">
          <div className="w-12 h-12 bg-amber-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-6 h-6 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01M12 3a9 9 0 100 18A9 9 0 0012 3z" />
            </svg>
          </div>
          <h2 className="text-lg font-semibold text-white mb-2">Already claimed</h2>
          <p className="text-sm text-zinc-400 mb-6">This company has already been claimed by another user.</p>
          <a href="/" className="text-sm text-blue-400 hover:text-blue-300 transition-colors">← Back to map</a>
        </div>
      </div>
    );
  }

  return <ClaimClient company={company} />;
}
