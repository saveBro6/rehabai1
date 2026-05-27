import { assertNoSupabaseError, getSupabase } from "@/services/common";
import type { Product } from "@/types";

export async function getProducts(filters?: { category?: string; recommended?: boolean }) {
  const supabase = getSupabase();
  let query = supabase.from("products").select("*").order("created_at", { ascending: false });

  if (filters?.category) query = query.eq("category", filters.category);
  if (filters?.recommended !== undefined) query = query.eq("is_recommended", filters.recommended);

  const { data, error } = await query;
  assertNoSupabaseError(error);
  return (data || []) as Product[];
}

export async function getProductById(id: string) {
  const supabase = getSupabase();
  const { data, error } = await supabase.from("products").select("*").eq("id", id).maybeSingle();
  assertNoSupabaseError(error);
  return data as Product | null;
}

export async function createProduct(payload: Omit<Product, "id" | "created_at">) {
  const supabase = getSupabase();
  const { data, error } = await supabase.from("products").insert(payload).select("*").single();
  assertNoSupabaseError(error);
  return data as Product;
}

export async function updateProduct(id: string, payload: Partial<Omit<Product, "id" | "created_at">>) {
  const supabase = getSupabase();
  const { data, error } = await supabase.from("products").update(payload).eq("id", id).select("*").single();
  assertNoSupabaseError(error);
  return data as Product;
}

export async function deleteProduct(id: string) {
  const supabase = getSupabase();
  const { error } = await supabase.from("products").delete().eq("id", id);
  assertNoSupabaseError(error);
}
