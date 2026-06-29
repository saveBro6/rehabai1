"use client";

import Image from "next/image";
import Link from "next/link";
import type { FormEvent } from "react";
import { useEffect, useMemo, useState } from "react";

import { Button } from "@/components/Button";
import { Card } from "@/components/Card";
import { RequireAuth } from "@/components/auth/RequireAuth";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/useToast";
import { getShippingAddressLines } from "@/lib/shipping-address";
import { formatCurrency, getImageUrl } from "@/lib/utils";
import {
  cancelPatientOrder,
  confirmPatientOrderReceived,
  getOrderById,
  type OrderWithItems,
  type ShippingStatus
} from "@/services/orders.service";

const patientCancellationReasons = [
  "Tôi không còn nhu cầu mua sản phẩm",
  "Tôi đặt nhầm sản phẩm",
  "Tôi muốn thay đổi địa chỉ giao hàng",
  "Tôi muốn thay đổi số lượng/sản phẩm",
  "Thời gian xử lý đơn hàng quá lâu",
  "Khác"
];

function formatDate(value?: string | null) {
  if (!value) return "Chưa rõ";
  return new Intl.DateTimeFormat("vi-VN", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
}

function formatDateOnly(value?: string | null) {
  if (!value) return "Chưa rõ";
  return new Intl.DateTimeFormat("vi-VN", { dateStyle: "medium" }).format(new Date(value));
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

function canPatientCancel(order: OrderWithItems) {
  return order.status === "pending" && !["shipped", "delivered"].includes(order.shipment?.shipping_status || "");
}

function canConfirmReceipt(order: OrderWithItems) {
  return order.status === "confirmed" && order.shipment?.shipping_status === "shipped";
}

function buildCancellationReason(reason: string, customReason: string) {
  return reason === "Khác" ? customReason.trim() : reason;
}

export default function PatientOrderDetailPage({ params }: { params: { id: string } }) {
  const { user, profile, isLoading } = useAuth();
  const { pushToast } = useToast();
  const [order, setOrder] = useState<OrderWithItems | null>(null);
  const [loadingOrder, setLoadingOrder] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCancelForm, setShowCancelForm] = useState(false);
  const [cancelReason, setCancelReason] = useState(patientCancellationReasons[0]);
  const [customCancelReason, setCustomCancelReason] = useState("");
  const [cancelling, setCancelling] = useState(false);
  const [showReceiptDialog, setShowReceiptDialog] = useState(false);
  const [confirmingReceipt, setConfirmingReceipt] = useState(false);
  const isActivePatient = profile?.account_type === "patient" && profile?.account_status === "active";

  async function refreshOrder(orderId: string, userId: string) {
    const row = await getOrderById(orderId, userId);
    setOrder(row);
    return row;
  }

  useEffect(() => {
    if (isLoading) return;

    if (!user || !isActivePatient) {
      setOrder(null);
      setLoadingOrder(false);
      return;
    }

    let active = true;
    setLoadingOrder(true);
    setError(null);

    void getOrderById(params.id, user.id)
      .then((row) => {
        if (active) setOrder(row);
      })
      .catch((loadError) => {
        if (!active) return;
        setError(loadError instanceof Error ? loadError.message : "Không thể tải chi tiết đơn hàng.");
      })
      .finally(() => {
        if (active) setLoadingOrder(false);
      });

    return () => {
      active = false;
    };
  }, [isActivePatient, isLoading, params.id, user]);

  const itemTotal = useMemo(() => {
    return (order?.items || []).reduce((sum, item) => sum + Number(item.unit_price || 0) * item.quantity, 0);
  }, [order]);

  async function submitCancellation(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!order || !user) return;

    const reason = buildCancellationReason(cancelReason, customCancelReason);
    if (!reason) {
      pushToast("Thiếu lý do hủy đơn", "Vui lòng nhập lý do hủy đơn hàng.");
      return;
    }

    setCancelling(true);
    try {
      await cancelPatientOrder(order.id, reason);
      await refreshOrder(order.id, user.id);
      setShowCancelForm(false);
      pushToast("Đã hủy đơn hàng", "Lý do hủy đã được lưu. Không có hoàn tiền thật trong MVP mock.");
    } catch (cancelError) {
      const message = cancelError instanceof Error ? cancelError.message : "Vui lòng thử lại.";
      pushToast("Không thể hủy đơn hàng", message);
    } finally {
      setCancelling(false);
    }
  }

  async function confirmReceipt() {
    if (!order || !user) return;

    setConfirmingReceipt(true);
    try {
      await confirmPatientOrderReceived(order.id);
      await refreshOrder(order.id, user.id);
      setShowReceiptDialog(false);
      pushToast("Đã xác nhận nhận hàng thành công.");
    } catch (receiptError) {
      const message = receiptError instanceof Error ? receiptError.message : "Vui lòng thử lại.";
      pushToast("Không thể xác nhận nhận hàng. Vui lòng thử lại.", message);
    } finally {
      setConfirmingReceipt(false);
    }
  }

  return (
    <RequireAuth>
      <section className="mx-auto max-w-6xl px-4 py-10">
        <Link href="/patient/orders" className="inline-flex">
          <Button variant="ghost">Quay lại đơn hàng</Button>
        </Link>

        {!isActivePatient ? (
          <Card className="mt-6 border-amber-200 bg-amber-50">
            <p className="font-semibold text-amber-800">Chỉ tài khoản Bệnh nhân đang active mới xem chi tiết đơn hàng.</p>
            <p className="mt-2 text-sm text-amber-700">Tài khoản không phải Bệnh nhân không phải buyer role trong MVP.</p>
          </Card>
        ) : null}

        {loadingOrder ? (
          <Card className="mt-6">
            <p className="text-slate-500">Đang tải chi tiết đơn hàng...</p>
          </Card>
        ) : error ? (
          <Card className="mt-6 border-red-200 bg-red-50">
            <p className="font-semibold text-red-700">Không thể tải chi tiết đơn hàng</p>
            <p className="mt-2 text-sm text-red-600">{error}</p>
          </Card>
        ) : !order ? (
          <Card className="mt-6">
            <p className="font-semibold text-slate-800">Không tìm thấy đơn hàng.</p>
            <p className="mt-2 text-sm text-slate-600">Đơn hàng không tồn tại hoặc không thuộc tài khoản hiện tại.</p>
          </Card>
        ) : (
          <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_340px]">
            <div className="grid gap-4">
              <Card>
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <p className="text-sm font-semibold uppercase tracking-wide text-emerald-700">Mock order</p>
                    <h1 className="mt-1 text-3xl font-bold text-slate-950">Chi tiết đơn hàng</h1>
                    <p className="mt-3 break-all text-sm text-slate-600">Mã đơn: {order.id}</p>
                    <p className="mt-2 text-sm text-slate-600">Ngày tạo: {formatDate(order.created_at)}</p>
                  </div>
                  <span className="inline-flex h-fit rounded-full bg-amber-100 px-3 py-1 text-sm font-semibold text-amber-800">
                    {getStatusLabel(order.status)}
                  </span>
                </div>
                <p className="mt-5 text-sm text-slate-600">
                  Trạng thái đơn phản ánh xử lý nội bộ. Thanh toán ví là số dư nội bộ RehabAI, không phải xác nhận từ cổng ngân hàng thật.
                </p>
                <p className="mt-3 rounded-lg border border-emerald-100 bg-emerald-50 p-3 text-sm font-semibold text-emerald-800">
                  {getPaymentLabel(order)}
                  {order.paid_at ? ` · ${formatDate(order.paid_at)}` : ""}
                </p>
                {order.status === "confirmed" ? (
                  <p className="mt-3 rounded-lg border border-emerald-100 bg-emerald-50 p-3 text-sm text-emerald-800">
                    Đơn hàng đã được xác nhận để xử lý. Thanh toán đã đi qua ví nội bộ nếu trạng thái thanh toán hiển thị là đã thanh toán.
                  </p>
                ) : null}
                {order.status === "cancelled" ? (
                  <div className="mt-5 rounded-lg border border-rose-100 bg-rose-50 p-4 text-sm">
                    <p className="font-semibold text-rose-800">Thông tin hủy đơn</p>
                    <p className="mt-2 text-rose-700">Lý do: {order.cancellation_reason || "Chưa có lý do"}</p>
                    <p className="mt-1 text-rose-700">Thời điểm hủy: {formatDate(order.cancelled_at)}</p>
                    <p className="mt-2 text-rose-700">Đơn mock/pending đã hủy không tạo giao dịch hoàn tiền thật.</p>
                  </div>
                ) : null}
              </Card>

              {canPatientCancel(order) ? (
                <Card>
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <h2 className="text-xl font-bold text-slate-950">Hủy đơn hàng</h2>
                      <p className="mt-2 text-sm text-slate-600">
                        Bạn có thể hủy đơn pending khi đơn chưa được giao hoặc giao thành công.
                      </p>
                    </div>
                    {!showCancelForm ? (
                      <Button variant="secondary" onClick={() => setShowCancelForm(true)}>
                        Hủy đơn hàng
                      </Button>
                    ) : null}
                  </div>

                  {showCancelForm ? (
                    <form className="mt-5 grid gap-4" onSubmit={submitCancellation}>
                      <label className="block text-sm font-semibold text-slate-800" htmlFor="patient-cancel-reason">
                        Lý do hủy đơn
                        <select
                          id="patient-cancel-reason"
                          className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                          disabled={cancelling}
                          value={cancelReason}
                          onChange={(event) => setCancelReason(event.target.value)}
                        >
                          {patientCancellationReasons.map((reason) => (
                            <option key={reason} value={reason}>
                              {reason}
                            </option>
                          ))}
                        </select>
                      </label>

                      {cancelReason === "Khác" ? (
                        <label className="block text-sm font-semibold text-slate-800" htmlFor="patient-custom-cancel-reason">
                          Lý do khác
                          <textarea
                            id="patient-custom-cancel-reason"
                            className="mt-2 min-h-24 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                            disabled={cancelling}
                            value={customCancelReason}
                            onChange={(event) => setCustomCancelReason(event.target.value)}
                          />
                        </label>
                      ) : null}

                      <div className="flex flex-col gap-3 sm:flex-row">
                        <Button disabled={cancelling} type="submit">
                          {cancelling ? "Đang hủy..." : "Xác nhận hủy đơn"}
                        </Button>
                        <Button disabled={cancelling} type="button" variant="ghost" onClick={() => setShowCancelForm(false)}>
                          Không hủy nữa
                        </Button>
                      </div>
                    </form>
                  ) : null}
                </Card>
              ) : null}

              {canConfirmReceipt(order) ? (
                <Card className="border-emerald-100 bg-emerald-50">
                  <h2 className="text-xl font-bold text-emerald-950">Xác nhận đã nhận hàng</h2>
                  <p className="mt-2 text-sm text-emerald-800">
                    Chỉ xác nhận khi bạn đã nhận đủ đơn hàng. Sau khi xác nhận, trạng thái vận chuyển sẽ chuyển thành Đã giao.
                  </p>
                  <Button className="mt-4" onClick={() => setShowReceiptDialog(true)} type="button">
                    Xác nhận đã nhận hàng
                  </Button>
                </Card>
              ) : null}

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

              <div className="mt-5 rounded-lg border border-slate-200 p-4">
                <p className="text-sm font-semibold text-slate-800">Thông tin vận chuyển</p>
                {order.shipment ? (
                  <div className="mt-3 space-y-2 text-sm text-slate-600">
                    <p>
                      <span className="font-semibold text-slate-800">Trạng thái:</span>{" "}
                      {getShippingStatusLabel(order.shipment.shipping_status)}
                    </p>
                    <p>
                      <span className="font-semibold text-slate-800">Đơn vị vận chuyển:</span>{" "}
                      {order.shipment.carrier_name || "Chưa có"}
                    </p>
                    <p>
                      <span className="font-semibold text-slate-800">Mã vận đơn:</span>{" "}
                      {order.shipment.tracking_number || "Chưa có"}
                    </p>
                    <p>
                      <span className="font-semibold text-slate-800">Phí vận chuyển:</span>{" "}
                      {formatCurrency(Number(order.shipment.shipping_fee || 0))}
                    </p>
                    <p>
                      <span className="font-semibold text-slate-800">Ngày giao dự kiến:</span>{" "}
                      {formatDateOnly(order.shipment.estimated_delivery_date)}
                    </p>
                    <p>
                      <span className="font-semibold text-slate-800">Thời điểm gửi:</span>{" "}
                      {formatDate(order.shipment.shipped_at)}
                    </p>
                    <p>
                      <span className="font-semibold text-slate-800">Thời điểm giao:</span>{" "}
                      {formatDate(order.shipment.delivered_at)}
                    </p>
                  </div>
                ) : (
                  <p className="mt-3 text-sm text-slate-600">
                    Chưa có thông tin vận chuyển. Admin sẽ cập nhật thủ công khi bắt đầu xử lý đơn.
                  </p>
                )}
              </div>
            </Card>
          </div>
        )}

        {showReceiptDialog && order ? (
          <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 px-4" role="dialog" aria-modal="true">
            <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
              <h2 className="text-xl font-bold text-slate-950">Xác nhận đã nhận hàng</h2>
              <p className="mt-3 text-sm text-slate-600">
                Tôi xác nhận đã nhận được đơn hàng.
              </p>
              <p className="mt-3 text-sm text-slate-600">
                Sau khi xác nhận, trạng thái vận chuyển sẽ là Đã giao và bạn không thể xác nhận lại lần nữa.
              </p>
              <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-end">
                <Button disabled={confirmingReceipt} variant="ghost" onClick={() => setShowReceiptDialog(false)} type="button">
                  Đóng
                </Button>
                <Button disabled={confirmingReceipt} onClick={confirmReceipt} type="button">
                  {confirmingReceipt ? "Đang xác nhận..." : "Xác nhận đã nhận hàng"}
                </Button>
              </div>
            </div>
          </div>
        ) : null}
      </section>
    </RequireAuth>
  );
}
