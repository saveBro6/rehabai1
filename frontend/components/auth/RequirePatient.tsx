"use client";

import Link from "next/link";
import { ShieldAlert } from "lucide-react";

import { Button } from "@/components/Button";
import { Card } from "@/components/Card";
import { RequireAuth } from "@/components/auth/RequireAuth";
import { useAuth } from "@/hooks/useAuth";

export function RequirePatient({ children }: { children: React.ReactNode }) {
  const { profile, isLoading } = useAuth();

  return (
    <RequireAuth>
      {isLoading ? (
        <section className="mx-auto max-w-7xl px-4 py-10 text-slate-500">Đang kiểm tra quyền bệnh nhân...</section>
      ) : profile?.role === "patient" ? (
        children
      ) : (
        <section className="mx-auto max-w-3xl px-4 py-16">
          <Card className="text-center">
            <ShieldAlert className="mx-auto h-10 w-10 text-emerald-600" />
            <h1 className="mt-4 text-2xl font-bold text-slate-950">Không có quyền truy cập</h1>
            <p className="mx-auto mt-3 max-w-xl text-slate-600">Trang này chỉ dành cho tài khoản bệnh nhân.</p>
            <Link href="/" className="mt-6 inline-flex">
              <Button>Về trang chủ</Button>
            </Link>
          </Card>
        </section>
      )}
    </RequireAuth>
  );
}
