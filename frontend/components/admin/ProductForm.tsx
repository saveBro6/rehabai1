"use client";

import Image from "next/image";
import type { ChangeEvent, FormEvent } from "react";
import { useEffect, useMemo, useState } from "react";

import { Button } from "@/components/Button";
import { Card } from "@/components/Card";
import { getProductVisibilityBadgeClass, getProductVisibilityLabel } from "@/lib/product-stock";
import { formatCurrency, getImageUrl } from "@/lib/utils";
import { DEFAULT_PRODUCT_CATEGORY_SUGGESTIONS as MANAGED_PRODUCT_CATEGORY_SUGGESTIONS } from "@/services/product-categories.service";
import { type ProductMutationPayload, uploadProductImage } from "@/services/products.service";
import type { Product } from "@/types";

const MAX_PRODUCT_IMAGE_SIZE_BYTES = 5 * 1024 * 1024;
const DEFAULT_PRODUCT_CATEGORY_SUGGESTIONS = [
  "Dụng cụ tập tay",
  "Dụng cụ tập chân",
  "Dây kháng lực",
  "Khung tập đi",
  "Ghế hỗ trợ",
  "Bóng tập phục hồi",
  "Thiết bị theo dõi sức khỏe",
  "Vật tư hỗ trợ phục hồi",
  "Dụng cụ thăng bằng",
  "Sản phẩm chăm sóc tại nhà"
];

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

function uniqueCategories(values: string[]) {
  const categories = new Map<string, string>();

  for (const value of values) {
    const category = value.trim();
    if (!category) continue;
    categories.set(category.toLocaleLowerCase("vi"), category);
  }

  return Array.from(categories.values());
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
  const categoryListboxId = `product-category-listbox-${mode}`;
  const isBusy = loading || uploading;
  const previewStatusProduct = initialProduct || { is_active: true, deleted_at: null };
  const [categoryMenuOpen, setCategoryMenuOpen] = useState(false);
  const existingCategories = useMemo(() => uniqueCategories(categorySuggestions), [categorySuggestions]);
  const fallbackCategories = useMemo(() => {
    const existingKeys = new Set(existingCategories.map((category) => category.toLocaleLowerCase("vi")));
    return MANAGED_PRODUCT_CATEGORY_SUGGESTIONS.filter(
      (category) => !existingKeys.has(category.toLocaleLowerCase("vi"))
    );
  }, [existingCategories]);
  const categoryQuery = form.category.trim();
  const normalizedCategoryQuery = categoryQuery.toLocaleLowerCase("vi");
  const matchingExistingCategories = useMemo(() => {
    if (!normalizedCategoryQuery) return existingCategories;
    return existingCategories.filter((category) => category.toLocaleLowerCase("vi").includes(normalizedCategoryQuery));
  }, [existingCategories, normalizedCategoryQuery]);
  const matchingFallbackCategories = useMemo(() => {
    if (!normalizedCategoryQuery) return fallbackCategories;
    return fallbackCategories.filter((category) => category.toLocaleLowerCase("vi").includes(normalizedCategoryQuery));
  }, [fallbackCategories, normalizedCategoryQuery]);
  const hasExactCategoryMatch = useMemo(() => {
    if (!normalizedCategoryQuery) return false;
    return [...existingCategories, ...fallbackCategories].some(
      (category) => category.toLocaleLowerCase("vi") === normalizedCategoryQuery
    );
  }, [existingCategories, fallbackCategories, normalizedCategoryQuery]);
  const showNewCategoryAction = Boolean(categoryQuery && !hasExactCategoryMatch);

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

  function selectCategory(category: string) {
    setForm((current) => ({ ...current, category }));
    setCategoryMenuOpen(false);
  }

  function renderCategoryOption(category: string, tone: "existing" | "suggested" = "existing") {
    const selected = form.category.trim().toLocaleLowerCase("vi") === category.toLocaleLowerCase("vi");

    return (
      <button
        key={`${tone}-${category}`}
        type="button"
        className={`rounded-lg border px-3 py-2 text-left text-sm transition ${
          selected
            ? "border-emerald-300 bg-emerald-50 font-semibold text-emerald-700"
            : tone === "existing"
              ? "border-slate-200 bg-white text-slate-700 hover:border-emerald-200 hover:bg-emerald-50 hover:text-emerald-700"
              : "border-emerald-100 bg-emerald-50/50 text-slate-700 hover:border-emerald-300 hover:bg-emerald-50 hover:text-emerald-700"
        }`}
        role="option"
        aria-selected={selected}
        onMouseDown={(event) => event.preventDefault()}
        onClick={() => selectCategory(category)}
      >
        {category}
      </button>
    );
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

        <div
          className="relative grid gap-2 text-sm font-semibold text-slate-700"
          onBlur={(event) => {
            if (!event.currentTarget.contains(event.relatedTarget)) {
              setCategoryMenuOpen(false);
            }
          }}
        >
          <div className="flex items-center justify-between gap-3">
            <label htmlFor="product-category">Danh mục</label>
            <button
              type="button"
              className="text-xs font-bold text-emerald-700 hover:text-emerald-800"
              disabled={isBusy}
              onClick={() => {
                setForm((current) => ({ ...current, category: "" }));
                setCategoryMenuOpen(true);
              }}
            >
              Thêm danh mục mới
            </button>
          </div>
          <input
            id="product-category"
            aria-autocomplete="list"
            aria-controls={categoryListboxId}
            aria-expanded={categoryMenuOpen}
            aria-haspopup="listbox"
            className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-normal text-slate-900 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-100"
            disabled={isBusy}
            required
            role="combobox"
            value={form.category}
            onChange={(event) => {
              setForm((current) => ({ ...current, category: event.target.value }));
              setCategoryMenuOpen(true);
            }}
            onFocus={() => setCategoryMenuOpen(true)}
            onKeyDown={(event) => {
              if (event.key === "Escape") {
                setCategoryMenuOpen(false);
              }
            }}
          />
          {categoryMenuOpen && (matchingExistingCategories.length || matchingFallbackCategories.length || showNewCategoryAction) ? (
            <div
              id={categoryListboxId}
              className="absolute left-0 right-0 top-full z-30 mt-2 max-h-96 overflow-auto rounded-lg border border-slate-200 bg-white p-4 text-sm font-normal text-slate-800 shadow-xl"
              role="listbox"
            >
              <div className="rounded-lg bg-emerald-50 px-4 py-3">
                <p className="font-bold text-emerald-800">Danh mục sản phẩm</p>
                <p className="mt-1 text-xs text-emerald-700">
                  Chọn danh mục có sẵn hoặc nhập danh mục mới cho catalog RehabAI.
                </p>
              </div>

              {showNewCategoryAction ? (
                <button
                  type="button"
                  className="mt-3 w-full rounded-lg border border-emerald-200 bg-white px-3 py-2 text-left text-sm font-semibold text-emerald-700 transition hover:bg-emerald-50"
                  role="option"
                  aria-selected="false"
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() => selectCategory(categoryQuery)}
                >
                  {`Dùng "${categoryQuery}" làm danh mục mới`}
                </button>
              ) : null}

              {matchingExistingCategories.length ? (
                <div className="mt-4">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-xs font-bold uppercase text-slate-500">Đang có trong hệ thống</p>
                    <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-500">
                      {matchingExistingCategories.length}
                    </span>
                  </div>
                  <div className="mt-2 grid gap-2 sm:grid-cols-2">
                    {matchingExistingCategories.map((category) => renderCategoryOption(category, "existing"))}
                  </div>
                </div>
              ) : null}

              {matchingFallbackCategories.length ? (
                <div className="mt-4">
                  <p className="text-xs font-bold uppercase text-emerald-700">Gợi ý nhanh</p>
                  <div className="mt-2 grid gap-2 sm:grid-cols-2">
                    {matchingFallbackCategories.map((category) => renderCategoryOption(category, "suggested"))}
                  </div>
                </div>
              ) : null}
            </div>
          ) : null}
          <span className="text-xs font-normal text-slate-500">Chọn danh mục có sẵn hoặc nhập danh mục mới</span>
        </div>

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
          <p className={`rounded-lg p-3 text-xs font-semibold ${getProductVisibilityBadgeClass(previewStatusProduct)}`}>
            {getProductVisibilityLabel(previewStatusProduct)}
          </p>
        </div>
      </Card>
    </form>
  );
}
