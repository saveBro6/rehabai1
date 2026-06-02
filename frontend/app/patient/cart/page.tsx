"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { Button } from "@/components/Button";
import { Card } from "@/components/Card";
import { RequireAuth } from "@/components/auth/RequireAuth";
import {
  STOCK_CHECKOUT_BLOCK_MESSAGE,
  getCartStockWarning,
  getProductStockBadgeClass,
  getProductStockDetail,
  getProductStockLabel,
  isProductSellable
} from "@/lib/product-stock";
import { formatCurrency, getImageUrl } from "@/lib/utils";
import { useCart } from "@/hooks/useCart";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/useToast";
import { removeCartItem, updateCartItem } from "@/services/cart.service";

export default function CartPage() {
  const router = useRouter();
  const { profile } = useAuth();
  const { items, total, loading, refresh } = useCart();
  const { pushToast } = useToast();
  const [pendingAction, setPendingAction] = useState<string | null>(null);
  const isPatientBuyer = profile?.account_type === "patient" && profile?.account_status === "active";
  const stockWarnings = items
    .map((item) => getCartStockWarning(item.product, item.quantity))
    .filter(Boolean);
  const hasStockIssue = stockWarnings.length > 0;

  async function changeQuantity(cartItemId: string, nextQuantity: number) {
    if (nextQuantity < 1) return;

    setPendingAction(cartItemId);
    try {
      await updateCartItem(cartItemId, nextQuantity);
      await refresh();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Vui l\u00f2ng th\u1eed l\u1ea1i sau.";
      pushToast("Kh\u00f4ng th\u1ec3 c\u1eadp nh\u1eadt gi\u1ecf h\u00e0ng", message);
    } finally {
      setPendingAction(null);
    }
  }

  async function removeItem(cartItemId: string) {
    setPendingAction(cartItemId);
    try {
      await removeCartItem(cartItemId);
      await refresh();
      pushToast("\u0110\u00e3 x\u00f3a s\u1ea3n ph\u1ea9m kh\u1ecfi gi\u1ecf h\u00e0ng.");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Vui l\u00f2ng th\u1eed l\u1ea1i sau.";
      pushToast("Kh\u00f4ng th\u1ec3 x\u00f3a s\u1ea3n ph\u1ea9m", message);
    } finally {
      setPendingAction(null);
    }
  }

  function continueToCheckout() {
    if (!isPatientBuyer) {
      pushToast("Ch\u1ec9 B\u1ec7nh nh\u00e2n m\u1edbi c\u00f3 th\u1ec3 thanh to\u00e1n", "T\u00e0i kho\u1ea3n B\u00e1c s\u0129 v\u00e0 Admin kh\u00f4ng ph\u1ea3i buyer role trong MVP.");
      return;
    }

    if (!items.length) {
      pushToast("Gi\u1ecf h\u00e0ng tr\u1ed1ng", "Vui l\u00f2ng th\u00eam s\u1ea3n ph\u1ea9m tr\u01b0\u1edbc khi thanh to\u00e1n.");
      return;
    }

    if (hasStockIssue) {
      pushToast("Kh\u00f4ng th\u1ec3 thanh to\u00e1n", STOCK_CHECKOUT_BLOCK_MESSAGE);
      return;
    }

    router.push("/patient/checkout");
  }

  return (
    <RequireAuth>
      <section className="mx-auto grid max-w-6xl gap-8 px-4 py-10 lg:grid-cols-[1fr_360px]">
        <div>
          <h1 className="text-3xl font-bold text-slate-950">Giỏ hàng</h1>
          {!isPatientBuyer ? (
            <Card className="mt-6 border-amber-200 bg-amber-50">
              <p className="font-semibold text-amber-800">{"T\u00e0i kho\u1ea3n n\u00e0y ch\u1ec9 \u0111\u01b0\u1ee3c xem s\u1ea3n ph\u1ea9m."}</p>
              <p className="mt-2 text-sm text-amber-700">{"Ch\u1ec9 B\u1ec7nh nh\u00e2n active m\u1edbi c\u00f3 th\u1ec3 mua h\u00e0ng v\u00e0 checkout trong MVP."}</p>
            </Card>
          ) : null}
          <div className="mt-6 grid gap-4">
            {loading ? (
              <p className="text-slate-500">{"\u0110ang t\u1ea3i gi\u1ecf h\u00e0ng..."}</p>
            ) : items.length ? (
              items.map((item) => {
                const stock = item.product?.stock_quantity || 0;
                const itemPending = pendingAction === item.id;
                const stockWarning = getCartStockWarning(item.product, item.quantity);
                const canAdjustQuantity = isProductSellable(item.product) && stock > 0 && isPatientBuyer;
                return (
                  <Card key={item.id} className="flex flex-col gap-4 sm:flex-row">
                    <Image
                      src={getImageUrl(item.product?.image_url)}
                      alt={item.product?.name || "S\u1ea3n ph\u1ea9m"}
                      width={96}
                      height={96}
                      className="h-24 w-24 rounded-lg object-cover"
                    />
                    <div className="flex-1">
                      <p className="font-bold">{item.product?.name}</p>
                      <div className="mt-2 flex flex-wrap items-center gap-2">
                        <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${getProductStockBadgeClass(stock)}`}>
                          {getProductStockLabel(stock)}
                        </span>
                        <span className="text-xs font-semibold text-slate-500">{getProductStockDetail(stock)}</span>
                      </div>
                      {stockWarning ? (
                        <p className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-800">
                          {stockWarning}
                        </p>
                      ) : null}
                      <p className="mt-2 font-semibold text-emerald-700">
                        {formatCurrency((item.product?.price || 0) * item.quantity)}
                      </p>
                      <div className="mt-4 flex flex-wrap items-center gap-2">
                        <Button
                          type="button"
                          variant="secondary"
                          onClick={() => void changeQuantity(item.id, item.quantity - 1)}
                          disabled={itemPending || item.quantity <= 1 || !canAdjustQuantity}
                        >
                          -
                        </Button>
                        <span className="min-w-12 rounded-lg border border-slate-200 px-3 py-2 text-center text-sm font-semibold">
                          {item.quantity}
                        </span>
                        <Button
                          type="button"
                          variant="secondary"
                          onClick={() => void changeQuantity(item.id, item.quantity + 1)}
                          disabled={itemPending || !canAdjustQuantity || item.quantity >= stock || Boolean(stockWarning)}
                        >
                          +
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          onClick={() => void removeItem(item.id)}
                          disabled={itemPending || !isPatientBuyer}
                        >
                          {"X\u00f3a"}
                        </Button>
                      </div>
                    </div>
                  </Card>
                );
              })
            ) : (
              <Card>
                <p className="text-slate-500">{"Gi\u1ecf h\u00e0ng \u0111ang tr\u1ed1ng."}</p>
              </Card>
            )}
          </div>
        </div>
        <Card className="h-fit">
          <h2 className="text-xl font-bold">{"T\u1ed5ng gi\u1ecf h\u00e0ng"}</h2>
          <p className="mt-2 text-sm text-slate-600">{"Ki\u1ec3m tra l\u1ea1i s\u1ea3n ph\u1ea9m tr\u01b0\u1edbc khi sang b\u01b0\u1edbc thanh to\u00e1n m\u00f4 ph\u1ecfng."}</p>
          <p className="mt-4 text-sm text-slate-600">{"T\u1ed5ng t\u1ea1m t\u00ednh"}</p>
          <p className="mt-1 text-3xl font-bold text-emerald-700">{formatCurrency(total)}</p>
          {hasStockIssue ? (
            <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-800">
              {STOCK_CHECKOUT_BLOCK_MESSAGE}
            </div>
          ) : null}
          <Button
            className="mt-4 w-full"
            onClick={continueToCheckout}
            disabled={loading || !items.length || !isPatientBuyer || hasStockIssue}
          >
            {"Ti\u1ebfp t\u1ee5c thanh to\u00e1n"}
          </Button>
          <p className="mt-3 text-xs text-slate-500">
            {"Thanh to\u00e1n ch\u1ec9 \u0111\u01b0\u1ee3c th\u1ef1c hi\u1ec7n b\u1edfi t\u00e0i kho\u1ea3n B\u1ec7nh nh\u00e2n. \u0110\u01a1n h\u00e0ng s\u1ebd \u1edf tr\u1ea1ng th\u00e1i pending/mock."}
          </p>
        </Card>
      </section>
    </RequireAuth>
  );
}
