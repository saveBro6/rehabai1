"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import { Eye, EyeOff } from "lucide-react";

import { Button } from "@/components/Button";
import { Card } from "@/components/Card";
import { useToast } from "@/hooks/useToast";
import { getSupabaseClient, getSupabaseConfigError } from "@/lib/supabase-client";

export default function ResetPasswordPage() {
  const { pushToast } = useToast();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [preparingSession, setPreparingSession] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  useEffect(() => {
    const supabase = getSupabaseClient();
    const code = new URLSearchParams(window.location.search).get("code");

    if (!supabase || !code) {
      setPreparingSession(false);
      return;
    }

    supabase.auth.exchangeCodeForSession(code).then(({ error }) => {
      if (error) {
        pushToast("Liên kết đặt lại mật khẩu không hợp lệ", error.message);
      }
      setPreparingSession(false);
    });
  }, [pushToast]);

  async function submit(event: FormEvent) {
    event.preventDefault();

    if (password.length < 6) {
      pushToast("Mật khẩu chưa hợp lệ", "Vui lòng nhập mật khẩu ít nhất 6 ký tự.");
      return;
    }

    if (password !== confirmPassword) {
      pushToast("Mật khẩu không khớp", "Vui lòng xác nhận lại mật khẩu chính xác.");
      return;
    }

    const supabase = getSupabaseClient();
    if (!supabase) {
      pushToast("Chưa thể đặt lại mật khẩu", getSupabaseConfigError());
      return;
    }

    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password });
    setLoading(false);

    if (error) {
      pushToast("Đặt lại mật khẩu thất bại", error.message);
      return;
    }

    pushToast("Đã đặt lại mật khẩu", "Bạn có thể đăng nhập bằng mật khẩu mới.");
  }

  return (
    <section className="mx-auto grid min-h-[70vh] max-w-md content-center px-4 py-16">
      <Card className="border-emerald-100 shadow-md">
        <h1 className="text-2xl font-bold text-emerald-950">Đặt lại mật khẩu</h1>
        <form onSubmit={submit} className="mt-6 grid gap-4">
          <div className="grid gap-1.5">
            <label htmlFor="password" className="text-sm font-medium text-slate-700">Mật khẩu mới</label>
            <div className="relative">
              <input
                id="password"
                className="w-full rounded-lg border border-slate-300 py-2 pl-3 pr-10 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-100"
                minLength={6}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="Nhập mật khẩu mới"
                type={showPassword ? "text" : "password"}
                value={password}
              />
              <button
                aria-label={showPassword ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
                className="absolute inset-y-0 right-0 flex items-center pr-3 text-slate-400 hover:text-slate-600 focus:outline-none"
                onClick={() => setShowPassword(!showPassword)}
                type="button"
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          <div className="grid gap-1.5">
            <label htmlFor="confirm_password" className="text-sm font-medium text-slate-700">Nhập lại mật khẩu</label>
            <div className="relative">
              <input
                id="confirm_password"
                className="w-full rounded-lg border border-slate-300 py-2 pl-3 pr-10 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-100"
                onChange={(event) => setConfirmPassword(event.target.value)}
                placeholder="Xác nhận mật khẩu mới"
                type={showConfirmPassword ? "text" : "password"}
                value={confirmPassword}
              />
              <button
                aria-label={showConfirmPassword ? "Ẩn mật khẩu xác nhận" : "Hiện mật khẩu xác nhận"}
                className="absolute inset-y-0 right-0 flex items-center pr-3 text-slate-400 hover:text-slate-600 focus:outline-none"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                type="button"
              >
                {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          <Button disabled={loading || preparingSession} type="submit">
            {loading ? "Đang cập nhật..." : "Cập nhật mật khẩu"}
          </Button>
        </form>
        <p className="mt-4 text-sm text-slate-600">
          Quay lại{" "}
          <Link className="font-semibold text-emerald-700" href="/login">
            đăng nhập
          </Link>
        </p>
      </Card>
    </section>
  );
}
