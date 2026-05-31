"use client";

import Image from "next/image";
import Link from "next/link";
import type { FormEvent } from "react";
import { useEffect, useMemo, useState } from "react";

import { Button } from "@/components/Button";
import { Card } from "@/components/Card";
import { RequireAdmin } from "@/components/auth/RequireAdmin";
import { useToast } from "@/hooks/useToast";
import { getShippingAddressLines } from "@/lib/shipping-address";
import { formatCurrency, getImageUrl } from "@/lib/utils";
import {
  cancelAdminOrder,
  confirmAdminOrder,
  getAdminOrderById,
  upsertAdminShipment,
  type AdminOrder,
  type Shipment,
  type ShippingStatus
} from "@/services/orders.service";

const shippingStatusOptions: Array<{ value: ShippingStatus; label: string }> = [
  { value: "not_started", label: "Chưa bắt đầu giao" },
  { value: "preparing", label: "Đang chuẩn bị" },
  { value: "shipped", label: "Đang giao" },
  { value: "delivered", label: "Đã giao" },
  { value: "failed", label: "Giao thất bại" },
  { value: "returned", label: "Đã hoàn trả" },
  { value: "cancelled", label: "Đã hủy" }
];

const adminCancellationReasons = [
  "Hết hàng",
  "Không thể liên hệ khách hàng",
  "Địa chỉ giao hàng không hợp lệ",
  "Đơn hàng nghi ngờ không hợp lệ",
  "Khác"
];

type ShipmentFormState = {
  carrier_name: string;
  tracking_number: string;
  shipping_status: ShippingStatus;
  shipping_fee: string;
  estimated_delivery_date: string;
  shipped_at: string;
  delivered_at: string;
};

function formatDate(value?: string | null) {
  if (!value) return "Chưa rõ";
  return new Intl.DateTimeFormat("vi-VN", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
}

function formatDateTimeLocal(value?: string | null) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const localDate = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return localDate.toISOString().slice(0, 16);
}

function toIsoDateTime(value: string) {
  return value ? new Date(value).toISOString() : null;
}

function getStatusLabel(status: AdminOrder["status"]) {
  if (status === "pending") return "Đơn hàng đang chờ xử lý";
  if (status === "confirmed") return "Đã xác nhận";
  if (status === "paid") return "Paid (không phải gateway-confirmed)";
  if (status === "cancelled") return "Đã hủy";
  return status;
}

function getShipmentFormState(shipment?: Shipment | null): ShipmentFormState {
  return {
    carrier_name: shipment?.carrier_name || "",
    tracking_number: shipment?.tracking_number || "",
    shipping_status: shipment?.shipping_status || "not_started",
    shipping_fee: shipment ? String(Number(shipment.shipping_fee || 0)) : "0",
    estimated_delivery_date: shipment?.estimated_delivery_date || "",
    shipped_at: formatDateTimeLocal(shipment?.shipped_at),
    delivered_at: formatDateTimeLocal(shipment?.delivered_at)
  };
}

function canAdminCancel(order: AdminOrder) {
  return ["pending", "confirmed"].includes(order.status) && !["shipped", "delivered"].includes(order.shipment?.shipping_status || "");
}

function canManageShipment(order: AdminOrder) {
  return order.status === "confirmed";
}

function buildCancellationReason(reason: string, customReason: string) {
  return reason === "Khác" ? customReason.trim() : reason;
}

export default function AdminOrderDetailPage({ params }: { params: { id: string } }) {
  const { pushToast } = useToast();
  const [order, setOrder] = useState<AdminOrder | null>(null);
  const [loading, setLoading] = useState(true);
  const [confirming, setConfirming] = useState(false);
  const [updatingShipment, setUpdatingShipment] = useState(false);
  const [shipmentForm, setShipmentForm] = useState<ShipmentFormState>(() => getShipmentFormState());
  const [showCancelForm, setShowCancelForm] = useState(false);
  const [cancelReason, setCancelReason] = useState(adminCancellationReasons[0]);
  const [customCancelReason, setCustomCancelReason] = useState("");
  const [cancelling, setCancelling] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;

    async function loadOrder() {
      setLoading(true);
      setError("");
      try {
        const row = await getAdminOrderById(params.id);
        if (active) {
          setOrder(row);
          setShipmentForm(getShipmentFormState(row?.shipment));
        }
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

  async function confirmOrder() {
    if (!order) return;

    setConfirming(true);
    try {
      await confirmAdminOrder(order.id);
      const row = await getAdminOrderById(order.id);
      setOrder(row);
      setShipmentForm(getShipmentFormState(row?.shipment));
      pushToast(
        "Xác nhận đơn hàng thành công.",
        "Đơn hàng đã được xác nhận để xử lý. Thanh toán vẫn là mô phỏng/chưa qua cổng thật."
      );
    } catch (confirmError) {
      const message = confirmError instanceof Error ? confirmError.message : "Vui lòng thử lại.";
      pushToast("Không thể xác nhận đơn hàng. Vui lòng thử lại.", message);
    } finally {
      setConfirming(false);
    }
  }

  async function submitCancellation(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!order) return;

    const reason = buildCancellationReason(cancelReason, customCancelReason);
    if (!reason) {
      pushToast("Thiếu lý do hủy đơn", "Vui lòng nhập lý do hủy đơn hàng.");
      return;
    }

    setCancelling(true);
    try {
      await cancelAdminOrder(order.id, reason);
      const row = await getAdminOrderById(order.id);
      setOrder(row);
      setShipmentForm(getShipmentFormState(row?.shipment));
      setShowCancelForm(false);
      pushToast("Cập nhật trạng thái đơn hàng thành công.", "Đơn hàng đã được hủy với lý do đã lưu.");
    } catch (cancelError) {
      const message = cancelError instanceof Error ? cancelError.message : "Vui lòng thử lại.";
      pushToast("Không thể cập nhật trạng thái đơn hàng. Vui lòng thử lại.", message);
    } finally {
      setCancelling(false);
    }
  }

  async function saveShipment(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!order) return;

    if (!canManageShipment(order)) {
      pushToast("Không thể cập nhật vận chuyển. Vui lòng thử lại.", "Cần xác nhận đơn hàng trước khi chuẩn bị giao.");
      return;
    }

    const shippingFee = shipmentForm.shipping_fee.trim() ? Number(shipmentForm.shipping_fee) : 0;
    if (!Number.isFinite(shippingFee) || shippingFee < 0) {
      pushToast("Không thể cập nhật vận chuyển. Vui lòng thử lại.", "Phí vận chuyển phải là số không âm.");
      return;
    }

    setUpdatingShipment(true);
    try {
      await upsertAdminShipment(order.id, {
        carrier_name: shipmentForm.carrier_name.trim() || null,
        tracking_number: shipmentForm.tracking_number.trim() || null,
        shipping_status: shipmentForm.shipping_status,
        shipping_fee: shippingFee,
        estimated_delivery_date: shipmentForm.estimated_delivery_date || null,
        shipped_at: toIsoDateTime(shipmentForm.shipped_at),
        delivered_at: toIsoDateTime(shipmentForm.delivered_at)
      });
      const row = await getAdminOrderById(order.id);
      setOrder(row);
      setShipmentForm(getShipmentFormState(row?.shipment));
      pushToast("Cập nhật vận chuyển thành công.");
    } catch {
      pushToast("Không thể cập nhật vận chuyển. Vui lòng thử lại.");
    } finally {
      setUpdatingShipment(false);
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
                {order.status === "pending" ? (
                  <div className="mt-5 rounded-lg border border-emerald-100 bg-emerald-50 p-4">
                    <p className="text-sm text-emerald-800">
                      Xác nhận này chỉ có nghĩa là Admin tiếp nhận đơn để xử lý. Không phải xác nhận thanh toán thật từ cổng thanh toán.
                    </p>
                    <Button className="mt-3" disabled={confirming} onClick={confirmOrder}>
                      {confirming ? "Đang xác nhận..." : "Xác nhận đơn hàng"}
                    </Button>
                  </div>
                ) : null}
                {order.status === "confirmed" ? (
                  <p className="mt-5 rounded-lg border border-emerald-100 bg-emerald-50 p-4 text-sm text-emerald-800">
                    Đơn hàng đã được xác nhận để xử lý. Thanh toán vẫn là mô phỏng/chưa qua cổng thật.
                  </p>
                ) : null}
                {order.status === "cancelled" ? (
                  <div className="mt-5 rounded-lg border border-rose-100 bg-rose-50 p-4 text-sm">
                    <p className="font-semibold text-rose-800">Thông tin hủy đơn</p>
                    <p className="mt-2 text-rose-700">Lý do: {order.cancellation_reason || "Chưa có lý do"}</p>
                    <p className="mt-1 text-rose-700">Thời điểm hủy: {formatDate(order.cancelled_at)}</p>
                    <p className="mt-2 text-rose-700">Đơn mock/pending đã hủy không tạo hoàn tiền thật.</p>
                  </div>
                ) : null}
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
                {getShippingAddressLines(order.shipping_address).length ? (
                  <dl className="mt-3 grid gap-2 text-sm">
                    {getShippingAddressLines(order.shipping_address).map((line) => (
                      <div key={`${line.label}-${line.value}`}>
                        <dt className="font-semibold text-slate-800">{line.label}</dt>
                        <dd className="mt-1 text-slate-600">{line.value}</dd>
                      </div>
                    ))}
                  </dl>
                ) : (
                  <p className="mt-2 text-sm text-slate-600">Chưa có địa chỉ</p>
                )}
              </div>

              {canAdminCancel(order) ? (
                <div className="mt-5 rounded-lg border border-rose-100 bg-rose-50 p-4">
                  <div className="flex flex-col gap-3">
                    <div>
                      <p className="text-sm font-semibold text-rose-800">Hủy đơn hàng</p>
                      <p className="mt-2 text-sm text-rose-700">
                        Hủy đơn pending/confirmed mock cần lý do. Không xử lý hoàn tiền thật trong MVP.
                      </p>
                    </div>
                    {!showCancelForm ? (
                      <Button variant="secondary" onClick={() => setShowCancelForm(true)}>
                        Hủy đơn hàng
                      </Button>
                    ) : null}
                  </div>

                  {showCancelForm ? (
                    <form className="mt-4 grid gap-4" onSubmit={submitCancellation}>
                      <label className="block text-sm font-semibold text-slate-800" htmlFor="admin-cancel-reason">
                        Lý do hủy đơn
                        <select
                          id="admin-cancel-reason"
                          className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                          disabled={cancelling}
                          value={cancelReason}
                          onChange={(event) => setCancelReason(event.target.value)}
                        >
                          {adminCancellationReasons.map((reason) => (
                            <option key={reason} value={reason}>
                              {reason}
                            </option>
                          ))}
                        </select>
                      </label>

                      {cancelReason === "Khác" ? (
                        <label className="block text-sm font-semibold text-slate-800" htmlFor="admin-custom-cancel-reason">
                          Lý do khác
                          <textarea
                            id="admin-custom-cancel-reason"
                            className="mt-2 min-h-24 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                            disabled={cancelling}
                            value={customCancelReason}
                            onChange={(event) => setCustomCancelReason(event.target.value)}
                          />
                        </label>
                      ) : null}

                      <div className="flex flex-col gap-3">
                        <Button disabled={cancelling} type="submit">
                          {cancelling ? "Đang hủy..." : "Xác nhận hủy đơn"}
                        </Button>
                        <Button disabled={cancelling} type="button" variant="ghost" onClick={() => setShowCancelForm(false)}>
                          Không hủy nữa
                        </Button>
                      </div>
                    </form>
                  ) : null}
                </div>
              ) : null}

              <form className="mt-6 border-t border-slate-100 pt-6" onSubmit={saveShipment}>
                <div>
                  <h3 className="text-lg font-bold text-slate-950">Vận chuyển thủ công</h3>
                  <p className="mt-2 text-sm text-slate-600">
                    Fulfillment thủ công/mock chỉ bắt đầu sau khi Admin xác nhận đơn hàng. Không xem đây là đơn đã được cổng thanh toán thật xác nhận.
                  </p>
                </div>
                {!canManageShipment(order) ? (
                  <p className="mt-4 rounded-lg border border-amber-100 bg-amber-50 p-3 text-sm text-amber-800">
                    Cần xác nhận đơn hàng trước khi cập nhật vận chuyển.
                  </p>
                ) : null}

                <label className="mt-4 block text-sm font-semibold text-slate-700" htmlFor="shipping-status">
                  Trạng thái giao hàng
                </label>
                <select
                  id="shipping-status"
                  className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  disabled={updatingShipment || !canManageShipment(order)}
                  value={shipmentForm.shipping_status}
                  onChange={(event) =>
                    setShipmentForm((current) => ({
                      ...current,
                      shipping_status: event.target.value as ShippingStatus
                    }))
                  }
                >
                  {shippingStatusOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>

                <div className="mt-4 grid gap-4">
                  <label className="block text-sm font-semibold text-slate-700" htmlFor="carrier-name">
                    Đơn vị vận chuyển
                    <input
                      id="carrier-name"
                      className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                      disabled={updatingShipment || !canManageShipment(order)}
                      value={shipmentForm.carrier_name}
                      onChange={(event) => setShipmentForm((current) => ({ ...current, carrier_name: event.target.value }))}
                    />
                  </label>

                  <label className="block text-sm font-semibold text-slate-700" htmlFor="tracking-number">
                    Mã vận đơn
                    <input
                      id="tracking-number"
                      className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                      disabled={updatingShipment || !canManageShipment(order)}
                      value={shipmentForm.tracking_number}
                      onChange={(event) => setShipmentForm((current) => ({ ...current, tracking_number: event.target.value }))}
                    />
                  </label>

                  <label className="block text-sm font-semibold text-slate-700" htmlFor="shipping-fee">
                    Phí vận chuyển
                    <input
                      id="shipping-fee"
                      min="0"
                      step="1000"
                      type="number"
                      className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                      disabled={updatingShipment || !canManageShipment(order)}
                      value={shipmentForm.shipping_fee}
                      onChange={(event) => setShipmentForm((current) => ({ ...current, shipping_fee: event.target.value }))}
                    />
                  </label>

                  <label className="block text-sm font-semibold text-slate-700" htmlFor="estimated-delivery-date">
                    Ngày giao dự kiến
                    <input
                      id="estimated-delivery-date"
                      type="date"
                      className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                      disabled={updatingShipment || !canManageShipment(order)}
                      value={shipmentForm.estimated_delivery_date}
                      onChange={(event) => setShipmentForm((current) => ({ ...current, estimated_delivery_date: event.target.value }))}
                    />
                  </label>

                  <label className="block text-sm font-semibold text-slate-700" htmlFor="shipped-at">
                    Thời điểm gửi hàng
                    <input
                      id="shipped-at"
                      type="datetime-local"
                      className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                      disabled={updatingShipment || !canManageShipment(order)}
                      value={shipmentForm.shipped_at}
                      onChange={(event) => setShipmentForm((current) => ({ ...current, shipped_at: event.target.value }))}
                    />
                  </label>

                  <label className="block text-sm font-semibold text-slate-700" htmlFor="delivered-at">
                    Thời điểm giao thành công
                    <input
                      id="delivered-at"
                      type="datetime-local"
                      className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                      disabled={updatingShipment || !canManageShipment(order)}
                      value={shipmentForm.delivered_at}
                      onChange={(event) => setShipmentForm((current) => ({ ...current, delivered_at: event.target.value }))}
                    />
                  </label>
                </div>

                <Button className="mt-5 w-full" disabled={updatingShipment || !canManageShipment(order)} type="submit">
                  {updatingShipment ? "Đang lưu..." : order.shipment ? "Cập nhật vận chuyển" : "Tạo thông tin vận chuyển"}
                </Button>
              </form>
            </Card>
          </div>
        )}
      </section>
    </RequireAdmin>
  );
}
