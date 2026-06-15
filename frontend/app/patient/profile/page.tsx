"use client";

import Image from "next/image";
import { CalendarDays, CreditCard, ShieldCheck, Upload, X } from "lucide-react";
import Link from "next/link";
import { FormEvent, useCallback, useEffect, useState } from "react";

import { Button } from "@/components/Button";
import { Card } from "@/components/Card";
import { RequireAuth } from "@/components/auth/RequireAuth";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/useToast";
import { formatCurrency, getImageUrl } from "@/lib/utils";
import { normalizeVietnamMobilePhone, VIETNAM_PHONE_ERROR } from "@/lib/vietnam-phone";
import { cancelCurrentPatientSubscription, getCurrentUserSubscription } from "@/services/subscriptions.service";
import { updateCurrentUserProfile, uploadPatientAvatar } from "@/services/users.service";
import type { User, UserSubscription } from "@/types";

const statusLabels: Record<UserSubscription["status"], string> = {
  active: "Đang hoạt động",
  pending_payment: "Đang chờ thanh toán",
  cancelled: "Đã hủy",
  expired: "Hết hạn"
};

const benefitSummaries: Record<string, string> = {
  Basic: "Thư viện bài tập cơ bản và đặt lịch tư vấn online.",
  Standard: "Full video bài tập, lộ trình cá nhân hóa và theo dõi tiến trình.",
  Premium: "Quyền Standard, ưu tiên tư vấn và báo cáo nâng cao."
};

function formatDate(value?: string | null) {
  if (!value) return "Chưa có";
  return new Intl.DateTimeFormat("vi-VN", { dateStyle: "medium" }).format(new Date(value));
}

function getPlanCta(subscription: UserSubscription | null) {
  if (!subscription || subscription.status === "cancelled" || subscription.status === "expired") return "Chọn gói";
  if (subscription.status === "pending_payment") return "Hoàn tất thanh toán";
  if (subscription.subscription?.name === "Basic" || subscription.subscription?.name === "Standard") return "Nâng cấp gói";
  return "Đổi gói";
}

export default function ProfilePage() {
  const { pushToast } = useToast();
  const { user: authUser, profile } = useAuth();
  const [user, setUser] = useState<User | null>(null);
  const [subscription, setSubscription] = useState<UserSubscription | null>(null);
  const [isCancelModalOpen, setIsCancelModalOpen] = useState(false);
  const [isCancellingSubscription, setIsCancellingSubscription] = useState(false);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreviewUrl, setAvatarPreviewUrl] = useState<string | null>(null);

  const loadSubscription = useCallback(async () => {
    if (!authUser || profile?.account_type !== "patient") {
      setSubscription(null);
      return;
    }

    try {
      const currentSubscription = await getCurrentUserSubscription();
      setSubscription(currentSubscription);
    } catch {
      setSubscription(null);
    }
  }, [authUser, profile?.account_type]);

  useEffect(() => {
    if (!authUser || !profile) return;
    setUser({
      ...profile,
      id: authUser.id,
      email: authUser.email || profile.email
    });
  }, [authUser, profile]);

  useEffect(() => {
    void loadSubscription();
  }, [loadSubscription]);

  useEffect(() => {
    function refreshSubscription() {
      void loadSubscription();
    }

    window.addEventListener("rehabai:subscription-updated", refreshSubscription);
    return () => window.removeEventListener("rehabai:subscription-updated", refreshSubscription);
  }, [loadSubscription]);

  useEffect(() => {
    if (!avatarFile) {
      setAvatarPreviewUrl(null);
      return;
    }

    const objectUrl = URL.createObjectURL(avatarFile);
    setAvatarPreviewUrl(objectUrl);

    return () => URL.revokeObjectURL(objectUrl);
  }, [avatarFile]);

  function selectAvatar(file?: File | null) {
    if (!file) return;

    const allowedTypes = ["image/jpeg", "image/png", "image/webp"];
    if (!allowedTypes.includes(file.type)) {
      pushToast("Ảnh không hợp lệ", "Vui lòng chọn ảnh JPG, PNG hoặc WebP.");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      pushToast("Ảnh quá lớn", "Vui lòng chọn ảnh tối đa 5MB.");
      return;
    }

    setAvatarFile(file);
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!user) return;

    const hasPhone = Boolean(user.phone?.trim());
    const normalizedPhone = hasPhone ? normalizeVietnamMobilePhone(user.phone) : null;
    if (hasPhone && !normalizedPhone) {
      pushToast("Số điện thoại không hợp lệ", VIETNAM_PHONE_ERROR);
      return;
    }

    try {
      let avatarUrl = user.avatar_url;
      if (avatarFile) {
        avatarUrl = await uploadPatientAvatar(user.id, avatarFile);
      }

      const updated = await updateCurrentUserProfile({
        full_name: user.full_name,
        phone: normalizedPhone,
        role: user.role,
        date_of_birth: user.date_of_birth,
        address: user.address,
        medical_condition: user.medical_condition,
        avatar_url: avatarUrl
      });
      setUser({ ...user, ...updated });
      setAvatarFile(null);
      pushToast("Đã cập nhật hồ sơ", "Thông tin cá nhân đã được lưu.");
    } catch (error) {
      pushToast("Không thể cập nhật hồ sơ", error instanceof Error ? error.message : "Vui lòng thử lại sau.");
    }
  }

  async function cancelActiveSubscription() {
    setIsCancellingSubscription(true);
    try {
      await cancelCurrentPatientSubscription();
      const refreshed = await getCurrentUserSubscription();
      setSubscription(refreshed);
      setIsCancelModalOpen(false);
      pushToast("Đã hủy gói", "Gói hiện tại đã được hủy. Quyền lợi gói không còn được áp dụng.");
    } catch (error) {
      pushToast("Không thể hủy gói", error instanceof Error ? error.message : "Vui lòng thử lại sau.");
    } finally {
      setIsCancellingSubscription(false);
    }
  }

  if (!user) {
    return (
      <RequireAuth>
        <section className="mx-auto max-w-3xl px-4 py-10 text-slate-500">Đang tải hồ sơ...</section>
      </RequireAuth>
    );
  }

  const planName = subscription?.status === "active" || subscription?.status === "pending_payment" ? subscription.subscription?.name || "Chưa có gói" : "Chưa có gói";
  const statusLabel = subscription ? statusLabels[subscription.status] : "Chưa có gói";
  const isPending = subscription?.status === "pending_payment";
  const isActive = subscription?.status === "active";

  return (
    <RequireAuth>
      <section className="mx-auto max-w-7xl px-4 py-10">
        <div>
          <p className="text-sm font-bold uppercase text-emerald-700">Hồ sơ</p>
          <h1 className="mt-2 text-3xl font-bold text-slate-950">Thông tin cá nhân và gói đăng ký</h1>
        </div>

        <div className="mt-8 grid gap-6 lg:grid-cols-[minmax(0,1fr)_380px]">
          <Card>
            <h2 className="text-xl font-bold text-slate-950">Thông tin người dùng</h2>
            <form onSubmit={submit} className="mt-6 grid gap-4">
              <div className="flex flex-col gap-4 rounded-2xl border border-slate-200 bg-slate-50 p-4 sm:flex-row sm:items-center">
                <div className="relative h-24 w-24 shrink-0 overflow-hidden rounded-full border border-emerald-100 bg-white">
                  {avatarPreviewUrl || user.avatar_url ? (
                    <Image
                      src={avatarPreviewUrl || getImageUrl(user.avatar_url)}
                      alt={user.full_name}
                      fill
                      className="object-cover"
                    />
                  ) : (
                    <div className="grid h-full w-full place-items-center bg-emerald-100 text-2xl font-bold text-emerald-700">
                      {user.full_name.slice(0, 1).toUpperCase()}
                    </div>
                  )}
                </div>
                <div className="flex-1">
                  <p className="font-semibold text-slate-950">Ảnh đại diện</p>
                  <p className="mt-1 text-sm text-slate-600">Chọn ảnh JPG, PNG hoặc WebP tối đa 5MB. Ảnh sẽ được tải lên khi bạn bấm Lưu hồ sơ.</p>
                  <label className="mt-3 inline-flex cursor-pointer items-center gap-2 rounded-lg border border-emerald-200 bg-white px-4 py-2 text-sm font-semibold text-emerald-700 transition hover:bg-emerald-50">
                    <Upload className="h-4 w-4" />
                    Chọn ảnh
                    <input
                      className="sr-only"
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      onChange={(event) => selectAvatar(event.target.files?.[0])}
                    />
                  </label>
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="flex flex-col gap-1.5">
                  <label className="text-sm font-medium text-slate-700">Họ và tên</label>
                  <input
                    className="rounded-lg border border-slate-300 px-3 py-2"
                    value={user.full_name}
                    onChange={(event) => setUser({ ...user, full_name: event.target.value })}
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-sm font-medium text-slate-700">Email</label>
                  <input className="rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 text-slate-500" value={user.email} readOnly />
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="flex flex-col gap-1.5">
                  <label className="text-sm font-medium text-slate-700">Số điện thoại</label>
                  <input
                    className="rounded-lg border border-slate-300 px-3 py-2"
                    value={user.phone || ""}
                    onChange={(event) => setUser({ ...user, phone: event.target.value })}
                    placeholder="Ví dụ: 0914662777"
                    inputMode="tel"
                  />
                  <p className="text-xs text-slate-500">Chỉ nhận số di động Việt Nam; hệ thống lưu theo dạng +84.</p>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-sm font-medium text-slate-700">Ngày sinh</label>
                  <input
                    className="rounded-lg border border-slate-300 px-3 py-2"
                    type="date"
                    value={user.date_of_birth || ""}
                    onChange={(event) => setUser({ ...user, date_of_birth: event.target.value })}
                  />
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium text-slate-700">Địa chỉ</label>
                <textarea
                  className="min-h-24 rounded-lg border border-slate-300 px-3 py-2"
                  value={user.address || ""}
                  onChange={(event) => setUser({ ...user, address: event.target.value })}
                  placeholder="Nhập địa chỉ hiện tại"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium text-slate-700">Ghi chú hỗ trợ / sức khỏe</label>
                <textarea
                  className="min-h-24 rounded-lg border border-slate-300 px-3 py-2"
                  value={user.medical_condition || ""}
                  onChange={(event) => setUser({ ...user, medical_condition: event.target.value })}
                  placeholder="Mô tả tình trạng sức khỏe hoặc yêu cầu hỗ trợ"
                />
              </div>

              <div>
                <Button>Lưu hồ sơ</Button>
              </div>
            </form>
          </Card>

          <aside className="grid gap-5">
            <Card className={isPending ? "border-amber-200 bg-amber-50" : isActive ? "border-emerald-100 bg-emerald-50" : ""}>
              <div className="flex items-start gap-3">
                <div className="grid h-11 w-11 place-items-center rounded-lg bg-white text-emerald-700 shadow-sm">
                  <CreditCard className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-slate-950">Gói đăng ký hiện tại</h2>
                  <p className="mt-1 text-sm text-slate-600">Nguồn dữ liệu dùng cho quyền truy cập video bài tập.</p>
                </div>
              </div>

              <div className="mt-5 rounded-lg bg-white p-4">
                <p className="text-sm text-slate-500">Tên gói</p>
                <p className="mt-1 text-2xl font-bold text-slate-950">{planName}</p>
                {subscription?.amount ? <p className="mt-1 text-sm text-slate-600">{formatCurrency(Number(subscription.amount))}</p> : null}
              </div>

              <dl className="mt-4 grid gap-3 text-sm">
                <div className="flex items-center justify-between gap-3 rounded-lg bg-white px-4 py-3">
                  <dt className="text-slate-500">Trạng thái</dt>
                  <dd className="font-semibold text-slate-950">{statusLabel}</dd>
                </div>
                <div className="flex items-center justify-between gap-3 rounded-lg bg-white px-4 py-3">
                  <dt className="text-slate-500">Bắt đầu</dt>
                  <dd className="font-semibold text-slate-950">{formatDate(subscription?.started_at || subscription?.start_date)}</dd>
                </div>
                <div className="flex items-center justify-between gap-3 rounded-lg bg-white px-4 py-3">
                  <dt className="text-slate-500">Hết hạn</dt>
                  <dd className="font-semibold text-slate-950">{formatDate(subscription?.expires_at || subscription?.end_date)}</dd>
                </div>
              </dl>

              {subscription?.payment_reference ? (
                <p className="mt-4 rounded-lg bg-white px-4 py-3 text-xs text-slate-600">
                  Mã tham chiếu: <span className="font-semibold text-slate-900">{subscription.payment_reference}</span>
                </p>
              ) : null}

              <div className="mt-4 rounded-lg bg-white p-4 text-sm text-slate-700">
                <div className="flex items-center gap-2 font-semibold text-emerald-700">
                  <ShieldCheck className="h-4 w-4" />
                  Quyền lợi
                </div>
                <p className="mt-2">{benefitSummaries[planName] || "Chọn gói để mở khóa quyền lợi phục hồi phù hợp."}</p>
              </div>

              {isActive ? (
                <Button
                  className="mt-5 w-full bg-red-600 text-white hover:bg-red-700 disabled:opacity-100"
                  type="button"
                  onClick={() => setIsCancelModalOpen(true)}
                >
                  Hủy gói hiện tại
                </Button>
              ) : null}

              <Link href="/patient/pricing" className="mt-3 inline-flex w-full">
                <Button className="w-full" variant={isActive ? "secondary" : "primary"}>
                  {getPlanCta(subscription)}
                </Button>
              </Link>
            </Card>

            <Card>
              <div className="flex items-center gap-2 text-slate-700">
                <CalendarDays className="h-5 w-5 text-emerald-600" />
                <h2 className="font-bold">Lưu ý MVP</h2>
              </div>
              <p className="mt-3 text-sm text-slate-600">
                Thanh toán gói hiện là mô phỏng. Hệ thống chỉ kích hoạt quyền truy cập sau khi bạn xác nhận thanh toán giả lập.
              </p>
            </Card>
          </aside>
        </div>
      </section>

      {isCancelModalOpen ? (
        <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/50 px-4">
          <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-2xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-xl font-bold text-slate-950">Xác nhận hủy gói</h2>
                <p className="mt-3 text-sm text-slate-600">
                  Bạn có chắc muốn hủy gói hiện tại? Sau khi hủy, các quyền lợi của gói sẽ không còn được áp dụng.
                </p>
              </div>
              <button
                aria-label="Đóng"
                className="rounded-full p-1 text-slate-500 hover:bg-slate-100"
                onClick={() => setIsCancelModalOpen(false)}
                type="button"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="mt-6 flex flex-wrap justify-end gap-3">
              <Button variant="secondary" type="button" onClick={() => setIsCancelModalOpen(false)} disabled={isCancellingSubscription}>
                Không, giữ lại
              </Button>
              <Button
                className="bg-red-600 text-white hover:bg-red-700"
                type="button"
                onClick={cancelActiveSubscription}
                disabled={isCancellingSubscription}
              >
                {isCancellingSubscription ? "Đang hủy..." : "Xác nhận hủy"}
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </RequireAuth>
  );
}
