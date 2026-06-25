"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  Activity,
  Bandage,
  ChevronDown,
  Dumbbell,
  Footprints,
  Grid3X3,
  Hand,
  Headphones,
  Heart,
  MoreHorizontal,
  PackageCheck,
  RefreshCcw,
  Search,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles,
  Star,
  Truck,
  Zap,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

import { ProductCard } from "@/components/ProductCard";
import { useAuth } from "@/hooks/useAuth";
import { getProductStockState } from "@/lib/product-stock";
import { clsx, getImageUrl } from "@/lib/utils";
import { getProductCategories, getProducts } from "@/services/products.service";
import type { Product } from "@/types";

type PriceFilter = "all" | "under-200" | "200-500" | "500-1000" | "over-1000";
type SortOption = "latest" | "oldest" | "price-asc" | "price-desc" | "stock-asc" | "stock-desc";

type CategoryQuickCard = {
  label: string;
  icon: LucideIcon;
  keywords: string[];
};

const CATEGORY_CARDS: CategoryQuickCard[] = [
  { label: "Tất cả danh mục", icon: Grid3X3, keywords: [] },
  { label: "Dụng cụ tập tay", icon: Hand, keywords: ["tay", "ban tay", "co tay", "cam nam"] },
  { label: "Dụng cụ tập chân", icon: Footprints, keywords: ["chan", "goi", "hong"] },
  { label: "Dụng cụ tập vai", icon: Dumbbell, keywords: ["vai", "canh tay"] },
  { label: "Hỗ trợ di chuyển", icon: Activity, keywords: ["di chuyen", "tap di", "khung", "thang bang"] },
  { label: "Nẹp & băng hỗ trợ", icon: Bandage, keywords: ["nep", "bang", "ho tro"] },
  { label: "Tiện ích chăm sóc", icon: Heart, keywords: ["cham soc", "tai nha", "tien ich"] },
  { label: "Thiết bị điện trị liệu", icon: Zap, keywords: ["dien", "xung", "tri lieu", "thiet bi"] },
  { label: "Khác", icon: MoreHorizontal, keywords: ["khac"] },
];

const PRICE_OPTIONS: Array<{ value: PriceFilter; label: string }> = [
  { value: "all", label: "Khoảng giá" },
  { value: "under-200", label: "Dưới 200.000đ" },
  { value: "200-500", label: "200.000đ - 500.000đ" },
  { value: "500-1000", label: "500.000đ - 1.000.000đ" },
  { value: "over-1000", label: "Trên 1.000.000đ" },
];

const SORT_OPTIONS: Array<{ value: SortOption; label: string }> = [
  { value: "latest", label: "Mới nhất" },
  { value: "oldest", label: "Cũ nhất" },
  { value: "price-asc", label: "Giá tăng dần" },
  { value: "price-desc", label: "Giá giảm dần" },
  { value: "stock-asc", label: "Tồn kho tăng dần" },
  { value: "stock-desc", label: "Tồn kho giảm dần" },
];

function normalizeText(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function findMatchingCategory(card: CategoryQuickCard, categories: string[]) {
  if (!card.keywords.length) return "";
  const label = normalizeText(card.label);

  return (
    categories.find((category) => {
      const normalizedCategory = normalizeText(category);
      return normalizedCategory.includes(label) || card.keywords.some((keyword) => normalizedCategory.includes(keyword));
    }) || ""
  );
}

function isProductInPriceRange(product: Product, filter: PriceFilter) {
  if (filter === "all") return true;
  if (filter === "under-200") return product.price < 200000;
  if (filter === "200-500") return product.price >= 200000 && product.price <= 500000;
  if (filter === "500-1000") return product.price > 500000 && product.price <= 1000000;
  return product.price > 1000000;
}

function sortProducts(products: Product[], sortBy: SortOption) {
  return [...products].sort((a, b) => {
    if (sortBy === "price-asc") return a.price - b.price;
    if (sortBy === "price-desc") return b.price - a.price;
    if (sortBy === "stock-asc") return a.stock_quantity - b.stock_quantity;
    if (sortBy === "stock-desc") return b.stock_quantity - a.stock_quantity;

    const dateA = a.created_at ? new Date(a.created_at).getTime() : 0;
    const dateB = b.created_at ? new Date(b.created_at).getTime() : 0;
    return sortBy === "oldest" ? dateA - dateB : dateB - dateA;
  });
}

export default function ProductsPage() {
  const { isAuthenticated } = useAuth();
  const [category, setCategory] = useState("");
  const [categories, setCategories] = useState<string[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [priceFilter, setPriceFilter] = useState<PriceFilter>("all");
  const [stockOnly, setStockOnly] = useState(false);
  const [sortBy, setSortBy] = useState<SortOption>("latest");

  useEffect(() => {
    let cancelled = false;

    async function loadProducts() {
      setLoading(true);
      try {
        const [nextCategories, nextProducts] = await Promise.all([getProductCategories(), getProducts()]);
        if (cancelled) return;
        setCategories(nextCategories);
        setProducts(nextProducts);
      } catch {
        if (cancelled) return;
        setCategories([]);
        setProducts([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void loadProducts();

    return () => {
      cancelled = true;
    };
  }, []);

  const filteredProducts = useMemo(() => {
    const normalizedSearch = normalizeText(searchTerm);
    const filtered = products.filter((product) => {
      const matchesSearch =
        !normalizedSearch ||
        [product.name, product.category, product.description || ""].some((value) => normalizeText(value).includes(normalizedSearch));
      const matchesCategory = !category || product.category === category;
      const matchesPrice = isProductInPriceRange(product, priceFilter);
      const matchesStock = !stockOnly || getProductStockState(product.stock_quantity) !== "out";

      return matchesSearch && matchesCategory && matchesPrice && matchesStock;
    });

    return sortProducts(filtered, sortBy);
  }, [category, priceFilter, products, searchTerm, sortBy, stockOnly]);

  const heroProducts = products.filter((product) => product.image_url).slice(0, 3);

  function resetFilters() {
    setCategory("");
    setSearchTerm("");
    setPriceFilter("all");
    setStockOnly(false);
    setSortBy("latest");
  }

  return (
    <section className="mx-auto max-w-[1500px] px-4 py-6 sm:px-6 lg:px-8">
      <div className="overflow-hidden rounded-[28px] border border-emerald-100 bg-gradient-to-br from-emerald-50 via-white to-sky-50 shadow-sm">
        <div className="grid gap-8 px-6 py-8 lg:grid-cols-[1.15fr_0.85fr] lg:px-8 lg:py-10">
          <div className="flex flex-col justify-center">
            <p className="text-xs font-extrabold uppercase tracking-[0.18em] text-emerald-700">MARKETPLACE</p>
            <h1 className="mt-4 max-w-2xl text-4xl font-black leading-tight text-slate-950 md:text-5xl">
              Dụng cụ hỗ trợ phục hồi
            </h1>
            <p className="mt-4 max-w-2xl text-base leading-7 text-slate-600">
              Sản phẩm chất lượng, an toàn và hiệu quả giúp bạn phục hồi chức năng tốt hơn mỗi ngày.
            </p>

            <div className="mt-7 grid gap-3 sm:grid-cols-3">
              <div className="rounded-2xl border border-emerald-100 bg-white/85 p-4 shadow-sm">
                <ShieldCheck className="h-6 w-6 text-emerald-600" />
                <p className="mt-3 text-sm font-bold text-slate-900">Chất lượng đảm bảo</p>
              </div>
              <div className="rounded-2xl border border-emerald-100 bg-white/85 p-4 shadow-sm">
                <Headphones className="h-6 w-6 text-emerald-600" />
                <p className="mt-3 text-sm font-bold text-slate-900">Tư vấn chuyên gia miễn phí</p>
              </div>
              <div className="rounded-2xl border border-emerald-100 bg-white/85 p-4 shadow-sm">
                <RefreshCcw className="h-6 w-6 text-emerald-600" />
                <p className="mt-3 text-sm font-bold text-slate-900">Đổi trả dễ dàng trong 7 ngày</p>
              </div>
            </div>
          </div>

          <div className="relative min-h-[260px]">
            <div className="absolute inset-0 rounded-[28px] bg-[radial-gradient(circle_at_35%_35%,rgba(16,185,129,0.16),transparent_36%),radial-gradient(circle_at_70%_65%,rgba(14,165,233,0.16),transparent_34%)]" />
            <div className="relative h-full rounded-[28px] border border-white/80 bg-white/55 p-5 shadow-inner">
              <div className="grid h-full grid-cols-[0.8fr_1fr] gap-4">
                <div className="flex flex-col justify-end gap-3">
                  <div className="rounded-3xl bg-white p-5 shadow-xl shadow-emerald-950/10">
                    <p className="text-sm font-bold text-slate-700">Ưu đãi phục hồi</p>
                    <p className="mt-3 text-3xl font-black text-emerald-700">Giảm đến 20%</p>
                    <p className="mt-2 text-sm leading-6 text-slate-600">Cho các dụng cụ hỗ trợ phục hồi</p>
                    <Link
                      href="#product-list"
                      className="mt-5 inline-flex rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-emerald-700"
                    >
                      Xem ngay
                    </Link>
                  </div>
                </div>

                <div className="relative hidden items-center justify-center sm:flex">
                  {heroProducts.length ? (
                    heroProducts.map((product, index) => (
                      <div
                        key={product.id}
                        className={clsx(
                          "absolute overflow-hidden rounded-3xl border border-white bg-white shadow-xl shadow-emerald-950/10",
                          index === 0 && "left-0 top-7 h-36 w-44 rotate-[-8deg]",
                          index === 1 && "right-0 top-0 h-40 w-48 rotate-[7deg]",
                          index === 2 && "bottom-0 left-14 h-36 w-48 rotate-[2deg]"
                        )}
                      >
                        <Image src={getImageUrl(product.image_url)} alt={product.name} fill className="object-cover" sizes="200px" />
                      </div>
                    ))
                  ) : (
                    <div className="flex h-48 w-56 items-center justify-center rounded-3xl border border-emerald-100 bg-white shadow-xl">
                      <PackageCheck className="h-16 w-16 text-emerald-500" />
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-7 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5 xl:grid-cols-9">
        {CATEGORY_CARDS.map((card) => {
          const Icon = card.icon;
          const resolvedCategory = findMatchingCategory(card, categories);
          const isAll = card.keywords.length === 0;
          const isActive = isAll ? category === "" : resolvedCategory && category === resolvedCategory;
          const isDisabled = !isAll && !resolvedCategory;

          return (
            <button
              key={card.label}
              type="button"
              disabled={isDisabled}
              title={isDisabled ? "Chưa có danh mục phù hợp trong dữ liệu hiện tại" : undefined}
              onClick={() => setCategory(isAll ? "" : resolvedCategory)}
              className={clsx(
                "flex min-h-28 flex-col items-center justify-center gap-3 rounded-2xl border bg-white px-3 py-4 text-center text-sm font-bold text-slate-800 shadow-sm transition",
                isActive && "border-emerald-300 bg-emerald-50 text-emerald-700 shadow-emerald-900/5",
                !isActive && "border-slate-200 hover:-translate-y-0.5 hover:border-emerald-200 hover:text-emerald-700 hover:shadow-md",
                isDisabled && "cursor-not-allowed opacity-55 hover:translate-y-0 hover:border-slate-200 hover:text-slate-800 hover:shadow-sm"
              )}
            >
              <span className={clsx("rounded-2xl p-3", isActive ? "bg-white text-emerald-700" : "bg-slate-50 text-slate-600")}>
                <Icon className="h-6 w-6" />
              </span>
              <span>{card.label}</span>
            </button>
          );
        })}
      </div>

      <div id="product-list" className="mt-5 rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="grid gap-3 lg:grid-cols-[1.35fr_0.9fr_0.9fr_0.75fr_0.75fr_0.9fr]">
          <label className="relative block">
            <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
            <input
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder="Tìm sản phẩm, dụng cụ hỗ trợ..."
              className="min-h-12 w-full rounded-xl border border-slate-200 bg-white pl-11 pr-4 text-sm font-medium text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-emerald-300 focus:ring-4 focus:ring-emerald-100"
            />
          </label>

          <SelectBox label="Danh mục" value={category} onChange={setCategory}>
            <option value="">Tất cả danh mục</option>
            {categories.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </SelectBox>

          <DisabledFilter label="Tất cả thương hiệu" />

          <SelectBox label="Giá" value={priceFilter} onChange={(value) => setPriceFilter(value as PriceFilter)}>
            {PRICE_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </SelectBox>

          <DisabledFilter label="Đánh giá" icon={<Star className="h-4 w-4" />} />

          <SelectBox label="Sắp xếp" value={sortBy} onChange={(value) => setSortBy(value as SortOption)}>
            {SORT_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </SelectBox>
        </div>

        <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
          <label className="inline-flex cursor-pointer items-center gap-3 rounded-full bg-slate-50 px-4 py-2 text-sm font-semibold text-slate-700">
            <input
              type="checkbox"
              checked={stockOnly}
              onChange={(event) => setStockOnly(event.target.checked)}
              className="h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
            />
            Chỉ xem hàng có sẵn
          </label>
          <div className="flex flex-wrap items-center gap-3 text-sm text-slate-500">
            <span>
              Hiển thị <strong className="text-slate-900">{filteredProducts.length}</strong> / {products.length} sản phẩm
            </span>
            <button type="button" onClick={resetFilters} className="font-bold text-emerald-700 transition hover:text-emerald-800">
              Đặt lại bộ lọc
            </button>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="mt-6 grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 8 }).map((_, index) => (
            <div key={index} className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
              <div className="h-48 animate-pulse bg-slate-100" />
              <div className="space-y-3 p-5">
                <div className="h-4 w-24 animate-pulse rounded bg-slate-100" />
                <div className="h-6 w-4/5 animate-pulse rounded bg-slate-100" />
                <div className="h-4 w-full animate-pulse rounded bg-slate-100" />
                <div className="h-11 w-full animate-pulse rounded-xl bg-slate-100" />
              </div>
            </div>
          ))}
        </div>
      ) : filteredProducts.length ? (
        <div className="mt-6 grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
          {filteredProducts.map((product) => (
            <ProductCard key={product.id} product={product} isAuthenticated={isAuthenticated} />
          ))}
        </div>
      ) : (
        <div className="mt-6 rounded-3xl border border-dashed border-emerald-200 bg-emerald-50/60 p-10 text-center">
          <SlidersHorizontal className="mx-auto h-10 w-10 text-emerald-600" />
          <h2 className="mt-4 text-xl font-black text-slate-950">Không tìm thấy sản phẩm phù hợp.</h2>
          <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-slate-600">
            Hãy thử bỏ bớt bộ lọc hoặc tìm bằng tên sản phẩm khác để tiếp tục mua sắm.
          </p>
          <button
            type="button"
            onClick={resetFilters}
            className="mt-5 rounded-xl bg-emerald-600 px-5 py-3 text-sm font-bold text-white transition hover:bg-emerald-700"
          >
            Xóa bộ lọc
          </button>
        </div>
      )}

      <div className="mt-8 grid gap-4 rounded-3xl border border-emerald-100 bg-gradient-to-r from-emerald-50 via-white to-emerald-50 p-5 sm:grid-cols-2 xl:grid-cols-4">
        <TrustItem icon={Truck} title="Giao hàng nhanh 24-48h" text="Toàn quốc" />
        <TrustItem icon={PackageCheck} title="Miễn phí giao hàng" text="Đơn từ 500.000đ" />
        <TrustItem icon={Headphones} title="Tư vấn 1:1 cùng chuyên gia" text="Hỗ trợ chọn sản phẩm phù hợp" />
        <TrustItem icon={ShieldCheck} title="Thanh toán an toàn" text="Qua ví RehabAI" />
      </div>
    </section>
  );
}

function SelectBox({
  label,
  value,
  onChange,
  children,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  children: React.ReactNode;
}) {
  return (
    <label className="relative block">
      <span className="sr-only">{label}</span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="min-h-12 w-full appearance-none rounded-xl border border-slate-200 bg-white px-4 pr-10 text-sm font-bold text-slate-700 outline-none transition focus:border-emerald-300 focus:ring-4 focus:ring-emerald-100"
      >
        {children}
      </select>
      <ChevronDown className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
    </label>
  );
}

function DisabledFilter({ label, icon }: { label: string; icon?: React.ReactNode }) {
  return (
    <button
      type="button"
      disabled
      className="inline-flex min-h-12 items-center justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50 px-4 text-sm font-bold text-slate-400"
      title="Chưa có dữ liệu cho bộ lọc này"
    >
      <span className="inline-flex items-center gap-2">
        {icon}
        {label}
      </span>
      <ChevronDown className="h-4 w-4" />
    </button>
  );
}

function TrustItem({ icon: Icon, title, text }: { icon: LucideIcon; title: string; text: string }) {
  return (
    <div className="flex items-center gap-4 rounded-2xl bg-white/70 p-4">
      <span className="rounded-2xl bg-emerald-100 p-3 text-emerald-700">
        <Icon className="h-6 w-6" />
      </span>
      <div>
        <p className="font-extrabold text-emerald-800">{title}</p>
        <p className="mt-1 text-sm text-slate-600">{text}</p>
      </div>
    </div>
  );
}
