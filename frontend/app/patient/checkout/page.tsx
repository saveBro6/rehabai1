"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { FormEvent } from "react";
import { useMemo, useState } from "react";

import { Button } from "@/components/Button";
import { Card } from "@/components/Card";
import { RequireAuth } from "@/components/auth/RequireAuth";
import { useAuth } from "@/hooks/useAuth";
import { useCart } from "@/hooks/useCart";
import { useToast } from "@/hooks/useToast";
import { formatCurrency, getImageUrl } from "@/lib/utils";
import { createOrderFromCart } from "@/services/orders.service";

export default function PatientCheckoutPage() {
  const router = useRouter();
  const { user, profile, isLoading: isAuthLoading } = useAuth();
  const { items, total, loading: isCartLoading, refresh } = useCart();
  const { pushToast } = useToast();
  const [shippingAddress, setShippingAddress] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const isActivePatient = profile?.account_type === "patient" && profile?.account_status === "active";
  const itemCount = useMemo(() => items.reduce((sum, item) => sum + item.quantity, 0), [items]);
  const isLoading = isAuthLoading || isCartLoading;

  async function confirmMockCheckout(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!user || !isActivePatient) {
      pushToast("Chi Benh nhan moi co the thanh toan", "Guest, Bac si va Admin khong phai buyer role trong MVP.");
      return;
    }

    if (!items.length) {
      pushToast("Gio hang trong", "Vui long them san pham truoc khi thanh toan.");
      return;
    }

    const address = shippingAddress.trim();
    if (!address) {
      pushToast("Can dia chi giao hang", "Vui long nhap dia chi giao hang truoc khi xac nhan.");
      return;
    }

    setSubmitting(true);
    try {
      const result = await createOrderFromCart(user.id, address);
      await refresh();
      pushToast("Đơn hàng đang chờ xử lý", "Chưa có thanh toán thật hoặc xác nhận từ cổng thanh toán.");

      if (result.order_id) {
        router.push(`/patient/orders/${result.order_id}`);
      } else {
        router.push("/patient/orders");
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "Vui long thu lai sau.";
      pushToast("Thanh toan mo phong that bai", message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <RequireAuth>
      <section className="mx-auto grid max-w-6xl gap-8 px-4 py-10 lg:grid-cols-[1fr_380px]">
        <div>
          <Link href="/patient/cart" className="inline-flex">
            <Button variant="ghost">Quay lai gio hang</Button>
          </Link>

          <div className="mt-6">
            <p className="text-sm font-semibold uppercase tracking-wide text-emerald-700">Thanh toán mô phỏng</p>
            <h1 className="mt-1 text-3xl font-bold text-slate-950">Xem lai don hang</h1>
            <p className="mt-2 max-w-2xl text-sm text-slate-600">
              Thanh toán mô phỏng - chưa phải thanh toán qua cổng thật. Don hang tao ra se o trang thai pending/mock.
            </p>
          </div>

          {!isActivePatient && !isAuthLoading ? (
            <Card className="mt-6 border-amber-200 bg-amber-50">
              <p className="font-semibold text-amber-800">Chi tai khoan Benh nhan active moi co the checkout.</p>
              <p className="mt-2 text-sm text-amber-700">Guest, Bac si va Admin khong phai buyer role trong MVP.</p>
            </Card>
          ) : null}

          <div className="mt-6 grid gap-4">
            {isLoading ? (
              <Card>
                <p className="text-slate-500">Dang tai gio hang...</p>
              </Card>
            ) : items.length ? (
              items.map((item) => {
                const subtotal = (item.product?.price || 0) * item.quantity;
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
                      <p className="font-bold text-slate-950">{item.product?.name || "San pham"}</p>
                      <p className="mt-1 text-sm text-slate-600">So luong: {item.quantity}</p>
                      <p className="mt-1 text-sm text-slate-600">
                        Don gia: {formatCurrency(item.product?.price || 0)}
                      </p>
                    </div>
                    <p className="font-bold text-emerald-700">{formatCurrency(subtotal)}</p>
                  </Card>
                );
              })
            ) : (
              <Card>
                <p className="font-semibold text-slate-800">Gio hang dang trong.</p>
                <p className="mt-2 text-sm text-slate-600">Vui long them san pham truoc khi thanh toan.</p>
                <Link href="/patient/products" className="mt-5 inline-flex">
                  <Button>Xem san pham</Button>
                </Link>
              </Card>
            )}
          </div>
        </div>

        <form onSubmit={confirmMockCheckout}>
          <Card className="h-fit">
            <h2 className="text-xl font-bold text-slate-950">Thong tin thanh toan</h2>

            <div className="mt-5 rounded-lg border border-amber-200 bg-amber-50 p-4">
              <p className="font-semibold text-amber-900">Thanh toán mô phỏng</p>
              <p className="mt-2 text-sm text-amber-800">
                Chưa có thanh toán thật hoặc xác nhận từ cổng thanh toán. Day chi la buoc xac nhan mock de tao don hang pending.
              </p>
            </div>

            <label className="mt-5 block text-sm font-semibold text-slate-800" htmlFor="shipping-address">
              Dia chi giao hang
            </label>
            <textarea
              id="shipping-address"
              className="mt-2 min-h-28 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
              placeholder="Nhap dia chi nhan hang"
              value={shippingAddress}
              onChange={(event) => setShippingAddress(event.target.value)}
              disabled={submitting || !isActivePatient}
            />

            <div className="mt-5 space-y-3 border-t border-slate-100 pt-5 text-sm text-slate-600">
              <div className="flex justify-between gap-4">
                <span>So san pham</span>
                <span className="font-semibold text-slate-950">{itemCount}</span>
              </div>
              <div className="flex justify-between gap-4">
                <span>Tong tam tinh</span>
                <span className="font-semibold text-slate-950">{formatCurrency(total)}</span>
              </div>
            </div>

            <Button
              type="submit"
              className="mt-5 w-full"
              disabled={submitting || isLoading || !items.length || !isActivePatient}
            >
              {submitting ? "Dang tao don..." : "Xác nhận thanh toán mô phỏng"}
            </Button>
            <p className="mt-3 text-xs text-slate-500">
              Đơn hàng đang chờ xử lý sau khi xac nhan. He thong khong ghi nhan day la thanh toan gateway that.
            </p>
          </Card>
        </form>
      </section>
    </RequireAuth>
  );
}
