"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { Button } from "@/components/Button";
import { Card } from "@/components/Card";
import { getProtectedHref } from "@/lib/auth-navigation";
import { formatCurrency, getImageUrl } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/useToast";
import { addToCart as addCartItem } from "@/services/cart.service";
import { getProductById } from "@/services/products.service";
import type { Product } from "@/types";

export default function ProductDetailPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const { isAuthenticated, profile, user } = useAuth();
  const { pushToast } = useToast();
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [pendingAction, setPendingAction] = useState<"cart" | "buy" | null>(null);
  const canBuy = profile?.account_type === "patient";
  const isOutOfStock = (product?.stock_quantity || 0) <= 0;

  useEffect(() => {
    setLoading(true);
    void getProductById(params.id)
      .then(setProduct)
      .finally(() => setLoading(false));
  }, [params.id]);

  async function addToCart(action: "cart" | "buy") {
    if (!product) return;

    if (!isAuthenticated) {
      pushToast("Can dang nhap", "Dang nhap bang tai khoan Benh nhan de mua san pham.");
      router.push(getProtectedHref(false, "/patient/cart"));
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

  if (loading) {
    return <section className="mx-auto max-w-7xl px-4 py-10 text-slate-500">Dang tai san pham...</section>;
  }

  if (!product) {
    return (
      <section className="mx-auto max-w-3xl px-4 py-16">
        <Card>
          <h1 className="text-2xl font-bold text-slate-950">Khong tim thay san pham</h1>
          <p className="mt-2 text-slate-600">San pham nay khong ton tai hoac khong con duoc hien thi cong khai.</p>
          <Link href="/patient/products" className="mt-5 inline-flex">
            <Button variant="secondary">Quay lai danh sach san pham</Button>
          </Link>
        </Card>
      </section>
    );
  }

  return (
    <section className="mx-auto grid max-w-7xl gap-8 px-4 py-10 lg:grid-cols-2">
      <Image
        src={getImageUrl(product.image_url)}
        alt={product.name}
        width={1000}
        height={720}
        className="h-[460px] w-full rounded-lg object-cover"
      />
      <Card>
        <p className="font-semibold text-emerald-700">{product.category}</p>
        <h1 className="mt-2 text-3xl font-bold text-slate-950">{product.name}</h1>
        <p className="mt-4 text-slate-600">{product.description}</p>
        <p className="mt-6 text-3xl font-bold text-emerald-700">{formatCurrency(product.price)}</p>
        <p className="mt-2 text-sm text-slate-500">
          {isOutOfStock ? "San pham da het hang" : `So luong san pham con lai: ${product.stock_quantity}`}
        </p>

        {isAuthenticated && !canBuy ? (
          <p className="mt-8 rounded-lg bg-slate-100 px-4 py-3 text-sm font-semibold text-slate-600">
            Tai khoan Bac si/Admin chi duoc xem san pham va khong the mua hang trong MVP.
          </p>
        ) : (
          <div className="mt-8 flex flex-wrap gap-3">
            <Button onClick={() => void addToCart("cart")} disabled={pendingAction !== null || isOutOfStock}>
              {pendingAction === "cart" ? "Dang them..." : "Them vao gio"}
            </Button>
            <Button onClick={() => void addToCart("buy")} disabled={pendingAction !== null || isOutOfStock}>
              {pendingAction === "buy" ? "Dang them..." : "Mua ngay"}
            </Button>
            {canBuy ? (
              <Link href="/patient/cart">
                <Button variant="secondary">Den gio hang</Button>
              </Link>
            ) : null}
          </div>
        )}
      </Card>
    </section>
  );
}
