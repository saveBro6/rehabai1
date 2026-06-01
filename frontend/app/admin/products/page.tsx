"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

import { Button } from "@/components/Button";
import { Card } from "@/components/Card";
import { ProductCategoryManager } from "@/components/admin/ProductCategoryManager";
import { RequireAdmin } from "@/components/auth/RequireAdmin";
import {
  getProductStockBadgeClass,
  getProductStockLabel,
  getProductVisibilityBadgeClass,
  getProductVisibilityLabel
} from "@/lib/product-stock";
import { formatCurrency, getImageUrl } from "@/lib/utils";
import { getAdminProducts, setProductActive } from "@/services/products.service";
import type { Product } from "@/types";

function formatDate(value?: string | null) {
  if (!value) return "Chưa rõ";
  return new Intl.DateTimeFormat("vi-VN", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
}

export default function AdminProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [updatingProductId, setUpdatingProductId] = useState<string | null>(null);

  const loadProducts = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      setProducts(await getAdminProducts());
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Không thể tải danh sách sản phẩm.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadProducts();
  }, [loadProducts]);

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

        <ProductCategoryManager />

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
                ) : products.length ? (
                  products.map((product) => (
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
                      Chưa có sản phẩm.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>
      </section>
    </RequireAdmin>
  );
}
