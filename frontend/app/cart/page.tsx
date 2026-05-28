"use client";

import { useState } from "react";

import { Button } from "@/components/Button";
import { Card } from "@/components/Card";
import { ProductImage } from "@/components/ProductImage";
import { RequireAuth } from "@/components/auth/RequireAuth";
import { useAuth } from "@/hooks/useAuth";
import { useCart } from "@/hooks/useCart";
import { useToast } from "@/hooks/useToast";
import { formatCurrency } from "@/lib/utils";
import { removeCartItem, updateCartItem } from "@/services/cart.service";
import { createOrderFromCart } from "@/services/orders.service";

export default function CartPage() {
  const { user } = useAuth();
  const { items, total, loading, refresh } = useCart();
  const { pushToast } = useToast();
  const [address, setAddress] = useState("Quan 7, TP.HCM");
  const [pendingItemId, setPendingItemId] = useState<string | null>(null);

  const hasStockIssue = items.some((item) => {
    const stock = item.product?.stock_quantity;
    return typeof stock === "number" && item.quantity > stock;
  });

  async function changeQuantity(itemId: string, nextQuantity: number, stock?: number) {
    if (nextQuantity < 1) return;

    if (typeof stock === "number" && nextQuantity > stock) {
      pushToast("Số lượng vượt quá tồn kho", `Sản phẩm này chỉ còn ${stock} sản phẩm.`);
      return;
    }

    setPendingItemId(itemId);
    try {
      await updateCartItem(itemId, nextQuantity);
      await refresh();
    } catch {
      pushToast("Không thể cập nhật giỏ hàng", "Vui lòng thử lại sau.");
    } finally {
      setPendingItemId(null);
    }
  }

  async function removeItem(itemId: string) {
    setPendingItemId(itemId);
    try {
      await removeCartItem(itemId);
      pushToast("Đã xóa sản phẩm khỏi giỏ hàng.");
      await refresh();
    } catch {
      pushToast("Không thể xóa sản phẩm", "Vui lòng thử lại sau.");
    } finally {
      setPendingItemId(null);
    }
  }

  async function checkout() {
    if (!items.length) {
      pushToast("Giỏ hàng trống. Vui lòng thêm sản phẩm trước khi checkout.");
      return;
    }

    if (hasStockIssue) {
      pushToast("Giỏ hàng vượt quá tồn kho", "Vui lòng giảm số lượng sản phẩm trước khi tạo đơn hàng.");
      return;
    }

    if (!user) return;
    await createOrderFromCart(user.id, address);
    pushToast("Đã tạo đơn hàng demo.", "Thanh toán giả lập: đơn hàng đang chờ xử lý, không phải thanh toán thật.");
    await refresh();
  }

  return (
    <RequireAuth>
      <section className="mx-auto grid max-w-6xl gap-8 px-4 py-10 lg:grid-cols-[1fr_360px]">
        <div>
          <h1 className="text-3xl font-bold text-slate-950">Giỏ hàng</h1>
          <div className="mt-6 grid gap-4">
            {loading ? <p className="text-slate-500">Đang tải giỏ hàng...</p> : null}

            {!loading && items.length
              ? items.map((item) => {
                  const stock = item.product?.stock_quantity;
                  const isOverStock = typeof stock === "number" && item.quantity > stock;
                  const isPending = pendingItemId === item.id;

                  return (
                    <Card key={item.id} className="flex gap-4">
                      <ProductImage
                        src={item.product?.image_url}
                        alt={item.product?.name || "Sản phẩm"}
                        width={96}
                        height={96}
                        className="h-24 w-24 rounded-lg object-cover"
                      />
                      <div className="flex-1">
                        <p className="font-bold">{item.product?.name}</p>
                        {typeof stock === "number" ? (
                          <p className="mt-1 text-xs text-slate-500">Còn {stock} sản phẩm</p>
                        ) : null}
                        {isOverStock ? (
                          <p className="mt-2 text-sm font-semibold text-red-600">
                            Số lượng trong giỏ vượt quá tồn kho. Vui lòng giảm xuống còn tối đa {stock}.
                          </p>
                        ) : null}

                        <div className="mt-3 flex flex-wrap items-center gap-2">
                          <Button
                            variant="secondary"
                            className="h-9 min-h-9 w-9 px-0"
                            onClick={() => void changeQuantity(item.id, item.quantity - 1, stock)}
                            disabled={isPending || item.quantity <= 1}
                            aria-label="Giảm số lượng"
                          >
                            -
                          </Button>
                          <span className="inline-flex h-9 min-w-12 items-center justify-center rounded-lg border border-slate-200 px-3 text-sm font-semibold text-slate-900">
                            {item.quantity}
                          </span>
                          <Button
                            variant="secondary"
                            className="h-9 min-h-9 w-9 px-0"
                            onClick={() => void changeQuantity(item.id, item.quantity + 1, stock)}
                            disabled={isPending}
                            aria-label="Tăng số lượng"
                          >
                            +
                          </Button>
                          <Button
                            variant="ghost"
                            className="h-9 min-h-9 px-3 text-red-600 hover:bg-red-50"
                            onClick={() => void removeItem(item.id)}
                            disabled={isPending}
                          >
                            Xóa
                          </Button>
                        </div>

                        <p className="mt-3 font-semibold text-emerald-700">
                          {formatCurrency((item.product?.price || 0) * item.quantity)}
                        </p>
                      </div>
                    </Card>
                  );
                })
              : null}

            {!loading && !items.length ? <Card><p className="text-slate-500">Giỏ hàng đang trống.</p></Card> : null}
          </div>
        </div>

        <Card className="h-fit">
          <h2 className="text-xl font-bold">Thanh toán giả lập</h2>
          <p className="mt-2 rounded-lg bg-amber-50 px-3 py-2 text-sm font-semibold text-amber-800">
            Đây là đơn hàng demo. Hệ thống chưa tích hợp cổng thanh toán hoặc webhook xác nhận.
          </p>
          <p className="mt-4 text-sm text-slate-600">Tổng tạm tính</p>
          <p className="mt-1 text-3xl font-bold text-emerald-700">{formatCurrency(total)}</p>
          {hasStockIssue ? (
            <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm font-semibold text-red-700">
              Một số sản phẩm vượt quá tồn kho. Vui lòng điều chỉnh số lượng trước khi tạo đơn hàng.
            </p>
          ) : null}
          <textarea
            className="mt-5 min-h-24 w-full rounded-lg border border-slate-300 px-3 py-2"
            value={address}
            onChange={(event) => setAddress(event.target.value)}
          />
          <Button className="mt-4 w-full" onClick={checkout} disabled={hasStockIssue || pendingItemId !== null}>
            Tạo đơn hàng demo
          </Button>
        </Card>
      </section>
    </RequireAuth>
  );
}
