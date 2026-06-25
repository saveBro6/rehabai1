"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { Eye, Heart, ShoppingCart, Sparkles, Star } from "lucide-react";

import { Button } from "@/components/Button";
import { Card } from "@/components/Card";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/useToast";
import { getProtectedHref } from "@/lib/auth-navigation";
import { getProductStockState, isProductSellable } from "@/lib/product-stock";
import { clsx, formatCurrency, getImageUrl } from "@/lib/utils";
import { addToCart as addCartItem } from "@/services/cart.service";
import type { Product } from "@/types";

function getStockPresentation(stockQuantity: number) {
  const state = getProductStockState(stockQuantity);
  const stock = Math.max(0, Number(stockQuantity || 0));

  if (state === "out") {
    return {
      label: "Hết hàng",
      detail: "Sản phẩm đã hết hàng",
      dotClass: "bg-rose-500",
      badgeClass: "bg-rose-50 text-rose-700 ring-rose-100",
    };
  }

  if (state === "low") {
    return {
      label: "Sắp hết hàng",
      detail: `Chỉ còn ${stock} sản phẩm`,
      dotClass: "bg-amber-500",
      badgeClass: "bg-amber-50 text-amber-700 ring-amber-100",
    };
  }

  return {
    label: "Còn hàng",
    detail: `Còn ${stock} sản phẩm`,
    dotClass: "bg-emerald-500",
    badgeClass: "bg-emerald-50 text-emerald-700 ring-emerald-100",
  };
}

export function ProductCard({ product, isAuthenticated = false }: { product: Product; isAuthenticated?: boolean }) {
  const { profile, user } = useAuth();
  const router = useRouter();
  const { pushToast } = useToast();
  const [pendingAction, setPendingAction] = useState<"cart" | "buy" | null>(null);
  const [favorite, setFavorite] = useState(false);
  const canBuy = profile?.account_type === "patient" && profile?.account_status === "active";
  const isSellable = isProductSellable(product);
  const isOutOfStock = product.stock_quantity <= 0;
  const stock = getStockPresentation(product.stock_quantity);
  const detailHref = `/patient/products/${product.id}`;
  const cartHref = getProtectedHref(isAuthenticated, "/patient/cart");

  async function addToCart(action: "cart" | "buy") {
    if (!isAuthenticated) {
      pushToast("Cần đăng nhập", "Đăng nhập bằng tài khoản Bệnh nhân để mua sản phẩm.");
      router.push(cartHref);
      return;
    }

    if (!canBuy) {
      pushToast("Chỉ Bệnh nhân mới có thể mua hàng", "Tài khoản Bác sĩ và Admin chỉ được xem sản phẩm trong MVP.");
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
      pushToast("Đã thêm vào giỏ", product.name);
      if (action === "buy") {
        router.push("/patient/cart");
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "Vui lòng thử lại sau.";
      pushToast("Không thể thêm vào giỏ", message);
    } finally {
      setPendingAction(null);
    }
  }

  return (
    <Card className="group flex h-full flex-col overflow-hidden rounded-3xl border-slate-200 p-0 shadow-sm shadow-slate-900/5 transition duration-200 hover:-translate-y-1 hover:border-emerald-200 hover:shadow-xl hover:shadow-emerald-950/10">
      <div className="relative aspect-[4/3] overflow-hidden bg-slate-50">
        <Link href={detailHref} aria-label={`Xem chi tiết ${product.name}`}>
          <Image
            src={getImageUrl(product.image_url)}
            alt={product.name}
            fill
            sizes="(min-width: 1280px) 25vw, (min-width: 640px) 50vw, 100vw"
            className="object-cover transition duration-500 group-hover:scale-105"
          />
        </Link>

        <div className="absolute left-3 top-3 flex flex-wrap gap-2">
          {product.is_recommended ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-600 px-3 py-1 text-xs font-extrabold text-white shadow-sm">
              <Sparkles className="h-3.5 w-3.5" />
              Gợi ý
            </span>
          ) : null}
          {!isSellable ? (
            <span className="rounded-full bg-slate-900/80 px-3 py-1 text-xs font-extrabold text-white">Ngừng bán</span>
          ) : null}
        </div>

        <button
          type="button"
          aria-pressed={favorite}
          aria-label={favorite ? "Bỏ yêu thích" : "Yêu thích sản phẩm"}
          onClick={() => setFavorite((value) => !value)}
          className={clsx(
            "absolute right-3 top-3 inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/80 bg-white/90 text-slate-500 shadow-sm backdrop-blur transition hover:text-rose-500",
            favorite && "text-rose-500"
          )}
        >
          <Heart className={clsx("h-5 w-5", favorite && "fill-current")} />
        </button>
      </div>

      <div className="flex flex-1 flex-col p-5">
        <div className="flex items-start justify-between gap-3">
          <p className="line-clamp-1 text-xs font-extrabold uppercase tracking-wide text-emerald-700">{product.category}</p>
          <span className={clsx("rounded-full px-2.5 py-1 text-xs font-extrabold ring-1", stock.badgeClass)}>{stock.label}</span>
        </div>

        <Link href={detailHref} className="mt-2 block">
          <h3 className="line-clamp-2 min-h-[3.5rem] text-lg font-black leading-7 text-slate-950 transition group-hover:text-emerald-700">
            {product.name}
          </h3>
        </Link>

        <p className="mt-2 line-clamp-2 min-h-[2.75rem] text-sm leading-6 text-slate-600">{product.description || "Chưa có mô tả sản phẩm."}</p>

        <div className="mt-4 flex items-center gap-2 text-sm">
          <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
          <span className="font-bold text-slate-800">Chưa có đánh giá</span>
        </div>

        <div className="mt-3">
          <p className="text-xl font-black text-emerald-700">{formatCurrency(product.price)}</p>
          <div className="mt-2 flex items-center gap-2 text-sm font-semibold text-slate-600">
            <span className={clsx("h-2.5 w-2.5 rounded-full", stock.dotClass)} />
            {stock.detail}
          </div>
        </div>

        <div className="mt-auto grid gap-2 pt-5">
          {isAuthenticated && !canBuy ? (
            <p className="rounded-2xl bg-slate-100 px-3 py-3 text-center text-xs font-semibold text-slate-600">
              Tài khoản này chỉ được xem sản phẩm.
            </p>
          ) : (
            <Button
              className="w-full rounded-xl bg-emerald-600 shadow-sm shadow-emerald-600/20 hover:bg-emerald-700"
              onClick={() => void addToCart("cart")}
              disabled={pendingAction !== null || isOutOfStock || !isSellable}
            >
              <ShoppingCart className="mr-2 h-4 w-4" />
              {pendingAction === "cart" ? "Đang thêm..." : "Thêm vào giỏ"}
            </Button>
          )}

          <div className="grid grid-cols-2 gap-2">
            <Link
              href={detailHref}
              className="inline-flex min-h-10 items-center justify-center rounded-xl border border-emerald-100 bg-white px-3 text-sm font-bold text-emerald-700 transition hover:bg-emerald-50"
            >
              <Eye className="mr-2 h-4 w-4" />
              Xem chi tiết
            </Link>
            <Button
              variant="ghost"
              className="min-h-10 rounded-xl text-emerald-700 hover:bg-emerald-50"
              onClick={() => void addToCart("buy")}
              disabled={pendingAction !== null || isOutOfStock || !isSellable || (isAuthenticated && !canBuy)}
            >
              {pendingAction === "buy" ? "Đang thêm..." : "Mua ngay"}
            </Button>
          </div>
        </div>
      </div>
    </Card>
  );
}
