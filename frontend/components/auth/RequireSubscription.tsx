"use client";

import Link from "next/link";
import { LockKeyhole } from "lucide-react";
import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";

import { Button } from "@/components/Button";
import { Card } from "@/components/Card";
import { useSubscriptionAccess } from "@/hooks/useSubscriptionAccess";
import { getAuthRedirectPath } from "@/lib/auth-navigation";
import type { SubscriptionPlanName } from "@/lib/subscription-access";

type RequireSubscriptionProps = {
  children: React.ReactNode;
  requiredPlan: SubscriptionPlanName;
};

export function RequireSubscription({ children, requiredPlan }: RequireSubscriptionProps) {
  const { isAuthenticated, isLoading, hasAccess } = useSubscriptionAccess();
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.replace(getAuthRedirectPath(pathname));
    }
  }, [isAuthenticated, isLoading, pathname, router]);

  if (isLoading) {
    return <section className="mx-auto max-w-7xl px-4 py-10 text-slate-500">Đang kiểm tra gói đăng ký...</section>;
  }

  if (!isAuthenticated) return null;

  if (!hasAccess(requiredPlan)) {
    return (
      <section className="mx-auto max-w-3xl px-4 py-16">
        <Card className="text-center">
          <LockKeyhole className="mx-auto h-10 w-10 text-emerald-600" />
          <h1 className="mt-4 text-2xl font-bold text-slate-950">Tính năng bị khóa</h1>
          <p className="mx-auto mt-3 max-w-xl text-slate-600">
            Bạn không thể truy cập tính năng này. Hãy mua gói {requiredPlan} hoặc cao hơn để có thể truy cập!
          </p>
          <Link href="/pricing" className="mt-6 inline-flex">
            <Button>Nâng cấp gói</Button>
          </Link>
        </Card>
      </section>
    );
  }

  return <>{children}</>;
}
