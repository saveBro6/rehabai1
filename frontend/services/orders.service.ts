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

export type ShippingStatus =
  | "not_started"
  | "preparing"
  | "shipped"
  | "delivered"
  | "failed"
  | "returned"
  | "cancelled";

export type Shipment = {
  id: string;
  order_id: string;
  carrier_name: string | null;
  tracking_number: string | null;
  shipping_status: ShippingStatus;
  shipping_fee: number;
  estimated_delivery_date: string | null;
  shipped_at: string | null;
  delivered_at: string | null;
  created_at?: string;
  updated_at?: string;
  is_deleted: boolean;
};

export type OrderWithItems = {
  id: string;
  user_id: string;
  total_amount: number;
  status: "pending" | "confirmed" | "paid" | "cancelled";
  shipping_address: string | null;
  cancelled_by: string | null;
  cancellation_reason: string | null;
  cancelled_at: string | null;
  cancellation_note: string | null;
  created_at?: string;
  items?: OrderItemWithProduct[];
  shipment?: Shipment | null;
};

export type AdminOrder = OrderWithItems & {
  patient?: Pick<Patient, "id" | "full_name" | "phone"> | null;
  account?: Pick<Account, "id" | "email" | "account_status"> | null;
};

export type AdminOrderStatus = "confirmed";
export type CheckoutResult = {
  order_id: string;
  total_amount: number;
  item_count: number;
};

type OrderRow = Row<"orders">;
type OrderItemRow = Row<"order_items">;
type ShipmentRow = Row<"shipments">;
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

async function getShipmentsByOrderIds(orderIds: string[]) {
  if (orderIds.length === 0) {
    return new Map<string, Shipment>();
  }

  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("shipments")
    .select("*")
    .in("order_id", orderIds)
    .eq("is_deleted", false);
  assertNoSupabaseError(error);

  return ((data || []) as ShipmentRow[]).reduce((shipmentsByOrderId, shipment) => {
    shipmentsByOrderId.set(shipment.order_id, shipment as Shipment);
    return shipmentsByOrderId;
  }, new Map<string, Shipment>());
}

async function attachShipmentsToOrders(orders: OrderWithItems[]): Promise<OrderWithItems[]> {
  const shipmentsByOrderId = await getShipmentsByOrderIds(orders.map((order) => order.id));

  return orders.map((order) => ({
    ...order,
    shipment: shipmentsByOrderId.get(order.id) || null
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
  const orders = await attachItemsToOrders((data || []) as OrderRow[]);
  return attachShipmentsToOrders(orders);
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

  const [orderWithItems] = await attachItemsToOrders([data as OrderRow]);
  const [order] = await attachShipmentsToOrders([orderWithItems]);
  return order;
}

export async function getAdminOrders() {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("orders")
    .select("*")
    .order("created_at", { ascending: false });
  assertNoSupabaseError(error);

  const orders = await attachShipmentsToOrders(await attachItemsToOrders((data || []) as OrderRow[]));
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

  const [orderWithItems] = await attachItemsToOrders([data as OrderRow]);
  const [order] = await attachShipmentsToOrders([orderWithItems]);
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

export async function confirmAdminOrder(orderId: string) {
  const row = await updateAdminOrderStatus(orderId, "confirmed");
  return row as unknown as AdminOrder;
}

export async function cancelPatientOrder(orderId: string, reason: string) {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .rpc("cancel_patient_order", { target_order_id: orderId, reason })
    .single();
  assertNoSupabaseError(error);
  return data as unknown as OrderWithItems;
}

export async function cancelAdminOrder(orderId: string, reason: string) {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .rpc("admin_cancel_order", { target_order_id: orderId, reason })
    .single();
  assertNoSupabaseError(error);
  return data as unknown as AdminOrder;
}

export type AdminShipmentInput = {
  carrier_name?: string | null;
  tracking_number?: string | null;
  shipping_status: ShippingStatus;
  shipping_fee?: number | null;
  estimated_delivery_date?: string | null;
  shipped_at?: string | null;
  delivered_at?: string | null;
};

export async function upsertAdminShipment(orderId: string, shipment: AdminShipmentInput) {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("shipments")
    .upsert(
      {
        order_id: orderId,
        carrier_name: shipment.carrier_name || null,
        tracking_number: shipment.tracking_number || null,
        shipping_status: shipment.shipping_status,
        shipping_fee: shipment.shipping_fee ?? 0,
        estimated_delivery_date: shipment.estimated_delivery_date || null,
        shipped_at: shipment.shipped_at || null,
        delivered_at: shipment.delivered_at || null,
        updated_at: new Date().toISOString(),
        is_deleted: false
      },
      { onConflict: "order_id" }
    )
    .select("*")
    .single();
  assertNoSupabaseError(error);
  return data as Shipment;
}
