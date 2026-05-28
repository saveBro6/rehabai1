"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { Card } from "@/components/Card";
import { ProductForm } from "@/components/admin/ProductForm";
import { RequireAdmin } from "@/components/auth/RequireAdmin";
import { useToast } from "@/hooks/useToast";
import {
  getAdminProductById,
  updateAdminProduct,
  type AdminProductPayload
} from "@/services/admin-products.service";
import type { Product } from "@/types";

export default function EditAdminProductPage() {
  const params = useParams<{ productId: string }>();
  const router = useRouter();
  const { pushToast } = useToast();
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!params.productId) return;

    let active = true;
    setLoading(true);
    setErrorMessage(null);

    void getAdminProductById(params.productId)
      .then((data) => {
        if (!active) return;
        setProduct(data);
        if (!data) {
          setErrorMessage("Không tìm thấy sản phẩm.");
        }
      })
      .catch(() => {
        if (active) setErrorMessage("Không thể tải sản phẩm. Vui lòng kiểm tra quyền admin hoặc RLS.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [params.productId]);

  async function saveProduct(payload: AdminProductPayload) {
    if (!product) return;
    const updated = await updateAdminProduct(product.id, payload);
    pushToast("Đã lưu thay đổi", updated.name);
    router.push("/admin/products");
  }

  return (
    <RequireAdmin>
      <section className="mx-auto max-w-7xl px-4 py-10">
        <div className="mb-8">
          <p className="text-sm font-bold uppercase text-emerald-700">Admin</p>
          <h1 className="text-3xl font-bold text-slate-950">Sửa sản phẩm</h1>
          <p className="mt-2 max-w-3xl text-sm text-slate-600">
            Cập nhật thông tin thương mại, giá, tồn kho và đường dẫn ảnh. Không quản lý video sản phẩm tại đây.
          </p>
        </div>

        {loading ? <p className="text-slate-500">Đang tải sản phẩm...</p> : null}
        {errorMessage ? <Card><p className="text-red-600">{errorMessage}</p></Card> : null}
        {!loading && product ? <ProductForm mode="edit" product={product} onSubmit={saveProduct} /> : null}
      </section>
    </RequireAdmin>
  );
}
