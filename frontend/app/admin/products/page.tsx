"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Ban, Edit, PackagePlus, RotateCcw } from "lucide-react";

import { Button } from "@/components/Button";
import { Card } from "@/components/Card";
import { ProductImage } from "@/components/ProductImage";
import { RequireAdmin } from "@/components/auth/RequireAdmin";
import { useToast } from "@/hooks/useToast";
import { formatCurrency } from "@/lib/utils";
import { getAdminProducts, setAdminProductActive } from "@/services/admin-products.service";
import type { Product } from "@/types";

function formatDate(value?: string) {
  if (!value) return "Chưa có ngày";
  return new Intl.DateTimeFormat("vi-VN", { dateStyle: "medium" }).format(new Date(value));
}

export default function AdminProductsPage() {
  const { pushToast } = useToast();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  async function loadProducts() {
    setLoading(true);
    setErrorMessage(null);
    try {
      const data = await getAdminProducts();
      setProducts(data);
    } catch {
      setErrorMessage("Không thể tải danh sách sản phẩm. Vui lòng kiểm tra quyền admin hoặc RLS.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadProducts();
  }, []);

  async function toggleProductActive(product: Product) {
    const nextActive = !product.is_active;
    const confirmed = window.confirm(
      nextActive
        ? `Bán lại "${product.name}" trên trang sản phẩm công khai?`
        : `Ngừng bán "${product.name}"? Sản phẩm sẽ bị ẩn khỏi trang công khai nhưng vẫn giữ trong lịch sử đơn hàng.`
    );
    if (!confirmed) return;

    setUpdatingId(product.id);
    try {
      const updated = await setAdminProductActive(product.id, nextActive);
      setProducts((current) => current.map((item) => (item.id === product.id ? updated : item)));
      pushToast(nextActive ? "Đã bán lại sản phẩm" : "Đã ngừng bán sản phẩm", product.name);
    } catch {
      pushToast("Không thể cập nhật trạng thái sản phẩm", "Vui lòng kiểm tra quyền admin, RLS hoặc dữ liệu nhập.");
    } finally {
      setUpdatingId(null);
    }
  }

  return (
    <RequireAdmin>
      <section className="mx-auto max-w-7xl px-4 py-10">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-sm font-bold uppercase text-emerald-700">Admin</p>
            <h1 className="text-3xl font-bold text-slate-950">Quản lý sản phẩm</h1>
            <p className="mt-2 max-w-3xl text-sm text-slate-600">
              Quản lý dụng cụ phục hồi trong module thương mại. Không quản lý video bài tập tại Product.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link href="/admin/products/new">
              <Button>
                <PackagePlus className="mr-2 h-4 w-4" />
                Thêm sản phẩm
              </Button>
            </Link>
            <Link href="/admin">
              <Button variant="secondary">Về admin</Button>
            </Link>
          </div>
        </div>

        <Card className="mt-8 border-emerald-200 bg-emerald-50 text-emerald-900">
          <p className="font-bold">Ngừng bán an toàn</p>
          <p className="mt-1 text-sm">
            Sản phẩm ngừng bán được ẩn khỏi trang công khai nhưng vẫn giữ lại để bảo toàn lịch sử đơn hàng.
          </p>
        </Card>

        {loading ? <p className="mt-8 text-slate-500">Đang tải sản phẩm...</p> : null}
        {errorMessage ? <Card className="mt-8"><p className="text-red-600">{errorMessage}</p></Card> : null}

        {!loading && !errorMessage ? (
          <Card className="mt-8 p-0">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[940px] text-left text-sm">
                <thead className="border-b border-slate-200 bg-slate-50 text-slate-500">
                  <tr>
                    <th className="px-5 py-3 font-semibold">Sản phẩm</th>
                    <th className="px-5 py-3 font-semibold">Danh mục</th>
                    <th className="px-5 py-3 font-semibold">Giá</th>
                    <th className="px-5 py-3 font-semibold">Tồn kho</th>
                    <th className="px-5 py-3 font-semibold">Trạng thái</th>
                    <th className="px-5 py-3 font-semibold">Ngày tạo</th>
                    <th className="px-5 py-3 text-right font-semibold">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {products.map((product) => (
                    <tr key={product.id} className="align-middle">
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <ProductImage
                            src={product.image_url}
                            alt={product.name}
                            width={160}
                            height={120}
                            className="h-16 w-20 rounded-lg object-cover"
                          />
                          <div>
                            <p className="font-bold text-slate-950">{product.name}</p>
                            <p className="mt-1 line-clamp-2 max-w-sm text-xs text-slate-500">{product.description || "Chưa có mô tả"}</p>
                            {product.is_recommended ? <p className="mt-1 text-xs font-semibold text-emerald-700">Sản phẩm gợi ý</p> : null}
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-4 text-slate-700">{product.category}</td>
                      <td className="px-5 py-4 font-semibold text-emerald-700">{formatCurrency(Number(product.price || 0))}</td>
                      <td className="px-5 py-4 text-slate-700">{product.stock_quantity}</td>
                      <td className="px-5 py-4">
                        <span
                          className={
                            product.is_active
                              ? "rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700"
                              : "rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-600"
                          }
                        >
                          {product.is_active ? "Đang bán" : "Ngừng bán"}
                        </span>
                      </td>
                      <td className="px-5 py-4 text-slate-600">{formatDate(product.created_at)}</td>
                      <td className="px-5 py-4">
                        <div className="flex justify-end gap-2">
                          <Link href={`/admin/products/${product.id}/edit`}>
                            <Button variant="secondary">
                              <Edit className="mr-2 h-4 w-4" />
                              Sửa
                            </Button>
                          </Link>
                          <Button
                            type="button"
                            variant="ghost"
                            className={
                              product.is_active
                                ? "text-amber-700 hover:bg-amber-50"
                                : "text-emerald-700 hover:bg-emerald-50"
                            }
                            onClick={() => void toggleProductActive(product)}
                            disabled={updatingId === product.id}
                          >
                            {product.is_active ? <Ban className="mr-2 h-4 w-4" /> : <RotateCcw className="mr-2 h-4 w-4" />}
                            {updatingId === product.id ? "Đang cập nhật..." : product.is_active ? "Ngừng bán" : "Bán lại"}
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {!products.length ? (
              <div className="p-8 text-center">
                <h2 className="text-xl font-bold text-slate-950">Chưa có sản phẩm</h2>
                <p className="mt-2 text-sm text-slate-600">Thêm sản phẩm đầu tiên để hiển thị trong cửa hàng.</p>
              </div>
            ) : null}
          </Card>
        ) : null}
      </section>
    </RequireAdmin>
  );
}
