import { assertNoSupabaseError, getSupabase } from "@/services/common";
import type { Account, Patient, Product } from "@/types";
import type { Row } from "@/types/supabase";

export type OrderItemWithProduct = {
  id: string;
  order_id: string;
  product_id: string;
  quantity: number;
  unit_price: number;
  created_at?: string;
  product?: Pick<Product, "id" | "name" | "category" | "image_url" | "price"> | null;
};

export type OrderWithItems = {
  id: string;
  user_id: string;
  total_amount: number;
  status: "pending" | "paid" | "cancelled";
  shipping_address: string | null;
  created_at?: string;
  items?: OrderItemWithProduct[];
};

export type AdminOrder = OrderWithItems & {
  patient?: Pick<Patient, "id" | "full_name" | "phone"> | null;
  account?: Pick<Account, "id" | "email" | "account_status"> | null;
};

export type AdminOrderStatus = "pending" | "cancelled";
export type CheckoutResult = {
  order_id: string;
  total_amount: number;
  item_count: number;
};

type OrderRow = Row<"orders">;
type OrderItemRow = Row<"order_items">;
type ProductSummary = Pick<Product, "id" | "name" | "category" | "image_url" | "price">;
type PatientSummary = Pick<Patient, "id" | "full_name" | "phone">;
type AccountSummary = Pick<Account, "id" | "email" | "account_status">;

function uniqueValues(values: string[]) {
  return Array.from(new Set(values.filter(Boolean)));
}

async function getItemsByOrderIds(orderIds: string[]) {
  if (orderIds.length === 0) {
    return new Map<string, OrderItemWithProduct[]>();
  }

  const supabase = getSupabase();
  const { data: itemsData, error: itemsError } = await supabase
    .from("order_items")
    .select("*")
    .in("order_id", orderIds)
    .order("created_at", { ascending: true });
  assertNoSupabaseError(itemsError);

  const itemRows = (itemsData || []) as OrderItemRow[];
  const productIds = uniqueValues(itemRows.map((item) => item.product_id));
  const productsById = new Map<string, ProductSummary>();

  if (productIds.length > 0) {
    const { data: productsData, error: productsError } = await supabase
      .from("products")
      .select("id,name,category,image_url,price")
      .in("id", productIds);
    assertNoSupabaseError(productsError);

    ((productsData || []) as ProductSummary[]).forEach((product) => {
      productsById.set(product.id, product);
    });
  }

  return itemRows.reduce((itemsByOrderId, item) => {
    const items = itemsByOrderId.get(item.order_id) || [];
    items.push({
      ...item,
      product: productsById.get(item.product_id) || null
    });
    itemsByOrderId.set(item.order_id, items);
    return itemsByOrderId;
  }, new Map<string, OrderItemWithProduct[]>());
}

async function attachItemsToOrders(orders: OrderRow[]): Promise<OrderWithItems[]> {
  const itemsByOrderId = await getItemsByOrderIds(orders.map((order) => order.id));

  return orders.map((order) => ({
    ...order,
    items: itemsByOrderId.get(order.id) || []
  }));
}

async function attachCustomerInfoToOrders(orders: OrderWithItems[]): Promise<AdminOrder[]> {
  const userIds = uniqueValues(orders.map((order) => order.user_id));
  if (userIds.length === 0) {
    return orders;
  }

  const supabase = getSupabase();
  const [patientsResult, accountsResult] = await Promise.all([
    supabase.from("patients").select("id,full_name,phone").in("id", userIds),
    supabase.from("accounts").select("id,email,account_status").in("id", userIds)
  ]);

  assertNoSupabaseError(patientsResult.error);
  assertNoSupabaseError(accountsResult.error);

  const patientsById = new Map<string, PatientSummary>();
  const accountsById = new Map<string, AccountSummary>();

  ((patientsResult.data || []) as PatientSummary[]).forEach((patient) => {
    patientsById.set(patient.id, patient);
  });
  ((accountsResult.data || []) as AccountSummary[]).forEach((account) => {
    accountsById.set(account.id, account);
  });

  return orders.map((order) => ({
    ...order,
    patient: patientsById.get(order.user_id) || null,
    account: accountsById.get(order.user_id) || null
  }));
}

export async function createOrderFromCart(userId: string, shippingAddress: string): Promise<CheckoutResult> {
  const supabase = getSupabase();
  const { data: authData, error: authError } = await supabase.auth.getUser();
  assertNoSupabaseError(authError);

  if (!authData.user || authData.user.id !== userId) {
    throw new Error("Authentication is required to checkout.");
  }

  const { data, error } = await supabase
    .rpc("checkout_patient_cart", { p_shipping_address: shippingAddress })
    .single();
  assertNoSupabaseError(error);

  return data as CheckoutResult;
}

export async function getOrders(userId: string) {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("orders")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });
  assertNoSupabaseError(error);
  return attachItemsToOrders((data || []) as OrderRow[]);
}

export async function getOrderById(orderId: string, userId: string) {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("orders")
    .select("*")
    .eq("id", orderId)
    .eq("user_id", userId)
    .maybeSingle();
  assertNoSupabaseError(error);

  if (!data) {
    return null;
  }

  const [order] = await attachItemsToOrders([data as OrderRow]);
  return order;
}

export async function getAdminOrders() {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("orders")
    .select("*")
    .order("created_at", { ascending: false });
  assertNoSupabaseError(error);

  const orders = await attachItemsToOrders((data || []) as OrderRow[]);
  return attachCustomerInfoToOrders(orders);
}

export async function getAdminOrderById(orderId: string) {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("orders")
    .select("*")
    .eq("id", orderId)
    .maybeSingle();
  assertNoSupabaseError(error);

  if (!data) {
    return null;
  }

  const [order] = await attachItemsToOrders([data as OrderRow]);
  const [adminOrder] = await attachCustomerInfoToOrders([order]);
  return adminOrder;
}

export async function updateAdminOrderStatus(orderId: string, status: AdminOrderStatus) {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .rpc("admin_update_order_status", { target_order_id: orderId, next_status: status })
    .single();
  assertNoSupabaseError(error);
  return data;
}
