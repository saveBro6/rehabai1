"use client";

import Link from "next/link";
import { FormEvent, Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import { Button } from "@/components/Button";
import { Card } from "@/components/Card";
import { useToast } from "@/hooks/useToast";
import { getSupabaseClient, getSupabaseConfigError } from "@/lib/supabase-client";
import { isSafeRedirectPath } from "@/lib/auth-navigation";
import { getUserProfile } from "@/services/users.service";
import { getDashboardHref } from "@/config/navigation";
import type { User as AppUserProfile } from "@/types";

function getDefaultRoute(userProfile: AppUserProfile) {
  return getDashboardHref(userProfile.account_type, userProfile.must_change_password);
}

function getErrorMessage(error: unknown) {
  if (error instanceof Error) return error.message;
  if (typeof error === "object" && error !== null && "message" in error) {
    return String((error as { message: unknown }).message);
  }
  return "Unknown error.";
}

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { pushToast } = useToast();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!email.includes("@")) {
      pushToast("Email không hợp lệ", "Vui lòng nhập đúng định dạng email.");
      return;
    }
    const supabase = getSupabaseClient();
    if (!supabase) {
      pushToast("Chưa thể đăng nhập", getSupabaseConfigError());
      return;
    }

    setLoading(true);
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      setLoading(false);
      pushToast("Đăng nhập thất bại", error.message);
      return;
    }

    let userProfile: AppUserProfile | null = null;
    try {
      userProfile = data.user ? await getUserProfile(data.user.id) : null;
    } catch (profileError) {
      setLoading(false);
      await supabase.auth.signOut();
      const detail = process.env.NODE_ENV !== "production" ? `Profile query failed: ${getErrorMessage(profileError)}` : "Khong the tai thong tin tai khoan.";
      pushToast("Khong the tai ho so", detail);
      return;
    }

    if (!userProfile) {
      setLoading(false);
      await supabase.auth.signOut();
      pushToast("Khong tim thay tai khoan", "Auth thanh cong nhung khong co ho so trong accounts.");
      return;
    }

    if (userProfile.account_status && userProfile.account_status !== "active") {
      setLoading(false);
      await supabase.auth.signOut();
      pushToast("Tai khoan khong hoat dong", `Trang thai hien tai: ${userProfile.account_status}.`);
      return;
    }

    const redirectTo = searchParams.get("redirect");
    const defaultRoute = getDefaultRoute(userProfile);
    const safeRedirect = isSafeRedirectPath(redirectTo) ? redirectTo : defaultRoute;
    pushToast("Đăng nhập thành công", "Đang chuyển đến trang tiếp theo.");
    router.push(safeRedirect || defaultRoute);
    setLoading(false);
  }

  return (
    <section className="mx-auto grid min-h-[70vh] max-w-md content-center px-4 py-16">
      <Card className="border-emerald-100 shadow-md">
        <h1 className="text-2xl font-bold text-emerald-950">Đăng nhập RehabAI</h1>
        <form onSubmit={submit} className="mt-6 grid gap-4">
          <div className="grid gap-1.5">
            <label htmlFor="email" className="text-sm font-medium text-slate-700">Email</label>
            <input id="email" className="rounded-lg border border-slate-300 px-3 py-2 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-100" type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="Nhập email của bạn" />
          </div>
          
          <div className="grid gap-1.5">
            <div className="flex items-center justify-between">
              <label htmlFor="password" className="text-sm font-medium text-slate-700">Mật khẩu</label>
              <Link href="/forgot-password" className="text-sm font-medium text-emerald-700 hover:underline">
                Quên mật khẩu?
              </Link>
            </div>
            <input id="password" className="rounded-lg border border-slate-300 px-3 py-2 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-100" type="password" placeholder="Nhập mật khẩu" value={password} onChange={(event) => setPassword(event.target.value)} />
          </div>

          <Button disabled={loading}>{loading ? "Đang đăng nhập..." : "Đăng nhập"}</Button>
        </form>
        <p className="mt-4 text-sm text-slate-600">Chưa có tài khoản? <Link className="font-semibold text-emerald-700" href="/patient/register">Đăng ký</Link></p>
      </Card>
    </section>

  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<section className="mx-auto max-w-md px-4 py-16 text-slate-600">Đang tải...</section>}>
      <LoginForm />
    </Suspense>
  );
}
