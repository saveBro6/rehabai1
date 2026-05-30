import { assertNoSupabaseError, getSupabase } from "@/services/common";

export async function createOrderFromCart(userId: string, shippingAddress: string) {
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

  return data;
}

export async function getOrders(userId: string) {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("orders")
    .select("*, items:order_items(*)")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });
  assertNoSupabaseError(error);
  return data || [];
}

export async function getOrderById(orderId: string) {
  const supabase = getSupabase();
  const { data, error } = await supabase.from("orders").select("*, items:order_items(*)").eq("id", orderId).maybeSingle();
  assertNoSupabaseError(error);
  return data;
}
