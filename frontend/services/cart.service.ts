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
  const { data: product, error: productError } = await supabase
    .from("products")
    .select("id, stock_quantity, is_active")
    .eq("id", productId)
    .maybeSingle();
  assertNoSupabaseError(productError);

  if (!product || product.is_active === false) {
    throw new Error("PRODUCT_NOT_AVAILABLE");
  }

  const { data: existing, error: existingError } = await supabase
    .from("cart_items")
    .select("*")
    .eq("user_id", userId)
    .eq("product_id", productId)
    .maybeSingle();
  assertNoSupabaseError(existingError);

  if (existing) {
    const nextQuantity = existing.quantity + quantity;
    if (typeof product.stock_quantity === "number" && nextQuantity > product.stock_quantity) {
      throw new Error("PRODUCT_STOCK_EXCEEDED");
    }

    const { data, error } = await supabase
      .from("cart_items")
      .update({ quantity: nextQuantity })
      .eq("id", existing.id)
      .select("*")
      .single();
    assertNoSupabaseError(error);
    return data as CartItem;
  }

  if (typeof product.stock_quantity === "number" && quantity > product.stock_quantity) {
    throw new Error("PRODUCT_STOCK_EXCEEDED");
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
