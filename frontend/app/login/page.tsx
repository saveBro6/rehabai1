"use client";

import Link from "next/link";
import { FormEvent, Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Activity, CalendarCheck2, ChevronDown, Eye, EyeOff, Lock, Mail, ShieldCheck, Sun, UserRound } from "lucide-react";

import { Button } from "@/components/Button";
import { getDashboardHref } from "@/config/navigation";
import { useToast } from "@/hooks/useToast";
import { isSafeRedirectPath } from "@/lib/auth-navigation";
import { getSupabaseClient, getSupabaseConfigError } from "@/lib/supabase-client";
import { getSupabaseKey, getSupabaseUrl } from "@/lib/supabase/config";
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
    callback: "Không thể hoàn tất xác thực Google. Vui lòng thử lại.",
    session: "Google đã xác thực nhưng ứng dụng chưa nhận được phiên đăng nhập. Vui lòng thử lại.",
    profile: "Google đã xác thực nhưng chưa thể tạo hoặc tải hồ sơ RehabAI.",
    inactive: "Tài khoản của bạn chưa ở trạng thái hoạt động.",
    server_config: "Máy chủ chưa được cấu hình đầy đủ để hoàn tất đăng nhập Google."
  };

  return messages[code] || "Không thể hoàn tất đăng nhập Google. Vui lòng thử lại.";
}

function GoogleLogo() {
  return (
    <svg aria-hidden="true" className="h-5 w-5" viewBox="0 0 24 24">
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

function RehabMark() {
  return (
    <span className="relative grid h-10 w-10 place-items-center rounded-2xl bg-emerald-50 text-emerald-600 shadow-sm ring-1 ring-emerald-100">
      <span className="absolute top-2 h-2.5 w-2.5 rounded-full bg-emerald-500" />
      <span className="absolute h-5 w-1.5 -rotate-12 rounded-full bg-emerald-600" />
      <span className="absolute left-2.5 top-5 h-1.5 w-4 rotate-12 rounded-full bg-emerald-500" />
      <span className="absolute right-2.5 top-4 h-1.5 w-4 -rotate-45 rounded-full bg-emerald-500" />
      <span className="absolute bottom-2 left-3 h-1.5 w-4 -rotate-45 rounded-full bg-emerald-600" />
      <span className="absolute bottom-2 right-3 h-1.5 w-4 rotate-45 rounded-full bg-emerald-600" />
    </span>
  );
}

function BenefitCard({
  icon: Icon,
  title,
  description
}: {
  icon: typeof Activity;
  title: string;
  description: string;
}) {
  return (
    <div className="flex gap-4 rounded-3xl border border-white/70 bg-white/80 p-4 shadow-lg shadow-emerald-950/5 backdrop-blur">
      <span className="grid h-14 w-14 flex-none place-items-center rounded-full bg-emerald-100 text-emerald-600">
        <Icon className="h-7 w-7" />
      </span>
      <div>
        <h3 className="text-base font-black text-slate-950">{title}</h3>
        <p className="mt-1 text-sm leading-6 text-slate-600">{description}</p>
      </div>
    </div>
  );
}

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { pushToast } = useToast();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [oauthLoading, setOauthLoading] = useState(false);
  const hasSupabasePublicConfig = Boolean(getSupabaseUrl() && getSupabaseKey());
  const emailVerified = searchParams.get("verified") === "1";
  const oauthErrorMessage = getOAuthErrorMessage(searchParams.get("oauth_error"));
  const unsupportedRole = searchParams.get("unsupported_role");

  async function continueWithGoogle() {
    if (!hasSupabasePublicConfig) {
      pushToast("Chưa thể đăng nhập bằng Google", getSupabaseConfigError());
      return;
    }

    const supabase = getSupabaseClient();
    if (!supabase) {
      pushToast("Chưa thể đăng nhập", getSupabaseConfigError());
      return;
    }

    setOauthLoading(true);
    const redirectTo = `${window.location.origin}/auth/callback`;
    console.info("[oauth] redirectTo", redirectTo);

    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo
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

    if (userProfile.account_type === "doctor") {
      setLoading(false);
      await supabase.auth.signOut();
      pushToast("Vai trò chưa được hỗ trợ", "Vui lòng dùng tài khoản Patient hoặc Admin trong luồng MVP hiện tại.");
      router.push("/login?unsupported_role=doctor");
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
    <div className="min-h-screen bg-white text-slate-950">
      <header className="flex h-20 items-center justify-between border-b border-slate-200 bg-white/95 px-5 backdrop-blur sm:px-8 lg:px-12">
        <Link href="/" className="flex items-center gap-3 text-2xl font-black text-emerald-600 outline-none focus-visible:ring-2 focus-visible:ring-emerald-500">
          <RehabMark />
          RehabAI
        </Link>
        <div className="flex items-center gap-5 text-sm font-bold text-slate-700">
          <button type="button" aria-label="Giao diện sáng" className="hidden rounded-full p-2 text-slate-600 transition hover:bg-emerald-50 hover:text-emerald-700 sm:inline-flex">
            <Sun className="h-5 w-5" />
          </button>
          <button type="button" className="hidden items-center gap-1 transition hover:text-emerald-700 sm:inline-flex">
            VN <ChevronDown className="h-4 w-4" />
          </button>
          <Link href="/#about" className="transition hover:text-emerald-700">
            Về chúng tôi
          </Link>
        </div>
      </header>

      <main className="relative grid min-h-[calc(100vh-128px)] overflow-hidden lg:grid-cols-[minmax(0,1.02fr)_minmax(480px,0.98fr)]">
        <section className="relative overflow-hidden bg-gradient-to-br from-emerald-50 via-white to-emerald-100/60 px-5 py-10 sm:px-8 lg:px-14 lg:py-16">
          <div className="absolute -left-28 -top-28 h-96 w-96 rounded-full border border-white/70 bg-white/30" />
          <div className="absolute left-[48%] top-0 hidden h-[120%] w-[34rem] -translate-x-1/2 rounded-[50%] border border-white/60 bg-white/30 lg:block" />
          <div className="absolute bottom-0 left-0 h-40 w-56 rounded-tr-[80%] bg-gradient-to-tr from-emerald-300/30 to-transparent" />
          <div className="absolute bottom-0 right-8 hidden h-32 w-40 rounded-t-full bg-emerald-400/20 blur-2xl lg:block" />

          <div className="relative mx-auto max-w-2xl lg:mx-0">
            <p className="text-base font-black text-emerald-600">Chào mừng bạn trở lại</p>
            <h1 className="mt-6 text-4xl font-black leading-tight tracking-tight text-slate-950 sm:text-5xl lg:text-6xl">
              Tiếp tục hành trình <span className="text-emerald-600">phục hồi</span> của bạn
            </h1>
            <p className="mt-6 max-w-xl text-base font-medium leading-8 text-slate-600">
              RehabAI đồng hành cùng bạn với các bài tập khoa học, theo dõi tiến trình và lộ trình cá nhân hóa.
            </p>

            <div className="mt-8 grid max-w-xl gap-3">
              <BenefitCard
                icon={Activity}
                title="Theo dõi tiến trình phục hồi"
                description="Ghi nhận và đánh giá sự tiến bộ của bạn theo thời gian."
              />
              <BenefitCard
                icon={UserRound}
                title="Truy cập bài tập phù hợp"
                description="Bài tập được thiết kế phù hợp với tình trạng và mục tiêu của bạn."
              />
              <BenefitCard
                icon={CalendarCheck2}
                title="Quản lý gói tập và đơn hàng"
                description="Dễ dàng theo dõi gói tập, thanh toán và lịch sử đơn hàng."
              />
            </div>

            <div className="relative mt-10 hidden h-40 max-w-xl items-end overflow-hidden rounded-[2rem] bg-gradient-to-r from-emerald-200/80 to-emerald-50 shadow-inner shadow-emerald-900/5 md:flex">
              <div className="absolute bottom-8 left-8 h-8 w-72 rounded-full bg-emerald-500/30 blur-sm" />
              <div className="absolute bottom-9 left-10 h-10 w-64 rounded-full border border-emerald-600/20 bg-emerald-300/60" />
              <div className="absolute bottom-10 left-28 h-12 w-12 rounded-2xl bg-emerald-500/70 shadow-lg shadow-emerald-900/10" />
              <div className="absolute bottom-10 left-44 h-12 w-12 rounded-2xl bg-emerald-500/70 shadow-lg shadow-emerald-900/10" />
              <div className="absolute bottom-10 right-24 h-24 w-10 rounded-full bg-white shadow-lg shadow-emerald-900/10">
                <div className="mx-auto mt-2 h-4 w-6 rounded-t-full bg-emerald-600" />
              </div>
            </div>
          </div>
        </section>

        <section className="flex items-center justify-center px-5 py-10 sm:px-8 lg:px-12">
          <div className="w-full max-w-xl">
            <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-2xl shadow-slate-950/5 sm:p-9">
              <div className="text-center">
                <h2 className="text-3xl font-black tracking-tight text-slate-950">Đăng nhập RehabAI</h2>
                <p className="mt-3 text-base font-medium text-slate-500">Tiếp tục với tài khoản của bạn</p>
              </div>

              {emailVerified ? (
                <div className="mt-6 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-800">
                  Xác thực email thành công. Bạn có thể đăng nhập.
                </div>
              ) : null}

              {oauthErrorMessage ? (
                <div className="mt-6 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-800">
                  {oauthErrorMessage}
                </div>
              ) : null}

              {unsupportedRole === "doctor" ? (
                <div className="mt-6 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-800">
                  Vai trò này hiện không có trong luồng MVP. Vui lòng dùng tài khoản Patient hoặc Admin.
                </div>
              ) : null}

              {!hasSupabasePublicConfig ? (
                <div className="mt-6 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-800">
                  Chưa cấu hình Supabase public env nên chưa thể đăng nhập bằng Google.
                </div>
              ) : null}

              <button
                className="mt-8 flex min-h-14 w-full items-center justify-center gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 text-base font-black text-slate-800 shadow-sm transition hover:border-slate-300 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-emerald-100 disabled:cursor-not-allowed disabled:opacity-60"
                data-oauth-google="login"
                disabled={!hasSupabasePublicConfig || oauthLoading || loading}
                onClick={continueWithGoogle}
                type="button"
              >
                <GoogleLogo />
                {oauthLoading ? "Đang chuyển đến Google..." : "Tiếp tục với Google"}
              </button>

              <div className="my-7 flex items-center gap-4 text-sm font-semibold text-slate-400">
                <span className="h-px flex-1 bg-slate-200" />
                hoặc đăng nhập bằng email
                <span className="h-px flex-1 bg-slate-200" />
              </div>

              <form onSubmit={submit} className="grid gap-5">
                <div className="grid gap-2">
                  <label htmlFor="email" className="text-sm font-bold text-slate-800">
                    Email
                  </label>
                  <div className="relative">
                    <Mail className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-500" />
                    <input
                      id="email"
                      className="min-h-14 w-full rounded-xl border border-slate-200 bg-white py-3 pl-12 pr-4 text-base font-medium text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100"
                      type="email"
                      value={email}
                      onChange={(event) => setEmail(event.target.value)}
                      placeholder="Nhập email của bạn"
                      autoComplete="email"
                    />
                  </div>
                </div>

                <div className="grid gap-2">
                  <label htmlFor="password" className="text-sm font-bold text-slate-800">
                    Mật khẩu
                  </label>
                  <div className="relative">
                    <Lock className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-500" />
                    <input
                      id="password"
                      className="min-h-14 w-full rounded-xl border border-slate-200 bg-white py-3 pl-12 pr-12 text-base font-medium text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100"
                      type={showPassword ? "text" : "password"}
                      placeholder="Nhập mật khẩu của bạn"
                      value={password}
                      onChange={(event) => setPassword(event.target.value)}
                      autoComplete="current-password"
                    />
                    <button
                      type="button"
                      aria-label={showPassword ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
                      className="absolute right-3 top-1/2 rounded-lg p-2 text-slate-500 transition -translate-y-1/2 hover:bg-slate-100 hover:text-slate-800"
                      onClick={() => setShowPassword((current) => !current)}
                    >
                      {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                    </button>
                  </div>
                  <Link href="/forgot-password" className="justify-self-end text-sm font-bold text-emerald-600 hover:text-emerald-700 hover:underline">
                    Quên mật khẩu?
                  </Link>
                </div>

                <Button className="min-h-14 rounded-xl text-base font-black shadow-lg shadow-emerald-600/20" disabled={loading || oauthLoading}>
                  {loading ? "Đang đăng nhập..." : "Đăng nhập"}
                </Button>
              </form>

              <div className="mt-7 flex items-center gap-4 text-sm font-semibold text-slate-500">
                <span className="h-px flex-1 bg-slate-200" />
                Chưa có tài khoản?
                <span className="h-px flex-1 bg-slate-200" />
              </div>
              <Link
                href="/patient/register"
                className="mt-5 inline-flex min-h-14 w-full items-center justify-center rounded-xl border border-emerald-200 bg-white px-4 py-3 text-base font-black text-emerald-600 transition hover:bg-emerald-50"
              >
                Đăng ký ngay
              </Link>
            </div>

            <p className="mt-7 flex items-center justify-center gap-3 text-center text-sm font-semibold text-slate-500">
              <ShieldCheck className="h-5 w-5 text-emerald-600" />
              Thông tin của bạn được bảo mật và mã hóa an toàn.
            </p>
          </div>
        </section>
      </main>

      <footer className="border-t border-slate-200 bg-white px-5 py-5 text-center text-sm font-medium text-slate-500">
        © 2026 RehabAI. Tất cả quyền được bảo lưu.
      </footer>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<section className="mx-auto max-w-md px-4 py-16 text-slate-600">Đang tải...</section>}>
      <LoginForm />
    </Suspense>
  );
}
