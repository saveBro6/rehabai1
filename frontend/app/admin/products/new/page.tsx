"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { Button } from "@/components/Button";
import { ProductForm } from "@/components/admin/ProductForm";
import { RequireAdmin } from "@/components/auth/RequireAdmin";
import { useToast } from "@/hooks/useToast";
import { createProduct, getAdminProductCategories, type ProductMutationPayload } from "@/services/products.service";

export default function NewAdminProductPage() {
  const router = useRouter();
  const { pushToast } = useToast();
  const [saving, setSaving] = useState(false);
  const [categories, setCategories] = useState<string[]>([]);

  useEffect(() => {
    void getAdminProductCategories()
      .then(setCategories)
      .catch(() => setCategories([]));
  }, []);

  async function submitProduct(payload: ProductMutationPayload) {
    setSaving(true);
    try {
      const product = await createProduct(payload);
      pushToast("Tạo sản phẩm thành công.", product.name);
      router.push("/admin/products");
    } catch (error) {
      pushToast("Không thể tạo sản phẩm.", error instanceof Error ? error.message : "Vui lòng thử lại.");
      throw error;
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
        <div className="mt-6">
          <ProductForm categorySuggestions={categories} loading={saving} mode="create" onSubmit={submitProduct} />
        </div>
      </section>
    </RequireAdmin>
  );
}
