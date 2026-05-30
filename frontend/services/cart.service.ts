import { assertNoSupabaseError, getSupabase } from "@/services/common";
import type { CartItem, Product } from "@/types";

function assertPositiveQuantity(quantity: number) {
  if (!Number.isInteger(quantity) || quantity < 1) {
    throw new Error("Quantity must be at least 1.");
  }
}

export async function ensurePatientBuyer(userId: string) {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("accounts")
    .select("account_type, account_status")
    .eq("id", userId)
    .maybeSingle();
  assertNoSupabaseError(error);

  if (data?.account_type !== "patient" || data?.account_status !== "active") {
    throw new Error("Only active Patient accounts can buy products.");
  }
}

async function getProductForCart(productId: string) {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("products")
    .select("*")
    .eq("id", productId)
    .maybeSingle();
  assertNoSupabaseError(error);

  if (!data) {
    throw new Error("Product is no longer available.");
  }

  return data as Product;
}

export async function assertProductStock(productId: string, quantity: number) {
  assertPositiveQuantity(quantity);
  const product = await getProductForCart(productId);

  if (quantity > product.stock_quantity) {
    throw new Error(`Only ${product.stock_quantity} item(s) are available for ${product.name}.`);
  }

  return product;
}

export async function validateCartItemsStock(cartItems: CartItem[]) {
  const supabase = getSupabase();
  const productIds = cartItems.map((item) => item.product_id);
  const { data: products, error } = await supabase.from("products").select("*").in("id", productIds);
  assertNoSupabaseError(error);

  const productMap = new Map((products || []).map((product) => [product.id, product as Product]));
  for (const item of cartItems) {
    assertPositiveQuantity(item.quantity);
    const product = productMap.get(item.product_id);

    if (!product) {
      throw new Error("Cart contains an unavailable product.");
    }

    if (item.quantity > product.stock_quantity) {
      throw new Error(`Only ${product.stock_quantity} item(s) are available for ${product.name}.`);
    }
  }

  return productMap;
}

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
  assertPositiveQuantity(quantity);
  await ensurePatientBuyer(userId);
  const supabase = getSupabase();
  const { data: existing, error: existingError } = await supabase
    .from("cart_items")
    .select("*")
    .eq("user_id", userId)
    .eq("product_id", productId)
    .maybeSingle();
  assertNoSupabaseError(existingError);

  if (existing) {
    const nextQuantity = existing.quantity + quantity;
    await assertProductStock(productId, nextQuantity);

    const { data, error } = await supabase
      .from("cart_items")
      .update({ quantity: nextQuantity })
      .eq("id", existing.id)
      .select("*")
      .single();
    assertNoSupabaseError(error);
    return data as CartItem;
  }

  await assertProductStock(productId, quantity);

  const { data, error } = await supabase
    .from("cart_items")
    .insert({ user_id: userId, product_id: productId, quantity })
    .select("*")
    .single();
  assertNoSupabaseError(error);
  return data as CartItem;
}

export async function updateCartItem(cartItemId: string, quantity: number) {
  assertPositiveQuantity(quantity);
  const supabase = getSupabase();
  const { data: existing, error: existingError } = await supabase
    .from("cart_items")
    .select("*")
    .eq("id", cartItemId)
    .maybeSingle();
  assertNoSupabaseError(existingError);

  if (!existing) {
    throw new Error("Cart item was not found.");
  }

  await ensurePatientBuyer(existing.user_id);
  await assertProductStock(existing.product_id, quantity);

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
