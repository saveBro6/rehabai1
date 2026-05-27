"use client";

import { useEffect, useState } from "react";

import { ProductCard } from "@/components/ProductCard";
import { productCategories } from "@/lib/constants";
import { useAuth } from "@/hooks/useAuth";
import { getProducts } from "@/services/products.service";
import type { Product } from "@/types";

export default function ProductsPage() {
  const { isAuthenticated } = useAuth();
  const [category, setCategory] = useState("");
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    void getProducts({ category: category || undefined }).then((data) => {
      setProducts(data);
      setLoading(false);
    });
  }, [category]);

  return (
    <section className="mx-auto max-w-7xl px-4 py-10">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div><p className="text-sm font-bold uppercase text-emerald-700">Marketplace</p><h1 className="text-3xl font-bold text-slate-950">Dụng cụ hỗ trợ phục hồi</h1></div>
        <select className="rounded-lg border border-slate-300 px-3 py-2" value={category} onChange={(event) => setCategory(event.target.value)}>
          <option value="">Tất cả danh mục</option>
          {productCategories.map((item) => <option key={item} value={item}>{item}</option>)}
        </select>
      </div>
      {loading ? <p className="mt-8 text-slate-500">Đang tải sản phẩm...</p> : <div className="mt-8 grid gap-5 md:grid-cols-2 lg:grid-cols-3">{products.map((product) => <ProductCard key={product.id} product={product} isAuthenticated={isAuthenticated} />)}</div>}
      {!loading && !products.length ? <p className="mt-8 text-slate-500">Chưa có sản phẩm trong danh mục này. Vui lòng quay lại sau.</p> : null}
    </section>
  );
}
