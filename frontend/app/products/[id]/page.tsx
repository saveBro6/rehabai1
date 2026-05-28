"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { Button } from "@/components/Button";
import { Card } from "@/components/Card";
import { ProductImage } from "@/components/ProductImage";
import { getProtectedHref } from "@/lib/auth-navigation";
import { formatCurrency } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/useToast";
import { addToCart as addCartItem } from "@/services/cart.service";
import { getProductById } from "@/services/products.service";
import type { Product } from "@/types";

export default function ProductDetailPage({ params }: { params: { id: string } }) {
  const { user, isAuthenticated } = useAuth();
  const router = useRouter();
  const { pushToast } = useToast();
  const [product, setProduct] = useState<Product | null>(null);
  const [loadingProduct, setLoadingProduct] = useState(true);
  const [loading, setLoading] = useState(false);
  const cartHref = getProtectedHref(isAuthenticated, "/cart");

  useEffect(() => {
    let active = true;

    setLoadingProduct(true);
    void getProductById(params.id)
      .then((data) => {
        if (active) setProduct(data);
      })
      .catch(() => {
        if (active) setProduct(null);
      })
      .finally(() => {
        if (active) setLoadingProduct(false);
      });

    return () => {
      active = false;
    };
  }, [params.id]);

  async function addToCart() {
    if (!product) return;
    if (!user) {
      router.push(cartHref);
      return;
    }

    setLoading(true);
    try {
      await addCartItem(user.id, product.id);
      pushToast("Đã thêm vào giỏ", product.name);
    } catch {
      pushToast("Không thể thêm vào giỏ", "Sản phẩm có thể đã ngừng bán hoặc vượt quá tồn kho.");
    } finally {
      setLoading(false);
    }
  }

  if (loadingProduct) {
    return <section className="mx-auto max-w-7xl px-4 py-10 text-slate-500">Đang tải sản phẩm...</section>;
  }

  if (!product) {
    return (
      <section className="mx-auto max-w-7xl px-4 py-10">
        <Card>
          <h1 className="text-2xl font-bold text-slate-950">Không tìm thấy sản phẩm</h1>
          <p className="mt-2 text-slate-600">Sản phẩm không tồn tại hoặc đã ngừng bán.</p>
          <Link className="mt-5 inline-flex" href="/products">
            <Button>Xem sản phẩm khác</Button>
          </Link>
        </Card>
      </section>
    );
  }

  return (
    <section className="mx-auto grid max-w-7xl gap-8 px-4 py-10 lg:grid-cols-2">
      <ProductImage
        src={product.image_url}
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
        <p className="mt-2 text-sm text-slate-500">Số lượng sản phẩm còn lại: {product.stock_quantity}</p>
        <div className="mt-8 flex gap-3">
          <Button onClick={addToCart} disabled={loading}>{loading ? "Đang thêm..." : "Thêm vào giỏ"}</Button>
          <Link href={cartHref}><Button variant="secondary">Đến giỏ hàng</Button></Link>
        </div>
      </Card>
    </section>
  );
}
