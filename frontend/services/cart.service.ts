import { assertNoSupabaseError, getSupabase } from "@/services/common";
import type { CartItem, Product } from "@/types";

const QUANTITY_MIN_ERROR = "S\u1ed1 l\u01b0\u1ee3ng ph\u1ea3i l\u00e0 s\u1ed1 nguy\u00ean l\u1edbn h\u01a1n 0.";
const PATIENT_BUYER_ERROR = "Ch\u1ec9 t\u00e0i kho\u1ea3n B\u1ec7nh nh\u00e2n active m\u1edbi c\u00f3 th\u1ec3 mua s\u1ea3n ph\u1ea9m.";
const UNAVAILABLE_PRODUCT_ERROR = "Sản phẩm không còn khả dụng.";
const STOPPED_PRODUCT_ERROR = "Sản phẩm đã ngừng bán.";
const OUT_OF_STOCK_ERROR = "Sản phẩm đã hết hàng.";
const UNAVAILABLE_CART_PRODUCT_ERROR = "Không thể thanh toán vì giỏ hàng có sản phẩm không khả dụng.";
const MISSING_CART_ITEM_ERROR = "Kh\u00f4ng t\u00ecm th\u1ea5y s\u1ea3n ph\u1ea9m trong gi\u1ecf h\u00e0ng.";

function getStockExceededError(stockQuantity: number) {
  return `S\u1ed1 l\u01b0\u1ee3ng trong gi\u1ecf v\u01b0\u1ee3t qu\u00e1 t\u1ed3n kho hi\u1ec7n t\u1ea1i. Ch\u1ec9 c\u00f2n ${stockQuantity} s\u1ea3n ph\u1ea9m.`;
}

function assertPositiveQuantity(quantity: number) {
  if (!Number.isInteger(quantity) || quantity < 1) {
    throw new Error(QUANTITY_MIN_ERROR);
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
    throw new Error(PATIENT_BUYER_ERROR);
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
    throw new Error(UNAVAILABLE_PRODUCT_ERROR);
  }

  return data as Product;
}

export async function assertProductStock(productId: string, quantity: number) {
  assertPositiveQuantity(quantity);
  const product = await getProductForCart(productId);

  if (!product.is_active || product.deleted_at) {
    throw new Error(product.deleted_at ? UNAVAILABLE_PRODUCT_ERROR : STOPPED_PRODUCT_ERROR);
  }

  if (product.stock_quantity <= 0) {
    throw new Error(OUT_OF_STOCK_ERROR);
  }

  if (quantity > product.stock_quantity) {
    throw new Error(getStockExceededError(product.stock_quantity));
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
      throw new Error(UNAVAILABLE_CART_PRODUCT_ERROR);
    }

    if (!product.is_active || product.deleted_at) {
      throw new Error(product.deleted_at ? UNAVAILABLE_CART_PRODUCT_ERROR : STOPPED_PRODUCT_ERROR);
    }

    if (product.stock_quantity <= 0) {
      throw new Error(OUT_OF_STOCK_ERROR);
    }

    if (item.quantity > product.stock_quantity) {
      throw new Error(getStockExceededError(product.stock_quantity));
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
    throw new Error(MISSING_CART_ITEM_ERROR);
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
