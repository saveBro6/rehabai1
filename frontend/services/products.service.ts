import { assertNoSupabaseError, getSupabase } from "@/services/common";
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

function uniqueSorted(values: Array<string | null | undefined>) {
  return Array.from(new Set(values.filter((value): value is string => Boolean(value)))).sort((a, b) =>
    a.localeCompare(b, "vi")
  );
}

export async function getProducts(filters?: { category?: string; recommended?: boolean }) {
  const supabase = getSupabase();
  let query = supabase.from("products").select("*").order("created_at", { ascending: false });

  if (filters?.category) query = query.eq("category", filters.category);
  if (filters?.recommended !== undefined) query = query.eq("is_recommended", filters.recommended);

  const { data, error } = await query;
  assertNoSupabaseError(error);
  return (data || []) as Product[];
}

export async function getProductCategories() {
  const supabase = getSupabase();
  const { data, error } = await supabase.from("products").select("category").order("category", { ascending: true });
  assertNoSupabaseError(error);

  return uniqueSorted((data || []).map((row) => row.category));
}

export async function getProductById(id: string) {
  const supabase = getSupabase();
  const { data, error } = await supabase.from("products").select("*").eq("id", id).maybeSingle();
  assertNoSupabaseError(error);
  return data as Product | null;
}

export async function getAdminProducts() {
  return getProducts();
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
  const supabase = getSupabase();
  const { data, error } = await supabase.from("products").insert(payload).select("*").single();
  assertNoSupabaseError(error);
  return data as Product;
}

export async function updateProduct(id: string, payload: Partial<ProductMutationPayload>) {
  const supabase = getSupabase();
  const { data, error } = await supabase.from("products").update(payload).eq("id", id).select("*").single();
  assertNoSupabaseError(error);
  return data as Product;
}

export async function deleteProduct(id: string) {
  void id;
  throw new Error("Hard delete sản phẩm đang bị tắt vì schema chưa có soft-delete/deactivate an toàn cho order_items.");
}
