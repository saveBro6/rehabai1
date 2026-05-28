import type { ComponentType } from "react";
import type { LucideProps } from "lucide-react";
import {
  BarChart3,
  CalendarCheck,
  ClipboardList,
  CreditCard,
  Dumbbell,
  LayoutDashboard,
  Package,
  Route,
  ShoppingBag,
  Stethoscope,
  TrendingUp
} from "lucide-react";

export type SidebarItem = {
  label: string;
  href: string;
  icon: ComponentType<LucideProps>;
  requiresAuth?: boolean;
  allowedRoles?: readonly string[];
};

export const sidebarItems = [
  {
    label: "Dashboard",
    href: "/dashboard",
    icon: LayoutDashboard,
    requiresAuth: true
  },
  {
    label: "Bác sĩ",
    href: "/doctors",
    icon: Stethoscope,
    requiresAuth: false
  },
  {
    label: "Lịch hẹn",
    href: "/appointments",
    icon: CalendarCheck,
    requiresAuth: true
  },
  {
    label: "Bài tập",
    href: "/exercises",
    icon: Dumbbell,
    requiresAuth: false
  },
  {
    label: "Lộ trình",
    href: "/recovery-plan",
    icon: Route,
    requiresAuth: true
  },
  {
    label: "Tiến trình",
    href: "/progress",
    icon: TrendingUp,
    requiresAuth: true
  },
  {
    label: "Sản phẩm",
    href: "/products",
    icon: ShoppingBag,
    requiresAuth: false
  },
  {
    label: "Bảng giá",
    href: "/pricing",
    icon: CreditCard,
    requiresAuth: false
  },
  {
    label: "Quản lý đơn hàng",
    href: "/admin/orders",
    icon: ClipboardList,
    requiresAuth: true,
    allowedRoles: ["admin"]
  },
  {
    label: "Báo cáo doanh thu",
    href: "/admin/reports",
    icon: BarChart3,
    requiresAuth: true,
    allowedRoles: ["admin"]
  },
  {
    label: "Quản lý sản phẩm",
    href: "/admin/products",
    icon: Package,
    requiresAuth: true,
    allowedRoles: ["admin"]
  }
] satisfies readonly SidebarItem[];

export const pageTitles: Record<string, string> = {
  "/": "Trang chủ",
  "/dashboard": "Dashboard",
  "/doctors": "Bác sĩ",
  "/appointments": "Lịch hẹn",
  "/exercises": "Bài tập",
  "/recovery-plan": "Lộ trình",
  "/progress": "Tiến trình",
  "/products": "Sản phẩm",
  "/pricing": "Bảng giá",
  "/profile": "Hồ sơ",
  "/cart": "Giỏ hàng",
  "/admin": "Quản trị",
  "/admin/orders": "Quản lý đơn hàng",
  "/admin/reports": "Báo cáo doanh thu",
  "/admin/products": "Quản lý sản phẩm",
  "/login": "Đăng nhập",
  "/register": "Đăng ký"
};

export function getPageTitle(pathname: string): string {
  const exact = pageTitles[pathname];
  if (exact) return exact;

  const matched = Object.keys(pageTitles)
    .filter((path) => path !== "/" && pathname.startsWith(`${path}/`))
    .sort((a, b) => b.length - a.length)[0];

  return matched ? pageTitles[matched] : "RehabAI";
}
