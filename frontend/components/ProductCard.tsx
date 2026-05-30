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
  const { profile, user } = useAuth();
  const router = useRouter();
  const { pushToast } = useToast();
  const [pendingAction, setPendingAction] = useState<"cart" | "buy" | null>(null);
  const canBuy = profile?.account_type === "patient";
  const isOutOfStock = product.stock_quantity <= 0;
  const detailHref = `/patient/products/${product.id}`;
  const cartHref = getProtectedHref(isAuthenticated, "/patient/cart");

  async function addToCart(action: "cart" | "buy") {
    if (!isAuthenticated) {
      pushToast("Can dang nhap", "Dang nhap bang tai khoan Benh nhan de mua san pham.");
      router.push(cartHref);
      return;
    }

    if (!canBuy) {
      pushToast("Chi Benh nhan moi co the mua hang", "Tai khoan Bac si va Admin chi duoc xem san pham trong MVP.");
      return;
    }

    if (isOutOfStock) {
      pushToast("San pham da het hang", "Vui long chon san pham khac.");
      return;
    }

    setPendingAction(action);
    try {
      if (!user) throw new Error("Authentication required.");
      await addCartItem(user.id, product.id);
      pushToast("Da them vao gio", product.name);
      if (action === "buy") {
        router.push("/patient/cart");
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "Vui long thu lai sau.";
      pushToast("Khong the them vao gio", message);
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
            <span className="rounded-full bg-emerald-100 px-2 py-1 text-xs font-semibold text-emerald-700">Goi y</span>
          ) : null}
        </div>
        <h3 className="mt-2 text-lg font-bold text-slate-950">{product.name}</h3>
        <p className="mt-2 line-clamp-2 text-sm text-slate-600">{product.description}</p>
        <p className="mt-4 font-bold text-emerald-700">{formatCurrency(product.price)}</p>
        <p className="mt-1 text-xs font-semibold text-slate-500">
          {isOutOfStock ? "Het hang" : `Con ${product.stock_quantity} san pham`}
        </p>
        <div className="mt-auto grid gap-2 pt-4">
          <Link href={detailHref}>
            <Button variant="secondary" className="w-full">
              Xem chi tiet
            </Button>
          </Link>
          {isAuthenticated && !canBuy ? (
            <p className="rounded-lg bg-slate-100 px-3 py-2 text-center text-xs font-semibold text-slate-600">
              Tai khoan nay chi duoc xem san pham.
            </p>
          ) : (
            <div className="grid grid-cols-2 gap-2">
              <Button
                variant="ghost"
                className="w-full"
                onClick={() => void addToCart("cart")}
                disabled={pendingAction !== null || isOutOfStock}
              >
                {pendingAction === "cart" ? "Dang them..." : "Them vao gio"}
              </Button>
              <Button
                className="w-full"
                onClick={() => void addToCart("buy")}
                disabled={pendingAction !== null || isOutOfStock}
              >
                {pendingAction === "buy" ? "Dang them..." : "Mua ngay"}
              </Button>
            </div>
          )}
        </div>
      </div>
    </Card>
  );
}
