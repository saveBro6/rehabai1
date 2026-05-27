"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";

import { getAuthRedirectPath } from "@/lib/auth-navigation";
import { useAuth } from "@/hooks/useAuth";

export function RequireAuth({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth();
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.replace(getAuthRedirectPath(pathname));
    }
  }, [isAuthenticated, isLoading, pathname, router]);

  if (isLoading) {
    return <div className="p-6 text-slate-600">Đang kiểm tra đăng nhập...</div>;
  }

  if (!isAuthenticated) {
    return null;
  }

  return <>{children}</>;
}
