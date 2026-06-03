"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createPortal } from "react-dom";
import { Search, X } from "lucide-react";
import type { CSSProperties, KeyboardEvent } from "react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { getProductStockBadgeClass, getProductStockLabel } from "@/lib/product-stock";
import { formatCurrency, getImageUrl } from "@/lib/utils";
import { getPublicProductCategoryNames } from "@/services/product-categories.service";
import { searchPublicProducts } from "@/services/products.service";
import type { Product } from "@/types";

const RESULT_LIMIT = 8;

export function PublicProductSearch() {
  const router = useRouter();
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const panelRef = useRef<HTMLDivElement | null>(null);
  const [query, setQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("");
  const [categories, setCategories] = useState<string[]>([]);
  const [recommendedProducts, setRecommendedProducts] = useState<Product[]>([]);
  const [results, setResults] = useState<Product[]>([]);
  const [panelOpen, setPanelOpen] = useState(false);
  const [panelStyle, setPanelStyle] = useState<CSSProperties>({});
  const [mounted, setMounted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [bootstrapped, setBootstrapped] = useState(false);
  const [error, setError] = useState("");

  const trimmedQuery = query.trim();
  const hasSearchContext = Boolean(trimmedQuery || selectedCategory);
  const visibleRecommendedProducts = useMemo(() => recommendedProducts.slice(0, 4), [recommendedProducts]);
  const updatePanelPosition = useCallback(() => {
    const wrapper = wrapperRef.current;
    if (!wrapper) return;

    const margin = 16;
    const gap = 12;
    const rect = wrapper.getBoundingClientRect();
    const availableBelow = window.innerHeight - rect.bottom - gap - margin;
    const availableAbove = rect.top - gap - margin;
    const useAbove = availableBelow < 260 && availableAbove > availableBelow;
    const availableHeight = useAbove ? availableAbove : availableBelow;
    const panelMaxHeight = Math.min(520, Math.max(180, availableHeight));
    const panelWidth = Math.min(rect.width, window.innerWidth - margin * 2);

    setPanelStyle({
      left: Math.min(Math.max(margin, rect.left), window.innerWidth - margin - panelWidth),
      maxHeight: panelMaxHeight,
      top: useAbove ? Math.max(margin, rect.top - gap - panelMaxHeight) : rect.bottom + gap,
      width: panelWidth
    });
  }, []);

  const openPanel = useCallback(() => {
    updatePanelPosition();
    setPanelOpen(true);
  }, [updatePanelPosition]);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      const target = event.target as Node;
      const clickedInput = wrapperRef.current?.contains(target);
      const clickedPanel = panelRef.current?.contains(target);

      if (!clickedInput && !clickedPanel) {
        setPanelOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    if (!panelOpen) return undefined;

    updatePanelPosition();
    window.addEventListener("resize", updatePanelPosition);
    window.addEventListener("scroll", updatePanelPosition, true);

    return () => {
      window.removeEventListener("resize", updatePanelPosition);
      window.removeEventListener("scroll", updatePanelPosition, true);
    };
  }, [panelOpen, updatePanelPosition]);

  async function loadInitialSuggestions() {
    if (bootstrapped) return;

    setBootstrapped(true);
    try {
      const [categoryNames, recommended] = await Promise.all([
        getPublicProductCategoryNames(),
        searchPublicProducts({ recommended: true, limit: 4 })
      ]);
      setCategories(categoryNames);
      setRecommendedProducts(recommended);
    } catch {
      setCategories([]);
      setRecommendedProducts([]);
    }
  }

  useEffect(() => {
    if (!panelOpen || !hasSearchContext) {
      if (!hasSearchContext) setResults([]);
      return undefined;
    }

    const timeoutId = window.setTimeout(() => {
      setLoading(true);
      setError("");
      void searchPublicProducts({
        query: trimmedQuery,
        category: selectedCategory || undefined,
        limit: RESULT_LIMIT
      })
        .then(setResults)
        .catch((searchError) => {
          setResults([]);
          setError(searchError instanceof Error ? searchError.message : "Không thể tìm kiếm sản phẩm.");
        })
        .finally(() => setLoading(false));
    }, 180);

    return () => window.clearTimeout(timeoutId);
  }, [hasSearchContext, panelOpen, selectedCategory, trimmedQuery]);

  function openProduct(productId: string) {
    setPanelOpen(false);
    router.push(`/patient/products/${productId}`);
  }

  function clearSearch() {
    setQuery("");
    setSelectedCategory("");
    setResults([]);
    setError("");
  }

  function chooseCategory(category: string) {
    setSelectedCategory(category);
    setQuery("");
    openPanel();
  }

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Escape") {
      setPanelOpen(false);
      return;
    }

    if (event.key === "Enter") {
      event.preventDefault();
      if (results[0]) {
        openProduct(results[0].id);
        return;
      }
      router.push("/patient/products");
    }
  }

  function renderProductRow(product: Product) {
    return (
      <Link
        key={product.id}
        href={`/patient/products/${product.id}`}
        className="grid w-full grid-cols-[56px_1fr] gap-3 rounded-lg px-2 py-2 text-left transition hover:bg-emerald-50"
        onClick={() => setPanelOpen(false)}
      >
        <Image
          alt={product.name}
          className="h-14 w-14 rounded-lg object-cover"
          height={56}
          src={getImageUrl(product.image_url)}
          unoptimized
          width={56}
        />
        <span className="min-w-0">
          <span className="block truncate text-sm font-bold text-slate-950">{product.name}</span>
          <span className="mt-1 flex flex-wrap items-center gap-2 text-xs text-slate-500">
            <span>{product.category}</span>
            <span className={`rounded-full px-2 py-0.5 font-bold ${getProductStockBadgeClass(product.stock_quantity)}`}>
              {getProductStockLabel(product.stock_quantity)}
            </span>
          </span>
          <span className="mt-1 block text-sm font-bold text-emerald-700">{formatCurrency(Number(product.price || 0))}</span>
        </span>
      </Link>
    );
  }

  const panel =
    panelOpen && mounted
      ? createPortal(
          <div
            ref={panelRef}
            className="fixed z-[9999] overflow-y-auto overscroll-contain rounded-lg border border-slate-200 bg-white p-4 shadow-2xl shadow-emerald-950/15"
            data-product-search-panel="true"
            style={panelStyle}
          >
            {selectedCategory ? (
              <div className="mb-3 flex items-center justify-between gap-3 rounded-lg bg-emerald-50 px-3 py-2">
                <p className="text-sm font-bold text-emerald-800">Đang lọc: {selectedCategory}</p>
                <button type="button" className="text-xs font-bold text-emerald-700" onClick={clearSearch}>
                  Bỏ lọc
                </button>
              </div>
            ) : null}

            {!hasSearchContext ? (
              <div className="grid gap-4">
                {categories.length ? (
                  <div>
                    <p className="text-xs font-bold uppercase text-slate-500">Danh mục phục hồi</p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {categories.slice(0, 8).map((category) => (
                        <button
                          key={category}
                          type="button"
                          className="rounded-full border border-emerald-100 bg-emerald-50 px-3 py-1.5 text-sm font-semibold text-emerald-700 transition hover:border-emerald-300 hover:bg-emerald-100"
                          onClick={() => chooseCategory(category)}
                        >
                          {category}
                        </button>
                      ))}
                    </div>
                  </div>
                ) : null}

                {visibleRecommendedProducts.length ? (
                  <div>
                    <p className="text-xs font-bold uppercase text-slate-500">Sản phẩm gợi ý</p>
                    <div className="mt-2 grid gap-1">{visibleRecommendedProducts.map(renderProductRow)}</div>
                  </div>
                ) : (
                  <p className="text-sm text-slate-500">Nhập tên sản phẩm hoặc danh mục để bắt đầu tìm kiếm.</p>
                )}
              </div>
            ) : (
              <div>
                <div className="mb-2 flex items-center justify-between gap-3">
                  <p className="text-xs font-bold uppercase text-slate-500">Kết quả tìm kiếm</p>
                  {loading ? <span className="text-xs font-semibold text-emerald-700">Đang tìm...</span> : null}
                </div>
                {error ? (
                  <p className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm font-semibold text-rose-700">
                    {error}
                  </p>
                ) : results.length ? (
                  <div className="grid gap-1">{results.map(renderProductRow)}</div>
                ) : !loading ? (
                  <p className="rounded-lg bg-slate-50 px-3 py-3 text-sm font-semibold text-slate-600">
                    Không tìm thấy sản phẩm phù hợp.
                  </p>
                ) : null}
              </div>
            )}
          </div>,
          document.body
        )
      : null;

  return (
    <div ref={wrapperRef} className="relative z-[80] mt-8 max-w-3xl" data-product-search="homepage">
      <div className="rounded-lg border border-emerald-100 bg-white p-2 shadow-xl shadow-emerald-950/10">
        <div
          className="flex items-center gap-3 rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 focus-within:border-emerald-400 focus-within:bg-white focus-within:ring-4 focus-within:ring-emerald-100"
          onClick={() => {
            openPanel();
            void loadInitialSuggestions();
          }}
          onMouseDown={() => {
            openPanel();
            void loadInitialSuggestions();
          }}
        >
          <Search className="h-5 w-5 flex-none text-emerald-600" />
          <input
            className="min-w-0 flex-1 bg-transparent text-base font-semibold text-slate-900 outline-none placeholder:text-slate-400"
            placeholder="Tìm sản phẩm, danh mục phục hồi..."
            value={query}
            onChange={(event) => {
              setQuery(event.target.value);
              setSelectedCategory("");
              openPanel();
            }}
            onFocus={() => {
              openPanel();
              void loadInitialSuggestions();
            }}
            onKeyDown={handleKeyDown}
          />
          {query || selectedCategory ? (
            <button
              type="button"
              aria-label="Xóa tìm kiếm"
              className="rounded-full p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
              onClick={clearSearch}
            >
              <X className="h-4 w-4" />
            </button>
          ) : null}
        </div>
      </div>

      {panel}
    </div>
  );
}
