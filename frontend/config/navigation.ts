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
    label: "Dashboard",
    href: "/patient/dashboard",
    icon: LayoutDashboard,
    requiresAuth: true
  },
  {
    label: "Bac si",
    href: "/patient/doctors",
    icon: Stethoscope,
    requiresAuth: false
  },
  {
    label: "Lich hen",
    href: "/patient/appointments",
    icon: CalendarCheck,
    requiresAuth: true
  },
  {
    label: "Bai tap",
    href: "/patient/exercises",
    icon: Dumbbell,
    requiresAuth: false
  },
  {
    label: "Lo trinh",
    href: "/patient/recovery-plan",
    icon: Route,
    requiresAuth: true
  },
  {
    label: "Tien trinh",
    href: "/patient/progress",
    icon: TrendingUp,
    requiresAuth: true
  },
  {
    label: "San pham",
    href: "/patient/products",
    icon: ShoppingBag,
    requiresAuth: false
  },
  {
    label: "Bang gia",
    href: "/patient/pricing",
    icon: CreditCard,
    requiresAuth: false
  }
];

export const doctorSidebarItems: SidebarItem[] = [
  { label: "Tong quan", href: "/doctor/dashboard", icon: LayoutDashboard, requiresAuth: true },
  { label: "Lich hen", href: "/doctor/appointments", icon: CalendarCheck, requiresAuth: true },
  { label: "Lich ranh", href: "/doctor/schedules", icon: CalendarClock, requiresAuth: true },
  { label: "Benh nhan cua toi", href: "/doctor/patients", icon: Users, requiresAuth: true },
  { label: "Ghi chu tu van", href: "/doctor/notes", icon: FileText, requiresAuth: true },
  { label: "Ho so bac si", href: "/doctor/profile", icon: Stethoscope, requiresAuth: true },
  { label: "Thong bao", href: "/doctor/notifications", icon: Bell, requiresAuth: true }
];

export const adminSidebarItems: SidebarItem[] = [
  { label: "Admin dashboard", href: "/admin", icon: ShieldCheck, requiresAuth: true }
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
  "/": "Trang chu",
  "/admin": "Quan tri",
  "/doctor": "Doctor",
  "/doctor/dashboard": "Doctor dashboard",
  "/doctor/appointments": "Lich hen bac si",
  "/doctor/schedules": "Lich ranh",
  "/doctor/patients": "Benh nhan",
  "/doctor/notes": "Ghi chu",
  "/doctor/profile": "Ho so bac si",
  "/doctor/notifications": "Thong bao",
  "/patient/dashboard": "Dashboard",
  "/patient/doctors": "Bac si",
  "/patient/appointments": "Lich hen",
  "/patient/exercises": "Bai tap",
  "/patient/recovery-plan": "Lo trinh",
  "/patient/progress": "Tien trinh",
  "/patient/products": "San pham",
  "/patient/pricing": "Bang gia",
  "/patient/profile": "Ho so",
  "/patient/cart": "Gio hang",
  "/login": "Dang nhap",
  "/patient/register": "Dang ky"
};

export function getPageTitle(pathname: string): string {
  const exact = pageTitles[pathname];
  if (exact) return exact;

  const matched = Object.keys(pageTitles)
    .filter((path) => path !== "/" && pathname.startsWith(`${path}/`))
    .sort((a, b) => b.length - a.length)[0];

  return matched ? pageTitles[matched] : "RehabAI";
}
