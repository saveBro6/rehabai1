"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/Button";
import { Card } from "@/components/Card";
import { ProductCard } from "@/components/ProductCard";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/useToast";
import { getProtectedHref } from "@/lib/auth-navigation";
import {
  getProductStockBadgeClass,
  getProductStockDetail,
  getProductStockLabel,
  getProductVisibilityBadgeClass,
  getProductVisibilityLabel,
  isProductSellable
} from "@/lib/product-stock";
import { formatCurrency, getImageUrl } from "@/lib/utils";
import { addToCart as addCartItem } from "@/services/cart.service";
import { getProductById, getRelatedProducts } from "@/services/products.service";
import type { Product } from "@/types";

type InfoSectionKey = "description" | "benefits" | "usage" | "notes" | "storage";

const INFO_SECTIONS: Array<{ key: InfoSectionKey; label: string }> = [
  { key: "description", label: "Mô tả sản phẩm" },
  { key: "benefits", label: "Công dụng / Lợi ích" },
  { key: "usage", label: "Cách sử dụng" },
  { key: "notes", label: "Lưu ý" },
  { key: "storage", label: "Bảo quản" }
];

function clampQuantity(value: number, stockQuantity: number) {
  const max = Math.max(1, stockQuantity || 1);
  return Math.min(Math.max(1, value), max);
}

function getAvailability(product: Product | null) {
  if (!product) {
    return {
      label: "Không khả dụng",
      detail: "Sản phẩm chưa sẵn sàng để mua.",
      className: "bg-slate-100 text-slate-600"
    };
  }

  if (!isProductSellable(product)) {
    return {
      label: getProductVisibilityLabel(product),
      detail: "Sản phẩm đang ngừng bán hoặc không còn hiển thị công khai.",
      className: getProductVisibilityBadgeClass(product)
    };
  }

  return {
    label: getProductStockLabel(product.stock_quantity),
    detail: getProductStockDetail(product.stock_quantity),
    className: getProductStockBadgeClass(product.stock_quantity)
  };
}

function getInfoContent(product: Product, key: InfoSectionKey) {
  if (key === "description") {
    return product.description?.trim() || "Chưa có mô tả chi tiết cho sản phẩm này.";
  }

  return "Chưa có dữ liệu riêng cho mục này. Vui lòng xem mô tả sản phẩm hoặc liên hệ tư vấn trước khi sử dụng.";
}

export default function ProductDetailPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const { isAuthenticated, isLoading: authLoading, profile, user } = useAuth();
  const { pushToast } = useToast();
  const [product, setProduct] = useState<Product | null>(null);
  const [relatedProducts, setRelatedProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [quantity, setQuantity] = useState(1);
  const [activeSection, setActiveSection] = useState<InfoSectionKey>("description");
  const [pendingAction, setPendingAction] = useState<"cart" | "buy" | null>(null);

  const canBuy = profile?.account_type === "patient" && profile?.account_status === "active";
  const isSellable = isProductSellable(product);
  const stockQuantity = product?.stock_quantity || 0;
  const isOutOfStock = stockQuantity <= 0;
  const availability = getAvailability(product);
  const purchaseDisabled = pendingAction !== null || isOutOfStock || !isSellable;
  const actionDisabled = purchaseDisabled || authLoading;
  const isKnownNonBuyer = isAuthenticated && !authLoading && !canBuy;
  const quantityOptions = useMemo(() => {
    const maxVisible = Math.min(Math.max(stockQuantity, 1), 10);
    return Array.from({ length: maxVisible }, (_, index) => index + 1);
  }, [stockQuantity]);

  useEffect(() => {
    let active = true;

    async function loadProduct() {
      setLoading(true);
      try {
        const row = await getProductById(params.id);
        if (!active) return;
        setProduct(row);
        setQuantity(1);

        if (row) {
          const related = await getRelatedProducts(row.id, row.category);
          if (active) setRelatedProducts(related.filter((item) => isProductSellable(item) && item.stock_quantity > 0));
        } else {
          setRelatedProducts([]);
        }
      } finally {
        if (active) setLoading(false);
      }
    }

    void loadProduct();

    return () => {
      active = false;
    };
  }, [params.id]);

  function updateQuantity(nextQuantity: number) {
    setQuantity(clampQuantity(nextQuantity, stockQuantity));
  }

  async function addToCart(action: "cart" | "buy") {
    if (!product) return;

    if (!isAuthenticated) {
      pushToast("Cần đăng nhập", "Đăng nhập bằng tài khoản Bệnh nhân để mua sản phẩm.");
      router.push(getProtectedHref(false, "/patient/cart"));
      return;
    }

    if (!canBuy) {
      pushToast("Chỉ Bệnh nhân mới có thể mua hàng", "Tài khoản Bác sĩ và Admin chỉ được xem sản phẩm trong MVP.");
      return;
    }

    if (purchaseDisabled) {
      pushToast("Sản phẩm không còn khả dụng", "Sản phẩm đã hết hàng hoặc đang ngừng bán.");
      return;
    }

    setPendingAction(action);
    try {
      if (!user) throw new Error("Authentication required.");
      await addCartItem(user.id, product.id, quantity);
      pushToast("Đã thêm vào giỏ", `${product.name} x ${quantity}`);
      if (action === "buy") {
        router.push("/patient/cart");
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "Vui lòng thử lại sau.";
      pushToast("Không thể thêm vào giỏ", message);
    } finally {
      setPendingAction(null);
    }
  }

  if (loading) {
    return <section className="mx-auto max-w-7xl px-4 py-10 text-slate-500">Đang tải sản phẩm...</section>;
  }

  if (!product) {
    return (
      <section className="mx-auto max-w-3xl px-4 py-16">
        <Card>
          <h1 className="text-2xl font-bold text-slate-950">Không tìm thấy sản phẩm</h1>
          <p className="mt-2 text-slate-600">
            Sản phẩm này không tồn tại hoặc không còn được hiển thị công khai.
          </p>
          <Link href="/patient/products" className="mt-5 inline-flex">
            <Button variant="secondary">Quay lại danh sách sản phẩm</Button>
          </Link>
        </Card>
      </section>
    );
  }

  return (
    <section className="mx-auto max-w-7xl px-4 pb-32 pt-8">
      <Link href="/patient/products" className="inline-flex">
        <Button variant="ghost">Quay lại sản phẩm</Button>
      </Link>

      <div className="mt-5 grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(360px,440px)]">
        <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
          <Image
            src={getImageUrl(product.image_url)}
            alt={product.name}
            width={1100}
            height={820}
            className="aspect-[4/3] w-full object-cover"
            priority
          />
        </div>

        <Card className="h-fit">
          <p className="text-sm font-bold uppercase text-emerald-700">{product.category}</p>
          <h1 className="mt-2 text-3xl font-bold leading-tight text-slate-950">{product.name}</h1>
          <p className="mt-4 text-3xl font-bold text-emerald-700">{formatCurrency(product.price)}</p>

          <div className="mt-5 rounded-lg border border-slate-200 bg-slate-50 p-4">
            <span className={`inline-flex rounded-full px-3 py-1 text-xs font-bold ${availability.className}`}>
              {availability.label}
            </span>
            <p className="mt-2 text-sm font-semibold text-slate-700">{availability.detail}</p>
          </div>

          <div className="mt-6 grid gap-2">
            <label className="text-sm font-semibold text-slate-700" htmlFor="product-quantity">
              Số lượng
            </label>
            <div className="flex w-fit items-center rounded-lg border border-slate-200 bg-white">
              <button
                type="button"
                className="min-h-11 w-11 text-lg font-bold text-slate-700 disabled:text-slate-300"
                disabled={quantity <= 1 || purchaseDisabled}
                onClick={() => updateQuantity(quantity - 1)}
                aria-label="Giảm số lượng"
              >
                -
              </button>
              <select
                id="product-quantity"
                className="min-h-11 border-x border-slate-200 bg-white px-4 text-center text-sm font-bold text-slate-900 focus:outline-none"
                disabled={purchaseDisabled}
                value={quantity}
                onChange={(event) => updateQuantity(Number(event.target.value))}
              >
                {quantityOptions.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
              <button
                type="button"
                className="min-h-11 w-11 text-lg font-bold text-slate-700 disabled:text-slate-300"
                disabled={quantity >= stockQuantity || purchaseDisabled}
                onClick={() => updateQuantity(quantity + 1)}
                aria-label="Tăng số lượng"
              >
                +
              </button>
            </div>
          </div>

          {authLoading ? (
            <p className="mt-6 rounded-lg bg-slate-100 px-4 py-3 text-sm font-semibold text-slate-600">
              Đang kiểm tra quyền mua hàng...
            </p>
          ) : isKnownNonBuyer ? (
            <p className="mt-6 rounded-lg bg-slate-100 px-4 py-3 text-sm font-semibold text-slate-600">
              Tài khoản Bác sĩ/Admin chỉ được xem sản phẩm và không thể mua hàng trong MVP.
            </p>
          ) : (
            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              <Button onClick={() => void addToCart("cart")} disabled={actionDisabled}>
                {authLoading ? "Đang kiểm tra..." : pendingAction === "cart" ? "Đang thêm..." : isAuthenticated ? "Thêm vào giỏ" : "Đăng nhập để thêm"}
              </Button>
              <Button onClick={() => void addToCart("buy")} disabled={actionDisabled} variant="secondary">
                {authLoading ? "Đang kiểm tra..." : pendingAction === "buy" ? "Đang thêm..." : isAuthenticated ? "Mua ngay" : "Đăng nhập để mua"}
              </Button>
            </div>
          )}

          <p className="mt-4 text-xs text-slate-500">
            Đơn hàng sản phẩm là commerce-only. Thanh toán hiện tại vẫn là mô phỏng theo MVP.
          </p>
        </Card>
      </div>

      <div className="mt-10 grid gap-6 lg:grid-cols-[240px_minmax(0,1fr)]">
        <Card className="h-fit">
          <h2 className="text-base font-bold text-slate-950">Thông tin sản phẩm</h2>
          <div className="mt-4 grid gap-2">
            {INFO_SECTIONS.map((section) => (
              <button
                key={section.key}
                type="button"
                className={`rounded-lg px-3 py-2 text-left text-sm font-semibold transition ${
                  activeSection === section.key
                    ? "bg-emerald-50 text-emerald-700"
                    : "text-slate-600 hover:bg-slate-50"
                }`}
                onClick={() => setActiveSection(section.key)}
              >
                {section.label}
              </button>
            ))}
          </div>
        </Card>

        <Card>
          <h2 className="text-xl font-bold text-slate-950">
            {INFO_SECTIONS.find((section) => section.key === activeSection)?.label}
          </h2>
          <p className="mt-4 whitespace-pre-line leading-7 text-slate-700">{getInfoContent(product, activeSection)}</p>
        </Card>
      </div>

      {relatedProducts.length ? (
        <div className="mt-10">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="text-sm font-bold uppercase text-emerald-700">Gợi ý</p>
              <h2 className="text-2xl font-bold text-slate-950">Sản phẩm liên quan</h2>
            </div>
            <Link href="/patient/products">
              <Button variant="ghost">Xem tất cả</Button>
            </Link>
          </div>
          <div className="mt-5 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            {relatedProducts.map((item) => (
              <ProductCard key={item.id} product={item} isAuthenticated={isAuthenticated} />
            ))}
          </div>
        </div>
      ) : null}

      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-slate-200 bg-white/95 px-4 py-3 shadow-[0_-10px_30px_rgba(15,23,42,0.08)] backdrop-blur">
        <div className="mx-auto flex max-w-7xl flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex min-w-0 items-center gap-3">
            <Image
              src={getImageUrl(product.image_url)}
              alt={product.name}
              width={56}
              height={56}
              className="h-14 w-14 rounded-lg object-cover"
            />
            <div className="min-w-0">
              <p className="truncate text-sm font-bold text-slate-950">{product.name}</p>
              <p className="text-sm font-bold text-emerald-700">{formatCurrency(product.price)}</p>
            </div>
          </div>
          {authLoading ? (
            <p className="text-sm font-semibold text-slate-600">Đang kiểm tra quyền mua hàng...</p>
          ) : isKnownNonBuyer ? (
            <p className="text-sm font-semibold text-slate-600">Tài khoản này chỉ được xem sản phẩm.</p>
          ) : (
            <div className="flex flex-wrap items-center gap-2">
              <div className="flex items-center rounded-lg border border-slate-200 bg-white">
                <button
                  type="button"
                  className="min-h-10 w-10 text-lg font-bold text-slate-700 disabled:text-slate-300"
                  disabled={quantity <= 1 || actionDisabled}
                  onClick={() => updateQuantity(quantity - 1)}
                  aria-label="Giảm số lượng"
                >
                  -
                </button>
                <span className="min-w-10 border-x border-slate-200 px-3 text-center text-sm font-bold text-slate-900">
                  {quantity}
                </span>
                <button
                  type="button"
                  className="min-h-10 w-10 text-lg font-bold text-slate-700 disabled:text-slate-300"
                  disabled={quantity >= stockQuantity || actionDisabled}
                  onClick={() => updateQuantity(quantity + 1)}
                  aria-label="Tăng số lượng"
                >
                  +
                </button>
              </div>
              <Button onClick={() => void addToCart("cart")} disabled={actionDisabled}>
                {authLoading ? "Đang kiểm tra..." : isAuthenticated ? "Thêm vào giỏ" : "Đăng nhập để thêm"}
              </Button>
              <Button onClick={() => void addToCart("buy")} disabled={actionDisabled} variant="secondary">
                {authLoading ? "Đang kiểm tra..." : isAuthenticated ? "Mua ngay" : "Đăng nhập để mua"}
              </Button>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
