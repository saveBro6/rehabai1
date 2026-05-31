"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import { Button } from "@/components/Button";
import { Card } from "@/components/Card";
import { RequireAuth } from "@/components/auth/RequireAuth";
import { formatCurrency, getImageUrl } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";
import { getOrderById, type OrderWithItems } from "@/services/orders.service";

function formatDate(value?: string) {
  if (!value) return "Chua ro";
  return new Intl.DateTimeFormat("vi-VN", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
}

function getStatusLabel(status: OrderWithItems["status"]) {
  if (status === "pending") return "Đơn hàng đang chờ xử lý";
  if (status === "paid") return "Paid (du lieu cu, khong phai gateway-confirmed)";
  if (status === "cancelled") return "Da huy";
  return status;
}

export default function PatientOrderDetailPage({ params }: { params: { id: string } }) {
  const { user, profile, isLoading } = useAuth();
  const [order, setOrder] = useState<OrderWithItems | null>(null);
  const [loadingOrder, setLoadingOrder] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const isActivePatient = profile?.account_type === "patient" && profile?.account_status === "active";

  useEffect(() => {
    if (isLoading) return;

    if (!user || !isActivePatient) {
      setOrder(null);
      setLoadingOrder(false);
      return;
    }

    let active = true;
    setLoadingOrder(true);
    setError(null);

    void getOrderById(params.id, user.id)
      .then((row) => {
        if (active) setOrder(row);
      })
      .catch((loadError) => {
        if (!active) return;
        setError(loadError instanceof Error ? loadError.message : "Khong the tai chi tiet don hang.");
      })
      .finally(() => {
        if (active) setLoadingOrder(false);
      });

    return () => {
      active = false;
    };
  }, [isActivePatient, isLoading, params.id, user]);

  const itemTotal = useMemo(() => {
    return (order?.items || []).reduce((sum, item) => sum + Number(item.unit_price || 0) * item.quantity, 0);
  }, [order]);

  return (
    <RequireAuth>
      <section className="mx-auto max-w-6xl px-4 py-10">
        <Link href="/patient/orders" className="inline-flex">
          <Button variant="ghost">Quay lai don hang</Button>
        </Link>

        {!isActivePatient ? (
          <Card className="mt-6 border-amber-200 bg-amber-50">
            <p className="font-semibold text-amber-800">Chi tai khoan Benh nhan dang active moi xem chi tiet don hang.</p>
            <p className="mt-2 text-sm text-amber-700">Bac si va Admin khong phai buyer role trong MVP.</p>
          </Card>
        ) : null}

        {loadingOrder ? (
          <Card className="mt-6">
            <p className="text-slate-500">Dang tai chi tiet don hang...</p>
          </Card>
        ) : error ? (
          <Card className="mt-6 border-red-200 bg-red-50">
            <p className="font-semibold text-red-700">Khong the tai chi tiet don hang</p>
            <p className="mt-2 text-sm text-red-600">{error}</p>
          </Card>
        ) : !order ? (
          <Card className="mt-6">
            <p className="font-semibold text-slate-800">Khong tim thay don hang.</p>
            <p className="mt-2 text-sm text-slate-600">Don hang khong ton tai hoac khong thuoc tai khoan hien tai.</p>
          </Card>
        ) : (
          <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_340px]">
            <div className="grid gap-4">
              <Card>
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <p className="text-sm font-semibold uppercase tracking-wide text-emerald-700">Mock order</p>
                    <h1 className="mt-1 text-3xl font-bold text-slate-950">Chi tiet don hang</h1>
                    <p className="mt-3 break-all text-sm text-slate-600">Ma don: {order.id}</p>
                    <p className="mt-2 text-sm text-slate-600">Ngay tao: {formatDate(order.created_at)}</p>
                  </div>
                  <span className="inline-flex h-fit rounded-full bg-amber-100 px-3 py-1 text-sm font-semibold text-amber-800">
                    {getStatusLabel(order.status)}
                  </span>
                </div>
                <p className="mt-5 text-sm text-slate-600">
                  Chưa có thanh toán thật hoặc xác nhận từ cổng thanh toán. Don hang nay dang o trang thai pending/mock.
                </p>
              </Card>

              <Card>
                <h2 className="text-xl font-bold text-slate-950">San pham trong don</h2>
                <div className="mt-5 grid gap-4">
                  {(order.items || []).map((item) => {
                    const product = item.product;
                    const subtotal = Number(item.unit_price || 0) * item.quantity;
                    return (
                      <div key={item.id} className="flex flex-col gap-4 border-b border-slate-100 pb-4 last:border-b-0 last:pb-0 sm:flex-row">
                        <Image
                          src={getImageUrl(product?.image_url)}
                          alt={product?.name || "San pham"}
                          width={96}
                          height={96}
                          className="h-24 w-24 rounded-lg object-cover"
                        />
                        <div className="flex-1">
                          <p className="font-semibold text-slate-950">{product?.name || "San pham khong kha dung"}</p>
                          <p className="mt-1 text-sm text-slate-600">Danh muc: {product?.category || "Chua ro"}</p>
                          <p className="mt-2 text-sm text-slate-600">
                            Don gia: {formatCurrency(Number(item.unit_price || 0))} x {item.quantity}
                          </p>
                        </div>
                        <p className="font-bold text-emerald-700">{formatCurrency(subtotal)}</p>
                      </div>
                    );
                  })}
                </div>
              </Card>
            </div>

            <Card className="h-fit">
              <h2 className="text-xl font-bold text-slate-950">Tong ket</h2>
              <div className="mt-5 space-y-3 text-sm text-slate-600">
                <div className="flex justify-between gap-4">
                  <span>Tam tinh san pham</span>
                  <span className="font-semibold text-slate-950">{formatCurrency(itemTotal)}</span>
                </div>
                <div className="flex justify-between gap-4">
                  <span>Tong don</span>
                  <span className="font-semibold text-slate-950">{formatCurrency(Number(order.total_amount || 0))}</span>
                </div>
              </div>
              <div className="mt-5 rounded-lg bg-slate-50 p-4">
                <p className="text-sm font-semibold text-slate-800">Dia chi giao hang</p>
                <p className="mt-2 text-sm text-slate-600">{order.shipping_address || "Chua co dia chi"}</p>
              </div>
            </Card>
          </div>
        )}
      </section>
    </RequireAuth>
  );
}
