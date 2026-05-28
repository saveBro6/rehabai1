"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { Button } from "@/components/Button";
import { Card } from "@/components/Card";
import { RequireAdmin } from "@/components/auth/RequireAdmin";
import { formatCurrency } from "@/lib/utils";
import { getAdminOrders, type AdminOrder } from "@/services/admin-orders.service";

function formatDate(value?: string) {
  if (!value) return "Chưa có ngày";
  return new Intl.DateTimeFormat("vi-VN", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
}

function getStatusLabel(status: string) {
  if (status === "pending") return "Đơn hàng demo - chờ xử lý";
  if (status === "processing") return "Đang xử lý";
  if (status === "shipped") return "Đã gửi hàng";
  if (status === "delivered") return "Đã giao";
  if (status === "cancelled") return "Đã hủy";
  return status;
}

export default function AdminOrdersPage() {
  const [orders, setOrders] = useState<AdminOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setErrorMessage(null);

    void getAdminOrders()
      .then((data) => {
        if (active) setOrders(data);
      })
      .catch(() => {
        if (active) setErrorMessage("Không thể tải danh sách đơn hàng. Vui lòng kiểm tra quyền admin hoặc RLS.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  return (
    <RequireAdmin>
      <section className="mx-auto max-w-7xl px-4 py-10">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-sm font-bold uppercase text-emerald-700">Admin</p>
            <h1 className="text-3xl font-bold text-slate-950">Quản lý đơn hàng</h1>
            <p className="mt-2 max-w-2xl text-sm text-slate-600">
              Theo dõi đơn hàng demo từ luồng giỏ hàng. Thanh toán thật, webhook, ví và hoàn tiền chưa được triển khai.
            </p>
          </div>
          <Link href="/admin">
            <Button variant="secondary">Về admin</Button>
          </Link>
        </div>

        <div className="mt-8 grid gap-4">
          {loading ? <p className="text-slate-500">Đang tải đơn hàng...</p> : null}
          {errorMessage ? <Card><p className="text-red-600">{errorMessage}</p></Card> : null}

          {!loading && !errorMessage && orders.length
            ? orders.map((order) => (
                <Card key={order.id}>
                  <div className="grid gap-5 lg:grid-cols-[1.3fr_1fr_auto]">
                    <div>
                      <p className="text-sm font-semibold text-slate-500">Mã đơn</p>
                      <p className="mt-1 break-all font-mono text-sm font-bold text-slate-950">{order.id}</p>
                      <p className="mt-3 text-sm text-slate-600">Ngày tạo: {formatDate(order.created_at)}</p>
                      <p className="mt-1 text-sm text-slate-600">Địa chỉ: {order.shipping_address || "Chưa có địa chỉ"}</p>
                    </div>

                    <div>
                      <p className="text-sm font-semibold text-slate-500">Khách hàng</p>
                      <p className="mt-1 font-bold text-slate-950">{order.buyer?.email || "Không rõ"}</p>
                      <p className="mt-1 text-sm text-slate-600">{order.buyer?.id ? `Account ID: ${order.buyer.id}` : "Không rõ"}</p>
                      <p className="mt-3 text-sm text-slate-600">{order.items?.length || 0} sản phẩm</p>
                    </div>

                    <div className="lg:text-right">
                      <span className="inline-flex rounded-full bg-amber-50 px-3 py-1 text-sm font-semibold text-amber-800">
                        {getStatusLabel(order.status)}
                      </span>
                      {order.status === "pending" ? (
                        <p className="mt-2 text-xs font-semibold text-amber-700">Thanh toán giả lập</p>
                      ) : null}
                      <p className="mt-3 text-2xl font-bold text-emerald-700">{formatCurrency(Number(order.total_amount || 0))}</p>
                      <Link href={`/admin/orders/${order.id}`} className="mt-4 inline-flex">
                        <Button>Chi tiết đơn hàng</Button>
                      </Link>
                    </div>
                  </div>
                </Card>
              ))
            : null}

          {!loading && !errorMessage && !orders.length ? (
            <Card className="text-center">
              <h2 className="text-xl font-bold text-slate-950">Chưa có đơn hàng</h2>
              <p className="mt-2 text-sm text-slate-600">Khi bệnh nhân tạo đơn hàng demo, đơn sẽ xuất hiện tại đây.</p>
            </Card>
          ) : null}
        </div>
      </section>
    </RequireAdmin>
  );
}
