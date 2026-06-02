import { getAdminOrders, type AdminOrder, type ShippingStatus } from "@/services/orders.service";

export type SalesReportGroupBy = "month" | "year";

export type SalesReportParams = {
  startDate?: string;
  endDate?: string;
  groupBy: SalesReportGroupBy;
};

export type SalesReportChartPoint = {
  key: string;
  label: string;
  value: number;
  orderCount: number;
};

export type SalesReportProductRow = {
  productId: string;
  name: string;
  category: string;
  quantity: number;
  value: number;
};

export type SalesReportSummary = {
  totalOrders: number;
  pendingOrders: number;
  confirmedOrders: number;
  cancelledOrders: number;
  deliveredOrders: number;
  validMockOrderValue: number;
  pendingOrderValue: number;
  cancelledOrderValue: number;
  soldProductQuantity: number;
};

export type SalesReport = {
  summary: SalesReportSummary;
  chart: SalesReportChartPoint[];
  topProductsByQuantity: SalesReportProductRow[];
  topProductsByValue: SalesReportProductRow[];
  recentOrders: AdminOrder[];
  statusBreakdown: Array<{ status: AdminOrder["status"]; label: string; count: number }>;
  shipmentBreakdown: Array<{ status: ShippingStatus | "none"; label: string; count: number }>;
};

function getDateRange(params: SalesReportParams) {
  const start = params.startDate ? new Date(`${params.startDate}T00:00:00`) : null;
  const end = params.endDate ? new Date(`${params.endDate}T23:59:59.999`) : null;
  return { start, end };
}

function isWithinDateRange(order: AdminOrder, params: SalesReportParams) {
  if (!order.created_at) return false;
  const createdAt = new Date(order.created_at);
  const { start, end } = getDateRange(params);

  if (start && createdAt < start) return false;
  if (end && createdAt > end) return false;
  return true;
}

function isDelivered(order: AdminOrder) {
  return order.shipment?.shipping_status === "delivered";
}

function isValidMockOrder(order: AdminOrder) {
  return order.status !== "cancelled" && (order.status === "confirmed" || isDelivered(order));
}

function getChartKey(order: AdminOrder, groupBy: SalesReportGroupBy) {
  const createdAt = new Date(order.created_at || 0);
  const year = createdAt.getFullYear();
  const month = String(createdAt.getMonth() + 1).padStart(2, "0");
  return groupBy === "year" ? String(year) : `${year}-${month}`;
}

function getChartLabel(key: string, groupBy: SalesReportGroupBy) {
  if (groupBy === "year") return key;
  const [year, month] = key.split("-");
  return `${month}/${year}`;
}

function getOrderStatusLabel(status: AdminOrder["status"]) {
  if (status === "pending") return "Đơn hàng đang chờ xử lý";
  if (status === "confirmed") return "Đã xác nhận";
  if (status === "paid") return "Paid (dữ liệu cũ, không phải gateway-confirmed)";
  if (status === "cancelled") return "Đã hủy";
  return status;
}

function getShipmentStatusLabel(status: ShippingStatus | "none") {
  if (status === "not_started") return "Chưa bắt đầu giao";
  if (status === "preparing") return "Đang chuẩn bị";
  if (status === "shipped") return "Đang giao";
  if (status === "delivered") return "Đã giao";
  if (status === "failed") return "Giao thất bại";
  if (status === "returned") return "Đã hoàn trả";
  if (status === "cancelled") return "Đã hủy";
  return "Không có vận chuyển";
}

function aggregateProducts(orders: AdminOrder[]) {
  const rowsById = new Map<string, SalesReportProductRow>();

  orders.forEach((order) => {
    (order.items || []).forEach((item) => {
      const productId = item.product_id;
      const current = rowsById.get(productId) || {
        productId,
        name: item.product?.name || "Sản phẩm không còn khả dụng",
        category: item.product?.category || "Chưa rõ",
        quantity: 0,
        value: 0
      };

      current.quantity += item.quantity;
      current.value += Number(item.unit_price || 0) * item.quantity;
      rowsById.set(productId, current);
    });
  });

  return Array.from(rowsById.values());
}

export async function getAdminSalesReport(params: SalesReportParams): Promise<SalesReport> {
  const orders = (await getAdminOrders()).filter((order) => isWithinDateRange(order, params));
  const validOrders = orders.filter(isValidMockOrder);
  const pendingOrders = orders.filter((order) => order.status === "pending");
  const cancelledOrders = orders.filter((order) => order.status === "cancelled");
  const products = aggregateProducts(validOrders);
  const chartByKey = new Map<string, SalesReportChartPoint>();

  validOrders.forEach((order) => {
    const key = getChartKey(order, params.groupBy);
    const current = chartByKey.get(key) || {
      key,
      label: getChartLabel(key, params.groupBy),
      value: 0,
      orderCount: 0
    };
    current.value += Number(order.total_amount || 0);
    current.orderCount += 1;
    chartByKey.set(key, current);
  });

  const statusCounts = new Map<AdminOrder["status"], number>();
  const shipmentCounts = new Map<ShippingStatus | "none", number>();

  orders.forEach((order) => {
    statusCounts.set(order.status, (statusCounts.get(order.status) || 0) + 1);
    const shipmentStatus = order.shipment?.shipping_status || "none";
    shipmentCounts.set(shipmentStatus, (shipmentCounts.get(shipmentStatus) || 0) + 1);
  });

  return {
    summary: {
      totalOrders: orders.length,
      pendingOrders: pendingOrders.length,
      confirmedOrders: orders.filter((order) => order.status === "confirmed").length,
      cancelledOrders: cancelledOrders.length,
      deliveredOrders: orders.filter(isDelivered).length,
      validMockOrderValue: validOrders.reduce((sum, order) => sum + Number(order.total_amount || 0), 0),
      pendingOrderValue: pendingOrders.reduce((sum, order) => sum + Number(order.total_amount || 0), 0),
      cancelledOrderValue: cancelledOrders.reduce((sum, order) => sum + Number(order.total_amount || 0), 0),
      soldProductQuantity: products.reduce((sum, product) => sum + product.quantity, 0)
    },
    chart: Array.from(chartByKey.values()).sort((first, second) => first.key.localeCompare(second.key)),
    topProductsByQuantity: [...products].sort((first, second) => second.quantity - first.quantity).slice(0, 8),
    topProductsByValue: [...products].sort((first, second) => second.value - first.value).slice(0, 8),
    recentOrders: [...orders]
      .sort((first, second) => new Date(second.created_at || 0).getTime() - new Date(first.created_at || 0).getTime())
      .slice(0, 10),
    statusBreakdown: Array.from(statusCounts.entries()).map(([status, count]) => ({
      status,
      label: getOrderStatusLabel(status),
      count
    })),
    shipmentBreakdown: Array.from(shipmentCounts.entries()).map(([status, count]) => ({
      status,
      label: getShipmentStatusLabel(status),
      count
    }))
  };
}
