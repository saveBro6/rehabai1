"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { Button } from "@/components/Button";
import { Card } from "@/components/Card";
import { RequireAuth } from "@/components/auth/RequireAuth";
import { useAuth } from "@/hooks/useAuth";
import { getShippingAddressLines } from "@/lib/shipping-address";
import { formatCurrency } from "@/lib/utils";
import { getOrders, type OrderWithItems } from "@/services/orders.service";

function formatDate(value?: string) {
  if (!value) return "Chưa rõ";
  return new Intl.DateTimeFormat("vi-VN", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
}

function getStatusLabel(status: OrderWithItems["status"]) {
  if (status === "pending") return "Đơn hàng đang chờ xử lý";
  if (status === "confirmed") return "Đã xác nhận";
  if (status === "paid") return "Paid (dữ liệu cũ, không phải gateway-confirmed)";
  if (status === "cancelled") return "Đã hủy";
  return status;
}

function getPaymentLabel(order: OrderWithItems) {
  if (order.payment_method === "internal_wallet" && order.payment_status === "paid") {
    return "Đã thanh toán bằng Ví RehabAI";
  }

  if (order.payment_status === "paid") {
    return "Đã thanh toán";
  }

  return "Chưa thanh toán";
}

function getCompactShippingAddress(address?: string | null) {
  const line = getShippingAddressLines(address).find((item) => item.label === "Địa chỉ cụ thể" || item.label === "Địa chỉ");
  return line?.value || address || "Chưa có địa chỉ";
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
        setError(loadError instanceof Error ? loadError.message : "Không thể tải danh sách đơn hàng.");
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
            <h1 className="text-3xl font-bold text-slate-950">Lịch sử đơn hàng</h1>
            <p className="mt-2 max-w-2xl text-sm text-slate-600">
              Đơn hàng hiện tại là đơn mock/pending. Chưa có thanh toán thật hoặc xác nhận từ cổng thanh toán.
            </p>
          </div>
          <Link href="/patient/products">
            <Button variant="secondary">Tiếp tục mua sắm</Button>
          </Link>
        </div>

        {!isActivePatient ? (
          <Card className="mt-6 border-amber-200 bg-amber-50">
            <p className="font-semibold text-amber-800">Chỉ tài khoản Bệnh nhân đang active mới xem lịch sử mua hàng.</p>
            <p className="mt-2 text-sm text-amber-700">Tài khoản không phải Bệnh nhân không phải buyer role trong MVP.</p>
          </Card>
        ) : null}

        {error ? (
          <Card className="mt-6 border-red-200 bg-red-50">
            <p className="font-semibold text-red-700">Không thể tải đơn hàng</p>
            <p className="mt-2 text-sm text-red-600">{error}</p>
          </Card>
        ) : null}

        <div className="mt-6 grid gap-4">
          {loadingOrders ? (
            <Card>
              <p className="text-slate-500">Đang tải đơn hàng...</p>
            </Card>
          ) : orders.length ? (
            orders.map((order) => {
              const itemCount = (order.items || []).reduce((sum, item) => sum + item.quantity, 0);
              return (
                <Card key={order.id}>
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div>
                      <p className="text-sm text-slate-500">Mã đơn</p>
                      <p className="break-all font-semibold text-slate-950">{order.id}</p>
                      <p className="mt-3 text-sm text-slate-600">{formatDate(order.created_at)}</p>
                      <p className="mt-2 text-sm text-slate-600">
                        Địa chỉ giao hàng: {getCompactShippingAddress(order.shipping_address)}
                      </p>
                    </div>
                    <div className="min-w-52 text-left lg:text-right">
                      <span className="inline-flex rounded-full bg-amber-100 px-3 py-1 text-sm font-semibold text-amber-800">
                        {getStatusLabel(order.status)}
                      </span>
                      <p className="mt-2 text-sm font-semibold text-emerald-700">{getPaymentLabel(order)}</p>
                      <p className="mt-3 text-sm text-slate-500">Tổng tiền</p>
                      <p className="text-2xl font-bold text-emerald-700">{formatCurrency(Number(order.total_amount || 0))}</p>
                      <p className="mt-1 text-sm text-slate-500">{itemCount} sản phẩm</p>
                    </div>
                  </div>
                  <Link href={`/patient/orders/${order.id}`} className="mt-5 inline-flex">
                    <Button>Xem chi tiết</Button>
                  </Link>
                </Card>
              );
            })
          ) : (
            <Card>
              <p className="font-semibold text-slate-800">Chưa có đơn hàng nào.</p>
              <p className="mt-2 text-sm text-slate-600">Khi checkout thành công, đơn hàng đang chờ xử lý sẽ hiển thị tại đây.</p>
              <Link href="/patient/products" className="mt-5 inline-flex">
                <Button>Xem sản phẩm</Button>
              </Link>
            </Card>
          )}
        </div>
      </section>
    </RequireAuth>
  );
}
