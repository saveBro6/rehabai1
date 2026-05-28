"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";

import { Button } from "@/components/Button";
import { Card } from "@/components/Card";
import { RequirePatient } from "@/components/auth/RequirePatient";
import { useAuth } from "@/hooks/useAuth";
import { formatCurrency } from "@/lib/utils";
import { getOrderById, type OrderWithItems } from "@/services/orders.service";

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

export default function OrderDetailPage() {
  const params = useParams<{ orderId: string }>();
  const { user, isLoading } = useAuth();
  const [order, setOrder] = useState<OrderWithItems | null>(null);
  const [loadingOrder, setLoadingOrder] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (isLoading || !user || !params.orderId) return;

    let active = true;
    setLoadingOrder(true);
    setErrorMessage(null);

    void getOrderById(params.orderId, user.id)
      .then((data) => {
        if (!active) return;
        setOrder(data);
        if (!data) {
          setErrorMessage("Không tìm thấy đơn hàng hoặc bạn không có quyền xem đơn này.");
        }
      })
      .catch(() => {
        if (active) setErrorMessage("Không thể tải chi tiết đơn hàng. Vui lòng thử lại sau.");
      })
      .finally(() => {
        if (active) setLoadingOrder(false);
      });

    return () => {
      active = false;
    };
  }, [isLoading, params.orderId, user]);

  const items = order?.items || [];

  return (
    <RequirePatient>
      <section className="mx-auto max-w-6xl px-4 py-10">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-sm font-bold uppercase text-emerald-700">Chi tiết đơn hàng</p>
            <h1 className="text-3xl font-bold text-slate-950">Đơn hàng của tôi</h1>
          </div>
          <Link href="/orders">
            <Button variant="secondary">Quay lại lịch sử</Button>
          </Link>
        </div>

        {loadingOrder ? <p className="mt-8 text-slate-500">Đang tải chi tiết đơn hàng...</p> : null}
        {errorMessage ? (
          <Card className="mt-8">
            <p className="text-red-600">{errorMessage}</p>
          </Card>
        ) : null}

        {!loadingOrder && order ? (
          <div className="mt-8 grid gap-6 lg:grid-cols-[1fr_360px]">
            <div className="grid gap-4">
              <Card>
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <p className="text-sm font-semibold text-slate-500">Mã đơn</p>
                    <p className="mt-1 break-all font-mono text-sm font-bold text-slate-950">{order.id}</p>
                    <p className="mt-3 text-sm text-slate-600">Ngày tạo: {formatDate(order.created_at)}</p>
                    <p className="mt-1 text-sm text-slate-600">Địa chỉ nhận hàng: {order.shipping_address || "Chưa có địa chỉ"}</p>
                  </div>
                  <span className="inline-flex rounded-full bg-amber-50 px-3 py-1 text-sm font-semibold text-amber-800">
                    {getStatusLabel(order.status)}
                  </span>
                </div>
              </Card>

              <Card>
                <h2 className="text-xl font-bold text-slate-950">Sản phẩm trong đơn</h2>
                <div className="mt-5 grid gap-4">
                  {items.length ? (
                    items.map((item) => {
                      const unitPrice = Number(item.unit_price || 0);
                      const subtotal = unitPrice * item.quantity;

                      return (
                        <div key={item.id} className="grid gap-3 rounded-lg border border-slate-100 p-4 md:grid-cols-[1fr_auto]">
                          <div>
                            <p className="font-bold text-slate-950">{item.product?.name || "Sản phẩm không khả dụng"}</p>
                            <p className="mt-1 text-sm text-slate-600">Số lượng: {item.quantity}</p>
                            <p className="mt-1 text-sm text-slate-600">Đơn giá: {formatCurrency(unitPrice)}</p>
                          </div>
                          <div className="md:text-right">
                            <p className="text-sm font-semibold text-slate-500">Tạm tính</p>
                            <p className="mt-1 text-lg font-bold text-emerald-700">{formatCurrency(subtotal)}</p>
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <p className="text-sm text-slate-500">Đơn hàng chưa có dòng sản phẩm.</p>
                  )}
                </div>
              </Card>
            </div>

            <Card className="h-fit">
              <h2 className="text-xl font-bold text-slate-950">Tổng kết</h2>
              <p className="mt-4 text-sm text-slate-600">Trạng thái</p>
              <p className="mt-1 font-semibold text-amber-800">{getStatusLabel(order.status)}</p>
              <p className="mt-4 rounded-lg bg-amber-50 px-3 py-2 text-sm font-semibold text-amber-800">
                Thanh toán giả lập: đơn hàng này không có xác nhận từ cổng thanh toán thật.
              </p>
              <p className="mt-5 text-sm text-slate-600">Tổng tiền</p>
              <p className="mt-1 text-3xl font-bold text-emerald-700">{formatCurrency(Number(order.total_amount || 0))}</p>
              <Link href="/products" className="mt-6 inline-flex w-full">
                <Button className="w-full">Mua thêm dụng cụ</Button>
              </Link>
            </Card>
          </div>
        ) : null}
      </section>
    </RequirePatient>
  );
}
