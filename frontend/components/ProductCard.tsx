"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";

import { Button } from "@/components/Button";
import { Card } from "@/components/Card";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/useToast";
import { getProtectedHref } from "@/lib/auth-navigation";
import { getProductStockBadgeClass, getProductStockDetail, getProductStockLabel, isProductSellable } from "@/lib/product-stock";
import { formatCurrency, getImageUrl } from "@/lib/utils";
import { addToCart as addCartItem } from "@/services/cart.service";
import type { Product } from "@/types";

export function ProductCard({ product, isAuthenticated = false }: { product: Product; isAuthenticated?: boolean }) {
  const { profile, user } = useAuth();
  const router = useRouter();
  const { pushToast } = useToast();
  const [pendingAction, setPendingAction] = useState<"cart" | "buy" | null>(null);
  const canBuy = profile?.account_type === "patient" && profile?.account_status === "active";
  const isSellable = isProductSellable(product);
  const isOutOfStock = product.stock_quantity <= 0;
  const stockLabel = getProductStockLabel(product.stock_quantity);
  const stockDetail = getProductStockDetail(product.stock_quantity);
  const detailHref = `/patient/products/${product.id}`;
  const cartHref = getProtectedHref(isAuthenticated, "/patient/cart");

  async function addToCart(action: "cart" | "buy") {
    if (!isAuthenticated) {
      pushToast("C\u1ea7n \u0111\u0103ng nh\u1eadp", "\u0110\u0103ng nh\u1eadp b\u1eb1ng t\u00e0i kho\u1ea3n B\u1ec7nh nh\u00e2n \u0111\u1ec3 mua s\u1ea3n ph\u1ea9m.");
      router.push(cartHref);
      return;
    }

    if (!canBuy) {
      pushToast("Ch\u1ec9 B\u1ec7nh nh\u00e2n m\u1edbi c\u00f3 th\u1ec3 mua h\u00e0ng", "T\u00e0i kho\u1ea3n B\u00e1c s\u0129 v\u00e0 Admin ch\u1ec9 \u0111\u01b0\u1ee3c xem s\u1ea3n ph\u1ea9m trong MVP.");
      return;
    }

    if (!isSellable || isOutOfStock) {
      pushToast("Sản phẩm không còn khả dụng", "Sản phẩm đã hết hàng hoặc đang ngừng bán.");
      return;
    }

    setPendingAction(action);
    try {
      if (!user) throw new Error("Authentication required.");
      await addCartItem(user.id, product.id);
      pushToast("\u0110\u00e3 th\u00eam v\u00e0o gi\u1ecf", product.name);
      if (action === "buy") {
        router.push("/patient/cart");
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "Vui l\u00f2ng th\u1eed l\u1ea1i sau.";
      pushToast("Kh\u00f4ng th\u1ec3 th\u00eam v\u00e0o gi\u1ecf", message);
    } finally {
      setPendingAction(null);
    }
  }

  return (
    <Card className="flex h-full flex-col overflow-hidden p-0">
      <Image
        src={getImageUrl(product.image_url)}
        alt={product.name}
        width={800}
        height={520}
        className="h-44 w-full object-cover"
      />
      <div className="flex flex-1 flex-col p-5">
        <div className="flex items-start justify-between gap-3">
          <p className="text-sm font-semibold text-emerald-700">{product.category}</p>
          {product.is_recommended ? (
            <span className="rounded-full bg-emerald-100 px-2 py-1 text-xs font-semibold text-emerald-700">{"G\u1ee3i \u00fd"}</span>
          ) : null}
        </div>
        <h3 className="mt-2 text-lg font-bold text-slate-950">{product.name}</h3>
        <p className="mt-2 line-clamp-2 text-sm text-slate-600">{product.description}</p>
        <p className="mt-4 font-bold text-emerald-700">{formatCurrency(product.price)}</p>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${getProductStockBadgeClass(product.stock_quantity)}`}>
            {stockLabel}
          </span>
          <span className="text-xs font-semibold text-slate-500">{stockDetail}</span>
        </div>
        <div className="mt-auto grid gap-2 pt-4">
          <Link href={detailHref}>
            <Button variant="secondary" className="w-full">
              {"Xem chi ti\u1ebft"}
            </Button>
          </Link>
          {isAuthenticated && !canBuy ? (
            <p className="rounded-lg bg-slate-100 px-3 py-2 text-center text-xs font-semibold text-slate-600">
              {"T\u00e0i kho\u1ea3n n\u00e0y ch\u1ec9 \u0111\u01b0\u1ee3c xem s\u1ea3n ph\u1ea9m."}
            </p>
          ) : (
            <div className="grid grid-cols-2 gap-2">
              <Button
                variant="ghost"
                className="w-full"
                onClick={() => void addToCart("cart")}
                disabled={pendingAction !== null || isOutOfStock || !isSellable}
              >
                {pendingAction === "cart" ? "\u0110ang th\u00eam..." : "Th\u00eam v\u00e0o gi\u1ecf"}
              </Button>
              <Button
                className="w-full"
                onClick={() => void addToCart("buy")}
                disabled={pendingAction !== null || isOutOfStock || !isSellable}
              >
                {pendingAction === "buy" ? "\u0110ang th\u00eam..." : "Mua ngay"}
              </Button>
            </div>
          )}
        </div>
      </div>
    </Card>
  );
}
