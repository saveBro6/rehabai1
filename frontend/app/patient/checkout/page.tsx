"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { FormEvent } from "react";
import { useMemo, useState } from "react";

import { Button } from "@/components/Button";
import { Card } from "@/components/Card";
import { RequireAuth } from "@/components/auth/RequireAuth";
import { useAuth } from "@/hooks/useAuth";
import { useCart } from "@/hooks/useCart";
import { useToast } from "@/hooks/useToast";
import {
  STOCK_CHECKOUT_BLOCK_MESSAGE,
  getCartStockWarning,
  getProductStockBadgeClass,
  getProductStockDetail,
  getProductStockLabel
} from "@/lib/product-stock";
import { composeShippingAddress, type DeliveryAddressForm } from "@/lib/shipping-address";
import { formatCurrency, getImageUrl } from "@/lib/utils";
import { createOrderFromCart } from "@/services/orders.service";

const emptyDeliveryAddress: DeliveryAddressForm = {
  recipientName: "",
  phone: "",
  province: "",
  district: "",
  ward: "",
  streetAddress: "",
  note: ""
};

const requiredDeliveryFields: Array<keyof DeliveryAddressForm> = [
  "recipientName",
  "phone",
  "province",
  "district",
  "ward",
  "streetAddress"
];

function isValidPhone(phone: string) {
  return /^(?:\+?84|0)[0-9]{8,10}$/.test(phone.replace(/[\s.-]/g, ""));
}

function normalizeCheckoutError(error: unknown) {
  const rawMessage = error instanceof Error ? error.message : "Vui lòng thử lại sau.";
  if (
    /insufficient stock|product stock changed|stock|availability|available|inactive|deleted|no longer|requested|cart/i.test(
      rawMessage
    )
  ) {
    return STOCK_CHECKOUT_BLOCK_MESSAGE;
  }

  return rawMessage;
}

export default function PatientCheckoutPage() {
  const router = useRouter();
  const { user, profile, isLoading: isAuthLoading } = useAuth();
  const { items, total, loading: isCartLoading, refresh } = useCart();
  const { pushToast } = useToast();
  const [deliveryAddress, setDeliveryAddress] = useState<DeliveryAddressForm>(emptyDeliveryAddress);
  const [submitting, setSubmitting] = useState(false);
  const isActivePatient = profile?.account_type === "patient" && profile?.account_status === "active";
  const itemCount = useMemo(() => items.reduce((sum, item) => sum + item.quantity, 0), [items]);
  const stockWarnings = useMemo(
    () =>
      items
        .map((item) => getCartStockWarning(item.product, item.quantity))
        .filter(Boolean),
    [items]
  );
  const hasStockIssue = stockWarnings.length > 0;
  const isLoading = isAuthLoading || isCartLoading;

  function updateDeliveryField(field: keyof DeliveryAddressForm, value: string) {
    setDeliveryAddress((current) => ({ ...current, [field]: value }));
  }

  function validateDeliveryAddress() {
    const missingField = requiredDeliveryFields.find((field) => !deliveryAddress[field].trim());
    if (missingField) {
      pushToast(
        "Thiếu thông tin giao hàng",
        "Vui lòng nhập đầy đủ họ tên, số điện thoại và địa chỉ nhận hàng."
      );
      return false;
    }

    if (!isValidPhone(deliveryAddress.phone)) {
      pushToast("Số điện thoại chưa hợp lệ", "Vui lòng nhập số điện thoại Việt Nam hợp lệ.");
      return false;
    }

    return true;
  }

  async function confirmMockCheckout(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!user || !isActivePatient) {
      pushToast(
        "Chỉ Bệnh nhân mới có thể thanh toán",
        "Guest, Bác sĩ và Admin không phải buyer role trong MVP."
      );
      return;
    }

    if (!items.length) {
      pushToast("Giỏ hàng trống", "Vui lòng thêm sản phẩm trước khi thanh toán.");
      return;
    }

    if (hasStockIssue) {
      pushToast("Không thể thanh toán", STOCK_CHECKOUT_BLOCK_MESSAGE);
      return;
    }

    if (!validateDeliveryAddress()) {
      return;
    }

    setSubmitting(true);
    try {
      const shippingAddress = composeShippingAddress(deliveryAddress);
      const result = await createOrderFromCart(user.id, shippingAddress);
      await refresh();
      pushToast(
        "Tạo đơn hàng mô phỏng thành công.",
        "Đơn hàng đang chờ xử lý. Chưa có thanh toán thật hoặc xác nhận từ cổng thanh toán."
      );

      if (result.order_id) {
        router.push(`/patient/orders/${result.order_id}`);
      } else {
        router.push("/patient/orders");
      }
    } catch (error) {
      pushToast("Thanh toán mô phỏng thất bại", normalizeCheckoutError(error));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <RequireAuth>
      <section className="mx-auto grid max-w-6xl gap-8 px-4 py-10 lg:grid-cols-[1fr_420px]">
        <div>
          <Link href="/patient/cart" className="inline-flex">
            <Button variant="ghost">Quay lại giỏ hàng</Button>
          </Link>

          <div className="mt-6">
            <p className="text-sm font-semibold uppercase tracking-wide text-emerald-700">Thanh toán mô phỏng</p>
            <h1 className="mt-1 text-3xl font-bold text-slate-950">Xem lại đơn hàng</h1>
            <p className="mt-2 max-w-2xl text-sm text-slate-600">
              Thanh toán mô phỏng - chưa phải thanh toán qua cổng thật. Đơn hàng tạo ra sẽ ở trạng thái pending/mock.
            </p>
          </div>

          {!isActivePatient && !isAuthLoading ? (
            <Card className="mt-6 border-amber-200 bg-amber-50">
              <p className="font-semibold text-amber-800">
                Chỉ tài khoản Bệnh nhân active mới có thể checkout.
              </p>
              <p className="mt-2 text-sm text-amber-700">
                Guest, Bác sĩ và Admin không phải buyer role trong MVP.
              </p>
            </Card>
          ) : null}

          <div className="mt-6 grid gap-4">
            {isLoading ? (
              <Card>
                <p className="text-slate-500">Đang tải giỏ hàng...</p>
              </Card>
            ) : items.length ? (
              items.map((item) => {
                const subtotal = (item.product?.price || 0) * item.quantity;
                const stock = item.product?.stock_quantity || 0;
                const stockWarning = getCartStockWarning(item.product, item.quantity);
                return (
                  <Card key={item.id} className="flex flex-col gap-4 sm:flex-row">
                    <Image
                      src={getImageUrl(item.product?.image_url)}
                      alt={item.product?.name || "Sản phẩm"}
                      width={96}
                      height={96}
                      className="h-24 w-24 rounded-lg object-cover"
                    />
                    <div className="flex-1">
                      <p className="font-bold text-slate-950">{item.product?.name || "Sản phẩm"}</p>
                      <p className="mt-1 text-sm text-slate-600">Số lượng: {item.quantity}</p>
                      <div className="mt-2 flex flex-wrap items-center gap-2">
                        <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${getProductStockBadgeClass(stock)}`}>
                          {getProductStockLabel(stock)}
                        </span>
                        <span className="text-xs font-semibold text-slate-500">{getProductStockDetail(stock)}</span>
                      </div>
                      {stockWarning ? (
                        <p className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-800">
                          {stockWarning}
                        </p>
                      ) : null}
                      <p className="mt-1 text-sm text-slate-600">
                        Đơn giá: {formatCurrency(item.product?.price || 0)}
                      </p>
                    </div>
                    <p className="font-bold text-emerald-700">{formatCurrency(subtotal)}</p>
                  </Card>
                );
              })
            ) : (
              <Card>
                <p className="font-semibold text-slate-800">Giỏ hàng đang trống.</p>
                <p className="mt-2 text-sm text-slate-600">Vui lòng thêm sản phẩm trước khi thanh toán.</p>
                <Link href="/patient/products" className="mt-5 inline-flex">
                  <Button>Xem sản phẩm</Button>
                </Link>
              </Card>
            )}
          </div>
        </div>

        <form onSubmit={confirmMockCheckout}>
          <Card className="h-fit">
            <h2 className="text-xl font-bold text-slate-950">Thông tin thanh toán</h2>

            <div className="mt-5 rounded-lg border border-amber-200 bg-amber-50 p-4">
              <p className="font-semibold text-amber-900">Thanh toán mô phỏng</p>
              <p className="mt-2 text-sm text-amber-800">
                Chưa có thanh toán thật hoặc xác nhận từ cổng thanh toán. Đây chỉ là bước xác nhận mock để tạo đơn hàng pending.
              </p>
            </div>

            <div className="mt-6">
              <h3 className="text-base font-bold text-slate-950">Địa chỉ nhận hàng</h3>
              <div className="mt-4 grid gap-4">
                <label className="block text-sm font-semibold text-slate-800" htmlFor="recipient-name">
                  Họ tên người nhận
                  <input
                    id="recipient-name"
                    className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
                    value={deliveryAddress.recipientName}
                    onChange={(event) => updateDeliveryField("recipientName", event.target.value)}
                    disabled={submitting || !isActivePatient}
                    autoComplete="name"
                  />
                </label>

                <label className="block text-sm font-semibold text-slate-800" htmlFor="recipient-phone">
                  Số điện thoại
                  <input
                    id="recipient-phone"
                    className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
                    value={deliveryAddress.phone}
                    onChange={(event) => updateDeliveryField("phone", event.target.value)}
                    disabled={submitting || !isActivePatient}
                    inputMode="tel"
                    autoComplete="tel"
                  />
                </label>

                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="block text-sm font-semibold text-slate-800" htmlFor="province">
                    Tỉnh/Thành phố
                    <input
                      id="province"
                      className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
                      value={deliveryAddress.province}
                      onChange={(event) => updateDeliveryField("province", event.target.value)}
                      disabled={submitting || !isActivePatient}
                      autoComplete="address-level1"
                    />
                  </label>

                  <label className="block text-sm font-semibold text-slate-800" htmlFor="district">
                    Quận/Huyện
                    <input
                      id="district"
                      className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
                      value={deliveryAddress.district}
                      onChange={(event) => updateDeliveryField("district", event.target.value)}
                      disabled={submitting || !isActivePatient}
                      autoComplete="address-level2"
                    />
                  </label>
                </div>

                <label className="block text-sm font-semibold text-slate-800" htmlFor="ward">
                  Phường/Xã
                  <input
                    id="ward"
                    className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
                    value={deliveryAddress.ward}
                    onChange={(event) => updateDeliveryField("ward", event.target.value)}
                    disabled={submitting || !isActivePatient}
                    autoComplete="address-level3"
                  />
                </label>

                <label className="block text-sm font-semibold text-slate-800" htmlFor="street-address">
                  Địa chỉ cụ thể
                  <input
                    id="street-address"
                    className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
                    value={deliveryAddress.streetAddress}
                    onChange={(event) => updateDeliveryField("streetAddress", event.target.value)}
                    disabled={submitting || !isActivePatient}
                    autoComplete="street-address"
                  />
                </label>

                <label className="block text-sm font-semibold text-slate-800" htmlFor="delivery-note">
                  Ghi chú giao hàng <span className="font-normal text-slate-500">(không bắt buộc)</span>
                  <textarea
                    id="delivery-note"
                    className="mt-2 min-h-20 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
                    value={deliveryAddress.note}
                    onChange={(event) => updateDeliveryField("note", event.target.value)}
                    disabled={submitting || !isActivePatient}
                  />
                </label>
              </div>
            </div>

            <div className="mt-5 space-y-3 border-t border-slate-100 pt-5 text-sm text-slate-600">
              <div className="flex justify-between gap-4">
                <span>Số sản phẩm</span>
                <span className="font-semibold text-slate-950">{itemCount}</span>
              </div>
              <div className="flex justify-between gap-4">
                <span>Tổng tạm tính</span>
                <span className="font-semibold text-slate-950">{formatCurrency(total)}</span>
              </div>
            </div>

            {hasStockIssue ? (
              <div className="mt-5 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-800">
                {STOCK_CHECKOUT_BLOCK_MESSAGE}
              </div>
            ) : null}

            <Button
              type="submit"
              className="mt-5 w-full"
              disabled={submitting || isLoading || !items.length || !isActivePatient || hasStockIssue}
            >
              {submitting ? "Đang tạo đơn..." : "Xác nhận thanh toán mô phỏng"}
            </Button>
            <p className="mt-3 text-xs text-slate-500">
              Đơn hàng đang chờ xử lý sau khi xác nhận. Hệ thống không ghi nhận đây là thanh toán gateway thật.
            </p>
          </Card>
        </form>
      </section>
    </RequireAuth>
  );
}
