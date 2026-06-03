"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";

import { Button } from "@/components/Button";
import { Card } from "@/components/Card";
import { ProductCategoryManager } from "@/components/admin/ProductCategoryManager";
import { RequireAdmin } from "@/components/auth/RequireAdmin";
import {
  getProductStockBadgeClass,
  getProductStockLabel,
  getProductStockState,
  getProductVisibilityBadgeClass,
  getProductVisibilityLabel,
  getProductVisibilityState
} from "@/lib/product-stock";
import { formatCurrency, getImageUrl } from "@/lib/utils";
import { getAdminProductCategoryRows } from "@/services/product-categories.service";
import { getAdminProducts, setProductActive } from "@/services/products.service";
import type { Product } from "@/types";

const PAGE_SIZE = 10;

type VisibilityFilter = "all" | "published" | "stopped";
type StockFilter = "all" | "available" | "low" | "out";
type SortOption = "newest" | "oldest" | "price-asc" | "price-desc" | "stock-asc" | "stock-desc";

function formatDate(value?: string | null) {
  if (!value) return "Chưa rõ";
  return new Intl.DateTimeFormat("vi-VN", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
}

function normalizeSearch(value: string) {
  return value.trim().toLocaleLowerCase("vi");
}

function compareDate(left?: string | null, right?: string | null) {
  return new Date(left || 0).getTime() - new Date(right || 0).getTime();
}

export default function AdminProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [categoryOptions, setCategoryOptions] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [updatingProductId, setUpdatingProductId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [visibilityFilter, setVisibilityFilter] = useState<VisibilityFilter>("all");
  const [stockFilter, setStockFilter] = useState<StockFilter>("all");
  const [sortOption, setSortOption] = useState<SortOption>("newest");
  const [page, setPage] = useState(1);

  const loadProducts = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [productRows, categoryRows] = await Promise.all([getAdminProducts(), getAdminProductCategoryRows()]);
      setProducts(productRows);
      setCategoryOptions(
        categoryRows
          .filter((category) => category.is_active)
          .map((category) => category.name)
          .sort((a, b) => a.localeCompare(b, "vi"))
      );
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Không thể tải danh sách sản phẩm.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadProducts();
  }, [loadProducts]);

  useEffect(() => {
    setPage(1);
  }, [searchTerm, categoryFilter, visibilityFilter, stockFilter, sortOption]);

  const filteredProducts = useMemo(() => {
    const query = normalizeSearch(searchTerm);

    const rows = products.filter((product) => {
      if (query) {
        const searchTarget = `${product.name} ${product.category} ${product.description || ""}`.toLocaleLowerCase("vi");
        if (!searchTarget.includes(query)) return false;
      }

      if (categoryFilter && product.category !== categoryFilter) return false;

      if (visibilityFilter !== "all" && getProductVisibilityState(product) !== visibilityFilter) return false;

      if (stockFilter !== "all" && getProductStockState(product.stock_quantity) !== stockFilter) return false;

      return true;
    });

    return [...rows].sort((left, right) => {
      if (sortOption === "oldest") return compareDate(left.created_at, right.created_at);
      if (sortOption === "price-asc") return Number(left.price || 0) - Number(right.price || 0);
      if (sortOption === "price-desc") return Number(right.price || 0) - Number(left.price || 0);
      if (sortOption === "stock-asc") return Number(left.stock_quantity || 0) - Number(right.stock_quantity || 0);
      if (sortOption === "stock-desc") return Number(right.stock_quantity || 0) - Number(left.stock_quantity || 0);
      return compareDate(right.created_at, left.created_at);
    });
  }, [categoryFilter, products, searchTerm, sortOption, stockFilter, visibilityFilter]);

  const totalPages = Math.max(1, Math.ceil(filteredProducts.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const pagedProducts = filteredProducts.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);
  const resultStart = filteredProducts.length ? (currentPage - 1) * PAGE_SIZE + 1 : 0;
  const resultEnd = Math.min(currentPage * PAGE_SIZE, filteredProducts.length);
  const hasActiveFilters =
    Boolean(searchTerm.trim()) || Boolean(categoryFilter) || visibilityFilter !== "all" || stockFilter !== "all" || sortOption !== "newest";

  async function toggleProductVisibility(product: Product) {
    setUpdatingProductId(product.id);
    setError("");
    try {
      await setProductActive(product.id, product.is_active === false);
      await loadProducts();
    } catch (updateError) {
      setError(updateError instanceof Error ? updateError.message : "Không thể cập nhật trạng thái sản phẩm.");
    } finally {
      setUpdatingProductId(null);
    }
  }

  function clearFilters() {
    setSearchTerm("");
    setCategoryFilter("");
    setVisibilityFilter("all");
    setStockFilter("all");
    setSortOption("newest");
    setPage(1);
  }

  return (
    <RequireAdmin>
      <section className="mx-auto max-w-7xl px-4 py-10">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm font-bold uppercase text-emerald-700">Admin products</p>
            <h1 className="text-3xl font-bold text-slate-950">Quản lý sản phẩm</h1>
            <p className="mt-2 max-w-2xl text-sm text-slate-600">
              Quản lý catalog sản phẩm commerce-only. Video bài tập phục hồi không thuộc Product module.
            </p>
          </div>
          <Link href="/admin/products/new">
            <Button>Tạo sản phẩm</Button>
          </Link>
        </div>

        {error ? (
          <Card className="mt-6 border-rose-200 bg-rose-50">
            <p className="text-sm font-semibold text-rose-700">{error}</p>
          </Card>
        ) : null}

        <Card className="mt-6">
          <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-sm font-bold uppercase text-emerald-700">Bộ lọc sản phẩm</p>
              <h2 className="text-xl font-bold text-slate-950">Tìm kiếm và sắp xếp catalog</h2>
            </div>
            <p className="text-sm text-slate-500">Áp dụng cho danh sách sản phẩm bên dưới.</p>
          </div>

          <div className="grid gap-4 lg:grid-cols-[1.3fr_repeat(4,minmax(0,1fr))]">
            <label className="grid gap-2 text-sm font-semibold text-slate-700" htmlFor="admin-product-search">
              Tìm kiếm
              <input
                id="admin-product-search"
                className="min-h-11 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-normal text-slate-900 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-100"
                placeholder="Tên, danh mục hoặc mô tả"
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
              />
            </label>

            <label className="grid gap-2 text-sm font-semibold text-slate-700" htmlFor="admin-product-category-filter">
              Danh mục
              <select
                id="admin-product-category-filter"
                className="min-h-11 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-normal text-slate-900 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-100"
                value={categoryFilter}
                onChange={(event) => setCategoryFilter(event.target.value)}
              >
                <option value="">Tất cả danh mục</option>
                {categoryOptions.map((category) => (
                  <option key={category} value={category}>
                    {category}
                  </option>
                ))}
              </select>
            </label>

            <label className="grid gap-2 text-sm font-semibold text-slate-700" htmlFor="admin-product-visibility-filter">
              Trạng thái
              <select
                id="admin-product-visibility-filter"
                className="min-h-11 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-normal text-slate-900 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-100"
                value={visibilityFilter}
                onChange={(event) => setVisibilityFilter(event.target.value as VisibilityFilter)}
              >
                <option value="all">Tất cả</option>
                <option value="published">Đã công khai</option>
                <option value="stopped">Ngừng bán</option>
              </select>
            </label>

            <label className="grid gap-2 text-sm font-semibold text-slate-700" htmlFor="admin-product-stock-filter">
              Tồn kho
              <select
                id="admin-product-stock-filter"
                className="min-h-11 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-normal text-slate-900 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-100"
                value={stockFilter}
                onChange={(event) => setStockFilter(event.target.value as StockFilter)}
              >
                <option value="all">Tất cả</option>
                <option value="available">Còn hàng</option>
                <option value="low">Sắp hết hàng</option>
                <option value="out">Hết hàng</option>
              </select>
            </label>

            <label className="grid gap-2 text-sm font-semibold text-slate-700" htmlFor="admin-product-sort">
              Sắp xếp
              <select
                id="admin-product-sort"
                className="min-h-11 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-normal text-slate-900 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-100"
                value={sortOption}
                onChange={(event) => setSortOption(event.target.value as SortOption)}
              >
                <option value="newest">Mới nhất</option>
                <option value="oldest">Cũ nhất</option>
                <option value="price-asc">Giá tăng dần</option>
                <option value="price-desc">Giá giảm dần</option>
                <option value="stock-asc">Tồn kho tăng dần</option>
                <option value="stock-desc">Tồn kho giảm dần</option>
              </select>
            </label>
          </div>

          <div className="mt-4 flex flex-col gap-3 border-t border-slate-100 pt-4 text-sm text-slate-600 sm:flex-row sm:items-center sm:justify-between">
            <p>
              Hiển thị <span className="font-semibold text-slate-900">{resultStart}-{resultEnd}</span> trong{" "}
              <span className="font-semibold text-slate-900">{filteredProducts.length}</span> sản phẩm phù hợp
              {filteredProducts.length !== products.length ? ` / ${products.length} tổng` : ""}.
            </p>
            {hasActiveFilters ? (
              <Button type="button" variant="ghost" onClick={clearFilters}>
                Xóa bộ lọc
              </Button>
            ) : null}
          </div>
        </Card>

        <Card className="mt-6 overflow-hidden p-0">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1040px] text-left text-sm">
              <thead className="bg-slate-50 text-slate-600">
                <tr>
                  <th className="px-5 py-3 font-semibold">Ảnh</th>
                  <th className="px-5 py-3 font-semibold">Tên sản phẩm</th>
                  <th className="px-5 py-3 font-semibold">Danh mục</th>
                  <th className="px-5 py-3 font-semibold">Giá</th>
                  <th className="px-5 py-3 font-semibold">Tồn kho</th>
                  <th className="px-5 py-3 font-semibold">Trạng thái</th>
                  <th className="px-5 py-3 font-semibold">Tạo lúc</th>
                  <th className="px-5 py-3 font-semibold">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  <tr>
                    <td className="px-5 py-6 text-slate-500" colSpan={8}>
                      Đang tải sản phẩm...
                    </td>
                  </tr>
                ) : pagedProducts.length ? (
                  pagedProducts.map((product) => (
                    <tr key={product.id}>
                      <td className="px-5 py-4">
                        <Image
                          alt={product.name}
                          className="h-16 w-16 rounded-lg object-cover"
                          height={64}
                          src={getImageUrl(product.image_url)}
                          unoptimized
                          width={64}
                        />
                      </td>
                      <td className="max-w-80 px-5 py-4">
                        <p className="font-semibold text-slate-950">{product.name}</p>
                        <p className="mt-1 line-clamp-2 text-xs text-slate-500">{product.description || "Chưa có mô tả"}</p>
                      </td>
                      <td className="px-5 py-4 text-slate-700">{product.category}</td>
                      <td className="px-5 py-4 font-semibold text-emerald-700">{formatCurrency(Number(product.price || 0))}</td>
                      <td className="px-5 py-4">
                        <div className="grid gap-1">
                          <span className="font-semibold text-slate-800">{product.stock_quantity}</span>
                          <span className={`w-fit rounded-full px-2.5 py-1 text-xs font-bold ${getProductStockBadgeClass(product.stock_quantity)}`}>
                            {getProductStockLabel(product.stock_quantity)}
                          </span>
                        </div>
                      </td>
                      <td className="px-5 py-4">
                        <span className={`inline-flex rounded-full px-3 py-1 text-xs font-bold ${getProductVisibilityBadgeClass(product)}`}>
                          {getProductVisibilityLabel(product)}
                        </span>
                        {product.is_recommended ? (
                          <span className="mt-2 block w-fit rounded-full bg-amber-100 px-3 py-1 text-xs font-bold text-amber-700">
                            Gợi ý
                          </span>
                        ) : null}
                      </td>
                      <td className="px-5 py-4 text-slate-700">{formatDate(product.created_at)}</td>
                      <td className="px-5 py-4">
                        <div className="flex flex-wrap gap-2">
                          <Link href={`/patient/products/${product.id}`}>
                            <Button variant="ghost">Xem</Button>
                          </Link>
                          <Link href={`/admin/products/${product.id}/edit`}>
                            <Button variant="secondary">Sửa</Button>
                          </Link>
                          {!product.deleted_at ? (
                            <Button
                              disabled={updatingProductId === product.id}
                              onClick={() => void toggleProductVisibility(product)}
                              variant="secondary"
                              type="button"
                            >
                              {updatingProductId === product.id
                                ? "Đang cập nhật..."
                                : product.is_active === false
                                  ? "Công khai lại"
                                  : "Ngừng bán"}
                            </Button>
                          ) : null}
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td className="px-5 py-6 text-slate-500" colSpan={8}>
                      Không tìm thấy sản phẩm phù hợp.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {!loading && filteredProducts.length > PAGE_SIZE ? (
            <div className="flex flex-col gap-3 border-t border-slate-100 px-5 py-4 text-sm text-slate-600 sm:flex-row sm:items-center sm:justify-between">
              <p>
                Trang <span className="font-semibold text-slate-900">{currentPage}</span> /{" "}
                <span className="font-semibold text-slate-900">{totalPages}</span>
              </p>
              <div className="flex gap-2">
                <Button
                  disabled={currentPage <= 1}
                  type="button"
                  variant="secondary"
                  onClick={() => setPage((current) => Math.max(1, current - 1))}
                >
                  Trước
                </Button>
                <Button
                  disabled={currentPage >= totalPages}
                  type="button"
                  variant="secondary"
                  onClick={() => setPage((current) => Math.min(totalPages, current + 1))}
                >
                  Sau
                </Button>
              </div>
            </div>
          ) : null}
        </Card>

        <ProductCategoryManager />
      </section>
    </RequireAdmin>
  );
}
