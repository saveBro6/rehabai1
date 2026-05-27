import { assertNoSupabaseError, getSupabase } from "@/services/common";
import type { CartItem } from "@/types";

export async function getCartItems(userId: string) {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("cart_items")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });
  assertNoSupabaseError(error);
  return (data || []) as CartItem[];
}

export async function addToCart(userId: string, productId: string, quantity = 1) {
  const supabase = getSupabase();
  const { data: existing, error: existingError } = await supabase
    .from("cart_items")
    .select("*")
    .eq("user_id", userId)
    .eq("product_id", productId)
    .maybeSingle();
  assertNoSupabaseError(existingError);

  if (existing) {
    const { data, error } = await supabase
      .from("cart_items")
      .update({ quantity: existing.quantity + quantity })
      .eq("id", existing.id)
      .select("*")
      .single();
    assertNoSupabaseError(error);
    return data as CartItem;
  }

  const { data, error } = await supabase
    .from("cart_items")
    .insert({ user_id: userId, product_id: productId, quantity })
    .select("*")
    .single();
  assertNoSupabaseError(error);
  return data as CartItem;
}

export async function updateCartItem(cartItemId: string, quantity: number) {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("cart_items")
    .update({ quantity })
    .eq("id", cartItemId)
    .select("*")
    .single();
  assertNoSupabaseError(error);
  return data as CartItem;
}

export async function removeCartItem(cartItemId: string) {
  const supabase = getSupabase();
  const { error } = await supabase.from("cart_items").delete().eq("id", cartItemId);
  assertNoSupabaseError(error);
}

export async function clearCart(userId: string) {
  const supabase = getSupabase();
  const { error } = await supabase.from("cart_items").delete().eq("user_id", userId);
  assertNoSupabaseError(error);
}
