import { assertNoSupabaseError, getSupabase } from "@/services/common";
import type { ProductCategory } from "@/types";

export const DEFAULT_PRODUCT_CATEGORY_SUGGESTIONS = [
  "Dụng cụ tập tay",
  "Dụng cụ tập chân",
  "Dây kháng lực",
  "Khung tập đi",
  "Ghế hỗ trợ",
  "Bóng tập phục hồi",
  "Thiết bị theo dõi sức khỏe",
  "Vật tư hỗ trợ phục hồi",
  "Dụng cụ thăng bằng",
  "Sản phẩm chăm sóc tại nhà"
];

export type ProductCategoryMutationPayload = {
  name: string;
  is_active?: boolean;
  sort_order?: number;
};

export type ProductCategoryUsage = Record<string, number>;

function normalizeCategoryName(name: string) {
  return name.trim().replace(/\s+/g, " ");
}

function categoryKey(name: string) {
  return normalizeCategoryName(name).toLocaleLowerCase("vi");
}

function uniqueSortedCategoryNames(values: Array<string | null | undefined>) {
  const categories = new Map<string, string>();

  for (const value of values) {
    const category = normalizeCategoryName(value || "");
    if (!category) continue;
    categories.set(categoryKey(category), category);
  }

  return Array.from(categories.values()).sort((a, b) => a.localeCompare(b, "vi"));
}

export function slugifyProductCategory(name: string) {
  const normalized = normalizeCategoryName(name)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  return normalized || `category-${Date.now()}`;
}

async function getExistingCategoryByName(name: string) {
  const categories = await getAdminProductCategoryRows();
  const key = categoryKey(name);
  return categories.find((category) => categoryKey(category.name) === key) || null;
}

export async function getPublicProductCategoryRows() {
  const supabase = getSupabase();
  const [{ data: categoryRows, error: categoryError }, { data: productRows, error: productError }] = await Promise.all([
    supabase
      .from("product_categories")
      .select("*")
      .eq("is_active", true)
      .is("deleted_at", null)
      .order("sort_order", { ascending: true })
      .order("name", { ascending: true }),
    supabase.from("products").select("category").eq("is_active", true).is("deleted_at", null)
  ]);

  assertNoSupabaseError(categoryError);
  assertNoSupabaseError(productError);

  const publicProductCategoryKeys = new Set(uniqueSortedCategoryNames((productRows || []).map((row) => row.category)).map(categoryKey));

  return ((categoryRows || []) as ProductCategory[]).filter((category) => publicProductCategoryKeys.has(categoryKey(category.name)));
}

export async function getPublicProductCategoryNames() {
  const categories = await getPublicProductCategoryRows();
  return categories.map((category) => category.name);
}

export async function getAdminProductCategoryRows() {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("product_categories")
    .select("*")
    .is("deleted_at", null)
    .order("is_active", { ascending: false })
    .order("sort_order", { ascending: true })
    .order("name", { ascending: true });

  assertNoSupabaseError(error);
  return (data || []) as ProductCategory[];
}

export async function getAdminProductCategoryNames() {
  const supabase = getSupabase();
  const [categoryRows, productResult] = await Promise.all([
    getAdminProductCategoryRows(),
    supabase.from("products").select("category").order("category", { ascending: true })
  ]);

  assertNoSupabaseError(productResult.error);

  const categoryNames = categoryRows.filter((category) => category.is_active).map((category) => category.name);
  const productCategoryNames = (productResult.data || []).map((row) => row.category);
  return uniqueSortedCategoryNames([...categoryNames, ...productCategoryNames, ...DEFAULT_PRODUCT_CATEGORY_SUGGESTIONS]);
}

export async function getProductCategoryUsage() {
  const supabase = getSupabase();
  const { data, error } = await supabase.from("products").select("category").is("deleted_at", null);
  assertNoSupabaseError(error);

  return (data || []).reduce<ProductCategoryUsage>((usage, row) => {
    const category = normalizeCategoryName(row.category || "");
    if (!category) return usage;
    usage[categoryKey(category)] = (usage[categoryKey(category)] || 0) + 1;
    return usage;
  }, {});
}

export async function ensureProductCategory(name: string) {
  const categoryName = normalizeCategoryName(name);
  if (!categoryName) {
    throw new Error("Vui lòng nhập danh mục.");
  }

  const existing = await getExistingCategoryByName(categoryName);
  const supabase = getSupabase();
  const now = new Date().toISOString();

  if (existing) {
    if (existing.is_active && !existing.deleted_at) return existing;

    const { data, error } = await supabase
      .from("product_categories")
      .update({ is_active: true, deleted_at: null, updated_at: now })
      .eq("id", existing.id)
      .select("*")
      .single();
    assertNoSupabaseError(error);
    return data as ProductCategory;
  }

  const slugBase = slugifyProductCategory(categoryName);
  const { data, error } = await supabase
    .from("product_categories")
    .insert({
      name: categoryName,
      slug: slugBase,
      is_active: true,
      sort_order: 0,
      updated_at: now
    })
    .select("*")
    .single();

  if (error && String(error.message || "").toLowerCase().includes("duplicate")) {
    const retry = await supabase
      .from("product_categories")
      .insert({
        name: categoryName,
        slug: `${slugBase}-${Date.now().toString(36)}`,
        is_active: true,
        sort_order: 0,
        updated_at: now
      })
      .select("*")
      .single();
    assertNoSupabaseError(retry.error);
    return retry.data as ProductCategory;
  }

  assertNoSupabaseError(error);
  return data as ProductCategory;
}

export async function createProductCategory(payload: ProductCategoryMutationPayload) {
  return ensureProductCategory(payload.name);
}

export async function updateProductCategory(id: string, payload: ProductCategoryMutationPayload) {
  const categoryName = normalizeCategoryName(payload.name);
  if (!categoryName) {
    throw new Error("Vui lòng nhập danh mục.");
  }

  const categories = await getAdminProductCategoryRows();
  const current = categories.find((category) => category.id === id);
  if (!current) {
    throw new Error("Không tìm thấy danh mục.");
  }

  const duplicate = categories.find((category) => categoryKey(category.name) === categoryKey(categoryName) && category.id !== id);
  if (duplicate) {
    throw new Error("Danh mục này đã tồn tại.");
  }

  const now = new Date().toISOString();
  const supabase = getSupabase();
  const updatePayload: ProductCategoryMutationPayload & { slug: string; updated_at: string } = {
    name: categoryName,
    slug: slugifyProductCategory(categoryName),
    sort_order: payload.sort_order ?? current.sort_order,
    updated_at: now
  };

  if (payload.is_active !== undefined) {
    updatePayload.is_active = payload.is_active;
  }

  const { data, error } = await supabase
    .from("product_categories")
    .update(updatePayload)
    .eq("id", id)
    .is("deleted_at", null)
    .select("*")
    .single();
  assertNoSupabaseError(error);

  if (categoryKey(current.name) !== categoryKey(categoryName)) {
    const productUpdate = await supabase
      .from("products")
      .update({ category: categoryName, updated_at: now })
      .eq("category", current.name)
      .is("deleted_at", null);
    assertNoSupabaseError(productUpdate.error);
  }

  return data as ProductCategory;
}

export async function setProductCategoryActive(id: string, isActive: boolean) {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("product_categories")
    .update({ is_active: isActive, updated_at: new Date().toISOString() })
    .eq("id", id)
    .is("deleted_at", null)
    .select("*")
    .single();
  assertNoSupabaseError(error);
  return data as ProductCategory;
}

export async function deleteProductCategory(id: string) {
  const [categories, usage] = await Promise.all([getAdminProductCategoryRows(), getProductCategoryUsage()]);
  const category = categories.find((item) => item.id === id);
  if (!category) {
    throw new Error("Không tìm thấy danh mục.");
  }

  if ((usage[categoryKey(category.name)] || 0) > 0) {
    throw new Error("Không thể xóa danh mục đang có sản phẩm. Hãy ngừng dùng danh mục này.");
  }

  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("product_categories")
    .update({ is_active: false, deleted_at: new Date().toISOString(), updated_at: new Date().toISOString() })
    .eq("id", id)
    .select("*")
    .single();
  assertNoSupabaseError(error);
  return data as ProductCategory;
}
