"use client";

import { useEffect, useState } from "react";
import { ChevronDown } from "lucide-react";

import { ProductCard } from "@/components/ProductCard";
import { useAuth } from "@/hooks/useAuth";
import { getProductCategories, getProducts } from "@/services/products.service";
import type { Product } from "@/types";

export default function ProductsPage() {
  const { isAuthenticated } = useAuth();
  const [category, setCategory] = useState("");
  const [categories, setCategories] = useState<string[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [categoryMenuOpen, setCategoryMenuOpen] = useState(false);

  useEffect(() => {
    void getProductCategories()
      .then(setCategories)
      .catch(() => setCategories([]));
  }, []);

  useEffect(() => {
    setLoading(true);
    void getProducts({ category: category || undefined })
      .then(setProducts)
      .catch(() => setProducts([]))
      .finally(() => setLoading(false));
  }, [category]);

  function selectCategory(nextCategory: string) {
    setCategory(nextCategory);
    setCategoryMenuOpen(false);
  }

  return (
    <section className="mx-auto max-w-7xl px-4 py-10">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div><p className="text-sm font-bold uppercase text-emerald-700">Marketplace</p><h1 className="text-3xl font-bold text-slate-950">Dụng cụ hỗ trợ phục hồi</h1></div>
        <div className="relative" onBlur={(event) => {
          if (!event.currentTarget.contains(event.relatedTarget)) {
            setCategoryMenuOpen(false);
          }
        }}>
          <button
            type="button"
            className="inline-flex min-h-11 min-w-56 items-center justify-between gap-3 rounded-lg border border-slate-300 bg-white px-3 py-2 text-left text-sm font-medium text-slate-800 transition hover:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
            aria-haspopup="listbox"
            aria-expanded={categoryMenuOpen}
            onClick={() => setCategoryMenuOpen((open) => !open)}
          >
            <span>{category || "Tất cả danh mục"}</span>
            <ChevronDown className="h-4 w-4 text-slate-500" />
          </button>

          {categoryMenuOpen ? (
            <div className="absolute right-0 z-50 mt-2 max-h-72 w-72 overflow-auto rounded-lg border border-slate-200 bg-white py-1 shadow-lg" role="listbox">
              <button
                type="button"
                className={`block w-full px-3 py-2 text-left text-sm transition hover:bg-emerald-50 ${category === "" ? "bg-emerald-50 font-semibold text-emerald-700" : "text-slate-700"}`}
                role="option"
                aria-selected={category === ""}
                onClick={() => selectCategory("")}
              >
                Tất cả danh mục
              </button>
              {categories.map((item) => (
                <button
                  key={item}
                  type="button"
                  className={`block w-full px-3 py-2 text-left text-sm transition hover:bg-emerald-50 ${category === item ? "bg-emerald-50 font-semibold text-emerald-700" : "text-slate-700"}`}
                  role="option"
                  aria-selected={category === item}
                  onClick={() => selectCategory(item)}
                >
                  {item}
                </button>
              ))}
            </div>
          ) : null}
        </div>
      </div>
      {loading ? <p className="mt-8 text-slate-500">Đang tải sản phẩm...</p> : <div className="mt-8 grid gap-5 md:grid-cols-2 lg:grid-cols-3">{products.map((product) => <ProductCard key={product.id} product={product} isAuthenticated={isAuthenticated} />)}</div>}
      {!loading && !products.length ? <p className="mt-8 text-slate-500">Chưa có sản phẩm trong danh mục này. Vui lòng quay lại sau.</p> : null}
    </section>
  );
}
