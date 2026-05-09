"use server";

import { createHash, randomInt } from "crypto";
import { createClient } from "@/lib/supabase/server";
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);
const FROM = process.env.RESEND_FROM ?? "noreply@startupstate.co";
const OTP_TTL_MINUTES = 15;

function hashOtp(otp: string): string {
  return createHash("sha256").update(otp).digest("hex");
}

function domainFromUrl(url: string | null): string | null {
  if (!url) return null;
  try {
    return new URL(url.startsWith("http") ? url : `https://${url}`).hostname.replace(/^www\./, "");
  } catch {
    return null;
  }
}

function domainFromEmail(email: string): string {
  return email.split("@")[1]?.toLowerCase() ?? "";
}

// ── Submit a claim ────────────────────────────────────────────────────────────

export type ClaimState =
  | null
  | { step: "otp"; claimId: number; email: string }
  | { step: "manual"; message: string }
  | { step: "done"; message: string }
  | { error: string };

export async function submitClaim(
  _prev: ClaimState,
  formData: FormData,
): Promise<ClaimState> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "You must be logged in to claim a company." };

  const companyId = Number(formData.get("company_id"));
  const email = (formData.get("email") as string).trim().toLowerCase();

  if (!email || !email.includes("@")) return { error: "Please enter a valid email address." };

  // Fetch company to check domain
  const { data: company, error: cErr } = await supabase
    .from("companies")
    .select("id, name, website")
    .eq("id", companyId)
    .single();

  if (cErr || !company) return { error: "Company not found." };

  // Check if user is already a member
  const { data: existingMember } = await supabase
    .from("company_members")
    .select("id")
    .eq("company_id", companyId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (existingMember) return { error: "You are already a member of this company." };

  // Check for existing pending/verified claim from this user
  const { data: existing } = await supabase
    .from("company_claims")
    .select("id, status")
    .eq("company_id", companyId)
    .eq("user_id", user.id)
    .in("status", ["pending", "verified"])
    .maybeSingle();

  if (existing) return { error: "You already have a pending claim for this company." };

  const companyDomain = domainFromUrl(company.website);
  const emailDomain = domainFromEmail(email);
  const domainMatches = companyDomain && emailDomain && emailDomain === companyDomain;

  if (domainMatches) {
    // Email OTP path
    const otp = String(randomInt(100000, 999999));
    const otpHash = hashOtp(otp);
    const expiresAt = new Date(Date.now() + OTP_TTL_MINUTES * 60 * 1000).toISOString();

    const { data: claim, error: insertErr } = await supabase
      .from("company_claims")
      .insert({
        company_id: companyId,
        user_id: user.id,
        email,
        status: "pending",
        method: "email_otp",
        otp_hash: otpHash,
        expires_at: expiresAt,
      })
      .select("id")
      .single();

    if (insertErr) return { error: insertErr.message };

    // Grant unverified membership immediately so they can see the company
    await supabase
      .from("company_members")
      .upsert(
        { company_id: companyId, user_id: user.id, role: "member", verified: false },
        { onConflict: "company_id,user_id" },
      );

    await resend.emails.send({
      from: FROM,
      to: email,
      subject: `Your Startupstate verification code for ${company.name}`,
      html: `
        <div style="font-family:system-ui,sans-serif;max-width:480px;margin:0 auto">
          <h2 style="color:#1e293b">Verify your claim</h2>
          <p>You requested to claim <strong>${company.name}</strong> on Startupstate.</p>
          <p>Your verification code is:</p>
          <div style="font-size:36px;font-weight:bold;letter-spacing:8px;color:#2563eb;padding:24px 0">${otp}</div>
          <p style="color:#64748b">This code expires in ${OTP_TTL_MINUTES} minutes. If you didn't request this, you can ignore this email.</p>
        </div>
      `,
    });

    return { step: "otp", claimId: claim.id, email };
  } else {
    // Manual review path
    const { error: insertErr } = await supabase
      .from("company_claims")
      .insert({
        company_id: companyId,
        user_id: user.id,
        email,
        status: "pending",
        method: "manual",
      });

    if (insertErr) return { error: insertErr.message };

    // Grant unverified membership immediately so they can see the company
    await supabase
      .from("company_members")
      .upsert(
        { company_id: companyId, user_id: user.id, role: "member", verified: false },
        { onConflict: "company_id,user_id" },
      );

    return {
      step: "manual",
      message: `Your claim request has been submitted for manual review. We'll reach out to ${email} within 1–2 business days.`,
    };
  }
}

// ── Verify OTP ────────────────────────────────────────────────────────────────

export async function verifyOtp(
  _prev: ClaimState,
  formData: FormData,
): Promise<ClaimState> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated." };

  const claimId = Number(formData.get("claim_id"));
  const otp = (formData.get("otp") as string).trim().replace(/\s/g, "");

  const { data: claim, error: cErr } = await supabase
    .from("company_claims")
    .select("id, company_id, otp_hash, expires_at, status")
    .eq("id", claimId)
    .eq("user_id", user.id)
    .single();

  if (cErr || !claim) return { error: "Claim not found." };
  if (claim.status !== "pending") return { error: "This claim has already been processed." };
  if (new Date(claim.expires_at) < new Date()) return { error: "This code has expired. Please start over." };
  if (hashOtp(otp) !== claim.otp_hash) return { error: "Incorrect code. Please try again." };

  // Mark claim verified
  const { error: updateErr } = await supabase
    .from("company_claims")
    .update({ status: "verified" })
    .eq("id", claimId);

  if (updateErr) return { error: updateErr.message };

  // Mark the pending membership as verified
  const { error: memberErr } = await supabase
    .from("company_members")
    .update({ verified: true })
    .eq("company_id", claim.company_id)
    .eq("user_id", user.id);

  if (memberErr) return { error: memberErr.message };

  // Keep owner_id pointing to the first owner for display purposes
  const { data: firstMember } = await supabase
    .from("company_members")
    .select("user_id")
    .eq("company_id", claim.company_id)
    .order("created_at", { ascending: true })
    .limit(1)
    .single();

  if (firstMember) {
    await supabase
      .from("companies")
      .update({ owner_id: firstMember.user_id })
      .eq("id", claim.company_id)
      .is("owner_id", null); // only set if not already set
  }

  return { step: "done", message: "You've been added as a member of this company!" };
}
