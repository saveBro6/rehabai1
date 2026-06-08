"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";

import { Button } from "@/components/Button";
import { Card } from "@/components/Card";
import { useToast } from "@/hooks/useToast";
import { getAuthRedirectUrl } from "@/lib/auth-redirects";
import { getSupabaseClient, getSupabaseConfigError } from "@/lib/supabase-client";

export default function ForgotPasswordPage() {
  const { pushToast } = useToast();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();

    if (!email.includes("@")) {
      pushToast("Email không hợp lệ", "Vui lòng nhập đúng định dạng email.");
      return;
    }

    const supabase = getSupabaseClient();
    if (!supabase) {
      pushToast("Chưa thể gửi yêu cầu", getSupabaseConfigError());
      return;
    }

    setLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: getAuthRedirectUrl("/patient/reset-password")
    });
    setLoading(false);

    if (error) {
      pushToast("Gửi yêu cầu thất bại", error.message);
      return;
    }

    pushToast("Đã gửi yêu cầu", "Vui lòng kiểm tra email để đặt lại mật khẩu.");
  }

  return (
    <section className="mx-auto grid min-h-[70vh] max-w-md content-center px-4 py-16">
      <Card className="border-emerald-100 shadow-md">
        <h1 className="text-2xl font-bold text-emerald-950">Quên mật khẩu</h1>
        <form onSubmit={submit} className="mt-6 grid gap-4">
          <div className="grid gap-1.5">
            <label htmlFor="email" className="text-sm font-medium text-slate-700">
              Nhập email của bạn
            </label>
            <input
              id="email"
              className="rounded-lg border border-slate-300 px-3 py-2 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-100"
              onChange={(event) => setEmail(event.target.value)}
              placeholder="email@example.com"
              type="email"
              value={email}
            />
          </div>
          <Button disabled={loading} type="submit">
            {loading ? "Đang gửi..." : "Gửi yêu cầu"}
          </Button>
        </form>
        <p className="mt-4 text-sm text-slate-600">
          Đã nhớ mật khẩu?{" "}
          <Link className="font-semibold text-emerald-700" href="/login">
            Đăng nhập
          </Link>
        </p>
      </Card>
    </section>
  );
}
