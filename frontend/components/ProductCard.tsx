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
import { formatCurrency, getImageUrl } from "@/lib/utils";
import { addToCart as addCartItem } from "@/services/cart.service";
import type { Product } from "@/types";

export function ProductCard({ product, isAuthenticated = false }: { product: Product; isAuthenticated?: boolean }) {
  const { user } = useAuth();
  const router = useRouter();
  const { pushToast } = useToast();
  const [pendingAction, setPendingAction] = useState<"cart" | "buy" | null>(null);
  const detailHref = getProtectedHref(isAuthenticated, `/products/${product.id}`);
  const cartHref = getProtectedHref(isAuthenticated, "/cart");

  async function addToCart(action: "cart" | "buy") {
    if (!isAuthenticated) {
      router.push(cartHref);
      return;
    }

    setPendingAction(action);
    try {
      if (!user) throw new Error("Authentication required.");
      await addCartItem(user.id, product.id);
      pushToast("Đã thêm vào giỏ", product.name);
      if (action === "buy") {
        router.push("/cart");
      }
    } catch {
      pushToast("Không thể thêm vào giỏ", "Vui lòng thử lại sau.");
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
          {product.is_recommended ? <span className="rounded-full bg-emerald-100 px-2 py-1 text-xs font-semibold text-emerald-700">Goi y</span> : null}
        </div>
        <h3 className="mt-2 text-lg font-bold text-slate-950">{product.name}</h3>
        <p className="mt-2 line-clamp-2 text-sm text-slate-600">{product.description}</p>
        <p className="mt-4 font-bold text-emerald-700">{formatCurrency(product.price)}</p>
        <div className="mt-auto grid gap-2 pt-4">
          <Link href={detailHref}>
            <Button variant="secondary" className="w-full">Xem chi tiết</Button>
          </Link>
          <div className="grid grid-cols-2 gap-2">
            <Button
              variant="ghost"
              className="w-full"
              onClick={() => void addToCart("cart")}
              disabled={pendingAction !== null}
            >
              {pendingAction === "cart" ? "Đang thêm..." : "Thêm vào giỏ"}
            </Button>
            <Button
              className="w-full"
              onClick={() => void addToCart("buy")}
              disabled={pendingAction !== null}
            >
              {pendingAction === "buy" ? "Đang thêm..." : "Mua ngay"}
            </Button>
          </div>
        </div>
      </div>
    </Card>
  );
}
