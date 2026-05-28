import {
  CalendarCheck,
  CreditCard,
  Dumbbell,
  LayoutDashboard,
  Route,
  ShoppingBag,
  Stethoscope,
  TrendingUp
} from "lucide-react";

export const sidebarItems = [
  {
    label: "Dashboard",
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
    label: "Bảng giá",
    href: "/patient/pricing",
    icon: CreditCard,
    requiresAuth: false
  }
] as const;

export const pageTitles: Record<string, string> = {
  "/": "Trang chủ",
  "/patient/dashboard": "Dashboard",
  "/patient/doctors": "Bác sĩ",
  "/patient/appointments": "Lịch hẹn",
  "/patient/exercises": "Bài tập",
  "/patient/recovery-plan": "Lộ trình",
  "/patient/progress": "Tiến trình",
  "/patient/products": "Sản phẩm",
  "/patient/pricing": "Bảng giá",
  "/patient/profile": "Hồ sơ",
  "/patient/cart": "Giỏ hàng",
  "/admin": "Quản trị",
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
