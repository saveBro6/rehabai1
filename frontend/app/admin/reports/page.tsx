"use client";

import Link from "next/link";
import { AlertTriangle, BarChart3, CheckCircle2, ClipboardList } from "lucide-react";
import { useEffect, useState } from "react";

import { Button } from "@/components/Button";
import { Card } from "@/components/Card";
import { RequireAdmin } from "@/components/auth/RequireAdmin";
import { formatCurrency } from "@/lib/utils";
import {
  getAdminRevenueReport,
  type AdminRevenueReport,
  type AdminRevenueStatusFilter,
  type MonthlyDemoRevenue,
  type StatusRevenueSummary
} from "@/services/admin-reports.service";

const STATUS_FILTERS: Array<{ value: AdminRevenueStatusFilter; label: string }> = [
  { value: "all", label: "Tất cả" },
  { value: "pending", label: "Chờ xử lý" },
  { value: "processing", label: "Đang xử lý" },
  { value: "shipped", label: "Đã gửi" },
  { value: "delivered", label: "Đã giao" },
  { value: "cancelled", label: "Đã hủy" }
];

export default function AdminReportsPage() {
  const [report, setReport] = useState<AdminRevenueReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [statusFilter, setStatusFilter] = useState<AdminRevenueStatusFilter>("all");

  useEffect(() => {
    let active = true;
    setLoading(true);
    setErrorMessage(null);

    void getAdminRevenueReport({ startDate, endDate, status: statusFilter })
      .then((data) => {
        if (active) setReport(data);
      })
      .catch(() => {
        if (active) setErrorMessage("Không thể tải báo cáo doanh thu. Vui lòng kiểm tra quyền admin hoặc RLS.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [endDate, startDate, statusFilter]);

  function setThisMonth() {
    const now = new Date();
    setStartDate(toDateInputValue(new Date(now.getFullYear(), now.getMonth(), 1)));
    setEndDate(toDateInputValue(new Date(now.getFullYear(), now.getMonth() + 1, 0)));
  }

  function setLastThreeMonths() {
    const now = new Date();
    setStartDate(toDateInputValue(new Date(now.getFullYear(), now.getMonth() - 2, 1)));
    setEndDate(toDateInputValue(new Date(now.getFullYear(), now.getMonth() + 1, 0)));
  }

  function clearFilters() {
    setStartDate("");
    setEndDate("");
    setStatusFilter("all");
  }

  return (
    <RequireAdmin>
      <section className="mx-auto max-w-7xl px-4 py-10">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-sm font-bold uppercase text-emerald-700">Admin</p>
            <h1 className="text-3xl font-bold text-slate-950">Báo cáo doanh thu demo</h1>
            <p className="mt-2 max-w-3xl text-sm text-slate-600">
              Dữ liệu demo, chưa phải doanh thu thanh toán thật. Dữ liệu này dựa trên đơn hàng demo, chưa phải doanh
              thu thanh toán thật từ cổng thanh toán.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link href="/admin/orders">
              <Button variant="secondary">Quản lý đơn hàng</Button>
            </Link>
            <Link href="/admin">
              <Button variant="secondary">Về admin</Button>
            </Link>
          </div>
        </div>

        <Card className="mt-8 border-amber-200 bg-amber-50 text-amber-900">
          <div className="flex gap-3">
            <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" />
            <div>
              <p className="font-bold">Thanh toán giả lập</p>
              <p className="mt-1 text-sm">
                Báo cáo này không xác nhận doanh thu thật. Đơn đã hủy không được tính vào doanh thu; doanh thu hoàn tất
                chỉ tính đơn đã giao.
              </p>
            </div>
          </div>
        </Card>

        <Card className="mt-6">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <h2 className="text-xl font-bold text-slate-950">Bộ lọc báo cáo</h2>
              <p className="mt-1 text-sm text-slate-600">Cards, bảng và biểu đồ cập nhật theo khoảng ngày và trạng thái.</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button type="button" variant="secondary" onClick={setThisMonth}>
                Tháng này
              </Button>
              <Button type="button" variant="secondary" onClick={setLastThreeMonths}>
                3 tháng gần nhất
              </Button>
              <Button type="button" variant="ghost" onClick={clearFilters}>
                Tất cả thời gian
              </Button>
            </div>
          </div>

          <div className="mt-5 grid gap-4 md:grid-cols-3">
            <label className="grid gap-1.5 text-sm font-semibold text-slate-700">
              Từ ngày
              <input
                type="date"
                value={startDate}
                max={endDate || undefined}
                onChange={(event) => setStartDate(event.target.value)}
                className="min-h-11 rounded-lg border border-slate-300 px-3 py-2 font-normal text-slate-900 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-100"
              />
            </label>
            <label className="grid gap-1.5 text-sm font-semibold text-slate-700">
              Đến ngày
              <input
                type="date"
                value={endDate}
                min={startDate || undefined}
                onChange={(event) => setEndDate(event.target.value)}
                className="min-h-11 rounded-lg border border-slate-300 px-3 py-2 font-normal text-slate-900 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-100"
              />
            </label>
            <label className="grid gap-1.5 text-sm font-semibold text-slate-700">
              Trạng thái
              <select
                value={statusFilter}
                onChange={(event) => setStatusFilter(event.target.value as AdminRevenueStatusFilter)}
                className="min-h-11 rounded-lg border border-slate-300 px-3 py-2 font-normal text-slate-900 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-100"
              >
                {STATUS_FILTERS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
          </div>
        </Card>

        {loading ? <p className="mt-8 text-slate-500">Đang tải báo cáo...</p> : null}
        {errorMessage ? (
          <Card className="mt-8">
            <p className="text-red-600">{errorMessage}</p>
          </Card>
        ) : null}

        {!loading && !errorMessage && report ? (
          <>
            <div className="mt-8 grid gap-4 md:grid-cols-3">
              <MetricCard
                icon={<BarChart3 className="h-5 w-5" />}
                label="Tổng giá trị đơn hàng demo"
                value={formatCurrency(report.totalDemoRevenue)}
                helper={`${report.revenueOrderCount} đơn không hủy`}
              />
              <MetricCard
                icon={<CheckCircle2 className="h-5 w-5" />}
                label="Doanh thu hoàn tất"
                value={formatCurrency(report.completedDemoRevenue)}
                helper="Doanh thu hoàn tất chỉ tính đơn đã giao"
              />
              <MetricCard
                icon={<ClipboardList className="h-5 w-5" />}
                label="Tổng số đơn"
                value={String(report.totalOrderCount)}
                helper={`${report.cancelledOrderCount} đơn đã hủy không tính doanh thu`}
              />
            </div>

            <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              {report.statusSummaries
                .filter((summary) => summary.status !== "cancelled")
                .map((summary) => (
                  <Card key={summary.status}>
                    <p className="text-sm font-semibold text-slate-500">Giá trị đơn {summary.label.toLowerCase()}</p>
                    <p className="mt-2 text-2xl font-bold text-emerald-700">{formatCurrency(summary.revenueTotal)}</p>
                    <p className="mt-1 text-sm text-slate-600">{summary.count} đơn</p>
                  </Card>
                ))}
            </div>

            <div className="mt-6 grid gap-6 lg:grid-cols-2">
              <Card>
                <h2 className="text-xl font-bold text-slate-950">Doanh thu demo theo tháng</h2>
                <p className="mt-1 text-sm text-slate-600">
                  Cột xanh là tổng giá trị demo không hủy; vạch xanh đậm là doanh thu hoàn tất từ đơn đã giao.
                </p>
                <MonthlyRevenueChart rows={report.monthlyRows} />
              </Card>

              <Card>
                <h2 className="text-xl font-bold text-slate-950">Số đơn theo trạng thái</h2>
                <p className="mt-1 text-sm text-slate-600">Đơn đã hủy được đếm riêng nhưng không cộng vào doanh thu.</p>
                <StatusCountChart summaries={report.statusSummaries} />
              </Card>
            </div>

            <Card className="mt-6">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="text-xl font-bold text-slate-950">Số đơn theo trạng thái</h2>
                  <p className="mt-1 text-sm text-slate-600">Đơn đã hủy được đếm riêng nhưng không cộng vào doanh thu.</p>
                </div>
              </div>
              <div className="mt-4 overflow-x-auto">
                <table className="w-full min-w-[620px] text-left text-sm">
                  <thead className="border-b border-slate-200 text-slate-500">
                    <tr>
                      <th className="py-3 pr-4 font-semibold">Trạng thái</th>
                      <th className="py-3 pr-4 font-semibold">Số đơn</th>
                      <th className="py-3 pr-4 font-semibold">Giá trị tính doanh thu demo</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {report.statusSummaries.map((summary) => (
                      <tr key={summary.status}>
                        <td className="py-3 pr-4 font-semibold text-slate-950">{summary.label}</td>
                        <td className="py-3 pr-4 text-slate-700">{summary.count}</td>
                        <td className="py-3 pr-4 text-slate-700">
                          {summary.status === "cancelled" ? "Không tính doanh thu" : formatCurrency(summary.revenueTotal)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>

            <Card className="mt-6">
              <h2 className="text-xl font-bold text-slate-950">Doanh thu demo theo tháng</h2>
              <p className="mt-1 text-sm text-slate-600">Bảng nhóm theo tháng tạo đơn, loại trừ đơn đã hủy khỏi tổng giá trị.</p>
              <div className="mt-4 overflow-x-auto">
                <table className="w-full min-w-[760px] text-left text-sm">
                  <thead className="border-b border-slate-200 text-slate-500">
                    <tr>
                      <th className="py-3 pr-4 font-semibold">Tháng</th>
                      <th className="py-3 pr-4 font-semibold">Số đơn demo</th>
                      <th className="py-3 pr-4 font-semibold">Đơn đã hủy</th>
                      <th className="py-3 pr-4 font-semibold">Tổng giá trị demo</th>
                      <th className="py-3 pr-4 font-semibold">Doanh thu hoàn tất</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {report.monthlyRows.length ? (
                      report.monthlyRows.map((row) => (
                        <tr key={row.monthKey}>
                          <td className="py-3 pr-4 font-semibold text-slate-950">{row.label}</td>
                          <td className="py-3 pr-4 text-slate-700">{row.orderCount}</td>
                          <td className="py-3 pr-4 text-slate-700">{row.cancelledCount}</td>
                          <td className="py-3 pr-4 font-semibold text-emerald-700">{formatCurrency(row.demoTotal)}</td>
                          <td className="py-3 pr-4 text-slate-700">{formatCurrency(row.completedTotal)}</td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td className="py-6 text-center text-slate-500" colSpan={5}>
                          Chưa có đơn hàng demo theo bộ lọc hiện tại.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </Card>
          </>
        ) : null}
      </section>
    </RequireAdmin>
  );
}

function MonthlyRevenueChart({ rows }: { rows: MonthlyDemoRevenue[] }) {
  const chartRows = rows.slice().reverse();
  const maxValue = Math.max(...chartRows.map((row) => row.demoTotal), 0);

  if (!chartRows.length) {
    return <p className="mt-6 rounded-lg bg-slate-50 p-6 text-center text-sm text-slate-500">Không có dữ liệu tháng.</p>;
  }

  return (
    <div className="mt-6 grid min-h-72 grid-cols-[auto_1fr] gap-4" role="img" aria-label="Biểu đồ doanh thu demo theo tháng">
      <div className="flex flex-col justify-between pb-8 text-right text-xs text-slate-500">
        <span>{formatCurrency(maxValue)}</span>
        <span>{formatCurrency(maxValue / 2)}</span>
        <span>0 ₫</span>
      </div>
      <div className="flex items-end gap-3 overflow-x-auto border-b border-l border-slate-200 px-3 pb-8 pt-4">
        {chartRows.map((row) => {
          const height = maxValue ? Math.max(8, Math.round((row.demoTotal / maxValue) * 100)) : 0;
          const completedHeight = maxValue ? Math.max(0, Math.round((row.completedTotal / maxValue) * 100)) : 0;

          return (
            <div key={row.monthKey} className="flex min-w-20 flex-1 flex-col items-center gap-2">
              <div className="flex h-44 w-full items-end justify-center">
                <div className="relative flex h-full w-10 items-end rounded-t-lg bg-emerald-100">
                  <div
                    className="w-full rounded-t-lg bg-emerald-500"
                    style={{ height: `${height}%` }}
                    title={`${row.label}: ${formatCurrency(row.demoTotal)}`}
                  />
                  {completedHeight ? (
                    <div
                      className="absolute bottom-0 left-1/2 w-6 -translate-x-1/2 rounded-t bg-emerald-800"
                      style={{ height: `${completedHeight}%` }}
                      title={`Hoàn tất: ${formatCurrency(row.completedTotal)}`}
                    />
                  ) : null}
                </div>
              </div>
              <div className="text-center">
                <p className="text-xs font-semibold text-slate-700">{row.label}</p>
                <p className="text-xs text-slate-500">{row.orderCount} đơn</p>
              </div>
            </div>
          );
        })}
      </div>
      <div className="col-span-2 flex flex-wrap gap-4 text-xs text-slate-600">
        <span className="inline-flex items-center gap-2">
          <span className="h-3 w-3 rounded-sm bg-emerald-500" />
          Tổng giá trị demo
        </span>
        <span className="inline-flex items-center gap-2">
          <span className="h-3 w-3 rounded-sm bg-emerald-800" />
          Doanh thu hoàn tất
        </span>
      </div>
    </div>
  );
}

function StatusCountChart({ summaries }: { summaries: StatusRevenueSummary[] }) {
  const maxCount = Math.max(...summaries.map((summary) => summary.count), 0);

  return (
    <div className="mt-6 grid gap-3" role="img" aria-label="Biểu đồ số đơn theo trạng thái">
      {summaries.map((summary) => {
        const width = maxCount ? Math.max(4, Math.round((summary.count / maxCount) * 100)) : 0;
        return (
          <div key={summary.status} className="grid gap-1.5">
            <div className="flex items-center justify-between gap-3 text-sm">
              <span className="font-semibold text-slate-700">{summary.label}</span>
              <span className="text-slate-500">{summary.count} đơn</span>
            </div>
            <div className="h-4 overflow-hidden rounded-full bg-slate-100">
              <div
                className={summary.status === "cancelled" ? "h-full rounded-full bg-slate-400" : "h-full rounded-full bg-emerald-500"}
                style={{ width: `${width}%` }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}

function MetricCard({
  icon,
  label,
  value,
  helper
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  helper: string;
}) {
  return (
    <Card>
      <div className="flex items-center gap-2 text-emerald-700">
        {icon}
        <p className="text-sm font-semibold">{label}</p>
      </div>
      <p className="mt-3 text-3xl font-bold text-slate-950">{value}</p>
      <p className="mt-1 text-sm text-slate-600">{helper}</p>
    </Card>
  );
}

function toDateInputValue(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}
