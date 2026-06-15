"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";

import { Button } from "@/components/Button";
import { Card } from "@/components/Card";
import { RequireAdmin } from "@/components/auth/RequireAdmin";
import { formatCurrency } from "@/lib/utils";
import {
  getAdminSalesReport,
  type SalesReport,
  type SalesReportChartPoint,
  type SalesReportGroupBy,
  type SalesReportProductRow,
  type SalesReportSubscriptionRow
} from "@/services/sales-reports.service";

type QuickRange = "7d" | "30d" | "month" | "year";
type ReportTab = "overview" | "products" | "subscriptions";

const REPORT_TABS: Array<{ id: ReportTab; label: string }> = [
  { id: "overview", label: "Tổng quan" },
  { id: "products", label: "Sản phẩm" },
  { id: "subscriptions", label: "Gói đăng ký" }
];

function toDateInputValue(date: Date) {
  return date.toISOString().slice(0, 10);
}

function getDefaultDateRange() {
  const end = new Date();
  const start = new Date();
  start.setDate(end.getDate() - 30);
  return { startDate: toDateInputValue(start), endDate: toDateInputValue(end) };
}

function getQuickRange(range: QuickRange) {
  const end = new Date();
  const start = new Date();

  if (range === "7d") start.setDate(end.getDate() - 7);
  if (range === "30d") start.setDate(end.getDate() - 30);
  if (range === "month") start.setDate(1);
  if (range === "year") start.setMonth(0, 1);

  return { startDate: toDateInputValue(start), endDate: toDateInputValue(end) };
}

function formatDate(value?: string | null) {
  if (!value) return "Chưa rõ";
  return new Intl.DateTimeFormat("vi-VN", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
}

function getOrderStatusLabel(status: string) {
  if (status === "pending") return "Đơn hàng đang chờ xử lý";
  if (status === "confirmed") return "Đã xác nhận";
  if (status === "cancelled") return "Đã hủy";
  if (status === "paid") return "Paid (dữ liệu cũ, không phải gateway-confirmed)";
  return status;
}

function getSubscriptionStatusLabel(status: string) {
  if (status === "active") return "Đang hoạt động";
  if (status === "cancelled") return "Đã hủy";
  if (status === "expired") return "Đã hết hạn";
  if (status === "pending_payment") return "Chờ thanh toán mô phỏng";
  return status;
}

function SummaryCard({ label, value, helper }: { label: string; value: string | number; helper?: string }) {
  return (
    <Card className="rounded-lg border border-slate-200 bg-white">
      <p className="text-sm font-semibold text-slate-500">{label}</p>
      <p className="mt-2 text-2xl font-bold text-slate-950">{value}</p>
      {helper ? <p className="mt-2 text-xs font-semibold text-slate-500">{helper}</p> : null}
    </Card>
  );
}

function MockValueChart({ data }: { data: SalesReportChartPoint[] }) {
  const maxValue = Math.max(...data.map((point) => point.value), 1);

  if (!data.length) {
    return (
      <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50 p-6 text-sm font-semibold text-slate-500">
        Không có dữ liệu báo cáo trong khoảng thời gian này.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <div className="flex min-w-[680px] items-end gap-4 rounded-lg border border-slate-100 bg-white p-5">
        {data.map((point) => {
          const height = Math.max(18, Math.round((point.value / maxValue) * 220));
          return (
            <div key={point.key} className="flex min-w-24 flex-1 flex-col items-center justify-end gap-3">
              <div className="flex h-64 w-full items-end justify-center border-b border-slate-200">
                <div
                  className="w-full max-w-16 rounded-t-lg bg-emerald-500 shadow-sm transition"
                  style={{ height }}
                  title={`${point.label}: ${formatCurrency(point.value)} / ${point.orderCount} đơn`}
                />
              </div>
              <div className="grid gap-1 text-center">
                <span className="text-xs font-bold text-slate-700">{point.label}</span>
                <span className="text-xs text-slate-500">{formatCurrency(point.value)}</span>
                <span className="text-[11px] font-semibold text-emerald-700">{point.orderCount} đơn</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function ProductTable({
  title,
  products,
  sortDescription
}: {
  title: string;
  products: SalesReportProductRow[];
  sortDescription: string;
}) {
  return (
    <Card className="overflow-hidden rounded-lg border border-slate-200 bg-white p-0">
      <div className="border-b border-slate-100 px-5 py-4">
        <h2 className="text-lg font-bold text-slate-950">{title}</h2>
        <p className="mt-1 text-xs font-semibold text-slate-500">{sortDescription}</p>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[560px] text-left text-sm">
          <thead className="bg-slate-50 text-slate-600">
            <tr>
              <th className="px-5 py-3 font-semibold">Sản phẩm</th>
              <th className="px-5 py-3 font-semibold">Danh mục</th>
              <th className="px-5 py-3 font-semibold">Số lượng</th>
              <th className="px-5 py-3 font-semibold">Giá trị mô phỏng</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {products.length ? (
              products.map((product) => (
                <tr key={product.productId}>
                  <td className="px-5 py-4 font-semibold text-slate-950">{product.name}</td>
                  <td className="px-5 py-4 text-slate-600">{product.category}</td>
                  <td className="px-5 py-4 text-slate-700">{product.quantity}</td>
                  <td className="px-5 py-4 font-semibold text-emerald-700">{formatCurrency(product.value)}</td>
                </tr>
              ))
            ) : (
              <tr>
                <td className="px-5 py-6 text-slate-500" colSpan={4}>
                  Không có dữ liệu báo cáo trong khoảng thời gian này.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

function SubscriptionTable({ subscriptions }: { subscriptions: SalesReportSubscriptionRow[] }) {
  return (
    <Card className="overflow-hidden rounded-lg border border-slate-200 bg-white p-0">
      <div className="border-b border-slate-100 px-5 py-4">
        <h2 className="text-lg font-bold text-slate-950">Giao dịch gói đăng ký</h2>
        <p className="mt-1 text-xs font-semibold text-slate-500">
          Pending payment không được tính là doanh thu mô phỏng đã ghi nhận.
        </p>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[820px] text-left text-sm">
          <thead className="bg-slate-50 text-slate-600">
            <tr>
              <th className="px-5 py-3 font-semibold">Ngày kích hoạt</th>
              <th className="px-5 py-3 font-semibold">Bệnh nhân</th>
              <th className="px-5 py-3 font-semibold">Gói</th>
              <th className="px-5 py-3 font-semibold">Số tiền</th>
              <th className="px-5 py-3 font-semibold">Trạng thái</th>
              <th className="px-5 py-3 font-semibold">Mã tham chiếu</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {subscriptions.length ? (
              subscriptions.map((subscription) => (
                <tr key={subscription.id}>
                  <td className="px-5 py-4 text-slate-700">{formatDate(subscription.activatedAt)}</td>
                  <td className="px-5 py-4 font-semibold text-slate-900">{subscription.patientName}</td>
                  <td className="px-5 py-4 font-semibold text-slate-900">{subscription.planName}</td>
                  <td className="px-5 py-4 font-semibold text-emerald-700">{formatCurrency(subscription.amount)}</td>
                  <td className="px-5 py-4 text-slate-700">{getSubscriptionStatusLabel(subscription.status)}</td>
                  <td className="px-5 py-4 text-slate-600">{subscription.paymentReference || "Không có mã"}</td>
                </tr>
              ))
            ) : (
              <tr>
                <td className="px-5 py-6 text-slate-500" colSpan={6}>
                  Chưa có giao dịch gói đăng ký phù hợp.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

function OverviewTab({ report }: { report: SalesReport }) {
  const productTransactionCount = report.chart.reduce((sum, point) => sum + point.orderCount, 0);
  const subscriptionTransactionCount = report.subscriptionRows.length;

  return (
    <div className="grid gap-5">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <SummaryCard
          label="Tổng doanh thu mô phỏng"
          value={formatCurrency(report.summary.totalMockRevenue)}
          helper="Không phải doanh thu thanh toán thật."
        />
        <SummaryCard
          label="Doanh thu sản phẩm mô phỏng"
          value={formatCurrency(report.summary.productMockRevenue)}
          helper="Chỉ tính đơn hợp lệ mô phỏng."
        />
        <SummaryCard
          label="Doanh thu gói đăng ký mô phỏng"
          value={formatCurrency(report.summary.subscriptionMockRevenue)}
          helper="Không tính pending_payment."
        />
        <SummaryCard label="Tổng giao dịch đã ghi nhận" value={productTransactionCount + subscriptionTransactionCount} />
      </div>

      <Card className="rounded-lg border border-slate-200 bg-white">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="text-xl font-bold text-slate-950">Tổng quan doanh thu mô phỏng</h2>
            <p className="mt-1 text-sm text-slate-600">
              Tách sản phẩm và gói đăng ký để không nhầm với doanh thu thật qua cổng thanh toán.
            </p>
          </div>
        </div>
        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          <div className="rounded-lg bg-slate-50 px-4 py-3">
            <p className="text-sm font-semibold text-slate-500">Giao dịch sản phẩm đã ghi nhận</p>
            <p className="mt-1 text-xl font-bold text-slate-950">{productTransactionCount}</p>
          </div>
          <div className="rounded-lg bg-slate-50 px-4 py-3">
            <p className="text-sm font-semibold text-slate-500">Giao dịch gói đăng ký đã ghi nhận</p>
            <p className="mt-1 text-xl font-bold text-slate-950">{subscriptionTransactionCount}</p>
          </div>
        </div>
      </Card>
    </div>
  );
}

function ProductsTab({
  report,
  groupBy,
  startDate,
  endDate
}: {
  report: SalesReport;
  groupBy: SalesReportGroupBy;
  startDate: string;
  endDate: string;
}) {
  return (
    <div className="grid gap-5">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <SummaryCard label="Tổng số đơn hàng" value={report.summary.totalOrders} />
        <SummaryCard label="Đơn chờ xử lý" value={report.summary.pendingOrders} />
        <SummaryCard label="Đơn đã xác nhận" value={report.summary.confirmedOrders} />
        <SummaryCard label="Đơn đã hủy" value={report.summary.cancelledOrders} />
        <SummaryCard label="Đơn đã giao / hoàn tất" value={report.summary.deliveredOrders} />
        <SummaryCard
          label="Giá trị đơn hợp lệ mô phỏng"
          value={formatCurrency(report.summary.validMockOrderValue)}
          helper="Chỉ gồm đơn confirmed/delivered, không tính cancelled/pending."
        />
        <SummaryCard
          label="Giá trị đang chờ xử lý"
          value={formatCurrency(report.summary.pendingOrderValue)}
          helper="Pending được tách riêng, không tính là giá trị hợp lệ mô phỏng."
        />
        <SummaryCard label="Số sản phẩm đã bán" value={report.summary.soldProductQuantity} />
      </div>

      <Card className="rounded-lg border border-slate-200 bg-white">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="text-xl font-bold text-slate-950">
              {groupBy === "month" ? "Biểu đồ theo tháng" : "Biểu đồ theo năm"}
            </h2>
            <p className="mt-1 text-sm text-slate-600">
              Giá trị đơn hợp lệ mô phỏng và số lượng đơn, không phải paid revenue.
            </p>
          </div>
          <p className="text-xs font-semibold text-slate-500">
            {startDate} đến {endDate}
          </p>
        </div>
        <div className="mt-5">
          <MockValueChart data={report.chart} />
        </div>
      </Card>

      <div className="grid gap-5 lg:grid-cols-2">
        <ProductTable
          title="Top sản phẩm bán chạy"
          products={report.topProductsByQuantity}
          sortDescription="Sắp xếp theo số lượng bán trong đơn hợp lệ mô phỏng."
        />
        <ProductTable
          title="Top sản phẩm theo giá trị mô phỏng"
          products={report.topProductsByValue}
          sortDescription="Sắp xếp theo tổng giá trị order_items trong đơn hợp lệ mô phỏng."
        />
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <Card className="rounded-lg border border-slate-200 bg-white">
          <h2 className="text-lg font-bold text-slate-950">Breakdown trạng thái đơn</h2>
          <div className="mt-4 grid gap-3">
            {report.statusBreakdown.length ? (
              report.statusBreakdown.map((row) => (
                <div key={row.status} className="flex items-center justify-between rounded-lg bg-slate-50 px-4 py-3">
                  <span className="text-sm font-semibold text-slate-700">{row.label}</span>
                  <span className="text-sm font-bold text-slate-950">{row.count}</span>
                </div>
              ))
            ) : (
              <p className="text-sm text-slate-500">Không có dữ liệu báo cáo trong khoảng thời gian này.</p>
            )}
          </div>
        </Card>

        <Card className="rounded-lg border border-slate-200 bg-white">
          <h2 className="text-lg font-bold text-slate-950">Breakdown vận chuyển</h2>
          <div className="mt-4 grid gap-3">
            {report.shipmentBreakdown.length ? (
              report.shipmentBreakdown.map((row) => (
                <div key={row.status} className="flex items-center justify-between rounded-lg bg-slate-50 px-4 py-3">
                  <span className="text-sm font-semibold text-slate-700">{row.label}</span>
                  <span className="text-sm font-bold text-slate-950">{row.count}</span>
                </div>
              ))
            ) : (
              <p className="text-sm text-slate-500">Không có dữ liệu báo cáo trong khoảng thời gian này.</p>
            )}
          </div>
        </Card>
      </div>

      <Card className="overflow-hidden rounded-lg border border-slate-200 bg-white p-0">
        <div className="border-b border-slate-100 px-5 py-4">
          <h2 className="text-lg font-bold text-slate-950">Đơn hàng gần đây trong khoảng lọc</h2>
          <p className="mt-1 text-xs font-semibold text-slate-500">
            Bảng này phục vụ đối chiếu demo, không phải đối soát tài chính thực tế.
          </p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[860px] text-left text-sm">
            <thead className="bg-slate-50 text-slate-600">
              <tr>
                <th className="px-5 py-3 font-semibold">Mã đơn</th>
                <th className="px-5 py-3 font-semibold">Khách hàng</th>
                <th className="px-5 py-3 font-semibold">Ngày đặt</th>
                <th className="px-5 py-3 font-semibold">Trạng thái</th>
                <th className="px-5 py-3 font-semibold">Tổng giá trị</th>
                <th className="px-5 py-3 font-semibold">Chi tiết</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {report.recentOrders.length ? (
                report.recentOrders.map((order) => (
                  <tr key={order.id}>
                    <td className="max-w-56 break-all px-5 py-4 font-semibold text-slate-900">{order.id}</td>
                    <td className="px-5 py-4 text-slate-700">
                      <p className="font-semibold text-slate-900">{order.patient?.full_name || "Chưa có tên"}</p>
                      <p className="text-xs text-slate-500">{order.account?.email || order.user_id}</p>
                    </td>
                    <td className="px-5 py-4 text-slate-700">{formatDate(order.created_at)}</td>
                    <td className="px-5 py-4 text-slate-700">{getOrderStatusLabel(order.status)}</td>
                    <td className="px-5 py-4 font-semibold text-emerald-700">{formatCurrency(Number(order.total_amount || 0))}</td>
                    <td className="px-5 py-4">
                      <Link href={`/admin/orders/${order.id}`}>
                        <Button variant="secondary">Mở đơn</Button>
                      </Link>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td className="px-5 py-6 text-slate-500" colSpan={6}>
                    Không có dữ liệu báo cáo trong khoảng thời gian này.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}

function SubscriptionsTab({ report }: { report: SalesReport }) {
  return (
    <div className="grid gap-5">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <SummaryCard
          label="Doanh thu gói đăng ký mô phỏng"
          value={formatCurrency(report.summary.subscriptionMockRevenue)}
          helper="Pending payment không được tính."
        />
        <SummaryCard label="Giao dịch gói đã ghi nhận" value={report.subscriptionRows.length} />
        <SummaryCard label="Gói đang hoạt động" value={report.summary.activeSubscriptionCount} />
        <SummaryCard label="Gói đã hủy" value={report.summary.cancelledSubscriptionCount} />
        <SummaryCard label="Basic active count" value={report.summary.basicActiveSubscriptions} />
        <SummaryCard label="Standard active count" value={report.summary.standardActiveSubscriptions} />
        <SummaryCard label="Premium active count" value={report.summary.premiumActiveSubscriptions} />
      </div>

      <SubscriptionTable subscriptions={report.subscriptionRows} />
    </div>
  );
}

export default function AdminSalesReportsPage() {
  const defaultRange = useMemo(() => getDefaultDateRange(), []);
  const [startDate, setStartDate] = useState(defaultRange.startDate);
  const [endDate, setEndDate] = useState(defaultRange.endDate);
  const [groupBy, setGroupBy] = useState<SalesReportGroupBy>("month");
  const [activeTab, setActiveTab] = useState<ReportTab>("overview");
  const [report, setReport] = useState<SalesReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadReport = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      setReport(await getAdminSalesReport({ startDate, endDate, groupBy }));
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Không thể tải báo cáo.");
    } finally {
      setLoading(false);
    }
  }, [endDate, groupBy, startDate]);

  useEffect(() => {
    void loadReport();
  }, [loadReport]);

  function applyQuickRange(range: QuickRange) {
    const nextRange = getQuickRange(range);
    setStartDate(nextRange.startDate);
    setEndDate(nextRange.endDate);
  }

  return (
    <RequireAdmin>
      <section className="mx-auto grid max-w-7xl gap-6 px-4 py-10">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold text-slate-950">Báo cáo</h1>
            <p className="mt-2 max-w-2xl text-sm text-slate-600">
              Theo dõi doanh thu mô phỏng theo sản phẩm và gói đăng ký trong MVP.
            </p>
          </div>
          <Link href="/admin/orders">
            <Button variant="secondary">Xem đơn hàng</Button>
          </Link>
        </div>

        <Card className="rounded-lg border border-amber-200 bg-amber-50">
          <p className="text-sm font-bold text-amber-900">Báo cáo mô phỏng, chưa phải doanh thu thanh toán thật.</p>
        </Card>

        <Card className="rounded-lg border border-slate-200 bg-white">
          <div className="grid gap-4 lg:grid-cols-[repeat(2,minmax(160px,1fr))_auto] lg:items-end">
            <label className="block text-sm font-semibold text-slate-700" htmlFor="report-start-date">
              Ngày bắt đầu
              <input
                id="report-start-date"
                className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
                type="date"
                value={startDate}
                onChange={(event) => setStartDate(event.target.value)}
              />
            </label>
            <label className="block text-sm font-semibold text-slate-700" htmlFor="report-end-date">
              Ngày kết thúc
              <input
                id="report-end-date"
                className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
                type="date"
                value={endDate}
                onChange={(event) => setEndDate(event.target.value)}
              />
            </label>
            <div className="flex flex-wrap gap-2">
              <Button type="button" variant="secondary" onClick={() => applyQuickRange("7d")}>
                7 ngày qua
              </Button>
              <Button type="button" variant="secondary" onClick={() => applyQuickRange("30d")}>
                30 ngày qua
              </Button>
              <Button type="button" variant="secondary" onClick={() => applyQuickRange("month")}>
                Tháng này
              </Button>
              <Button type="button" variant="secondary" onClick={() => applyQuickRange("year")}>
                Năm nay
              </Button>
            </div>
          </div>

          <div className="mt-5 flex flex-wrap gap-2">
            <Button type="button" variant={groupBy === "month" ? "primary" : "secondary"} onClick={() => setGroupBy("month")}>
              Theo tháng
            </Button>
            <Button type="button" variant={groupBy === "year" ? "primary" : "secondary"} onClick={() => setGroupBy("year")}>
              Theo năm
            </Button>
          </div>
        </Card>

        <div className="border-b border-slate-200">
          <div className="flex flex-wrap gap-6">
            {REPORT_TABS.map((tab) => (
              <button
                key={tab.id}
                className={`border-b-2 px-1 pb-3 text-sm font-bold transition ${
                  activeTab === tab.id
                    ? "border-emerald-600 text-emerald-700"
                    : "border-transparent text-slate-500 hover:text-slate-800"
                }`}
                type="button"
                onClick={() => setActiveTab(tab.id)}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {error ? (
          <Card className="rounded-lg border border-rose-200 bg-rose-50">
            <p className="text-sm font-semibold text-rose-700">{error}</p>
          </Card>
        ) : null}

        {loading ? (
          <Card className="rounded-lg border border-slate-200 bg-white">
            <p className="text-sm font-semibold text-slate-500">Đang tải báo cáo...</p>
          </Card>
        ) : report ? (
          <>
            {activeTab === "overview" ? <OverviewTab report={report} /> : null}
            {activeTab === "products" ? (
              <ProductsTab report={report} groupBy={groupBy} startDate={startDate} endDate={endDate} />
            ) : null}
            {activeTab === "subscriptions" ? <SubscriptionsTab report={report} /> : null}
          </>
        ) : null}
      </section>
    </RequireAdmin>
  );
}
