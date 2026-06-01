import type { Product } from "@/types";

export const LOW_STOCK_THRESHOLD = 5;
export const STOCK_CHECKOUT_BLOCK_MESSAGE =
  "Kh\u00f4ng th\u1ec3 thanh to\u00e1n v\u00ec c\u00f3 s\u1ea3n ph\u1ea9m \u0111\u00e3 h\u1ebft h\u00e0ng ho\u1eb7c v\u01b0\u1ee3t qu\u00e1 t\u1ed3n kho.";

export type ProductStockState = "available" | "low" | "out";
export type ProductVisibilityState = "published" | "stopped" | "deleted";

export function getProductVisibilityState(product: Pick<Product, "is_active" | "deleted_at">): ProductVisibilityState {
  if (product.deleted_at) return "deleted";
  if (product.is_active === false) return "stopped";
  return "published";
}

export function isProductSellable(product: Product | null | undefined) {
  return Boolean(product && getProductVisibilityState(product) === "published");
}

export function getProductVisibilityLabel(product: Pick<Product, "is_active" | "deleted_at">) {
  const state = getProductVisibilityState(product);
  if (state === "deleted") return "Đã xóa";
  if (state === "stopped") return "Ngừng bán";
  return "Đã công khai";
}

export function getProductVisibilityBadgeClass(product: Pick<Product, "is_active" | "deleted_at">) {
  const state = getProductVisibilityState(product);
  if (state === "deleted") return "bg-slate-100 text-slate-600";
  if (state === "stopped") return "bg-amber-100 text-amber-800";
  return "bg-emerald-100 text-emerald-700";
}

export function getProductStockState(stockQuantity: number | null | undefined): ProductStockState {
  const stock = Math.max(0, Number(stockQuantity || 0));

  if (stock <= 0) return "out";
  if (stock <= LOW_STOCK_THRESHOLD) return "low";
  return "available";
}

export function getProductStockLabel(stockQuantity: number | null | undefined) {
  const state = getProductStockState(stockQuantity);

  if (state === "out") return "H\u1ebft h\u00e0ng";
  if (state === "low") return "S\u1eafp h\u1ebft h\u00e0ng";
  return "C\u00f2n h\u00e0ng";
}

export function getProductStockDetail(stockQuantity: number | null | undefined) {
  const stock = Math.max(0, Number(stockQuantity || 0));
  const state = getProductStockState(stock);

  if (state === "out") return "S\u1ea3n ph\u1ea9m \u0111\u00e3 h\u1ebft h\u00e0ng";
  if (state === "low") return `Ch\u1ec9 c\u00f2n ${stock} s\u1ea3n ph\u1ea9m`;
  return `C\u00f2n ${stock} s\u1ea3n ph\u1ea9m`;
}

export function getProductStockBadgeClass(stockQuantity: number | null | undefined) {
  const state = getProductStockState(stockQuantity);

  if (state === "out") return "bg-rose-100 text-rose-700";
  if (state === "low") return "bg-amber-100 text-amber-800";
  return "bg-emerald-100 text-emerald-700";
}

export function getCartStockWarning(product: Product | null | undefined, quantity: number) {
  if (!product) {
    return "S\u1ea3n ph\u1ea9m n\u00e0y kh\u00f4ng c\u00f2n kh\u1ea3 d\u1ee5ng.";
  }

  if (!isProductSellable(product)) {
    return "Sản phẩm này đang ngừng bán hoặc không còn hiển thị công khai.";
  }

  const stock = Math.max(0, Number(product.stock_quantity || 0));

  if (stock <= 0) {
    return "S\u1ea3n ph\u1ea9m \u0111\u00e3 h\u1ebft h\u00e0ng.";
  }

  if (quantity > stock) {
    return "S\u1ed1 l\u01b0\u1ee3ng trong gi\u1ecf v\u01b0\u1ee3t qu\u00e1 t\u1ed3n kho hi\u1ec7n t\u1ea1i.";
  }

  return "";
}
