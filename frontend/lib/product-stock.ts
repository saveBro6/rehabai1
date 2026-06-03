import type { Product } from "@/types";

export const LOW_STOCK_THRESHOLD = 5;
export const STOCK_CHECKOUT_BLOCK_MESSAGE =
  "Không thể thanh toán vì giỏ hàng có sản phẩm không khả dụng.";

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

  if (state === "out") return "Hết hàng";
  if (state === "low") return "Sắp hết hàng";
  return "Còn hàng";
}

export function getProductStockDetail(stockQuantity: number | null | undefined) {
  const stock = Math.max(0, Number(stockQuantity || 0));
  const state = getProductStockState(stock);

  if (state === "out") return "Sản phẩm đã hết hàng";
  if (state === "low") return `Chỉ còn ${stock} sản phẩm`;
  return `Còn ${stock} sản phẩm`;
}

export function getProductStockBadgeClass(stockQuantity: number | null | undefined) {
  const state = getProductStockState(stockQuantity);

  if (state === "out") return "bg-rose-100 text-rose-700";
  if (state === "low") return "bg-amber-100 text-amber-800";
  return "bg-emerald-100 text-emerald-700";
}

export function getCartStockWarning(product: Product | null | undefined, quantity: number) {
  if (!product) {
    return "Sản phẩm không còn khả dụng.";
  }

  const visibilityState = getProductVisibilityState(product);
  if (visibilityState === "deleted") {
    return "Sản phẩm không còn khả dụng.";
  }

  if (visibilityState === "stopped") {
    return "Sản phẩm đã ngừng bán.";
  }

  const stock = Math.max(0, Number(product.stock_quantity || 0));

  if (stock <= 0) {
    return "Sản phẩm đã hết hàng.";
  }

  if (quantity > stock) {
    return "Số lượng trong giỏ vượt quá tồn kho hiện tại.";
  }

  return "";
}
