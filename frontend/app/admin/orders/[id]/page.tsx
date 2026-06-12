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
  transitionAdminShipment,
  updateAdminShipmentDetails,
  type AdminOrder,
  type Shipment,
  type ShippingStatus
} from "@/services/orders.service";

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
  shipping_fee: string;
  estimated_delivery_date: string;
};

function formatDate(value?: string | null) {
  if (!value) return "Chưa rõ";
  return new Intl.DateTimeFormat("vi-VN", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
}

function formatDateOnly(value?: string | null) {
  if (!value) return "Chưa rõ";
  return new Intl.DateTimeFormat("vi-VN", { dateStyle: "medium" }).format(new Date(value));
}

function getStatusLabel(status: AdminOrder["status"]) {
  if (status === "pending") return "Đơn hàng đang chờ xử lý";
  if (status === "confirmed") return "Đã xác nhận";
  if (status === "paid") return "Paid (không phải gateway-confirmed)";
  if (status === "cancelled") return "Đã hủy";
  return status;
}

function getPaymentLabel(order: AdminOrder) {
  if (order.payment_method === "internal_wallet" && order.payment_status === "paid") {
    return "Đã thanh toán bằng Ví RehabAI";
  }

  if (order.payment_status === "paid") {
    return "Đã thanh toán";
  }

  return "Chưa thanh toán";
}

function getShippingStatusLabel(status?: ShippingStatus) {
  if (status === "not_started") return "Chưa bắt đầu giao";
  if (status === "preparing") return "Đang chuẩn bị";
  if (status === "shipped") return "Đang giao";
  if (status === "delivered") return "Đã giao";
  if (status === "failed") return "Giao thất bại";
  if (status === "returned") return "Đã hoàn trả";
  if (status === "cancelled") return "Đã hủy";
  return "Chưa có thông tin";
}

function getShipmentFormState(shipment?: Shipment | null): ShipmentFormState {
  return {
    carrier_name: shipment?.carrier_name || "",
    tracking_number: shipment?.tracking_number || "",
    shipping_fee: shipment ? String(Number(shipment.shipping_fee || 0)) : "0",
    estimated_delivery_date: shipment?.estimated_delivery_date || ""
  };
}

function getShipmentStatus(order: AdminOrder) {
  return order.shipment?.shipping_status;
}

function canAdminCancel(order: AdminOrder) {
  return ["pending", "confirmed"].includes(order.status) && !["shipped", "delivered"].includes(getShipmentStatus(order) || "");
}

function canEditShipmentDetails(order: AdminOrder) {
  return order.status === "confirmed" && !["shipped", "delivered"].includes(getShipmentStatus(order) || "");
}

function canStartPreparation(order: AdminOrder) {
  return order.status === "confirmed" && (!order.shipment || getShipmentStatus(order) === "not_started");
}

function canHandOverToCarrier(order: AdminOrder) {
  return order.status === "confirmed" && getShipmentStatus(order) === "preparing";
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
  const [transitioningShipment, setTransitioningShipment] = useState<"preparing" | "shipped" | null>(null);
  const [shipmentForm, setShipmentForm] = useState<ShipmentFormState>(() => getShipmentFormState());
  const [showCancelForm, setShowCancelForm] = useState(false);
  const [cancelReason, setCancelReason] = useState(adminCancellationReasons[0]);
  const [customCancelReason, setCustomCancelReason] = useState("");
  const [cancelling, setCancelling] = useState(false);
  const [error, setError] = useState("");

  async function refreshOrder(orderId: string) {
    const row = await getAdminOrderById(orderId);
    setOrder(row);
    setShipmentForm(getShipmentFormState(row?.shipment));
    return row;
  }

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
      await refreshOrder(order.id);
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
      await refreshOrder(order.id);
      setShowCancelForm(false);
      pushToast("Cập nhật trạng thái đơn hàng thành công.", "Đơn hàng đã được hủy với lý do đã lưu.");
    } catch (cancelError) {
      const message = cancelError instanceof Error ? cancelError.message : "Vui lòng thử lại.";
      pushToast("Không thể cập nhật trạng thái đơn hàng. Vui lòng thử lại.", message);
    } finally {
      setCancelling(false);
    }
  }

  async function saveShipmentDetails(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!order) return;

    if (!canEditShipmentDetails(order)) {
      pushToast("Không thể cập nhật vận chuyển. Vui lòng thử lại.", "Chỉ được sửa thông tin vận chuyển trước khi bàn giao cho đơn vị vận chuyển.");
      return;
    }

    const shippingFee = shipmentForm.shipping_fee.trim() ? Number(shipmentForm.shipping_fee) : 0;
    if (!Number.isFinite(shippingFee) || shippingFee < 0) {
      pushToast("Không thể cập nhật vận chuyển. Vui lòng thử lại.", "Phí vận chuyển phải là số không âm.");
      return;
    }

    setUpdatingShipment(true);
    try {
      await updateAdminShipmentDetails(order.id, {
        carrier_name: shipmentForm.carrier_name.trim() || null,
        tracking_number: shipmentForm.tracking_number.trim() || null,
        shipping_fee: shippingFee,
        estimated_delivery_date: shipmentForm.estimated_delivery_date || null
      });
      await refreshOrder(order.id);
      pushToast("Cập nhật vận chuyển thành công.");
    } catch (shipmentError) {
      const message = shipmentError instanceof Error ? shipmentError.message : "Vui lòng thử lại.";
      pushToast("Không thể cập nhật vận chuyển. Vui lòng thử lại.", message);
    } finally {
      setUpdatingShipment(false);
    }
  }

  async function moveShipment(nextStatus: "preparing" | "shipped") {
    if (!order) return;

    setTransitioningShipment(nextStatus);
    try {
      await transitionAdminShipment(order.id, nextStatus);
      await refreshOrder(order.id);
      pushToast(nextStatus === "preparing" ? "Đã chuyển sang chuẩn bị hàng." : "Đã bàn giao đơn vị vận chuyển.");
    } catch (shipmentError) {
      const message = shipmentError instanceof Error ? shipmentError.message : "Vui lòng thử lại.";
      pushToast("Không thể cập nhật vận chuyển. Vui lòng thử lại.", message);
    } finally {
      setTransitioningShipment(null);
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
                  Thanh toán ví là số dư nội bộ RehabAI. Không dùng trạng thái đơn hàng như xác nhận thanh toán thật từ gateway.
                </p>
                <p className="mt-3 rounded-lg border border-emerald-100 bg-emerald-50 p-3 text-sm font-semibold text-emerald-800">
                  {getPaymentLabel(order)}
                  {order.paid_at ? ` · ${formatDate(order.paid_at)}` : ""}
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
                        Hủy đơn pending/confirmed mock cần lý do. Admin không thể hủy sau khi đơn đã bàn giao hoặc đã giao trong MVP.
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

              <form className="mt-6 border-t border-slate-100 pt-6" onSubmit={saveShipmentDetails}>
                <div>
                  <h3 className="text-lg font-bold text-slate-950">Vận chuyển thủ công</h3>
                  <p className="mt-2 text-sm text-slate-600">
                    Fulfillment thủ công/mock chỉ bắt đầu sau khi Admin xác nhận đơn hàng. Admin không được tự đánh dấu đã giao trong MVP.
                  </p>
                </div>

                <div className="mt-4 rounded-lg border border-slate-200 p-3 text-sm text-slate-700">
                  <p>
                    <span className="font-semibold text-slate-900">Trạng thái:</span>{" "}
                    {getShippingStatusLabel(order.shipment?.shipping_status)}
                  </p>
                  <p className="mt-2">
                    <span className="font-semibold text-slate-900">Thời điểm gửi:</span>{" "}
                    {formatDate(order.shipment?.shipped_at)}
                  </p>
                  <p className="mt-2">
                    <span className="font-semibold text-slate-900">Thời điểm giao:</span>{" "}
                    {formatDate(order.shipment?.delivered_at)}
                  </p>
                </div>

                {!canEditShipmentDetails(order) ? (
                  <p className="mt-4 rounded-lg border border-amber-100 bg-amber-50 p-3 text-sm text-amber-800">
                    {order.status !== "confirmed"
                      ? "Cần xác nhận đơn hàng trước khi cập nhật vận chuyển."
                      : "Thông tin vận chuyển chỉ được sửa trước khi bàn giao cho đơn vị vận chuyển."}
                  </p>
                ) : null}

                <div className="mt-4 grid gap-4">
                  <label className="block text-sm font-semibold text-slate-700" htmlFor="carrier-name">
                    Đơn vị vận chuyển
                    <input
                      id="carrier-name"
                      className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                      disabled={updatingShipment || !canEditShipmentDetails(order)}
                      value={shipmentForm.carrier_name}
                      onChange={(event) => setShipmentForm((current) => ({ ...current, carrier_name: event.target.value }))}
                    />
                  </label>

                  <label className="block text-sm font-semibold text-slate-700" htmlFor="tracking-number">
                    Mã vận đơn
                    <input
                      id="tracking-number"
                      className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                      disabled={updatingShipment || !canEditShipmentDetails(order)}
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
                      disabled={updatingShipment || !canEditShipmentDetails(order)}
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
                      disabled={updatingShipment || !canEditShipmentDetails(order)}
                      value={shipmentForm.estimated_delivery_date}
                      onChange={(event) => setShipmentForm((current) => ({ ...current, estimated_delivery_date: event.target.value }))}
                    />
                  </label>
                </div>

                <Button className="mt-5 w-full" disabled={updatingShipment || !canEditShipmentDetails(order)} type="submit">
                  {updatingShipment ? "Đang lưu..." : order.shipment ? "Cập nhật vận chuyển" : "Tạo thông tin vận chuyển"}
                </Button>
              </form>

              <div className="mt-4 grid gap-3">
                {canStartPreparation(order) ? (
                  <Button
                    disabled={transitioningShipment !== null}
                    onClick={() => void moveShipment("preparing")}
                    type="button"
                  >
                    {transitioningShipment === "preparing" ? "Đang cập nhật..." : "Chuẩn bị hàng"}
                  </Button>
                ) : null}

                {canHandOverToCarrier(order) ? (
                  <Button
                    disabled={transitioningShipment !== null}
                    onClick={() => void moveShipment("shipped")}
                    type="button"
                  >
                    {transitioningShipment === "shipped" ? "Đang cập nhật..." : "Bàn giao đơn vị vận chuyển"}
                  </Button>
                ) : null}

                {order.shipment?.shipping_status === "delivered" ? (
                  <p className="rounded-lg border border-emerald-100 bg-emerald-50 p-3 text-sm text-emerald-800">
                    Đơn đã được Patient xác nhận nhận hàng. Trạng thái đã giao là chỉ đọc với Admin trong MVP.
                  </p>
                ) : null}
              </div>
            </Card>
          </div>
        )}
      </section>
    </RequireAdmin>
  );
}
