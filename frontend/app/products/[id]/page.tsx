"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";

import { Button } from "@/components/Button";
import { Card } from "@/components/Card";
import { RequireAuth } from "@/components/auth/RequireAuth";
import { formatCurrency } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/useToast";
import { addToCart as addCartItem } from "@/services/cart.service";
import { getProductById } from "@/services/products.service";
import type { Product } from "@/types";

export default function ProductDetailPage({ params }: { params: { id: string } }) {
  const { user } = useAuth();
  const { pushToast } = useToast();
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    void getProductById(params.id).then(setProduct);
  }, [params.id]);

  async function addToCart() {
    if (!product) return;
    if (!user) return;
    setLoading(true);
    await addCartItem(user.id, product.id);
    setLoading(false);
    pushToast("Đã thêm vào giỏ", product.name);
  }

  if (!product) return <RequireAuth><section className="mx-auto max-w-7xl px-4 py-10 text-slate-500">Đang tải sản phẩm...</section></RequireAuth>;

  return (
    <RequireAuth>
    <section className="mx-auto grid max-w-7xl gap-8 px-4 py-10 lg:grid-cols-2">
      <Image
        src={product.image_url || "/images/placeholders/rehab-equipment.jpg"}
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
          <Link href="/cart"><Button variant="secondary">Đến giỏ hàng</Button></Link>
        </div>
      </Card>
    </section>
    </RequireAuth>
  );
}
