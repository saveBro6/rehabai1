import type { ComponentType } from "react";
import type { LucideProps } from "lucide-react";
import {
  BarChart3,
  CalendarCheck,
  ClipboardList,
  CreditCard,
  Dumbbell,
  Home,
  LayoutDashboard,
  LogIn,
  Package,
  Route,
  ShoppingBag,
  Stethoscope,
  TrendingUp,
  UserPlus,
  Users,
  FileText
} from "lucide-react";

export type SidebarItem = {
  label: string;
  href: string;
  icon: ComponentType<LucideProps>;
  requiresAuth?: boolean;
  allowedRoles?: readonly string[];
};

export type SidebarSection = {
  label: string;
  items: readonly SidebarItem[];
};

export const guestSidebarSections = [
  {
    label: "Công khai",
    items: [
      {
        label: "Trang chủ",
        href: "/",
        icon: Home,
        requiresAuth: false
      },
      {
        label: "Bác sĩ",
        href: "/doctors",
        icon: Stethoscope,
        requiresAuth: false
      },
      {
        label: "Bài tập",
        href: "/exercises",
        icon: Dumbbell,
        requiresAuth: false
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
      }
    ]
  },
  {
    label: "Tài khoản",
    items: [
      {
        label: "Đăng nhập",
        href: "/login",
        icon: LogIn,
        requiresAuth: false
      },
      {
        label: "Đăng ký",
        href: "/register",
        icon: UserPlus,
        requiresAuth: false
      }
    ]
  }
] satisfies readonly SidebarSection[];

export const patientSidebarSections = [
  {
    label: "Chăm sóc phục hồi",
    items: [
      {
        label: "Dashboard",
        href: "/dashboard",
        icon: LayoutDashboard,
        requiresAuth: true,
        allowedRoles: ["patient"]
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
        requiresAuth: true,
        allowedRoles: ["patient"]
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
        requiresAuth: true,
        allowedRoles: ["patient"]
      },
      {
        label: "Tiến trình",
        href: "/progress",
        icon: TrendingUp,
        requiresAuth: true,
        allowedRoles: ["patient"]
      },
      {
        label: "Sản phẩm",
        href: "/products",
        icon: ShoppingBag,
        requiresAuth: false
      },
      {
        label: "Lịch sử đơn hàng",
        href: "/orders",
        icon: ClipboardList,
        requiresAuth: true,
        allowedRoles: ["patient"]
      },
      {
        label: "Bảng giá",
        href: "/pricing",
        icon: CreditCard,
        requiresAuth: false
      }
    ]
  }
] satisfies readonly SidebarSection[];

export const adminSidebarSections = [
  {
    label: "Quản trị",
    items: [
      {
        label: "Tổng quan quản trị",
        href: "/admin",
        icon: LayoutDashboard,
        requiresAuth: true,
        allowedRoles: ["admin"]
      },
      {
        label: "Quản lý bác sĩ",
        href: "/admin/doctors",
        icon: Stethoscope,
        requiresAuth: true,
        allowedRoles: ["admin"]
      },
      {
        label: "Quản lý sản phẩm",
        href: "/admin/products",
        icon: Package,
        requiresAuth: true,
        allowedRoles: ["admin"]
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
      }
    ]
  }
] satisfies readonly SidebarSection[];

export const doctorSidebarSections = [
  {
    label: "Bác sĩ",
    items: [
      {
        label: "Dashboard",
        href: "/doctor/dashboard",
        icon: LayoutDashboard,
        requiresAuth: true,
        allowedRoles: ["doctor"]
      },
      {
        label: "Hồ sơ bác sĩ",
        href: "/doctor/profile",
        icon: Stethoscope,
        requiresAuth: true,
        allowedRoles: ["doctor"]
      },
      {
        label: "Lịch làm việc",
        href: "/doctor/schedules",
        icon: CalendarCheck,
        requiresAuth: true,
        allowedRoles: ["doctor"]
      },
      {
        label: "Lịch hẹn",
        href: "/doctor/appointments",
        icon: ClipboardList,
        requiresAuth: true,
        allowedRoles: ["doctor"]
      },
      {
        label: "Bệnh nhân",
        href: "/doctor/patients",
        icon: Users,
        requiresAuth: true,
        allowedRoles: ["doctor"]
      },
      {
        label: "Ghi chú",
        href: "/doctor/notes",
        icon: FileText,
        requiresAuth: true,
        allowedRoles: ["doctor"]
      },
      {
        label: "Bài tập",
        href: "/exercises",
        icon: Dumbbell,
        requiresAuth: false
      }
    ]
  }
] satisfies readonly SidebarSection[];

export function getSidebarSections(role?: string | null, isAuthenticated = false) {
  if (!isAuthenticated) return guestSidebarSections;
  if (role === "admin") return adminSidebarSections;
  if (role === "doctor") return doctorSidebarSections;
  return patientSidebarSections;
}

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
  "/admin/doctors": "Quản lý bác sĩ",
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
