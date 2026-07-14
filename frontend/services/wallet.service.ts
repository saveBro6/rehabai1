import { assertNoSupabaseError, getSupabase } from "@/services/common";
import type { Row } from "@/types/supabase";

export type Wallet = Row<"wallets">;
export type WalletTopup = Row<"wallet_topups">;
export type WalletTransaction = Row<"wallet_transactions">;

export type PayosWalletTopup = {
  id: string;
  amount: number;
  topup_code: string;
  status: WalletTopup["status"];
  provider_status: string | null;
  expires_at: string | null;
  checkoutUrl: string | null;
  qrCode: string | null;
};

export class PayosNotConfiguredError extends Error {
  constructor(message = "payOS chưa được cấu hình trên máy chủ. Vui lòng liên hệ quản trị viên.") {
    super(message);
    this.name = "PayosNotConfiguredError";
  }
}

function firstRow<T>(data: T[] | T | null): T | null {
  if (!data) return null;
  return Array.isArray(data) ? data[0] || null : data;
}

export async function getMyWallet() {
  const supabase = getSupabase();
  const { data, error } = await supabase.rpc("get_my_wallet");
  assertNoSupabaseError(error);
  return firstRow(data as Wallet[] | null);
}

export async function getMyWalletTopups() {
  const response = await fetch("/api/wallet/topups", {
    method: "GET",
    headers: { "Content-Type": "application/json" }
  });
  const data = (await response.json().catch(() => null)) as { topups?: WalletTopup[]; message?: string } | null;

  if (!response.ok) {
    throw new Error(data?.message || "Khong the tai lich su nap vi.");
  }

  return data?.topups || [];
}

export async function getMyWalletTransactions() {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("wallet_transactions")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(30);
  assertNoSupabaseError(error);
  return (data || []) as WalletTransaction[];
}

export async function createPayosWalletTopup(amount: number): Promise<PayosWalletTopup> {
  const response = await fetch("/api/wallet/topups/payos", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ amount })
  });
  const data = (await response.json().catch(() => null)) as
    | (PayosWalletTopup & { code?: string; message?: string })
    | null;

  if (!response.ok) {
    if (data?.code === "PAYOS_NOT_CONFIGURED") {
      throw new PayosNotConfiguredError();
    }
    throw new Error(data?.message || "Không thể tạo mã QR nạp ví payOS.");
  }

  if (!data) {
    throw new Error("Không thể tạo mã QR nạp ví payOS.");
  }

  return data;
}

export async function cancelWalletTopup(topupId: string) {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .rpc("cancel_own_pending_wallet_topup", { target_topup_id: topupId })
    .single();
  assertNoSupabaseError(error);

  if (!data) {
    throw new Error("Không thể tải trạng thái giao dịch sau khi hủy.");
  }

  return data as WalletTopup;
}
