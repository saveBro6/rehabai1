import { NextResponse } from "next/server";

import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

export async function GET() {
  const supabase = createClient();
  const {
    data: { user },
    error: authError
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const admin = createAdminClient();
  const { data: account, error: accountError } = await admin
    .from("accounts")
    .select("id,account_type,account_status")
    .eq("id", user.id)
    .maybeSingle();

  if (accountError) {
    return NextResponse.json({ message: accountError.message }, { status: 500 });
  }

  if (account?.account_type !== "patient" || account.account_status !== "active") {
    return NextResponse.json({ message: "Only active Patient accounts can read wallet top-ups." }, { status: 403 });
  }

  const { error: expiryError } = await admin.rpc("expire_stale_wallet_topups");
  if (expiryError) {
    return NextResponse.json({ message: expiryError.message }, { status: 500 });
  }

  const { data, error } = await admin
    .from("wallet_topups")
    .select("*")
    .eq("patient_id", user.id)
    .order("created_at", { ascending: false })
    .limit(20);

  if (error) {
    return NextResponse.json({ message: error.message }, { status: 500 });
  }

  return NextResponse.json({ topups: data || [] });
}
