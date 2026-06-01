import {
  Bell,
  CalendarCheck,
  CalendarClock,
  CreditCard,
  Dumbbell,
  FileText,
  LayoutDashboard,
  Route,
  ShieldCheck,
  ShoppingBag,
  Stethoscope,
  TrendingUp,
  UserRound,
  Users,
  type LucideIcon
} from "lucide-react";

import type { Account } from "@/types";

export type AccountType = Account["account_type"];

export type SidebarItem = {
  label: string;
  href: string;
  icon: LucideIcon;
  requiresAuth?: boolean;
};

export const patientSidebarItems: SidebarItem[] = [
  {
    label: "Tổng quan",
    href: "/patient/dashboard",
    icon: LayoutDashboard,
    requiresAuth: true
  },
  {
    label: "Bác sĩ",
    href: "/patient/doctors",
    icon: Stethoscope,
    requiresAuth: false
  },
  {
    label: "Lịch hẹn",
    href: "/patient/appointments",
    icon: CalendarCheck,
    requiresAuth: true
  },
  {
    label: "Bài tập",
    href: "/patient/exercises",
    icon: Dumbbell,
    requiresAuth: false
  },
  {
    label: "Lộ trình",
    href: "/patient/recovery-plan",
    icon: Route,
    requiresAuth: true
  },
  {
    label: "Tiến trình",
    href: "/patient/progress",
    icon: TrendingUp,
    requiresAuth: true
  },
  {
    label: "Sản phẩm",
    href: "/patient/products",
    icon: ShoppingBag,
    requiresAuth: false
  },
  {
    label: "Đơn hàng",
    href: "/patient/orders",
    icon: FileText,
    requiresAuth: true
  },
  {
    label: "Bảng giá",
    href: "/patient/pricing",
    icon: CreditCard,
    requiresAuth: false
  }
];

export const doctorSidebarItems: SidebarItem[] = [
  { label: "Tổng quan", href: "/doctor/dashboard", icon: LayoutDashboard, requiresAuth: true },
  { label: "Lịch hẹn", href: "/doctor/appointments", icon: CalendarCheck, requiresAuth: true },
  { label: "Lịch rảnh", href: "/doctor/schedules", icon: CalendarClock, requiresAuth: true },
  { label: "Bệnh nhân của tôi", href: "/doctor/patients", icon: Users, requiresAuth: true },
  { label: "Ghi chú tư vấn", href: "/doctor/notes", icon: FileText, requiresAuth: true },
  { label: "Hồ sơ bác sĩ", href: "/doctor/profile", icon: Stethoscope, requiresAuth: true },
  { label: "Thông báo", href: "/doctor/notifications", icon: Bell, requiresAuth: true }
];

export const adminSidebarItems: SidebarItem[] = [
  { label: "Sản phẩm", href: "/admin/products", icon: ShoppingBag, requiresAuth: true },
  { label: "Tổng quan", href: "/admin", icon: ShieldCheck, requiresAuth: true },
  { label: "Đơn hàng", href: "/admin/orders", icon: FileText, requiresAuth: true }
];

export function getSidebarItemsForAccountType(accountType?: AccountType | null): SidebarItem[] {
  if (accountType === "admin") return adminSidebarItems;
  if (accountType === "doctor") return doctorSidebarItems;
  return patientSidebarItems;
}

export function getDashboardHref(accountType?: AccountType | null, mustChangePassword?: boolean) {
  if (accountType === "admin") return "/admin";
  if (accountType === "doctor") return mustChangePassword ? "/doctor/change-password" : "/doctor/dashboard";
  return "/patient/dashboard";
}

export function getProfileHref(accountType?: AccountType | null) {
  if (accountType === "admin") return "/admin";
  if (accountType === "doctor") return "/doctor/profile";
  return "/patient/profile";
}

export function getCartHref(accountType?: AccountType | null) {
  return accountType === "patient" ? "/patient/cart" : null;
}

export const pageTitles: Record<string, string> = {
  "/admin/products": "Quản lý sản phẩm",
  "/": "Trang chủ",
  "/admin": "Quản trị",
  "/admin/orders": "Quản lý đơn hàng",
  "/doctor": "Bác sĩ",
  "/doctor/dashboard": "Tổng quan bác sĩ",
  "/doctor/appointments": "Lịch hẹn bác sĩ",
  "/doctor/schedules": "Lịch rảnh",
  "/doctor/patients": "Bệnh nhân",
  "/doctor/notes": "Ghi chú",
  "/doctor/profile": "Hồ sơ bác sĩ",
  "/doctor/notifications": "Thông báo",
  "/patient/dashboard": "Tổng quan",
  "/patient/doctors": "Bác sĩ",
  "/patient/appointments": "Lịch hẹn",
  "/patient/exercises": "Bài tập",
  "/patient/recovery-plan": "Lộ trình",
  "/patient/progress": "Tiến trình",
  "/patient/products": "Sản phẩm",
  "/patient/orders": "Đơn hàng",
  "/patient/pricing": "Bảng giá",
  "/patient/profile": "Hồ sơ",
  "/patient/cart": "Giỏ hàng",
  "/login": "Đăng nhập",
  "/patient/register": "Đăng ký"
};

export function getPageTitle(pathname: string): string {
  const exact = pageTitles[pathname];
  if (exact) return exact;

  const matched = Object.keys(pageTitles)
    .filter((path) => path !== "/" && pathname.startsWith(`${path}/`))
    .sort((a, b) => b.length - a.length)[0];

  return matched ? pageTitles[matched] : "RehabAI";
}
