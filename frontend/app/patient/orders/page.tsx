"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { Button } from "@/components/Button";
import { Card } from "@/components/Card";
import { RequireAuth } from "@/components/auth/RequireAuth";
import { formatCurrency } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";
import { getOrders, type OrderWithItems } from "@/services/orders.service";

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

export default function PatientOrdersPage() {
  const { user, profile, isLoading } = useAuth();
  const [orders, setOrders] = useState<OrderWithItems[]>([]);
  const [loadingOrders, setLoadingOrders] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const isActivePatient = profile?.account_type === "patient" && profile?.account_status === "active";

  useEffect(() => {
    if (isLoading) return;

    if (!user || !isActivePatient) {
      setOrders([]);
      setLoadingOrders(false);
      return;
    }

    let active = true;
    setLoadingOrders(true);
    setError(null);

    void getOrders(user.id)
      .then((rows) => {
        if (active) setOrders(rows);
      })
      .catch((loadError) => {
        if (!active) return;
        setError(loadError instanceof Error ? loadError.message : "Khong the tai danh sach don hang.");
      })
      .finally(() => {
        if (active) setLoadingOrders(false);
      });

    return () => {
      active = false;
    };
  }, [isActivePatient, isLoading, user]);

  return (
    <RequireAuth>
      <section className="mx-auto max-w-6xl px-4 py-10">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wide text-emerald-700">Mock commerce</p>
            <h1 className="text-3xl font-bold text-slate-950">Lich su don hang</h1>
            <p className="mt-2 max-w-2xl text-sm text-slate-600">
              Don hang hien tai la don mock/pending. Chưa có thanh toán thật hoặc xác nhận từ cổng thanh toán.
            </p>
          </div>
          <Link href="/patient/products">
            <Button variant="secondary">Tiep tuc mua sam</Button>
          </Link>
        </div>

        {!isActivePatient ? (
          <Card className="mt-6 border-amber-200 bg-amber-50">
            <p className="font-semibold text-amber-800">Chi tai khoan Benh nhan dang active moi xem lich su mua hang.</p>
            <p className="mt-2 text-sm text-amber-700">Bac si va Admin khong phai buyer role trong MVP.</p>
          </Card>
        ) : null}

        {error ? (
          <Card className="mt-6 border-red-200 bg-red-50">
            <p className="font-semibold text-red-700">Khong the tai don hang</p>
            <p className="mt-2 text-sm text-red-600">{error}</p>
          </Card>
        ) : null}

        <div className="mt-6 grid gap-4">
          {loadingOrders ? (
            <Card>
              <p className="text-slate-500">Dang tai don hang...</p>
            </Card>
          ) : orders.length ? (
            orders.map((order) => {
              const itemCount = (order.items || []).reduce((sum, item) => sum + item.quantity, 0);
              return (
                <Card key={order.id}>
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div>
                      <p className="text-sm text-slate-500">Ma don</p>
                      <p className="break-all font-semibold text-slate-950">{order.id}</p>
                      <p className="mt-3 text-sm text-slate-600">{formatDate(order.created_at)}</p>
                      <p className="mt-2 text-sm text-slate-600">
                        Dia chi giao hang: {order.shipping_address || "Chua co dia chi"}
                      </p>
                    </div>
                    <div className="min-w-52 text-left lg:text-right">
                      <span className="inline-flex rounded-full bg-amber-100 px-3 py-1 text-sm font-semibold text-amber-800">
                        {getStatusLabel(order.status)}
                      </span>
                      <p className="mt-3 text-sm text-slate-500">Tong tien</p>
                      <p className="text-2xl font-bold text-emerald-700">{formatCurrency(Number(order.total_amount || 0))}</p>
                      <p className="mt-1 text-sm text-slate-500">{itemCount} san pham</p>
                    </div>
                  </div>
                  <Link href={`/patient/orders/${order.id}`} className="mt-5 inline-flex">
                    <Button>Xem chi tiet</Button>
                  </Link>
                </Card>
              );
            })
          ) : (
            <Card>
              <p className="font-semibold text-slate-800">Chua co don hang nao.</p>
              <p className="mt-2 text-sm text-slate-600">Khi checkout thanh cong, đơn hàng đang chờ xử lý se hien thi tai day.</p>
              <Link href="/patient/products" className="mt-5 inline-flex">
                <Button>Xem san pham</Button>
              </Link>
            </Card>
          )}
        </div>
      </section>
    </RequireAuth>
  );
}
