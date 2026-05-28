"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";

import { Button } from "@/components/Button";
import { Card } from "@/components/Card";
import { ImagePreview } from "@/components/ImagePreview";
import type { AdminProductPayload } from "@/services/admin-products.service";
import type { Product } from "@/types";

type ProductFormProps = {
  mode: "create" | "edit";
  product?: Product | null;
  onSubmit: (payload: AdminProductPayload) => Promise<void>;
};

function toFormValue(value: string | number | null | undefined) {
  return value === null || value === undefined ? "" : String(value);
}

export function ProductForm({ mode, product, onSubmit }: ProductFormProps) {
  const [name, setName] = useState(product?.name || "");
  const [description, setDescription] = useState(product?.description || "");
  const [category, setCategory] = useState(product?.category || "");
  const [price, setPrice] = useState(toFormValue(product?.price));
  const [stockQuantity, setStockQuantity] = useState(toFormValue(product?.stock_quantity));
  const [imageUrl, setImageUrl] = useState(product?.image_url || "");
  const [isRecommended, setIsRecommended] = useState(Boolean(product?.is_recommended));
  const [isActive, setIsActive] = useState(product?.is_active ?? true);
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrorMessage(null);

    const parsedPrice = Number(price);
    const parsedStock = Number(stockQuantity);

    if (!name.trim() || !category.trim()) {
      setErrorMessage("Vui lòng nhập tên sản phẩm và danh mục.");
      return;
    }

    if (!Number.isFinite(parsedPrice) || parsedPrice < 0) {
      setErrorMessage("Giá phải là số không âm.");
      return;
    }

    if (!Number.isInteger(parsedStock) || parsedStock < 0) {
      setErrorMessage("Tồn kho phải là số nguyên không âm.");
      return;
    }

    setSubmitting(true);
    try {
      await onSubmit({
        name: name.trim(),
        description: description.trim() || null,
        category: category.trim(),
        price: parsedPrice,
        stock_quantity: parsedStock,
        image_url: imageUrl.trim() || null,
        is_recommended: isRecommended,
        is_active: isActive
      });
    } catch {
      setErrorMessage("Không thể lưu sản phẩm. Vui lòng kiểm tra quyền admin, RLS hoặc dữ liệu nhập.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
      <Card>
        <form className="grid gap-5" onSubmit={(event) => void submit(event)}>
          {errorMessage ? <p className="rounded-lg bg-red-50 px-3 py-2 text-sm font-semibold text-red-700">{errorMessage}</p> : null}

          <label className="grid gap-1.5 text-sm font-semibold text-slate-700">
            Tên sản phẩm
            <input
              value={name}
              onChange={(event) => setName(event.target.value)}
              className="min-h-11 rounded-lg border border-slate-300 px-3 py-2 font-normal text-slate-900 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-100"
              required
            />
          </label>

          <label className="grid gap-1.5 text-sm font-semibold text-slate-700">
            Mô tả
            <textarea
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              className="min-h-28 rounded-lg border border-slate-300 px-3 py-2 font-normal text-slate-900 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-100"
            />
          </label>

          <div className="grid gap-4 md:grid-cols-3">
            <label className="grid gap-1.5 text-sm font-semibold text-slate-700">
              Danh mục
              <input
                value={category}
                onChange={(event) => setCategory(event.target.value)}
                className="min-h-11 rounded-lg border border-slate-300 px-3 py-2 font-normal text-slate-900 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-100"
                required
              />
            </label>

            <label className="grid gap-1.5 text-sm font-semibold text-slate-700">
              Giá
              <input
                type="number"
                min="0"
                step="1000"
                value={price}
                onChange={(event) => setPrice(event.target.value)}
                className="min-h-11 rounded-lg border border-slate-300 px-3 py-2 font-normal text-slate-900 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-100"
                required
              />
            </label>

            <label className="grid gap-1.5 text-sm font-semibold text-slate-700">
              Tồn kho
              <input
                type="number"
                min="0"
                step="1"
                value={stockQuantity}
                onChange={(event) => setStockQuantity(event.target.value)}
                className="min-h-11 rounded-lg border border-slate-300 px-3 py-2 font-normal text-slate-900 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-100"
                required
              />
            </label>
          </div>

          <label className="grid gap-1.5 text-sm font-semibold text-slate-700">
            Đường dẫn ảnh
            <input
              value={imageUrl}
              onChange={(event) => setImageUrl(event.target.value)}
              placeholder="products/example.jpg hoặc https://..."
              className="min-h-11 rounded-lg border border-slate-300 px-3 py-2 font-normal text-slate-900 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-100"
            />
          </label>

          <label className="flex items-center gap-3 rounded-lg border border-slate-200 px-3 py-3 text-sm font-semibold text-slate-700">
            <input
              type="checkbox"
              checked={isRecommended}
              onChange={(event) => setIsRecommended(event.target.checked)}
              className="h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
            />
            Gợi ý trên danh sách sản phẩm
          </label>

          <label className="flex items-center gap-3 rounded-lg border border-slate-200 px-3 py-3 text-sm font-semibold text-slate-700">
            <input
              type="checkbox"
              checked={isActive}
              onChange={(event) => setIsActive(event.target.checked)}
              className="h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
            />
            Đang bán
          </label>

          <div className="flex flex-wrap gap-3">
            <Button type="submit" disabled={submitting}>
              {submitting ? "Đang lưu..." : mode === "create" ? "Thêm sản phẩm" : "Lưu thay đổi"}
            </Button>
            <Link href="/admin/products">
              <Button type="button" variant="secondary">Quay lại</Button>
            </Link>
          </div>
        </form>
      </Card>

      <Card className="h-fit">
        <h2 className="text-xl font-bold text-slate-950">Xem trước ảnh</h2>
        <div className="mt-4 overflow-hidden rounded-lg border border-slate-100">
          <ImagePreview src={imageUrl} alt={name || "Ảnh sản phẩm"} className="h-56 w-full object-cover" />
        </div>
        <p className="mt-3 text-sm text-slate-600">
          MVP chỉ nhập đường dẫn ảnh. Upload ảnh sản phẩm sẽ làm ở task riêng nếu cần.
        </p>
        <p className="mt-3 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800">
          Products là commerce-only. Không thêm video sản phẩm trong form này.
        </p>
        <p className="mt-3 rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-600">
          Sản phẩm ngừng bán sẽ bị ẩn khỏi trang công khai nhưng vẫn giữ lại cho lịch sử đơn hàng và trang admin.
        </p>
      </Card>
    </div>
  );
}
