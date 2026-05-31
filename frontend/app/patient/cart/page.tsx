"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { Button } from "@/components/Button";
import { Card } from "@/components/Card";
import { RequireAuth } from "@/components/auth/RequireAuth";
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

  async function changeQuantity(cartItemId: string, nextQuantity: number) {
    if (nextQuantity < 1) return;

    setPendingAction(cartItemId);
    try {
      await updateCartItem(cartItemId, nextQuantity);
      await refresh();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Vui long thu lai sau.";
      pushToast("Khong the cap nhat gio hang", message);
    } finally {
      setPendingAction(null);
    }
  }

  async function removeItem(cartItemId: string) {
    setPendingAction(cartItemId);
    try {
      await removeCartItem(cartItemId);
      await refresh();
      pushToast("Da xoa san pham khoi gio hang.");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Vui long thu lai sau.";
      pushToast("Khong the xoa san pham", message);
    } finally {
      setPendingAction(null);
    }
  }

  function continueToCheckout() {
    if (!isPatientBuyer) {
      pushToast("Chi Benh nhan moi co the thanh toan", "Tai khoan Bac si va Admin khong phai buyer role trong MVP.");
      return;
    }

    if (!items.length) {
      pushToast("Gio hang trong. Vui long them san pham truoc khi thanh toan.");
      return;
    }

    router.push("/patient/checkout");
  }

  return (
    <RequireAuth>
      <section className="mx-auto grid max-w-6xl gap-8 px-4 py-10 lg:grid-cols-[1fr_360px]">
        <div>
          <h1 className="text-3xl font-bold text-slate-950">Gio hang</h1>
          {!isPatientBuyer ? (
            <Card className="mt-6 border-amber-200 bg-amber-50">
              <p className="font-semibold text-amber-800">Tai khoan nay chi duoc xem san pham.</p>
              <p className="mt-2 text-sm text-amber-700">Chi Benh nhan active moi co the mua hang va checkout trong MVP.</p>
            </Card>
          ) : null}
          <div className="mt-6 grid gap-4">
            {loading ? (
              <p className="text-slate-500">Dang tai gio hang...</p>
            ) : items.length ? (
              items.map((item) => {
                const stock = item.product?.stock_quantity || 0;
                const itemPending = pendingAction === item.id;
                return (
                  <Card key={item.id} className="flex flex-col gap-4 sm:flex-row">
                    <Image
                      src={getImageUrl(item.product?.image_url)}
                      alt={item.product?.name || "San pham"}
                      width={96}
                      height={96}
                      className="h-24 w-24 rounded-lg object-cover"
                    />
                    <div className="flex-1">
                      <p className="font-bold">{item.product?.name}</p>
                      <p className="text-sm text-slate-600">Ton kho: {stock}</p>
                      <p className="mt-2 font-semibold text-emerald-700">
                        {formatCurrency((item.product?.price || 0) * item.quantity)}
                      </p>
                      <div className="mt-4 flex flex-wrap items-center gap-2">
                        <Button
                          type="button"
                          variant="secondary"
                          onClick={() => void changeQuantity(item.id, item.quantity - 1)}
                          disabled={itemPending || item.quantity <= 1 || !isPatientBuyer}
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
                          disabled={itemPending || item.quantity >= stock || !isPatientBuyer}
                        >
                          +
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          onClick={() => void removeItem(item.id)}
                          disabled={itemPending || !isPatientBuyer}
                        >
                          Xoa
                        </Button>
                      </div>
                    </div>
                  </Card>
                );
              })
            ) : (
              <Card>
                <p className="text-slate-500">Gio hang dang trong.</p>
              </Card>
            )}
          </div>
        </div>
        <Card className="h-fit">
          <h2 className="text-xl font-bold">Tong gio hang</h2>
          <p className="mt-2 text-sm text-slate-600">Kiem tra lai san pham truoc khi sang buoc thanh toan mo phong.</p>
          <p className="mt-4 text-sm text-slate-600">Tong tam tinh</p>
          <p className="mt-1 text-3xl font-bold text-emerald-700">{formatCurrency(total)}</p>
          <Button
            className="mt-4 w-full"
            onClick={continueToCheckout}
            disabled={loading || !items.length || !isPatientBuyer}
          >
            Tiếp tục thanh toán
          </Button>
          <p className="mt-3 text-xs text-slate-500">
            Thanh toan chi duoc thuc hien boi tai khoan Benh nhan. Don hang se o trang thai pending/mock.
          </p>
        </Card>
      </section>
    </RequireAuth>
  );
}
