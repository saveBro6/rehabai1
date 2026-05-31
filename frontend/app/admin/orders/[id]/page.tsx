"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import { Button } from "@/components/Button";
import { Card } from "@/components/Card";
import { RequireAdmin } from "@/components/auth/RequireAdmin";
import { formatCurrency, getImageUrl } from "@/lib/utils";
import {
  getAdminOrderById,
  updateAdminOrderStatus,
  type AdminOrder,
  type AdminOrderStatus
} from "@/services/orders.service";

function formatDate(value?: string | null) {
  if (!value) return "Chưa rõ";
  return new Intl.DateTimeFormat("vi-VN", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
}

function getStatusLabel(status: AdminOrder["status"]) {
  if (status === "pending") return "Pending mock";
  if (status === "paid") return "Paid (không phải gateway-confirmed)";
  if (status === "cancelled") return "Đã hủy";
  return status;
}

function canUpdateStatus(status: AdminOrder["status"]): status is AdminOrderStatus {
  return status === "pending" || status === "cancelled";
}

export default function AdminOrderDetailPage({ params }: { params: { id: string } }) {
  const [order, setOrder] = useState<AdminOrder | null>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;

    async function loadOrder() {
      setLoading(true);
      setError("");
      try {
        const row = await getAdminOrderById(params.id);
        if (active) setOrder(row);
      } catch (loadError) {
        if (!active) return;
        setError(loadError instanceof Error ? loadError.message : "Không thể tải chi tiết đơn hàng.");
      } finally {
        if (active) setLoading(false);
      }
    }

    void loadOrder();

    return () => {
      active = false;
    };
  }, [params.id]);

  const itemTotal = useMemo(() => {
    return (order?.items || []).reduce((sum, item) => sum + Number(item.unit_price || 0) * item.quantity, 0);
  }, [order]);

  async function changeStatus(status: AdminOrderStatus) {
    if (!order) return;
    setUpdating(true);
    setError("");
    try {
      await updateAdminOrderStatus(order.id, status);
      setOrder(await getAdminOrderById(order.id));
    } catch (updateError) {
      setError(updateError instanceof Error ? updateError.message : "Không thể cập nhật trạng thái đơn hàng.");
    } finally {
      setUpdating(false);
    }
  }

  return (
    <RequireAdmin>
      <section className="mx-auto max-w-7xl px-4 py-10">
        <Link href="/admin/orders" className="inline-flex">
          <Button variant="ghost">Quay lại danh sách</Button>
        </Link>

        {loading ? (
          <Card className="mt-6">
            <p className="text-slate-500">Đang tải chi tiết đơn hàng...</p>
          </Card>
        ) : error ? (
          <Card className="mt-6 border-rose-200 bg-rose-50">
            <p className="font-semibold text-rose-700">Không thể tải đơn hàng</p>
            <p className="mt-2 text-sm text-rose-600">{error}</p>
          </Card>
        ) : !order ? (
          <Card className="mt-6">
            <p className="font-semibold text-slate-800">Không tìm thấy đơn hàng.</p>
            <p className="mt-2 text-sm text-slate-600">Đơn hàng không tồn tại hoặc tài khoản hiện tại không có quyền quản trị.</p>
          </Card>
        ) : (
          <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_360px]">
            <div className="grid gap-5">
              <Card>
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <p className="text-sm font-bold uppercase text-emerald-700">Admin order detail</p>
                    <h1 className="mt-1 text-3xl font-bold text-slate-950">Chi tiết đơn hàng</h1>
                    <p className="mt-3 break-all text-sm text-slate-600">Mã đơn: {order.id}</p>
                    <p className="mt-2 text-sm text-slate-600">Ngày đặt: {formatDate(order.created_at)}</p>
                  </div>
                  <span className="inline-flex h-fit rounded-full bg-amber-100 px-3 py-1 text-sm font-bold text-amber-800">
                    {getStatusLabel(order.status)}
                  </span>
                </div>
                <p className="mt-5 text-sm text-slate-600">
                  Đây là đơn hàng mock/simulated. Không dùng trạng thái này như xác nhận thanh toán thật từ gateway.
                </p>
              </Card>

              <Card>
                <h2 className="text-xl font-bold text-slate-950">Khách hàng</h2>
                <div className="mt-4 grid gap-2 text-sm text-slate-700 sm:grid-cols-2">
                  <p><span className="font-semibold text-slate-500">Tên:</span> {order.patient?.full_name || "Chưa có tên"}</p>
                  <p><span className="font-semibold text-slate-500">Email:</span> {order.account?.email || "Chưa có email"}</p>
                  <p><span className="font-semibold text-slate-500">Điện thoại:</span> {order.patient?.phone || "Chưa có"}</p>
                  <p><span className="font-semibold text-slate-500">Account:</span> {order.account?.account_status || "Chưa rõ"}</p>
                </div>
              </Card>

              <Card>
                <h2 className="text-xl font-bold text-slate-950">Sản phẩm trong đơn</h2>
                <div className="mt-5 grid gap-4">
                  {(order.items || []).map((item) => {
                    const product = item.product;
                    const subtotal = Number(item.unit_price || 0) * item.quantity;
                    return (
                      <div key={item.id} className="flex flex-col gap-4 border-b border-slate-100 pb-4 last:border-b-0 last:pb-0 sm:flex-row">
                        <Image
                          src={getImageUrl(product?.image_url)}
                          alt={product?.name || "Sản phẩm"}
                          width={96}
                          height={96}
                          className="h-24 w-24 rounded-lg object-cover"
                        />
                        <div className="flex-1">
                          <p className="font-semibold text-slate-950">{product?.name || "Sản phẩm không khả dụng"}</p>
                          <p className="mt-1 text-sm text-slate-600">Danh mục: {product?.category || "Chưa rõ"}</p>
                          <p className="mt-2 text-sm text-slate-600">
                            Đơn giá: {formatCurrency(Number(item.unit_price || 0))} x {item.quantity}
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
              <h2 className="text-xl font-bold text-slate-950">Tổng kết</h2>
              <div className="mt-5 space-y-3 text-sm text-slate-600">
                <div className="flex justify-between gap-4">
                  <span>Tạm tính sản phẩm</span>
                  <span className="font-semibold text-slate-950">{formatCurrency(itemTotal)}</span>
                </div>
                <div className="flex justify-between gap-4">
                  <span>Tổng đơn</span>
                  <span className="font-semibold text-slate-950">{formatCurrency(Number(order.total_amount || 0))}</span>
                </div>
              </div>

              <div className="mt-5 rounded-lg bg-slate-50 p-4">
                <p className="text-sm font-semibold text-slate-800">Địa chỉ giao hàng</p>
                <p className="mt-2 text-sm text-slate-600">{order.shipping_address || "Chưa có địa chỉ"}</p>
              </div>

              <div className="mt-5 grid gap-2">
                <p className="text-sm font-semibold text-slate-800">Cập nhật trạng thái MVP</p>
                {canUpdateStatus(order.status) ? (
                  <select
                    className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
                    disabled={updating}
                    onChange={(event) => void changeStatus(event.target.value as AdminOrderStatus)}
                    value={order.status}
                  >
                    <option value="pending">Pending mock</option>
                    <option value="cancelled">Đã hủy</option>
                  </select>
                ) : (
                  <p className="text-sm text-slate-500">Không cập nhật trạng thái paid trong MVP mock.</p>
                )}
              </div>
            </Card>
          </div>
        )}
      </section>
    </RequireAdmin>
  );
}
