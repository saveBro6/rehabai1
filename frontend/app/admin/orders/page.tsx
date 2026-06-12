"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";

import { Button } from "@/components/Button";
import { Card } from "@/components/Card";
import { RequireAdmin } from "@/components/auth/RequireAdmin";
import { getShippingAddressLines } from "@/lib/shipping-address";
import { formatCurrency } from "@/lib/utils";
import { getAdminOrders, type AdminOrder, type ShippingStatus } from "@/services/orders.service";

const PAGE_SIZE = 10;

type OrderStatusFilter = "all" | "pending" | "confirmed" | "cancelled";
type ShippingStatusFilter = "all" | ShippingStatus | "none";
type FulfillmentFilter =
  | "all"
  | "needs_confirmation"
  | "needs_preparing"
  | "needs_handoff"
  | "waiting_patient"
  | "completed"
  | "cancelled";
type DateFilter = "all" | "today" | "7d" | "30d";
type SortOption = "newest" | "oldest" | "total_asc" | "total_desc" | "items_asc" | "items_desc";

const orderStatusOptions: Array<{ value: OrderStatusFilter; label: string }> = [
  { value: "all", label: "Tất cả" },
  { value: "pending", label: "Chờ xử lý" },
  { value: "confirmed", label: "Đã xác nhận" },
  { value: "cancelled", label: "Đã hủy" }
];

const shippingStatusOptions: Array<{ value: ShippingStatusFilter; label: string }> = [
  { value: "all", label: "Tất cả" },
  { value: "not_started", label: "Chưa bắt đầu giao" },
  { value: "preparing", label: "Đang chuẩn bị" },
  { value: "shipped", label: "Đang giao" },
  { value: "delivered", label: "Đã giao" },
  { value: "failed", label: "Thất bại" },
  { value: "returned", label: "Hoàn trả" },
  { value: "cancelled", label: "Đã hủy" },
  { value: "none", label: "Không có vận chuyển" }
];

const fulfillmentOptions: Array<{ value: FulfillmentFilter; label: string }> = [
  { value: "all", label: "Tất cả" },
  { value: "needs_confirmation", label: "Cần xác nhận đơn" },
  { value: "needs_preparing", label: "Cần chuẩn bị hàng" },
  { value: "needs_handoff", label: "Cần bàn giao vận chuyển" },
  { value: "waiting_patient", label: "Đang chờ Patient xác nhận nhận hàng" },
  { value: "completed", label: "Đã hoàn tất" },
  { value: "cancelled", label: "Đã hủy" }
];

const dateFilterOptions: Array<{ value: DateFilter; label: string }> = [
  { value: "all", label: "Tất cả thời gian" },
  { value: "today", label: "Hôm nay" },
  { value: "7d", label: "7 ngày qua" },
  { value: "30d", label: "30 ngày qua" }
];

const sortOptions: Array<{ value: SortOption; label: string }> = [
  { value: "newest", label: "Mới nhất" },
  { value: "oldest", label: "Cũ nhất" },
  { value: "total_asc", label: "Tổng tiền tăng dần" },
  { value: "total_desc", label: "Tổng tiền giảm dần" },
  { value: "items_asc", label: "Số lượng sản phẩm tăng dần" },
  { value: "items_desc", label: "Số lượng sản phẩm giảm dần" }
];

function formatDate(value?: string | null) {
  if (!value) return "Chưa rõ";
  return new Intl.DateTimeFormat("vi-VN", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
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
    return "Ví RehabAI";
  }

  if (order.payment_status === "paid") {
    return "Đã thanh toán";
  }

  return "Chưa thanh toán";
}

function getStatusBadgeClass(status: AdminOrder["status"]) {
  if (status === "pending") return "bg-amber-100 text-amber-800";
  if (status === "confirmed") return "bg-emerald-100 text-emerald-700";
  if (status === "cancelled") return "bg-rose-100 text-rose-700";
  return "bg-slate-100 text-slate-700";
}

function getShippingStatusLabel(status?: ShippingStatus | null) {
  if (status === "not_started") return "Chưa bắt đầu giao";
  if (status === "preparing") return "Đang chuẩn bị";
  if (status === "shipped") return "Đang giao";
  if (status === "delivered") return "Đã giao";
  if (status === "failed") return "Thất bại";
  if (status === "returned") return "Hoàn trả";
  if (status === "cancelled") return "Đã hủy";
  return "Không có vận chuyển";
}

function getShippingBadgeClass(status?: ShippingStatus | null) {
  if (status === "delivered") return "bg-emerald-100 text-emerald-700";
  if (status === "shipped" || status === "preparing") return "bg-sky-100 text-sky-700";
  if (status === "failed" || status === "returned" || status === "cancelled") return "bg-rose-100 text-rose-700";
  return "bg-slate-100 text-slate-600";
}

function getItemCount(order: AdminOrder) {
  return (order.items || []).reduce((sum, item) => sum + item.quantity, 0);
}

function getCompactShippingAddress(address?: string | null) {
  const line = getShippingAddressLines(address).find(
    (item) => item.label === "Địa chỉ cụ thể" || item.label === "Địa chỉ"
  );
  return line?.value || address || "Chưa có";
}

function getFulfillmentState(order: AdminOrder): Exclude<FulfillmentFilter, "all"> | "other" {
  const shippingStatus = order.shipment?.shipping_status;

  if (order.status === "cancelled") return "cancelled";
  if (shippingStatus === "delivered") return "completed";
  if (order.status === "pending") return "needs_confirmation";
  if (order.status === "confirmed" && (!shippingStatus || shippingStatus === "not_started")) return "needs_preparing";
  if (order.status === "confirmed" && shippingStatus === "preparing") return "needs_handoff";
  if (order.status === "confirmed" && shippingStatus === "shipped") return "waiting_patient";
  return "other";
}

function getFulfillmentLabel(order: AdminOrder) {
  const state = getFulfillmentState(order);
  return fulfillmentOptions.find((option) => option.value === state)?.label || "Theo dõi thủ công";
}

function matchesDateFilter(order: AdminOrder, dateFilter: DateFilter) {
  if (dateFilter === "all") return true;
  if (!order.created_at) return false;

  const createdAt = new Date(order.created_at);
  const now = new Date();
  const start = new Date(now);

  if (dateFilter === "today") {
    return createdAt.toDateString() === now.toDateString();
  }

  start.setDate(now.getDate() - (dateFilter === "7d" ? 7 : 30));
  return createdAt >= start;
}

function getSearchHaystack(order: AdminOrder) {
  return [
    order.id,
    order.patient?.full_name,
    order.patient?.phone,
    order.account?.email,
    order.shipping_address,
    order.shipment?.tracking_number,
    order.shipment?.carrier_name
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

function sortOrders(orders: AdminOrder[], sortOption: SortOption) {
  return [...orders].sort((first, second) => {
    if (sortOption === "oldest") {
      return new Date(first.created_at || 0).getTime() - new Date(second.created_at || 0).getTime();
    }

    if (sortOption === "total_asc") {
      return Number(first.total_amount || 0) - Number(second.total_amount || 0);
    }

    if (sortOption === "total_desc") {
      return Number(second.total_amount || 0) - Number(first.total_amount || 0);
    }

    if (sortOption === "items_asc") {
      return getItemCount(first) - getItemCount(second);
    }

    if (sortOption === "items_desc") {
      return getItemCount(second) - getItemCount(first);
    }

    return new Date(second.created_at || 0).getTime() - new Date(first.created_at || 0).getTime();
  });
}

export default function AdminOrdersPage() {
  const [orders, setOrders] = useState<AdminOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [orderStatusFilter, setOrderStatusFilter] = useState<OrderStatusFilter>("all");
  const [shippingStatusFilter, setShippingStatusFilter] = useState<ShippingStatusFilter>("all");
  const [fulfillmentFilter, setFulfillmentFilter] = useState<FulfillmentFilter>("all");
  const [dateFilter, setDateFilter] = useState<DateFilter>("all");
  const [sortOption, setSortOption] = useState<SortOption>("newest");
  const [currentPage, setCurrentPage] = useState(1);

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

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, orderStatusFilter, shippingStatusFilter, fulfillmentFilter, dateFilter, sortOption]);

  const filteredOrders = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase();
    const matches = orders.filter((order) => {
      const shippingStatus = order.shipment?.shipping_status;

      if (normalizedSearch && !getSearchHaystack(order).includes(normalizedSearch)) {
        return false;
      }

      if (orderStatusFilter !== "all" && order.status !== orderStatusFilter) {
        return false;
      }

      if (shippingStatusFilter === "none" && shippingStatus) {
        return false;
      }

      if (shippingStatusFilter !== "all" && shippingStatusFilter !== "none" && shippingStatus !== shippingStatusFilter) {
        return false;
      }

      if (fulfillmentFilter !== "all" && getFulfillmentState(order) !== fulfillmentFilter) {
        return false;
      }

      return matchesDateFilter(order, dateFilter);
    });

    return sortOrders(matches, sortOption);
  }, [dateFilter, fulfillmentFilter, orderStatusFilter, orders, searchTerm, shippingStatusFilter, sortOption]);

  const pageCount = Math.max(1, Math.ceil(filteredOrders.length / PAGE_SIZE));
  const safeCurrentPage = Math.min(currentPage, pageCount);
  const pageStartIndex = (safeCurrentPage - 1) * PAGE_SIZE;
  const visibleOrders = filteredOrders.slice(pageStartIndex, pageStartIndex + PAGE_SIZE);
  const resultStart = filteredOrders.length ? pageStartIndex + 1 : 0;
  const resultEnd = Math.min(pageStartIndex + PAGE_SIZE, filteredOrders.length);

  return (
    <RequireAdmin>
      <section className="mx-auto max-w-7xl px-4 py-10">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm font-bold uppercase text-emerald-700">Admin orders</p>
            <h1 className="text-3xl font-bold text-slate-950">Quản lý đơn hàng</h1>
            <p className="mt-2 max-w-2xl text-sm text-slate-600">
              Thanh toán hiện tại là mock/simulated. Trạng thái pending hoặc confirmed không có nghĩa là đã xác nhận bởi cổng thanh toán thật.
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

        <Card className="mt-6">
          <div className="grid gap-4 lg:grid-cols-[minmax(240px,2fr)_repeat(3,minmax(160px,1fr))]">
            <label className="block text-sm font-semibold text-slate-700" htmlFor="admin-order-search">
              Tìm kiếm đơn hàng
              <input
                id="admin-order-search"
                className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
                placeholder="Mã đơn, tên, email, địa chỉ, mã vận đơn..."
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
              />
            </label>

            <label className="block text-sm font-semibold text-slate-700" htmlFor="admin-order-status-filter">
              Trạng thái đơn
              <select
                id="admin-order-status-filter"
                className="mt-2 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
                value={orderStatusFilter}
                onChange={(event) => setOrderStatusFilter(event.target.value as OrderStatusFilter)}
              >
                {orderStatusOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>

            <label className="block text-sm font-semibold text-slate-700" htmlFor="admin-shipping-status-filter">
              Trạng thái vận chuyển
              <select
                id="admin-shipping-status-filter"
                className="mt-2 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
                value={shippingStatusFilter}
                onChange={(event) => setShippingStatusFilter(event.target.value as ShippingStatusFilter)}
              >
                {shippingStatusOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>

            <label className="block text-sm font-semibold text-slate-700" htmlFor="admin-fulfillment-filter">
              Việc cần xử lý
              <select
                id="admin-fulfillment-filter"
                className="mt-2 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
                value={fulfillmentFilter}
                onChange={(event) => setFulfillmentFilter(event.target.value as FulfillmentFilter)}
              >
                {fulfillmentOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div className="mt-4 grid gap-4 md:grid-cols-3">
            <label className="block text-sm font-semibold text-slate-700" htmlFor="admin-order-date-filter">
              Thời gian
              <select
                id="admin-order-date-filter"
                className="mt-2 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
                value={dateFilter}
                onChange={(event) => setDateFilter(event.target.value as DateFilter)}
              >
                {dateFilterOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>

            <label className="block text-sm font-semibold text-slate-700" htmlFor="admin-order-sort">
              Sắp xếp
              <select
                id="admin-order-sort"
                className="mt-2 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
                value={sortOption}
                onChange={(event) => setSortOption(event.target.value as SortOption)}
              >
                {sortOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>

            <div className="flex items-end">
              <Button
                type="button"
                variant="secondary"
                onClick={() => {
                  setSearchTerm("");
                  setOrderStatusFilter("all");
                  setShippingStatusFilter("all");
                  setFulfillmentFilter("all");
                  setDateFilter("all");
                  setSortOption("newest");
                }}
              >
                Xóa bộ lọc
              </Button>
            </div>
          </div>

          <p className="mt-4 text-sm font-semibold text-slate-600">
            {loading
              ? "Đang tải dữ liệu..."
              : `Hiển thị ${resultStart}-${resultEnd} trên ${filteredOrders.length} đơn hàng phù hợp.`}
          </p>
        </Card>

        <Card className="mt-6 overflow-hidden p-0">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1160px] text-left text-sm">
              <thead className="bg-slate-50 text-slate-600">
                <tr>
                  <th className="px-5 py-3 font-semibold">Mã đơn</th>
                  <th className="px-5 py-3 font-semibold">Khách hàng</th>
                  <th className="px-5 py-3 font-semibold">Ngày đặt</th>
                  <th className="px-5 py-3 font-semibold">Trạng thái</th>
                  <th className="px-5 py-3 font-semibold">Vận chuyển</th>
                  <th className="px-5 py-3 font-semibold">Việc cần xử lý</th>
                  <th className="px-5 py-3 font-semibold">Tổng tiền</th>
                  <th className="px-5 py-3 font-semibold">Địa chỉ giao hàng</th>
                  <th className="px-5 py-3 font-semibold">Số lượng</th>
                  <th className="px-5 py-3 font-semibold">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  <tr>
                    <td className="px-5 py-6 text-slate-500" colSpan={10}>
                      Đang tải đơn hàng...
                    </td>
                  </tr>
                ) : visibleOrders.length ? (
                  visibleOrders.map((order) => (
                    <tr key={order.id}>
                      <td className="max-w-52 break-all px-5 py-4 font-semibold text-slate-900">{order.id}</td>
                      <td className="px-5 py-4 text-slate-700">
                        <p className="font-semibold text-slate-900">{order.patient?.full_name || "Chưa có tên"}</p>
                        <p className="text-xs text-slate-500">{order.account?.email || order.user_id}</p>
                        {order.patient?.phone ? <p className="text-xs text-slate-500">{order.patient.phone}</p> : null}
                      </td>
                      <td className="px-5 py-4 text-slate-700">{formatDate(order.created_at)}</td>
                      <td className="px-5 py-4">
                        <div className="grid gap-2">
                          <span className={`inline-flex w-fit rounded-full px-3 py-1 text-xs font-bold ${getStatusBadgeClass(order.status)}`}>
                            {getStatusLabel(order.status)}
                          </span>
                          {order.status === "cancelled" ? (
                            <span className="max-w-64 text-xs text-slate-500">
                              Lý do: {order.cancellation_reason || "Chưa có lý do"}
                            </span>
                          ) : null}
                          <span className="text-xs font-semibold text-emerald-700">{getPaymentLabel(order)}</span>
                        </div>
                      </td>
                      <td className="px-5 py-4">
                        <span className={`inline-flex w-fit rounded-full px-3 py-1 text-xs font-bold ${getShippingBadgeClass(order.shipment?.shipping_status)}`}>
                          {getShippingStatusLabel(order.shipment?.shipping_status)}
                        </span>
                        {order.shipment?.tracking_number ? (
                          <p className="mt-2 text-xs text-slate-500">Mã vận đơn: {order.shipment.tracking_number}</p>
                        ) : null}
                      </td>
                      <td className="px-5 py-4 text-slate-700">{getFulfillmentLabel(order)}</td>
                      <td className="px-5 py-4 font-semibold text-emerald-700">{formatCurrency(Number(order.total_amount || 0))}</td>
                      <td className="max-w-64 px-5 py-4 text-slate-700">{getCompactShippingAddress(order.shipping_address)}</td>
                      <td className="px-5 py-4 text-slate-700">{getItemCount(order)} sản phẩm</td>
                      <td className="px-5 py-4">
                        <Link href={`/admin/orders/${order.id}`}>
                          <Button variant="secondary">Chi tiết</Button>
                        </Link>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td className="px-5 py-6 text-slate-500" colSpan={10}>
                      Không tìm thấy đơn hàng phù hợp.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>

        {!loading && filteredOrders.length > PAGE_SIZE ? (
          <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-slate-600">
              Trang {safeCurrentPage} / {pageCount}
            </p>
            <div className="flex gap-2">
              <Button
                type="button"
                variant="secondary"
                disabled={safeCurrentPage <= 1}
                onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
              >
                Trước
              </Button>
              <Button
                type="button"
                variant="secondary"
                disabled={safeCurrentPage >= pageCount}
                onClick={() => setCurrentPage((page) => Math.min(pageCount, page + 1))}
              >
                Sau
              </Button>
            </div>
          </div>
        ) : null}
      </section>
    </RequireAdmin>
  );
}
