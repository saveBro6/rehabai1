import { NextResponse, type NextRequest } from "next/server";

import { getDashboardHref } from "@/config/navigation";
import { createClient } from "@/lib/supabase/server";

function redirectTo(request: NextRequest, path: string) {
  return NextResponse.redirect(new URL(path, request.nextUrl.origin));
}

function getSafeText(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function getSafeGoogleAvatarUrl(value: unknown) {
  const candidate = getSafeText(value);
  return candidate.startsWith("https://") ? candidate : null;
}

function getDisplayName(email: string, metadata: Record<string, unknown>) {
  return (
    getSafeText(metadata.full_name) ||
    getSafeText(metadata.name) ||
    getSafeText(metadata.given_name) ||
    email.split("@")[0] ||
    "Nguoi dung"
  );
}

export async function GET(request: NextRequest) {
  const supabase = createClient();
  const code = request.nextUrl.searchParams.get("code");

  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) return redirectTo(request, "/login?oauth_error=callback");
  }

  const {
    data: { user },
    error: userError
  } = await supabase.auth.getUser();

  if (userError || !user) return redirectTo(request, "/login?oauth_error=session");

  const { data: existingAccount, error: accountLookupError } = await supabase
    .from("accounts")
    .select("id, account_type, account_status, must_change_password")
    .eq("id", user.id)
    .maybeSingle();

  if (accountLookupError) return redirectTo(request, "/login?oauth_error=profile");

  let account = existingAccount;

  if (!account) {
    const metadata = user.user_metadata || {};
    const email = user.email || "";
    const fullName = getDisplayName(email, metadata);
    const avatarUrl = getSafeGoogleAvatarUrl(metadata.avatar_url) || getSafeGoogleAvatarUrl(metadata.picture);

    const { data: createdAccount, error: createAccountError } = await supabase
      .from("accounts")
      .insert({
        id: user.id,
        email,
        account_type: "patient",
        account_status: "active"
      })
      .select("id, account_type, account_status, must_change_password")
      .single();

    if (createAccountError) return redirectTo(request, "/login?oauth_error=profile");

    const { error: createPatientError } = await supabase.from("patients").insert({
      id: user.id,
      full_name: fullName,
      phone: null,
      avatar_url: avatarUrl
    });

    if (createPatientError) return redirectTo(request, "/login?oauth_error=profile");
    account = createdAccount;
  } else if (account.account_type === "patient") {
    const metadata = user.user_metadata || {};
    const email = user.email || "";
    const avatarUrl = getSafeGoogleAvatarUrl(metadata.avatar_url) || getSafeGoogleAvatarUrl(metadata.picture);
    const { data: patient } = await supabase.from("patients").select("id, avatar_url").eq("id", user.id).maybeSingle();
    if (!patient) {
      await supabase.from("patients").insert({
        id: user.id,
        full_name: getDisplayName(email, metadata),
        phone: null,
        avatar_url: avatarUrl
      });
    } else if (!patient.avatar_url && avatarUrl) {
      await supabase.from("patients").update({ avatar_url: avatarUrl }).eq("id", user.id);
    }
  }

  if (account.account_status && account.account_status !== "active") {
    await supabase.auth.signOut();
    return redirectTo(request, "/login?oauth_error=inactive");
  }

  return redirectTo(request, getDashboardHref(account.account_type, account.must_change_password));
}
