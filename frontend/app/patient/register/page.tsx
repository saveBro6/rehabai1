"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { Eye, EyeOff } from "lucide-react";

import { Button } from "@/components/Button";
import { Card } from "@/components/Card";
import { useToast } from "@/hooks/useToast";
import { getAuthRedirectUrl } from "@/lib/auth-redirects";
import { getSupabaseClient, getSupabaseConfigError } from "@/lib/supabase-client";
import { normalizeVietnamMobilePhone, VIETNAM_PHONE_ERROR } from "@/lib/vietnam-phone";

function GoogleLogo() {
  return (
    <svg aria-hidden="true" className="mr-3 h-5 w-5" viewBox="0 0 24 24">
      <path
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
        fill="#4285F4"
      />
      <path
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
        fill="#34A853"
      />
      <path
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
        fill="#FBBC05"
      />
      <path
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84C6.71 7.31 9.14 5.38 12 5.38z"
        fill="#EA4335"
      />
    </svg>
  );
}

export default function RegisterPage() {
  const router = useRouter();
  const { pushToast } = useToast();
  const [form, setForm] = useState({
    full_name: "",
    email: "",
    phone: "",
    password: "",
    confirm_password: ""
  });
  const [loading, setLoading] = useState(false);
  const [oauthLoading, setOauthLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  async function continueWithGoogle() {
    const supabase = getSupabaseClient();
    if (!supabase) {
      pushToast("Chưa thể đăng ký", getSupabaseConfigError());
      return;
    }

    setOauthLoading(true);
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: getAuthRedirectUrl("/auth/callback")
      }
    });

    if (error) {
      setOauthLoading(false);
      pushToast("Không thể tiếp tục với Google", error.message);
    }
  }

  async function submit(event: FormEvent) {
    event.preventDefault();

    if (!form.full_name || !form.email.includes("@") || form.password.length < 6) {
      pushToast("Thông tin chưa hợp lệ.", "Vui lòng nhập họ tên, email và mật khẩu ít nhất 6 ký tự.");
      return;
    }

    if (form.password !== form.confirm_password) {
      pushToast("Mật khẩu không khớp.", "Vui lòng xác nhận lại mật khẩu chính xác.");
      return;
    }

    const normalizedPhone = normalizeVietnamMobilePhone(form.phone);
    if (!normalizedPhone) {
      pushToast("Số điện thoại không hợp lệ", VIETNAM_PHONE_ERROR);
      return;
    }

    const supabase = getSupabaseClient();
    if (!supabase) {
      pushToast("Chưa thể đăng ký", getSupabaseConfigError());
      return;
    }

    setLoading(true);
    const { data, error } = await supabase.auth.signUp({
      email: form.email,
      password: form.password,
      options: {
        emailRedirectTo: getAuthRedirectUrl("/login"),
        data: {
          full_name: form.full_name,
          phone: normalizedPhone
        }
      }
    });

    if (error) {
      setLoading(false);
      pushToast("Đăng ký thất bại", error.message);
      return;
    }

    if (!data.session) {
      setLoading(false);
      pushToast("Đăng ký thành công", "Vui lòng kiểm tra email để xác thực tài khoản trước khi đăng nhập.");
      return;
    }

    pushToast("Đăng ký thành công!", "Đang chuyển đến dashboard.");
    router.push("/patient/dashboard");
  }

  return (
    <section className="mx-auto grid min-h-[80vh] max-w-lg content-center px-4 py-16">
      <Card className="border border-emerald-100 p-6 shadow-md">
        <h1 className="text-2xl font-bold tracking-tight text-emerald-950">Đăng ký tài khoản</h1>
        <p className="mt-1 text-sm text-slate-500">Điền thông tin của bạn để tạo tài khoản mới.</p>

        <Button className="mt-6 w-full border-slate-200 bg-white text-slate-800 shadow-sm hover:border-slate-300 hover:bg-white hover:shadow-md" disabled={oauthLoading || loading} onClick={continueWithGoogle} type="button" variant="secondary">
          <GoogleLogo />
          {oauthLoading ? "Đang chuyển đến Google..." : "Tiếp tục với Google"}
        </Button>

        <div className="my-5 flex items-center gap-3 text-xs font-semibold uppercase tracking-wide text-slate-400">
          <span className="h-px flex-1 bg-slate-200" />
          hoặc
          <span className="h-px flex-1 bg-slate-200" />
        </div>

        <form onSubmit={submit} className="grid gap-4">
          <div className="grid gap-1.5">
            <label htmlFor="full_name" className="text-sm font-medium text-slate-700">
              Họ và tên
            </label>
            <input
              id="full_name"
              type="text"
              required
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 placeholder-slate-400 transition-all focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-100"
              placeholder="Nhập họ và tên của bạn"
              value={form.full_name}
              onChange={(event) => setForm({ ...form, full_name: event.target.value })}
            />
          </div>

          <div className="grid gap-1.5">
            <label htmlFor="phone" className="text-sm font-medium text-slate-700">
              Số điện thoại
            </label>
            <input
              id="phone"
              type="tel"
              required
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 placeholder-slate-400 transition-all focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-100"
              placeholder="Ví dụ: 0914662777"
              value={form.phone}
              onChange={(event) => setForm({ ...form, phone: event.target.value })}
            />
          </div>

          <div className="grid gap-1.5">
            <label htmlFor="email" className="text-sm font-medium text-slate-700">
              Email
            </label>
            <input
              id="email"
              type="email"
              required
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 placeholder-slate-400 transition-all focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-100"
              placeholder="Nhập email của bạn"
              value={form.email}
              onChange={(event) => setForm({ ...form, email: event.target.value })}
            />
          </div>

          <div className="grid gap-1.5">
            <label htmlFor="password" className="text-sm font-medium text-slate-700">
              Mật khẩu
            </label>
            <div className="relative">
              <input
                id="password"
                type={showPassword ? "text" : "password"}
                required
                minLength={6}
                className="w-full rounded-lg border border-slate-300 py-2 pl-3 pr-10 text-sm text-slate-900 placeholder-slate-400 transition-all focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-100"
                placeholder="Nhập mật khẩu (tối thiểu 6 ký tự)"
                value={form.password}
                onChange={(event) => setForm({ ...form, password: event.target.value })}
              />
              <button
                type="button"
                tabIndex={-1}
                className="absolute inset-y-0 right-0 flex items-center pr-3 text-slate-400 hover:text-slate-600 focus:outline-none"
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          <div className="grid gap-1.5">
            <label htmlFor="confirm_password" className="text-sm font-medium text-slate-700">
              Nhập lại mật khẩu
            </label>
            <div className="relative">
              <input
                id="confirm_password"
                type={showConfirmPassword ? "text" : "password"}
                required
                className="w-full rounded-lg border border-slate-300 py-2 pl-3 pr-10 text-sm text-slate-900 placeholder-slate-400 transition-all focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-100"
                placeholder="Xác nhận lại mật khẩu"
                value={form.confirm_password}
                onChange={(event) => setForm({ ...form, confirm_password: event.target.value })}
              />
              <button
                type="button"
                tabIndex={-1}
                className="absolute inset-y-0 right-0 flex items-center pr-3 text-slate-400 hover:text-slate-600 focus:outline-none"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              >
                {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          <Button type="submit" disabled={loading || oauthLoading} className="mt-2 w-full justify-center">
            {loading ? "Đang tạo tài khoản..." : "Tạo tài khoản"}
          </Button>
        </form>
      </Card>
    </section>
  );
}
