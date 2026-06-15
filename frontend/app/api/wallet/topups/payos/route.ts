import { NextRequest, NextResponse } from "next/server";

import { createPayosClient, getAppUrl, isPayosConfigured } from "@/lib/payos";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

const MIN_TOPUP_AMOUNT = 10000;
const MAX_TOPUP_AMOUNT = 10000000;
const TOPUP_EXPIRATION_MINUTES = 15;

function parseAmount(value: unknown) {
  if (typeof value === "number") return value;
  if (typeof value === "string" && value.trim()) return Number(value);
  return NaN;
}

function isValidAmount(amount: number) {
  return Number.isInteger(amount) && amount >= MIN_TOPUP_AMOUNT && amount <= MAX_TOPUP_AMOUNT;
}

function makeProviderOrderCode() {
  return (Date.now() - 1700000000000) * 1000 + Math.floor(Math.random() * 1000);
}

function makeTopupCode(orderCode: number) {
  return `RAI${orderCode}`;
}

async function createPendingTopup(
  admin: ReturnType<typeof createAdminClient>,
  patientId: string,
  amount: number,
  expiresAt: Date
) {
  const { data: wallet, error: walletError } = await admin
    .from("wallets")
    .select("id,status")
    .eq("patient_id", patientId)
    .maybeSingle();

  if (walletError) throw walletError;

  let walletId = wallet?.id;
  if (!walletId) {
    const { data: insertedWallet, error: insertWalletError } = await admin
      .from("wallets")
      .insert({ patient_id: patientId })
      .select("id")
      .single();
    if (insertWalletError) throw insertWalletError;
    walletId = insertedWallet.id;
  } else if (wallet?.status !== "active") {
    throw new Error("Wallet is not active.");
  }

  for (let attempt = 0; attempt < 5; attempt += 1) {
    const orderCode = makeProviderOrderCode();
    const topupCode = makeTopupCode(orderCode);
    const { data: topup, error } = await admin
      .from("wallet_topups")
      .insert({
        wallet_id: walletId,
        patient_id: patientId,
        amount,
        status: "pending",
        topup_code: topupCode,
        provider: "payos",
        provider_order_code: orderCode,
        provider_status: "PENDING",
        payment_instruction: `Nạp ví RehabAI qua payOS. Mã nạp: ${topupCode}.`,
        expires_at: expiresAt.toISOString()
      })
      .select("*")
      .single();

    if (!error && topup) return topup;
    if (!String(error?.message || "").toLowerCase().includes("duplicate")) throw error;
  }

  throw new Error("Could not create a unique payOS top-up code.");
}

export async function POST(request: NextRequest) {
  const body = (await request.json().catch(() => null)) as { amount?: unknown } | null;
  const amount = parseAmount(body?.amount);

  if (!isValidAmount(amount)) {
    return NextResponse.json(
      { message: "Số tiền nạp phải từ 10.000đ đến 10.000.000đ và là số nguyên VND." },
      { status: 400 }
    );
  }

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
    return NextResponse.json({ message: "Only active Patient accounts can create wallet top-up." }, { status: 403 });
  }

  const { error: expiryError } = await admin.rpc("expire_stale_wallet_topups");
  if (expiryError) {
    return NextResponse.json({ message: expiryError.message }, { status: 500 });
  }

  if (!isPayosConfigured()) {
    return NextResponse.json(
      { code: "PAYOS_NOT_CONFIGURED", message: "payOS is not configured." },
      { status: 503 }
    );
  }

  const expiresAt = new Date(Date.now() + TOPUP_EXPIRATION_MINUTES * 60 * 1000);
  const expiredAtUnix = Math.floor(expiresAt.getTime() / 1000);
  let topup = await createPendingTopup(admin, user.id, amount, expiresAt);

  try {
    const appUrl = getAppUrl();
    const payos = createPayosClient();
    const paymentLink = await payos.paymentRequests.create({
      orderCode: Number(topup.provider_order_code),
      amount,
      description: topup.topup_code,
      returnUrl: `${appUrl}/patient/wallet?topup=success`,
      cancelUrl: `${appUrl}/patient/wallet?topup=cancel`,
      expiredAt: expiredAtUnix,
      items: [{ name: "Nạp ví RehabAI", quantity: 1, price: amount }]
    });

    const { data: updatedTopup, error: updateError } = await admin
      .from("wallet_topups")
      .update({
        provider_payment_link_id: paymentLink.paymentLinkId,
        provider_checkout_url: paymentLink.checkoutUrl,
        provider_qr_code: paymentLink.qrCode,
        provider_status: paymentLink.status,
        provider_raw: paymentLink,
        updated_at: new Date().toISOString()
      })
      .eq("id", topup.id)
      .select("*")
      .single();

    if (updateError) throw updateError;
    topup = updatedTopup;
  } catch (error) {
    await admin
      .from("wallet_topups")
      .update({
        status: "failed",
        provider_status: "CREATE_LINK_FAILED",
        provider_raw: { error: error instanceof Error ? error.message : String(error) },
        failed_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq("id", topup.id);

    return NextResponse.json(
      { message: error instanceof Error ? error.message : "Không thể tạo liên kết thanh toán payOS." },
      { status: 502 }
    );
  }

  return NextResponse.json({
    id: topup.id,
    amount: Number(topup.amount),
    topup_code: topup.topup_code,
    status: topup.status,
    provider_status: topup.provider_status,
    expires_at: topup.expires_at,
    checkoutUrl: topup.provider_checkout_url,
    qrCode: topup.provider_qr_code
  });
}
