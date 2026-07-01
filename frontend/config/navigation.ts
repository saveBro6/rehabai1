import {
  BarChart3,
  Bell,
  CreditCard,
  Dumbbell,
  FileText,
  LayoutDashboard,
  Route,
  ShieldCheck,
  ShoppingBag,
  Sparkles,
  TrendingUp,
  UserRound,
  WalletCards,
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
  { label: "Tổng quan", href: "/patient/dashboard", icon: LayoutDashboard, requiresAuth: true },
  { label: "Thông báo", href: "/patient/notifications", icon: Bell, requiresAuth: true },
  { label: "Bài tập", href: "/patient/exercises", icon: Dumbbell, requiresAuth: false },
  { label: "Lộ trình", href: "/patient/recovery-plan", icon: Route, requiresAuth: true },
  { label: "Tiến trình", href: "/patient/progress", icon: TrendingUp, requiresAuth: true },
  { label: "Hồ sơ bệnh nhân", href: "/patient/profile", icon: UserRound, requiresAuth: true },
  { label: "Hồ sơ bệnh án", href: "/patient/medical-record", icon: FileText, requiresAuth: true },
  { label: "Trợ lý AI bệnh án", href: "/patient/ai_analysis", icon: Sparkles, requiresAuth: true },
  { label: "Sản phẩm", href: "/patient/products", icon: ShoppingBag, requiresAuth: false },
  { label: "Đơn hàng", href: "/patient/orders", icon: FileText, requiresAuth: true },
  { label: "Ví của tôi", href: "/patient/wallet", icon: WalletCards, requiresAuth: true },
  { label: "Bảng giá", href: "/patient/pricing", icon: CreditCard, requiresAuth: false }
];

export const adminSidebarItems: SidebarItem[] = [
  { label: "Tổng quan", href: "/admin", icon: ShieldCheck, requiresAuth: true },
  { label: "Bài tập", href: "/admin/exercises", icon: Dumbbell, requiresAuth: true },
  { label: "Sản phẩm", href: "/admin/products", icon: ShoppingBag, requiresAuth: true },
  { label: "Đơn hàng", href: "/admin/orders", icon: FileText, requiresAuth: true },
  { label: "Báo cáo bán hàng", href: "/admin/reports", icon: BarChart3, requiresAuth: true }
];

export function getSidebarItemsForAccountType(accountType?: AccountType | null): SidebarItem[] {
  if (accountType === "admin") return adminSidebarItems;
  if (accountType === "doctor") return [];
  return patientSidebarItems;
}

export function getDashboardHref(accountType?: AccountType | null, mustChangePassword?: boolean) {
  if (accountType === "admin") return "/admin";
  if (accountType === "doctor") return "/login?unsupported_role=doctor";
  if (accountType === "patient") return "/patient/dashboard";
  return "/login";
}

export function getProfileHref(accountType?: AccountType | null) {
  if (accountType === "admin") return "/admin";
  if (accountType === "doctor") return "/login?unsupported_role=doctor";
  if (accountType === "patient") return "/patient/profile";
  return "/login";
}

export function getCartHref(accountType?: AccountType | null) {
  return accountType === "patient" ? "/patient/cart" : null;
}

export const pageTitles: Record<string, string> = {
  "/": "Trang chủ",
  "/admin": "Quản trị",
  "/admin/exercises": "Quản lý video bài tập",
  "/admin/products": "Quản lý sản phẩm",
  "/admin/orders": "Quản lý đơn hàng",
  "/admin/reports": "Báo cáo bán hàng",
  "/patient/dashboard": "Tổng quan",
  "/patient/notifications": "Thông báo",
  "/patient/exercises": "Bài tập",
  "/patient/recovery-plan": "Lộ trình",
  "/patient/progress": "Tiến trình",
  "/patient/products": "Sản phẩm",
  "/patient/orders": "Đơn hàng",
  "/patient/wallet": "Ví RehabAI",
  "/patient/pricing": "Bảng giá",
  "/patient/profile": "Hồ sơ bệnh nhân",
  "/patient/medical-record": "Hồ sơ bệnh án",
  "/patient/ai_analysis": "Trợ lý AI bệnh án",
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
