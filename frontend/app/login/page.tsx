"use client";

import Link from "next/link";
import { FormEvent, Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import { Button } from "@/components/Button";
import { Card } from "@/components/Card";
import { useToast } from "@/hooks/useToast";
import { getSupabaseClient, getSupabaseConfigError } from "@/lib/supabase-client";
import { isSafeRedirectPath } from "@/lib/auth-navigation";

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
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);

    if (error) {
      pushToast("Đăng nhập thất bại", error.message);
      return;
    }

    const redirectTo = searchParams.get("redirect");
    const safeRedirect = isSafeRedirectPath(redirectTo) ? redirectTo : "/dashboard";
    pushToast("Đăng nhập thành công", "Đang chuyển đến trang tiếp theo.");
    router.push(safeRedirect || "/dashboard");
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
        <p className="mt-4 text-sm text-slate-600">Chưa có tài khoản? <Link className="font-semibold text-emerald-700" href="/register">Đăng ký</Link></p>
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
