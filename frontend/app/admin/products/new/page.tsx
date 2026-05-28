"use client";

import { useRouter } from "next/navigation";

import { ProductForm } from "@/components/admin/ProductForm";
import { RequireAdmin } from "@/components/auth/RequireAdmin";
import { useToast } from "@/hooks/useToast";
import { createAdminProduct, type AdminProductPayload } from "@/services/admin-products.service";

export default function NewAdminProductPage() {
  const router = useRouter();
  const { pushToast } = useToast();

  async function createProduct(payload: AdminProductPayload) {
    const product = await createAdminProduct(payload);
    pushToast("Đã thêm sản phẩm", product.name);
    router.push("/admin/products");
  }

  return (
    <RequireAdmin>
      <section className="mx-auto max-w-7xl px-4 py-10">
        <div className="mb-8">
          <p className="text-sm font-bold uppercase text-emerald-700">Admin</p>
          <h1 className="text-3xl font-bold text-slate-950">Thêm sản phẩm</h1>
          <p className="mt-2 max-w-3xl text-sm text-slate-600">
            Tạo sản phẩm thương mại mới. Không thêm video sản phẩm tại module này.
          </p>
        </div>

        <ProductForm mode="create" onSubmit={createProduct} />
      </section>
    </RequireAdmin>
  );
}
