import { getCartItems } from "@/services/cart.service";
import { assertNoSupabaseError, getSupabase } from "@/services/common";
import type { Product } from "@/types";

export type OrderItemWithProduct = {
  id: string;
  order_id: string;
  product_id: string;
  quantity: number;
  unit_price: number;
  created_at?: string;
  product?: Pick<Product, "id" | "name" | "image_url"> | null;
};

export type OrderWithItems = {
  id: string;
  user_id: string;
  total_amount: number;
  status: string;
  shipping_address?: string | null;
  created_at?: string;
  items?: OrderItemWithProduct[];
};

const ORDER_WITH_ITEMS_SELECT = "*, items:order_items(*, product:products(id, name, image_url))";

export async function createOrderFromCart(userId: string, shippingAddress: string) {
  const supabase = getSupabase();
  const cartItems = await getCartItems(userId);

  if (!cartItems.length) {
    throw new Error("Cart is empty.");
  }

  const productIds = cartItems.map((item) => item.product_id);
  const { data: products, error: productsError } = await supabase.from("products").select("*").in("id", productIds);
  assertNoSupabaseError(productsError);

  const productMap = new Map((products || []).map((product) => [product.id, product as Product]));
  const invalidItem = cartItems.find((item) => !productMap.has(item.product_id));
  if (invalidItem) {
    throw new Error("Cart contains an unavailable product.");
  }

  const inactiveItem = cartItems.find((item) => productMap.get(item.product_id)?.is_active === false);
  if (inactiveItem) {
    throw new Error("Cart contains an inactive product.");
  }

  const totalAmount = cartItems.reduce((sum, item) => {
    const product = productMap.get(item.product_id);
    return sum + Number(product?.price || 0) * item.quantity;
  }, 0);

  const { data: order, error: orderError } = await supabase
    .from("orders")
    .insert({ user_id: userId, shipping_address: shippingAddress, total_amount: totalAmount, status: "pending" })
    .select("*")
    .single();
  assertNoSupabaseError(orderError);
  if (!order) throw new Error("Could not create order.");

  const orderItems = cartItems.map((item) => ({
    order_id: order.id,
    product_id: item.product_id,
    quantity: item.quantity,
    unit_price: Number(productMap.get(item.product_id)?.price || 0)
  }));

  const { data: createdItems, error: itemsError } = await supabase.from("order_items").insert(orderItems).select("*");
  assertNoSupabaseError(itemsError);

  const { error: clearError } = await supabase.from("cart_items").delete().eq("user_id", userId);
  assertNoSupabaseError(clearError);

  return { ...order, items: createdItems || [] };
}

export async function getOrders(userId: string) {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("orders")
    .select(ORDER_WITH_ITEMS_SELECT)
    .eq("user_id", userId)
    .order("created_at", { ascending: false });
  assertNoSupabaseError(error);
  return (data || []) as OrderWithItems[];
}

export async function getOrderById(orderId: string, userId: string) {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("orders")
    .select(ORDER_WITH_ITEMS_SELECT)
    .eq("id", orderId)
    .eq("user_id", userId)
    .maybeSingle();
  assertNoSupabaseError(error);
  return data as OrderWithItems | null;
}
