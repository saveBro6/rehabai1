"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { Button } from "@/components/Button";
import { Card } from "@/components/Card";
import { ProductForm } from "@/components/admin/ProductForm";
import { RequireAdmin } from "@/components/auth/RequireAdmin";
import { useToast } from "@/hooks/useToast";
import { getProductVisibilityBadgeClass, getProductVisibilityLabel } from "@/lib/product-stock";
import {
  getAdminProductById,
  getAdminProductCategories,
  setProductActive,
  updateProduct,
  type ProductMutationPayload
} from "@/services/products.service";
import type { Product } from "@/types";

export default function EditAdminProductPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const { pushToast } = useToast();
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [updatingVisibility, setUpdatingVisibility] = useState(false);
  const [error, setError] = useState("");
  const [categories, setCategories] = useState<string[]>([]);

  useEffect(() => {
    let active = true;

    async function loadProduct() {
      setLoading(true);
      setError("");
      try {
        const [row, categoryRows] = await Promise.all([getAdminProductById(params.id), getAdminProductCategories()]);
        if (!active) return;
        setProduct(row);
        setCategories(categoryRows);
        if (!row) setError("Không tìm thấy sản phẩm.");
      } catch (loadError) {
        if (!active) return;
        setError(loadError instanceof Error ? loadError.message : "Không thể tải sản phẩm.");
      } finally {
        if (active) setLoading(false);
      }
    }

    void loadProduct();

    return () => {
      active = false;
    };
  }, [params.id]);

  async function submitProduct(payload: ProductMutationPayload) {
    setSaving(true);
    try {
      const updated = await updateProduct(params.id, payload);
      pushToast("Cập nhật sản phẩm thành công.", updated.name);
      router.push("/admin/products");
    } catch (saveError) {
      pushToast("Không thể cập nhật sản phẩm.", saveError instanceof Error ? saveError.message : "Vui lòng thử lại.");
      throw saveError;
    } finally {
      setSaving(false);
    }
  }

  async function toggleVisibility() {
    if (!product || product.deleted_at) return;

    const nextActive = product.is_active === false;
    setUpdatingVisibility(true);
    setError("");
    try {
      const updated = await setProductActive(product.id, nextActive);
      setProduct(updated);
      pushToast(
        nextActive ? "Đã công khai lại sản phẩm." : "Đã ngừng bán sản phẩm.",
        "Lịch sử đơn hàng cũ vẫn được giữ nguyên."
      );
    } catch (visibilityError) {
      pushToast(
        "Không thể cập nhật trạng thái sản phẩm.",
        visibilityError instanceof Error ? visibilityError.message : "Vui lòng thử lại."
      );
    } finally {
      setUpdatingVisibility(false);
    }
  }

  return (
    <RequireAdmin>
      <section className="mx-auto max-w-7xl px-4 py-10">
        <Link href="/admin/products" className="inline-flex">
          <Button variant="ghost">Quay lại danh sách</Button>
        </Link>

        {loading ? (
          <Card className="mt-6">
            <p className="text-slate-500">Đang tải sản phẩm...</p>
          </Card>
        ) : error ? (
          <Card className="mt-6 border-rose-200 bg-rose-50">
            <p className="font-semibold text-rose-700">{error}</p>
          </Card>
        ) : product ? (
          <div className="mt-6 grid gap-6">
            <Card className="flex flex-col gap-4 border-emerald-100 bg-emerald-50/60 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm font-bold uppercase text-emerald-700">Trạng thái hiển thị</p>
                <div className="mt-2 flex flex-wrap items-center gap-3">
                  <span className={`inline-flex rounded-full px-3 py-1 text-sm font-bold ${getProductVisibilityBadgeClass(product)}`}>
                    {getProductVisibilityLabel(product)}
                  </span>
                  <p className="text-sm text-slate-600">
                    Ngừng bán sẽ ẩn sản phẩm khỏi trang công khai và chặn mua mới, nhưng không ảnh hưởng lịch sử đơn hàng.
                  </p>
                </div>
              </div>
              {!product.deleted_at ? (
                <Button
                  disabled={updatingVisibility || saving}
                  onClick={() => void toggleVisibility()}
                  type="button"
                  variant={product.is_active === false ? "primary" : "secondary"}
                >
                  {updatingVisibility ? "Đang cập nhật..." : product.is_active === false ? "Công khai lại" : "Ngừng bán"}
                </Button>
              ) : null}
            </Card>
            <ProductForm
              categorySuggestions={categories}
              initialProduct={product}
              loading={saving}
              mode="edit"
              onSubmit={submitProduct}
            />
          </div>
        ) : null}
      </section>
    </RequireAdmin>
  );
}
