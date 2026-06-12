import { NextRequest, NextResponse } from "next/server";

import { createPayosClient, isPayosConfigured } from "@/lib/payos";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import type { Json } from "@/types/supabase";

export const runtime = "nodejs";

type RouteContext = {
  params: {
    id: string;
  };
};

function serializeProviderPayload(value: unknown): Json {
  return JSON.parse(JSON.stringify(value)) as Json;
}

export async function POST(_request: NextRequest, { params }: RouteContext) {
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
    return NextResponse.json({ message: "Only active Patient accounts can cancel wallet top-ups." }, { status: 403 });
  }

  const { error: expiryError } = await admin.rpc("expire_stale_wallet_topups");
  if (expiryError) {
    return NextResponse.json({ message: expiryError.message }, { status: 500 });
  }

  const { data: topup, error: topupError } = await admin
    .from("wallet_topups")
    .select("*")
    .eq("id", params.id)
    .eq("patient_id", user.id)
    .maybeSingle();

  if (topupError) {
    return NextResponse.json({ message: topupError.message }, { status: 500 });
  }

  if (!topup) {
    return NextResponse.json({ message: "Không tìm thấy giao dịch nạp ví." }, { status: 404 });
  }

  if (topup.status !== "pending") {
    return NextResponse.json(
      { message: "Chỉ giao dịch đang chờ thanh toán mới có thể hủy.", topup },
      { status: 409 }
    );
  }

  let providerPayload: Json | null = topup.provider_raw;
  let providerStatus = topup.provider_status;

  if (topup.provider === "payos") {
    if (!isPayosConfigured()) {
      return NextResponse.json(
        { message: "Không thể hủy liên kết payOS khi máy chủ chưa được cấu hình payOS." },
        { status: 503 }
      );
    }

    const providerIdentifier = topup.provider_payment_link_id || topup.provider_order_code;
    if (!providerIdentifier) {
      return NextResponse.json({ message: "Giao dịch chưa có mã liên kết payOS để hủy." }, { status: 409 });
    }

    try {
      const paymentRequests = createPayosClient().paymentRequests;
      const cancellation =
        typeof providerIdentifier === "string"
          ? await paymentRequests.cancel(providerIdentifier, "Cancelled by user")
          : await paymentRequests.cancel(providerIdentifier, "Cancelled by user");
      providerPayload = serializeProviderPayload(cancellation);
      providerStatus = cancellation.status;

      if (cancellation.status === "PAID" || cancellation.status === "PROCESSING") {
        return NextResponse.json(
          { message: "payOS đang xử lý hoặc đã ghi nhận thanh toán. Vui lòng kiểm tra lại trạng thái." },
          { status: 409 }
        );
      }

      if (cancellation.status === "EXPIRED") {
        const now = new Date().toISOString();
        const { data: expiredTopup, error: expireError } = await admin
          .from("wallet_topups")
          .update({
            status: "expired",
            provider_status: cancellation.status,
            provider_raw: providerPayload,
            expired_at: now,
            cancellation_reason: cancellation.cancellationReason || "Payment window expired after 15 minutes",
            updated_at: now
          })
          .eq("id", topup.id)
          .eq("patient_id", user.id)
          .eq("status", "pending")
          .select("*")
          .maybeSingle();

        if (expireError) {
          return NextResponse.json({ message: expireError.message }, { status: 500 });
        }

        return NextResponse.json({ topup: expiredTopup || topup });
      }

      if (cancellation.status !== "CANCELLED") {
        return NextResponse.json(
          { message: `payOS chưa xác nhận hủy giao dịch (trạng thái: ${cancellation.status}).` },
          { status: 409 }
        );
      }
    } catch (error) {
      console.error("Failed to cancel payOS wallet top-up.", {
        topupId: topup.id,
        message: error instanceof Error ? error.message : "Unknown payOS cancellation error"
      });
      return NextResponse.json(
        { message: "Không thể hủy giao dịch trên payOS. Giao dịch vẫn được giữ ở trạng thái chờ để tránh sai lệch." },
        { status: 502 }
      );
    }
  }

  const now = new Date().toISOString();
  const { data: cancelledTopup, error: cancelError } = await admin
    .from("wallet_topups")
    .update({
      status: "cancelled",
      provider_status: providerStatus === "CANCELLED" ? providerStatus : "CANCELLED_BY_USER",
      provider_raw: providerPayload,
      cancelled_at: now,
      cancellation_reason: "Cancelled by user",
      updated_at: now
    })
    .eq("id", topup.id)
    .eq("patient_id", user.id)
    .eq("status", "pending")
    .select("*")
    .maybeSingle();

  if (cancelError) {
    return NextResponse.json({ message: cancelError.message }, { status: 500 });
  }

  if (!cancelledTopup) {
    return NextResponse.json(
      { message: "Trạng thái giao dịch đã thay đổi. Vui lòng kiểm tra lại." },
      { status: 409 }
    );
  }

  return NextResponse.json({ topup: cancelledTopup });
}
