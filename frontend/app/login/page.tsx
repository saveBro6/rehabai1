"use client";

import Link from "next/link";
import { FormEvent, Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import { Button } from "@/components/Button";
import { Card } from "@/components/Card";
import { getDashboardHref } from "@/config/navigation";
import { useToast } from "@/hooks/useToast";
import { getAuthRedirectUrl } from "@/lib/auth-redirects";
import { isSafeRedirectPath } from "@/lib/auth-navigation";
import { getSupabaseClient, getSupabaseConfigError } from "@/lib/supabase-client";
import { getUserProfile } from "@/services/users.service";
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

function getOAuthErrorMessage(code: string | null) {
  if (!code) return null;

  const messages: Record<string, string> = {
    callback: "Khong the hoan tat xac thuc Google. Vui long thu lai.",
    session: "Google da xac thuc nhung ung dung chua nhan duoc phien dang nhap. Vui long thu lai.",
    profile: "Google da xac thuc nhung chua the tao hoac tai ho so RehabAI.",
    inactive: "Tai khoan cua ban chua o trang thai hoat dong.",
    server_config: "May chu chua duoc cau hinh day du de hoan tat dang nhap Google."
  };

  return messages[code] || "Khong the hoan tat dang nhap Google. Vui long thu lai.";
}

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

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { pushToast } = useToast();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [oauthLoading, setOauthLoading] = useState(false);
  const emailVerified = searchParams.get("verified") === "1";
  const oauthErrorMessage = getOAuthErrorMessage(searchParams.get("oauth_error"));

  async function continueWithGoogle() {
    const supabase = getSupabaseClient();
    if (!supabase) {
      pushToast("Chưa thể đăng nhập", getSupabaseConfigError());
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
      pushToast("Không thể đăng nhập bằng Google", error.message);
    }
  }

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
      const detail = process.env.NODE_ENV !== "production" ? `Profile query failed: ${getErrorMessage(profileError)}` : "Không thể tải thông tin tài khoản.";
      pushToast("Không thể tải hồ sơ", detail);
      return;
    }

    if (!userProfile) {
      setLoading(false);
      await supabase.auth.signOut();
      pushToast("Không tìm thấy tài khoản", "Auth thành công nhưng chưa có hồ sơ trong accounts.");
      return;
    }

    if (userProfile.account_status && userProfile.account_status !== "active") {
      setLoading(false);
      await supabase.auth.signOut();
      pushToast("Tài khoản không hoạt động", `Trạng thái hiện tại: ${userProfile.account_status}.`);
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
        {emailVerified ? (
          <div className="mt-4 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-800">
            Xác thực email thành công. Bạn có thể đăng nhập.
          </div>
        ) : null}

        {oauthErrorMessage ? (
          <div className="mt-4 rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-800">
            {oauthErrorMessage}
          </div>
        ) : null}

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
            <label htmlFor="email" className="text-sm font-medium text-slate-700">
              Email
            </label>
            <input
              id="email"
              className="rounded-lg border border-slate-300 px-3 py-2 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-100"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="Nhập email của bạn"
            />
          </div>

          <div className="grid gap-1.5">
            <div className="flex items-center justify-between">
              <label htmlFor="password" className="text-sm font-medium text-slate-700">
                Mật khẩu
              </label>
              <Link href="/forgot-password" className="text-sm font-medium text-emerald-700 hover:underline">
                Quên mật khẩu?
              </Link>
            </div>
            <input
              id="password"
              className="rounded-lg border border-slate-300 px-3 py-2 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-100"
              type="password"
              placeholder="Nhập mật khẩu"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
            />
          </div>

          <Button disabled={loading || oauthLoading}>{loading ? "Đang đăng nhập..." : "Đăng nhập"}</Button>
        </form>
        <p className="mt-4 text-sm text-slate-600">
          Chưa có tài khoản?{" "}
          <Link className="font-semibold text-emerald-700" href="/patient/register">
            Đăng ký
          </Link>
        </p>
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
