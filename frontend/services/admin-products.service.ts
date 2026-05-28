import { assertNoSupabaseError, getSupabase } from "@/services/common";
import type { Product } from "@/types";

export type AdminProductPayload = {
  name: string;
  description: string | null;
  category: string;
  price: number;
  stock_quantity: number;
  image_url: string | null;
  is_recommended: boolean;
  is_active: boolean;
};

export async function getAdminProducts() {
  const supabase = getSupabase();
  const { data, error } = await supabase.from("products").select("*").order("created_at", { ascending: false });
  assertNoSupabaseError(error);
  return (data || []) as Product[];
}

export async function getAdminProductById(productId: string) {
  const supabase = getSupabase();
  const { data, error } = await supabase.from("products").select("*").eq("id", productId).maybeSingle();
  assertNoSupabaseError(error);
  return data as Product | null;
}

export async function createAdminProduct(payload: AdminProductPayload) {
  const supabase = getSupabase();
  const { data, error } = await supabase.from("products").insert(payload).select("*").single();
  assertNoSupabaseError(error);
  return data as Product;
}

export async function updateAdminProduct(productId: string, payload: AdminProductPayload) {
  const supabase = getSupabase();
  const { data, error } = await supabase.from("products").update(payload).eq("id", productId).select("*").single();
  assertNoSupabaseError(error);
  return data as Product;
}

export async function setAdminProductActive(productId: string, isActive: boolean) {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("products")
    .update({ is_active: isActive })
    .eq("id", productId)
    .select("*")
    .single();
  assertNoSupabaseError(error);
  return data as Product;
}

export async function deleteAdminProductIfUnused(productId: string) {
  const supabase = getSupabase();
  const { count, error: countError } = await supabase
    .from("order_items")
    .select("id", { count: "exact", head: true })
    .eq("product_id", productId);
  assertNoSupabaseError(countError);

  if ((count || 0) > 0) {
    throw new Error("PRODUCT_HAS_ORDERS");
  }

  const { error } = await supabase.from("products").delete().eq("id", productId);
  assertNoSupabaseError(error);
}
