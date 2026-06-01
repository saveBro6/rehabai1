"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { Button } from "@/components/Button";
import { Card } from "@/components/Card";
import { ProductForm } from "@/components/admin/ProductForm";
import { RequireAdmin } from "@/components/auth/RequireAdmin";
import { useToast } from "@/hooks/useToast";
import { getProductById, getProductCategories, updateProduct, type ProductMutationPayload } from "@/services/products.service";
import type { Product } from "@/types";

export default function EditAdminProductPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const { pushToast } = useToast();
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [categories, setCategories] = useState<string[]>([]);

  useEffect(() => {
    let active = true;

    async function loadProduct() {
      setLoading(true);
      setError("");
      try {
        const [row, categoryRows] = await Promise.all([getProductById(params.id), getProductCategories()]);
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
          <div className="mt-6">
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
