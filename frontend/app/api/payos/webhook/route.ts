import { NextRequest, NextResponse } from "next/server";

import { createPayosClient } from "@/lib/payos";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const payload = await request.json().catch(() => null);
  if (!payload) {
    return NextResponse.json({ message: "Invalid JSON payload." }, { status: 400 });
  }

  const payos = createPayosClient();
  let webhookData;

  try {
    webhookData = await payos.webhooks.verify(payload);
  } catch {
    return NextResponse.json({ message: "Invalid payOS webhook signature." }, { status: 400 });
  }

  const admin = createAdminClient();
  const orderCode = Number(webhookData.orderCode);
  const amount = Number(webhookData.amount);
  const isPaid = payload.success === true && webhookData.code === "00";

  const { error: expiryError } = await admin.rpc("expire_stale_wallet_topups");
  if (expiryError) {
    return NextResponse.json({ message: expiryError.message }, { status: 500 });
  }

  if (isPaid) {
    const { error } = await admin.rpc("complete_provider_wallet_topup", {
      p_provider: "payos",
      p_provider_order_code: orderCode,
      p_amount: amount,
      p_provider_payment_link_id: webhookData.paymentLinkId,
      p_provider_raw: payload
    });

    if (error) {
      return NextResponse.json({ message: error.message }, { status: 400 });
    }

    return NextResponse.json({ ok: true });
  }

  const providerStatus = webhookData.code || "FAILED";
  const nextStatus: "cancelled" | "expired" | "failed" =
    providerStatus === "CANCELLED" ? "cancelled" : providerStatus === "EXPIRED" ? "expired" : "failed";
  const now = new Date().toISOString();
  const statusUpdate =
    nextStatus === "cancelled"
      ? {
          status: nextStatus,
          provider_status: providerStatus,
          provider_payment_link_id: webhookData.paymentLinkId,
          provider_raw: payload,
          cancelled_at: now,
          cancellation_reason: "Cancelled by payOS",
          updated_at: now
        }
      : nextStatus === "expired"
        ? {
            status: nextStatus,
            provider_status: providerStatus,
            provider_payment_link_id: webhookData.paymentLinkId,
            provider_raw: payload,
            expired_at: now,
            cancellation_reason: "Payment window expired after 15 minutes",
            updated_at: now
          }
      : {
          status: nextStatus,
          provider_status: providerStatus,
          provider_payment_link_id: webhookData.paymentLinkId,
          provider_raw: payload,
          failed_at: now,
          updated_at: now
        };

  const { error } = await admin
    .from("wallet_topups")
    .update(statusUpdate)
    .eq("provider", "payos")
    .eq("provider_order_code", orderCode)
    .eq("amount", amount)
    .eq("status", "pending");

  if (error) {
    return NextResponse.json({ message: error.message }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}
