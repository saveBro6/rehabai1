import { assertNoSupabaseError, getSupabase } from "@/services/common";
import type { OrderWithItems } from "@/services/orders.service";

export const ADMIN_ORDER_STATUSES = ["pending", "processing", "shipped", "delivered", "cancelled"] as const;

export type AdminOrderStatus = (typeof ADMIN_ORDER_STATUSES)[number];

export type AdminOrderBuyer = {
  id: string;
  email: string;
};

export type AdminOrder = OrderWithItems & {
  status: AdminOrderStatus;
  buyer?: AdminOrderBuyer | null;
};

type AccountRow = {
  id: string;
  email: string;
};

const ADMIN_ORDER_SELECT = "*, items:order_items(*, product:products(id, name, image_url))";

export function isAdminOrderStatus(status: string): status is AdminOrderStatus {
  return ADMIN_ORDER_STATUSES.includes(status as AdminOrderStatus);
}

export async function getAdminOrders() {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("orders")
    .select(ADMIN_ORDER_SELECT)
    .order("created_at", { ascending: false });
  assertNoSupabaseError(error);

  return hydrateOrderBuyers((data || []) as AdminOrder[]);
}

export async function getAdminOrderById(orderId: string) {
  const supabase = getSupabase();
  const { data, error } = await supabase.from("orders").select(ADMIN_ORDER_SELECT).eq("id", orderId).maybeSingle();
  assertNoSupabaseError(error);
  if (!data) return null;

  const [order] = await hydrateOrderBuyers([data as AdminOrder]);
  return order || null;
}

export async function updateAdminOrderStatus(orderId: string, status: AdminOrderStatus) {
  if (!isAdminOrderStatus(status)) {
    throw new Error("Invalid order status.");
  }

  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("orders")
    .update({ status })
    .eq("id", orderId)
    .select(ADMIN_ORDER_SELECT)
    .single();
  assertNoSupabaseError(error);
  if (!data) {
    throw new Error("Could not update order status.");
  }

  const [order] = await hydrateOrderBuyers([data as AdminOrder]);
  return order;
}

async function hydrateOrderBuyers(orders: AdminOrder[]) {
  if (!orders.length) return orders;

  const supabase = getSupabase();
  const accountIds = Array.from(new Set(orders.map((order) => order.user_id).filter(Boolean)));
  const { data: accounts, error: accountsError } = accountIds.length
    ? await supabase.from("accounts").select("id, email").in("id", accountIds)
    : { data: [], error: null };
  assertNoSupabaseError(accountsError);

  const accountMap = new Map((accounts || []).map((account) => [(account as AccountRow).id, account as AccountRow]));

  return orders.map((order) => ({
    ...order,
    buyer: accountMap.get(order.user_id) || null
  }));
}
