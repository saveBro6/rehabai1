"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

import { Button } from "@/components/Button";
import { Card } from "@/components/Card";
import { RequireAdmin } from "@/components/auth/RequireAdmin";
import { formatCurrency } from "@/lib/utils";
import {
  getAdminOrders,
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

function getItemCount(order: AdminOrder) {
  return (order.items || []).reduce((sum, item) => sum + item.quantity, 0);
}

export default function AdminOrdersPage() {
  const [orders, setOrders] = useState<AdminOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatingOrderId, setUpdatingOrderId] = useState<string | null>(null);
  const [error, setError] = useState("");

  const loadOrders = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      setOrders(await getAdminOrders());
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Không thể tải danh sách đơn hàng.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadOrders();
  }, [loadOrders]);

  async function changeStatus(order: AdminOrder, status: AdminOrderStatus) {
    setUpdatingOrderId(order.id);
    setError("");
    try {
      await updateAdminOrderStatus(order.id, status);
      await loadOrders();
    } catch (updateError) {
      setError(updateError instanceof Error ? updateError.message : "Không thể cập nhật trạng thái đơn hàng.");
    } finally {
      setUpdatingOrderId(null);
    }
  }

  return (
    <RequireAdmin>
      <section className="mx-auto max-w-7xl px-4 py-10">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm font-bold uppercase text-emerald-700">Admin orders</p>
            <h1 className="text-3xl font-bold text-slate-950">Quản lý đơn hàng</h1>
            <p className="mt-2 max-w-2xl text-sm text-slate-600">
              Thanh toán hiện tại là mock/simulated. Trạng thái pending không có nghĩa là đã xác nhận bởi cổng thanh toán thật.
            </p>
          </div>
          <Link href="/admin">
            <Button variant="secondary">Về dashboard</Button>
          </Link>
        </div>

        {error ? (
          <Card className="mt-6 border-rose-200 bg-rose-50">
            <p className="text-sm font-semibold text-rose-700">{error}</p>
          </Card>
        ) : null}

        <Card className="mt-6 overflow-hidden p-0">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1040px] text-left text-sm">
              <thead className="bg-slate-50 text-slate-600">
                <tr>
                  <th className="px-5 py-3 font-semibold">Mã đơn</th>
                  <th className="px-5 py-3 font-semibold">Khách hàng</th>
                  <th className="px-5 py-3 font-semibold">Ngày đặt</th>
                  <th className="px-5 py-3 font-semibold">Trạng thái</th>
                  <th className="px-5 py-3 font-semibold">Tổng tiền</th>
                  <th className="px-5 py-3 font-semibold">Địa chỉ giao hàng</th>
                  <th className="px-5 py-3 font-semibold">Số lượng</th>
                  <th className="px-5 py-3 font-semibold">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  <tr>
                    <td className="px-5 py-6 text-slate-500" colSpan={8}>Đang tải đơn hàng...</td>
                  </tr>
                ) : orders.length ? (
                  orders.map((order) => {
                    const isUpdating = updatingOrderId === order.id;
                    return (
                      <tr key={order.id}>
                        <td className="max-w-56 break-all px-5 py-4 font-semibold text-slate-900">{order.id}</td>
                        <td className="px-5 py-4 text-slate-700">
                          <p className="font-semibold text-slate-900">{order.patient?.full_name || "Chưa có tên"}</p>
                          <p className="text-xs text-slate-500">{order.account?.email || order.user_id}</p>
                          {order.patient?.phone ? <p className="text-xs text-slate-500">{order.patient.phone}</p> : null}
                        </td>
                        <td className="px-5 py-4 text-slate-700">{formatDate(order.created_at)}</td>
                        <td className="px-5 py-4">
                          <div className="grid gap-2">
                            <span className="inline-flex w-fit rounded-full bg-amber-100 px-3 py-1 text-xs font-bold text-amber-800">
                              {getStatusLabel(order.status)}
                            </span>
                            {canUpdateStatus(order.status) ? (
                              <select
                                className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
                                disabled={isUpdating}
                                onChange={(event) => void changeStatus(order, event.target.value as AdminOrderStatus)}
                                value={order.status}
                              >
                                <option value="pending">Pending mock</option>
                                <option value="cancelled">Đã hủy</option>
                              </select>
                            ) : (
                              <span className="text-xs text-slate-500">Không cập nhật paid trong MVP mock.</span>
                            )}
                          </div>
                        </td>
                        <td className="px-5 py-4 font-semibold text-emerald-700">{formatCurrency(Number(order.total_amount || 0))}</td>
                        <td className="max-w-64 px-5 py-4 text-slate-700">{order.shipping_address || "Chưa có"}</td>
                        <td className="px-5 py-4 text-slate-700">{getItemCount(order)} sản phẩm</td>
                        <td className="px-5 py-4">
                          <Link href={`/admin/orders/${order.id}`}>
                            <Button variant="secondary">Chi tiết</Button>
                          </Link>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td className="px-5 py-6 text-slate-500" colSpan={8}>Chưa có đơn hàng.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>
      </section>
    </RequireAdmin>
  );
}
