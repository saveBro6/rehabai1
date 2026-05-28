"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { Button } from "@/components/Button";
import { Card } from "@/components/Card";
import { RequirePatient } from "@/components/auth/RequirePatient";
import { useAuth } from "@/hooks/useAuth";
import { formatCurrency } from "@/lib/utils";
import { getOrders, type OrderWithItems } from "@/services/orders.service";

function formatDate(value?: string) {
  if (!value) return "Chưa có ngày";
  return new Intl.DateTimeFormat("vi-VN", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
}

function getStatusLabel(status: string) {
  if (status === "pending") return "Đơn hàng demo - thanh toán giả lập";
  if (status === "paid") return "Đã đánh dấu thanh toán (dữ liệu mock/cũ)";
  if (status === "cancelled") return "Đã hủy";
  return status;
}

export default function OrdersPage() {
  const { user, isLoading } = useAuth();
  const [orders, setOrders] = useState<OrderWithItems[]>([]);
  const [loadingOrders, setLoadingOrders] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (isLoading || !user) return;

    let active = true;
    setLoadingOrders(true);
    setErrorMessage(null);

    void getOrders(user.id)
      .then((data) => {
        if (active) setOrders(data);
      })
      .catch(() => {
        if (active) setErrorMessage("Không thể tải lịch sử đơn hàng. Vui lòng thử lại sau.");
      })
      .finally(() => {
        if (active) setLoadingOrders(false);
      });

    return () => {
      active = false;
    };
  }, [isLoading, user]);

  return (
    <RequirePatient>
      <section className="mx-auto max-w-6xl px-4 py-10">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-sm font-bold uppercase text-emerald-700">Đơn hàng</p>
            <h1 className="text-3xl font-bold text-slate-950">Lịch sử đơn hàng</h1>
            <p className="mt-2 max-w-2xl text-sm text-slate-600">
              Các đơn hàng trong MVP dùng thanh toán giả lập. Trạng thái pending không phải xác nhận thanh toán thật từ cổng thanh toán.
            </p>
          </div>
          <Link href="/products">
            <Button>Mua dụng cụ</Button>
          </Link>
        </div>

        <div className="mt-8 grid gap-4">
          {loadingOrders ? <p className="text-slate-500">Đang tải đơn hàng...</p> : null}
          {errorMessage ? <Card><p className="text-red-600">{errorMessage}</p></Card> : null}

          {!loadingOrders && !errorMessage && orders.length
            ? orders.map((order) => (
                <Card key={order.id}>
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                      <p className="text-sm font-semibold text-slate-500">Mã đơn</p>
                      <p className="mt-1 font-mono text-sm font-bold text-slate-950">{order.id}</p>
                      <p className="mt-3 text-sm text-slate-600">Ngày tạo: {formatDate(order.created_at)}</p>
                      <p className="mt-1 text-sm text-slate-600">Địa chỉ nhận hàng: {order.shipping_address || "Chưa có địa chỉ"}</p>
                    </div>
                    <div className="text-left sm:text-right">
                      <span className="inline-flex rounded-full bg-amber-50 px-3 py-1 text-sm font-semibold text-amber-800">
                        {getStatusLabel(order.status)}
                      </span>
                      <p className="mt-3 text-2xl font-bold text-emerald-700">{formatCurrency(Number(order.total_amount || 0))}</p>
                      <p className="mt-1 text-sm text-slate-500">{order.items?.length || 0} sản phẩm</p>
                    </div>
                  </div>
                  <div className="mt-5 flex justify-end">
                    <Link href={`/orders/${order.id}`}>
                      <Button variant="secondary">Xem chi tiết</Button>
                    </Link>
                  </div>
                </Card>
              ))
            : null}

          {!loadingOrders && !errorMessage && !orders.length ? (
            <Card className="text-center">
              <h2 className="text-xl font-bold text-slate-950">Chưa có đơn hàng</h2>
              <p className="mx-auto mt-2 max-w-xl text-sm text-slate-600">
                Sau khi tạo đơn hàng demo từ giỏ hàng, đơn sẽ xuất hiện tại đây.
              </p>
              <Link href="/products" className="mt-5 inline-flex">
                <Button>Mua dụng cụ</Button>
              </Link>
            </Card>
          ) : null}
        </div>
      </section>
    </RequirePatient>
  );
}
