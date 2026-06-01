"use client";

import Image from "next/image";
import type { ChangeEvent, FormEvent } from "react";
import { useEffect, useMemo, useState } from "react";

import { Button } from "@/components/Button";
import { Card } from "@/components/Card";
import { formatCurrency, getImageUrl } from "@/lib/utils";
import { type ProductMutationPayload, uploadProductImage } from "@/services/products.service";
import type { Product } from "@/types";

const MAX_PRODUCT_IMAGE_SIZE_BYTES = 5 * 1024 * 1024;

type ProductFormState = {
  name: string;
  description: string;
  category: string;
  price: string;
  stock_quantity: string;
  image_url: string;
  is_recommended: boolean;
};

type ProductFormProps = {
  mode: "create" | "edit";
  categorySuggestions?: string[];
  initialProduct?: Product | null;
  loading?: boolean;
  onSubmit: (payload: ProductMutationPayload) => Promise<void>;
};

function getInitialState(product?: Product | null): ProductFormState {
  return {
    name: product?.name || "",
    description: product?.description || "",
    category: product?.category || "",
    price: product ? String(Number(product.price || 0)) : "",
    stock_quantity: product ? String(product.stock_quantity || 0) : "0",
    image_url: product?.image_url || "",
    is_recommended: Boolean(product?.is_recommended)
  };
}

function normalizeImagePath(value: string) {
  return value.trim().replace(/^images\/+/, "");
}

function isExternalImageUrl(value: string) {
  return /^https?:\/\//i.test(value.trim());
}

function validateSelectedImage(file: File) {
  if (!file.type.startsWith("image/")) {
    return "Tệp tải lên phải là hình ảnh.";
  }

  if (file.size > MAX_PRODUCT_IMAGE_SIZE_BYTES) {
    return "Ảnh sản phẩm không được vượt quá 5MB.";
  }

  return "";
}

export function ProductForm({
  mode,
  categorySuggestions = [],
  initialProduct,
  loading = false,
  onSubmit
}: ProductFormProps) {
  const [form, setForm] = useState<ProductFormState>(() => getInitialState(initialProduct));
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [localPreviewUrl, setLocalPreviewUrl] = useState("");
  const [error, setError] = useState("");
  const [uploading, setUploading] = useState(false);

  const existingImagePath = normalizeImagePath(form.image_url);
  const hasExternalImage = isExternalImageUrl(form.image_url);
  const previewUrl = useMemo(() => localPreviewUrl || getImageUrl(form.image_url), [form.image_url, localPreviewUrl]);
  const numericPrice = Number(form.price || 0);
  const numericStock = Number(form.stock_quantity || 0);
  const datalistId = `product-category-options-${mode}`;
  const isBusy = loading || uploading;

  useEffect(() => {
    if (!selectedImage) {
      setLocalPreviewUrl("");
      return undefined;
    }

    const objectUrl = URL.createObjectURL(selectedImage);
    setLocalPreviewUrl(objectUrl);

    return () => {
      URL.revokeObjectURL(objectUrl);
    };
  }, [selectedImage]);

  function chooseImage(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0] || null;
    setError("");

    if (!file) {
      setSelectedImage(null);
      return;
    }

    const validationError = validateSelectedImage(file);
    if (validationError) {
      setSelectedImage(null);
      setError(validationError);
      event.target.value = "";
      return;
    }

    setSelectedImage(file);
  }

  async function submitForm(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    const name = form.name.trim();
    const category = form.category.trim();

    if (!name) {
      setError("Vui lòng nhập tên sản phẩm.");
      return;
    }

    if (!category) {
      setError("Vui lòng nhập danh mục.");
      return;
    }

    if (!Number.isFinite(numericPrice) || numericPrice < 0) {
      setError("Giá sản phẩm phải là số không âm.");
      return;
    }

    if (!Number.isInteger(numericStock) || numericStock < 0) {
      setError("Tồn kho phải là số nguyên không âm.");
      return;
    }

    if (!selectedImage && hasExternalImage) {
      setError("Ảnh hiện tại đang dùng URL ngoài. Vui lòng tải ảnh mới lên để thay thế.");
      return;
    }

    try {
      setUploading(Boolean(selectedImage));
      const finalImagePath = selectedImage ? await uploadProductImage(selectedImage) : existingImagePath;
      await onSubmit({
        name,
        description: form.description.trim() || null,
        category,
        price: numericPrice,
        stock_quantity: numericStock,
        image_url: finalImagePath || null,
        is_recommended: form.is_recommended
      });
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Không thể lưu sản phẩm. Vui lòng thử lại.");
    } finally {
      setUploading(false);
    }
  }

  return (
    <form className="grid gap-6 lg:grid-cols-[1fr_340px]" onSubmit={submitForm}>
      <Card className="grid gap-5">
        <div>
          <h2 className="text-xl font-bold text-slate-950">
            {mode === "create" ? "Tạo sản phẩm" : "Chỉnh sửa sản phẩm"}
          </h2>
          <p className="mt-2 text-sm text-slate-600">
            Sản phẩm chỉ dùng cho commerce. Video bài tập phục hồi thuộc Exercise Library.
          </p>
        </div>

        {error ? (
          <div className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700">
            {error}
          </div>
        ) : null}

        <label className="grid gap-2 text-sm font-semibold text-slate-700" htmlFor="product-name">
          Tên sản phẩm
          <input
            id="product-name"
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-normal text-slate-900 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-100"
            disabled={isBusy}
            required
            value={form.name}
            onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
          />
        </label>

        <label className="grid gap-2 text-sm font-semibold text-slate-700" htmlFor="product-category">
          Danh mục
          <input
            id="product-category"
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-normal text-slate-900 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-100"
            disabled={isBusy}
            list={datalistId}
            required
            value={form.category}
            onChange={(event) => setForm((current) => ({ ...current, category: event.target.value }))}
          />
          <datalist id={datalistId}>
            {categorySuggestions.map((category) => (
              <option key={category} value={category} />
            ))}
          </datalist>
          <span className="text-xs font-normal text-slate-500">Chọn hoặc nhập danh mục mới</span>
        </label>

        <label className="grid gap-2 text-sm font-semibold text-slate-700" htmlFor="product-description">
          Mô tả
          <textarea
            id="product-description"
            className="min-h-28 rounded-lg border border-slate-300 px-3 py-2 text-sm font-normal text-slate-900 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-100"
            disabled={isBusy}
            value={form.description}
            onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))}
          />
        </label>

        <div className="grid gap-4 sm:grid-cols-2">
          <label className="grid gap-2 text-sm font-semibold text-slate-700" htmlFor="product-price">
            Giá
            <input
              id="product-price"
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-normal text-slate-900 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-100"
              disabled={isBusy}
              min="0"
              required
              step="1000"
              type="number"
              value={form.price}
              onChange={(event) => setForm((current) => ({ ...current, price: event.target.value }))}
            />
          </label>

          <label className="grid gap-2 text-sm font-semibold text-slate-700" htmlFor="product-stock">
            Tồn kho
            <input
              id="product-stock"
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-normal text-slate-900 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-100"
              disabled={isBusy}
              min="0"
              required
              step="1"
              type="number"
              value={form.stock_quantity}
              onChange={(event) => setForm((current) => ({ ...current, stock_quantity: event.target.value }))}
            />
          </label>
        </div>

        <div className="grid gap-4 rounded-lg border border-slate-200 bg-slate-50 p-4">
          <label className="grid gap-2 text-sm font-semibold text-slate-700" htmlFor="product-image-file">
            Ảnh sản phẩm
            <input
              id="product-image-file"
              accept="image/*"
              className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-normal text-slate-900 file:mr-4 file:rounded-md file:border-0 file:bg-emerald-50 file:px-3 file:py-1.5 file:text-sm file:font-semibold file:text-emerald-700 hover:file:bg-emerald-100"
              disabled={isBusy}
              type="file"
              onChange={chooseImage}
            />
          </label>
          <p className="text-xs text-slate-500">
            Chọn ảnh từ máy tính. Hỗ trợ JPG, PNG, WEBP, GIF hoặc AVIF, tối đa 5MB.
          </p>

          {hasExternalImage ? (
            <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-800">
              Ảnh hiện tại đang dùng URL ngoài. Vui lòng tải ảnh mới lên để thay thế.
            </div>
          ) : existingImagePath ? (
            <p className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-600">
              Đường dẫn đã lưu: <span className="font-semibold text-slate-800">{existingImagePath}</span>
            </p>
          ) : null}

          {selectedImage ? (
            <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-700">
              Ảnh mới sẽ được tải lên khi lưu: {selectedImage.name}
            </p>
          ) : null}
        </div>

        <label className="flex items-center gap-3 text-sm font-semibold text-slate-700" htmlFor="product-recommended">
          <input
            id="product-recommended"
            checked={form.is_recommended}
            className="h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
            disabled={isBusy}
            type="checkbox"
            onChange={(event) => setForm((current) => ({ ...current, is_recommended: event.target.checked }))}
          />
          Đánh dấu sản phẩm gợi ý
        </label>

        <div className="flex flex-col gap-3 sm:flex-row">
          <Button disabled={isBusy} type="submit">
            {uploading ? "Đang tải ảnh..." : loading ? "Đang lưu..." : mode === "create" ? "Tạo sản phẩm" : "Lưu thay đổi"}
          </Button>
        </div>
      </Card>

      <Card className="h-fit">
        <h2 className="text-lg font-bold text-slate-950">Xem trước</h2>
        <Image
          alt={form.name || "Ảnh sản phẩm"}
          className="mt-4 h-56 w-full rounded-lg object-cover"
          height={224}
          src={previewUrl}
          unoptimized
          width={320}
        />
        <div className="mt-4 grid gap-2 text-sm text-slate-600">
          <p className="font-bold text-slate-950">{form.name || "Tên sản phẩm"}</p>
          <p>{form.category || "Danh mục"}</p>
          <p className="font-semibold text-emerald-700">
            {Number.isFinite(numericPrice) ? formatCurrency(numericPrice) : "Giá chưa hợp lệ"}
          </p>
          <p>Tồn kho: {Number.isFinite(numericStock) ? numericStock : 0}</p>
          <p className="rounded-lg bg-emerald-50 p-3 text-xs font-semibold text-emerald-700">Đã công khai</p>
        </div>
      </Card>
    </form>
  );
}
