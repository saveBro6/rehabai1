"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";

import { Button } from "@/components/Button";
import { Card } from "@/components/Card";
import { RequireAdmin } from "@/components/auth/RequireAdmin";
import { useToast } from "@/hooks/useToast";
import { formatCurrency } from "@/lib/utils";
import {
  ADMIN_ORDER_STATUSES,
  getAdminOrderById,
  updateAdminOrderStatus,
  type AdminOrder,
  type AdminOrderStatus
} from "@/services/admin-orders.service";

const STATUS_LABELS: Record<AdminOrderStatus, string> = {
  pending: "Đơn hàng demo - chờ xử lý",
  processing: "Đang xử lý",
  shipped: "Đã gửi hàng",
  delivered: "Đã giao",
  cancelled: "Đã hủy"
};

function formatDate(value?: string) {
  if (!value) return "Chưa có ngày";
  return new Intl.DateTimeFormat("vi-VN", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
}

export default function AdminOrderDetailPage() {
  const params = useParams<{ orderId: string }>();
  const { pushToast } = useToast();
  const [order, setOrder] = useState<AdminOrder | null>(null);
  const [selectedStatus, setSelectedStatus] = useState<AdminOrderStatus>("pending");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!params.orderId) return;

    let active = true;
    setLoading(true);
    setErrorMessage(null);

    void getAdminOrderById(params.orderId)
      .then((data) => {
        if (!active) return;
        setOrder(data);
        if (data) {
          setSelectedStatus(data.status);
        } else {
          setErrorMessage("Không tìm thấy đơn hàng.");
        }
      })
      .catch(() => {
        if (active) setErrorMessage("Không thể tải chi tiết đơn hàng. Vui lòng kiểm tra quyền admin hoặc RLS.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [params.orderId]);

  async function saveStatus() {
    if (!order || selectedStatus === order.status) return;

    setSaving(true);
    try {
      const updated = await updateAdminOrderStatus(order.id, selectedStatus);
      setOrder(updated);
      pushToast("Đã cập nhật trạng thái", `Trạng thái mới: ${STATUS_LABELS[selectedStatus]}.`);
    } catch {
      pushToast("Không thể cập nhật trạng thái", "Vui lòng kiểm tra quyền admin, RLS hoặc constraint status.");
    } finally {
      setSaving(false);
    }
  }

  const items = order?.items || [];

  return (
    <RequireAdmin>
      <section className="mx-auto max-w-7xl px-4 py-10">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-sm font-bold uppercase text-emerald-700">Admin</p>
            <h1 className="text-3xl font-bold text-slate-950">Chi tiết đơn hàng</h1>
          </div>
          <Link href="/admin/orders">
            <Button variant="secondary">Quay lại quản lý đơn hàng</Button>
          </Link>
        </div>

        {loading ? <p className="mt-8 text-slate-500">Đang tải chi tiết đơn hàng...</p> : null}
        {errorMessage ? <Card className="mt-8"><p className="text-red-600">{errorMessage}</p></Card> : null}

        {!loading && order ? (
          <div className="mt-8 grid gap-6 lg:grid-cols-[1fr_380px]">
            <div className="grid gap-4">
              <Card>
                <div className="grid gap-5 md:grid-cols-2">
                  <div>
                    <p className="text-sm font-semibold text-slate-500">Mã đơn</p>
                    <p className="mt-1 break-all font-mono text-sm font-bold text-slate-950">{order.id}</p>
                    <p className="mt-3 text-sm text-slate-600">Ngày tạo: {formatDate(order.created_at)}</p>
                    <p className="mt-1 text-sm text-slate-600">Địa chỉ nhận hàng: {order.shipping_address || "Chưa có địa chỉ"}</p>
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-slate-500">Khách hàng</p>
                    <p className="mt-1 font-bold text-slate-950">{order.buyer?.email || "Không rõ"}</p>
                    <p className="mt-1 text-sm text-slate-600">{order.buyer?.id ? `Account ID: ${order.buyer.id}` : "Không rõ"}</p>
                    <p className="mt-3 text-sm text-slate-600">Trạng thái: {STATUS_LABELS[order.status]}</p>
                  </div>
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

            <div className="grid h-fit gap-4">
              <Card>
                <h2 className="text-xl font-bold text-slate-950">Tổng kết</h2>
                <p className="mt-4 text-sm text-slate-600">Tổng tiền</p>
                <p className="mt-1 text-3xl font-bold text-emerald-700">{formatCurrency(Number(order.total_amount || 0))}</p>
                <p className="mt-4 rounded-lg bg-amber-50 px-3 py-2 text-sm font-semibold text-amber-800">
                  Đơn hàng demo - chưa có xác nhận thanh toán thật từ cổng thanh toán.
                </p>
              </Card>

              <Card>
                <h2 className="text-xl font-bold text-slate-950">Cập nhật trạng thái</h2>
                <label className="mt-4 block text-sm font-semibold text-slate-700" htmlFor="order-status">
                  Trạng thái đơn hàng
                </label>
                <select
                  id="order-status"
                  className="mt-2 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
                  value={selectedStatus}
                  onChange={(event) => setSelectedStatus(event.target.value as AdminOrderStatus)}
                >
                  {ADMIN_ORDER_STATUSES.map((status) => (
                    <option key={status} value={status}>
                      {STATUS_LABELS[status]}
                    </option>
                  ))}
                </select>
                <Button className="mt-4 w-full" onClick={() => void saveStatus()} disabled={saving || selectedStatus === order.status}>
                  {saving ? "Đang cập nhật..." : "Cập nhật trạng thái"}
                </Button>
                <p className="mt-3 text-xs text-slate-500">
                  Không dùng trạng thái paid trong MVP vì chưa có gateway/webhook xác nhận thanh toán thật.
                </p>
              </Card>
            </div>
          </div>
        ) : null}
      </section>
    </RequireAdmin>
  );
}
