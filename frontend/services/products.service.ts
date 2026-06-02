import { assertNoSupabaseError, getSupabase } from "@/services/common";
import {
  ensureProductCategory,
  getAdminProductCategoryNames,
  getPublicProductCategoryNames
} from "@/services/product-categories.service";
import type { Product } from "@/types";

export type ProductMutationPayload = {
  name: string;
  description?: string | null;
  category: string;
  price: number;
  image_url?: string | null;
  stock_quantity: number;
  is_recommended: boolean;
};

const PRODUCT_IMAGE_BUCKET = "images";
const PRODUCT_IMAGE_FOLDER = "products";
const MAX_PRODUCT_IMAGE_SIZE_BYTES = 5 * 1024 * 1024;

const IMAGE_EXTENSION_BY_TYPE: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
  "image/avif": "avif"
};

export async function getProducts(filters?: { category?: string; recommended?: boolean }) {
  const supabase = getSupabase();
  let query = supabase
    .from("products")
    .select("*")
    .eq("is_active", true)
    .is("deleted_at", null)
    .order("created_at", { ascending: false });

  if (filters?.category) query = query.eq("category", filters.category);
  if (filters?.recommended !== undefined) query = query.eq("is_recommended", filters.recommended);

  const { data, error } = await query;
  assertNoSupabaseError(error);
  return (data || []) as Product[];
}

export async function searchPublicProducts(filters?: {
  query?: string;
  category?: string;
  recommended?: boolean;
  limit?: number;
}) {
  const supabase = getSupabase();
  const searchTerm = filters?.query?.trim().replace(/[,]/g, " ") || "";
  const limit = Math.min(Math.max(filters?.limit || 8, 1), 24);

  let query = supabase
    .from("products")
    .select("*")
    .eq("is_active", true)
    .is("deleted_at", null)
    .order("is_recommended", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(limit);

  if (filters?.category) query = query.eq("category", filters.category);
  if (filters?.recommended !== undefined) query = query.eq("is_recommended", filters.recommended);
  if (searchTerm) {
    query = query.or(`name.ilike.%${searchTerm}%,category.ilike.%${searchTerm}%,description.ilike.%${searchTerm}%`);
  }

  const { data, error } = await query;
  assertNoSupabaseError(error);
  return (data || []) as Product[];
}

export async function getProductCategories() {
  return getPublicProductCategoryNames();
}

export async function getAdminProductCategories() {
  return getAdminProductCategoryNames();
}

export async function getProductById(id: string) {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("products")
    .select("*")
    .eq("id", id)
    .eq("is_active", true)
    .is("deleted_at", null)
    .maybeSingle();
  assertNoSupabaseError(error);
  return data as Product | null;
}

export async function getRelatedProducts(productId: string, category: string, limit = 6) {
  const supabase = getSupabase();
  const baseSelect = "*";
  const [categoryResult, recommendedResult] = await Promise.all([
    supabase
      .from("products")
      .select(baseSelect)
      .eq("is_active", true)
      .is("deleted_at", null)
      .eq("category", category)
      .neq("id", productId)
      .order("is_recommended", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(limit),
    supabase
      .from("products")
      .select(baseSelect)
      .eq("is_active", true)
      .is("deleted_at", null)
      .eq("is_recommended", true)
      .neq("id", productId)
      .order("created_at", { ascending: false })
      .limit(limit)
  ]);

  assertNoSupabaseError(categoryResult.error);
  assertNoSupabaseError(recommendedResult.error);

  const merged = [...(categoryResult.data || []), ...(recommendedResult.data || [])] as Product[];
  return Array.from(new Map(merged.map((product) => [product.id, product])).values()).slice(0, limit);
}

export async function getAdminProducts() {
  const supabase = getSupabase();
  const { data, error } = await supabase.from("products").select("*").order("created_at", { ascending: false });
  assertNoSupabaseError(error);
  return (data || []) as Product[];
}

export async function getAdminProductById(id: string) {
  const supabase = getSupabase();
  const { data, error } = await supabase.from("products").select("*").eq("id", id).maybeSingle();
  assertNoSupabaseError(error);
  return data as Product | null;
}

export async function getProductsByIds(productIds: string[]) {
  if (productIds.length === 0) {
    return [] as Product[];
  }

  const supabase = getSupabase();
  const { data, error } = await supabase.from("products").select("*").in("id", productIds);
  assertNoSupabaseError(error);
  return (data || []) as Product[];
}

export async function uploadProductImage(file: File) {
  if (!file.type.startsWith("image/")) {
    throw new Error("Tệp tải lên phải là hình ảnh.");
  }

  if (file.size > MAX_PRODUCT_IMAGE_SIZE_BYTES) {
    throw new Error("Ảnh sản phẩm không được vượt quá 5MB.");
  }

  const extension = IMAGE_EXTENSION_BY_TYPE[file.type] || file.name.split(".").pop()?.toLowerCase() || "jpg";
  const safeExtension = extension.replace(/[^a-z0-9]/g, "") || "jpg";
  const path = `${PRODUCT_IMAGE_FOLDER}/product-${Date.now()}.${safeExtension}`;
  const supabase = getSupabase();
  const { error } = await supabase.storage.from(PRODUCT_IMAGE_BUCKET).upload(path, file, {
    contentType: file.type,
    upsert: false
  });
  assertNoSupabaseError(error);
  return path;
}

export async function createProduct(payload: ProductMutationPayload) {
  await ensureProductCategory(payload.category);
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("products")
    .insert({ ...payload, is_active: true, deleted_at: null, updated_at: new Date().toISOString() })
    .select("*")
    .single();
  assertNoSupabaseError(error);
  return data as Product;
}

export async function updateProduct(id: string, payload: Partial<ProductMutationPayload>) {
  if (payload.category) {
    await ensureProductCategory(payload.category);
  }

  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("products")
    .update({ ...payload, updated_at: new Date().toISOString() })
    .eq("id", id)
    .is("deleted_at", null)
    .select("*")
    .single();
  assertNoSupabaseError(error);
  return data as Product;
}

export async function setProductActive(id: string, isActive: boolean) {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("products")
    .update({ is_active: isActive, updated_at: new Date().toISOString() })
    .eq("id", id)
    .is("deleted_at", null)
    .select("*")
    .single();
  assertNoSupabaseError(error);
  return data as Product;
}

export async function deleteProduct(id: string) {
  void id;
  throw new Error("Hard delete sản phẩm đang bị tắt vì schema chưa có soft-delete/deactivate an toàn cho order_items.");
}
