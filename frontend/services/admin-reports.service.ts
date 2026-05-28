import { ADMIN_ORDER_STATUSES, type AdminOrderStatus } from "@/services/admin-orders.service";
import { assertNoSupabaseError, getSupabase } from "@/services/common";

type RevenueOrderRow = {
  id: string;
  total_amount: number;
  status: AdminOrderStatus;
  created_at: string;
};

export type AdminRevenueStatusFilter = AdminOrderStatus | "all";

export type AdminRevenueReportFilters = {
  startDate?: string;
  endDate?: string;
  status?: AdminRevenueStatusFilter;
};

export type StatusRevenueSummary = {
  status: AdminOrderStatus;
  label: string;
  count: number;
  revenueTotal: number;
};

export type MonthlyDemoRevenue = {
  monthKey: string;
  label: string;
  orderCount: number;
  cancelledCount: number;
  demoTotal: number;
  completedTotal: number;
};

export type AdminRevenueReport = {
  totalDemoRevenue: number;
  completedDemoRevenue: number;
  totalOrderCount: number;
  revenueOrderCount: number;
  cancelledOrderCount: number;
  statusSummaries: StatusRevenueSummary[];
  monthlyRows: MonthlyDemoRevenue[];
};

const STATUS_LABELS: Record<AdminOrderStatus, string> = {
  pending: "Chờ xử lý",
  processing: "Đang xử lý",
  shipped: "Đã gửi",
  delivered: "Đã giao",
  cancelled: "Đã hủy"
};

export async function getAdminRevenueReport(filters: AdminRevenueReportFilters = {}): Promise<AdminRevenueReport> {
  const supabase = getSupabase();
  let query = supabase.from("orders").select("id, total_amount, status, created_at").order("created_at", { ascending: false });

  if (filters.startDate) {
    query = query.gte("created_at", startOfDayIso(filters.startDate));
  }

  if (filters.endDate) {
    query = query.lte("created_at", endOfDayIso(filters.endDate));
  }

  if (filters.status && filters.status !== "all") {
    query = query.eq("status", filters.status);
  }

  const { data, error } = await query;
  assertNoSupabaseError(error);

  return buildAdminRevenueReport((data || []) as RevenueOrderRow[]);
}

function buildAdminRevenueReport(orders: RevenueOrderRow[]): AdminRevenueReport {
  const statusMap = new Map<AdminOrderStatus, StatusRevenueSummary>(
    ADMIN_ORDER_STATUSES.map((status) => [
      status,
      {
        status,
        label: STATUS_LABELS[status],
        count: 0,
        revenueTotal: 0
      }
    ])
  );
  const monthlyMap = new Map<string, MonthlyDemoRevenue>();

  let totalDemoRevenue = 0;
  let completedDemoRevenue = 0;
  let revenueOrderCount = 0;
  let cancelledOrderCount = 0;

  for (const order of orders) {
    const amount = Number(order.total_amount || 0);
    const status = order.status;
    const summary = statusMap.get(status);
    if (summary) {
      summary.count += 1;
      if (status !== "cancelled") {
        summary.revenueTotal += amount;
      }
    }

    const monthRow = getOrCreateMonthRow(monthlyMap, order.created_at);
    if (status === "cancelled") {
      cancelledOrderCount += 1;
      monthRow.cancelledCount += 1;
      continue;
    }

    totalDemoRevenue += amount;
    revenueOrderCount += 1;
    monthRow.orderCount += 1;
    monthRow.demoTotal += amount;

    if (status === "delivered") {
      completedDemoRevenue += amount;
      monthRow.completedTotal += amount;
    }
  }

  return {
    totalDemoRevenue,
    completedDemoRevenue,
    totalOrderCount: orders.length,
    revenueOrderCount,
    cancelledOrderCount,
    statusSummaries: Array.from(statusMap.values()),
    monthlyRows: Array.from(monthlyMap.values()).sort((a, b) => b.monthKey.localeCompare(a.monthKey))
  };
}

function getOrCreateMonthRow(monthlyMap: Map<string, MonthlyDemoRevenue>, createdAt: string) {
  const date = createdAt ? new Date(createdAt) : new Date();
  const monthKey = Number.isNaN(date.getTime()) ? "unknown" : `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
  const existing = monthlyMap.get(monthKey);
  if (existing) return existing;

  const label =
    monthKey === "unknown"
      ? "Không rõ tháng"
      : new Intl.DateTimeFormat("vi-VN", { month: "2-digit", year: "numeric" }).format(date);
  const row = {
    monthKey,
    label,
    orderCount: 0,
    cancelledCount: 0,
    demoTotal: 0,
    completedTotal: 0
  };
  monthlyMap.set(monthKey, row);
  return row;
}

function startOfDayIso(dateValue: string) {
  return `${dateValue}T00:00:00.000Z`;
}

function endOfDayIso(dateValue: string) {
  return `${dateValue}T23:59:59.999Z`;
}
