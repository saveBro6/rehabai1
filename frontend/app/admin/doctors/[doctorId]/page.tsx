"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { Check, X } from "lucide-react";

import { Button } from "@/components/Button";
import { Card } from "@/components/Card";
import { RequireAdmin } from "@/components/auth/RequireAdmin";
import { StatusBadge, formatCurrency } from "@/components/doctor/DoctorComponents";
import {
  DOCTOR_PUBLIC_PROFILE_STATUS_LABELS,
  DOCTOR_PUBLIC_PROFILE_STATUS_TONES,
  approveDoctorPublicProfile,
  formatDoctorReviewDate,
  getAdminDoctorById,
  rejectDoctorPublicProfile,
  type AdminDoctor
} from "@/services/admin-doctors.service";

function getAccountStatusLabel(status?: string) {
  if (status === "active") return "Đang hoạt động";
  if (status === "inactive") return "Tạm ngưng";
  if (status === "locked") return "Đã khóa";
  return "Không rõ";
}

export default function AdminDoctorDetailPage({ params }: { params: { doctorId: string } }) {
  const [doctor, setDoctor] = useState<AdminDoctor | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [rejectionReason, setRejectionReason] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const loadDoctor = useCallback(async () => {
    setLoading(true);
    setErrorMessage(null);
    try {
      setDoctor(await getAdminDoctorById(params.doctorId));
    } catch {
      setErrorMessage("Không thể tải chi tiết bác sĩ. Vui lòng kiểm tra quyền admin hoặc RLS.");
    } finally {
      setLoading(false);
    }
  }, [params.doctorId]);

  useEffect(() => {
    void loadDoctor();
  }, [loadDoctor]);

  async function approve() {
    if (!doctor) return;
    setSaving(true);
    setErrorMessage(null);
    try {
      await approveDoctorPublicProfile(doctor.id);
      await loadDoctor();
    } catch {
      setErrorMessage("Không thể phê duyệt hồ sơ. Chỉ hồ sơ đang chờ duyệt mới có thể được phê duyệt.");
    } finally {
      setSaving(false);
    }
  }

  async function reject() {
    if (!doctor) return;
    if (!rejectionReason.trim()) {
      setErrorMessage("Vui lòng nhập lý do từ chối.");
      return;
    }

    setSaving(true);
    setErrorMessage(null);
    try {
      await rejectDoctorPublicProfile(doctor.id, rejectionReason);
      setRejectionReason("");
      await loadDoctor();
    } catch {
      setErrorMessage("Không thể từ chối hồ sơ. Chỉ hồ sơ đang chờ duyệt mới có thể được từ chối.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <RequireAdmin>
      <section className="mx-auto max-w-5xl px-4 py-10">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-sm font-bold uppercase text-emerald-700">Admin</p>
            <h1 className="text-3xl font-bold text-slate-950">Duyệt hồ sơ công khai</h1>
          </div>
          <Link href="/admin/doctors">
            <Button variant="secondary">Về quản lý bác sĩ</Button>
          </Link>
        </div>

        {loading ? <p className="mt-8 text-slate-500">Đang tải hồ sơ bác sĩ...</p> : null}
        {errorMessage ? (
          <Card className="mt-8 border-rose-100 bg-rose-50">
            <p className="text-sm font-semibold text-rose-700">{errorMessage}</p>
          </Card>
        ) : null}

        {!loading && !doctor ? (
          <Card className="mt-8">
            <h2 className="text-xl font-bold text-slate-950">Không tìm thấy bác sĩ</h2>
            <p className="mt-2 text-sm text-slate-600">Hồ sơ không tồn tại hoặc bạn không có quyền truy cập.</p>
          </Card>
        ) : null}

        {doctor ? (
          <div className="mt-8 grid gap-6">
            <Card>
              <div className="grid gap-6 lg:grid-cols-[1fr_280px]">
                <div>
                  <p className="text-sm font-bold uppercase text-emerald-700">Thông tin bác sĩ</p>
                  <h2 className="mt-2 text-2xl font-bold text-slate-950">{doctor.full_name}</h2>
                  <p className="mt-1 font-semibold text-emerald-700">{doctor.specialty}</p>
                  <p className="mt-4 text-sm text-slate-700">{doctor.bio || "Chưa có bio."}</p>
                </div>
                <div className="grid gap-3 rounded-lg bg-slate-50 p-4 text-sm text-slate-700">
                  <p><span className="font-semibold">Email:</span> {doctor.account?.email || "Không rõ"}</p>
                  <p><span className="font-semibold">Trạng thái tài khoản:</span> {getAccountStatusLabel(doctor.account?.account_status)}</p>
                  <p><span className="font-semibold">Kinh nghiệm:</span> {doctor.experience_years} năm</p>
                  <p><span className="font-semibold">Phí tư vấn:</span> {formatCurrency(doctor.consultation_fee)}</p>
                  <p><span className="font-semibold">Tư vấn online:</span> {doctor.available_online ? "Có" : "Không"}</p>
                </div>
              </div>
            </Card>

            <Card>
              <div className="flex flex-col justify-between gap-4 md:flex-row md:items-start">
                <div>
                  <p className="text-sm font-bold uppercase text-emerald-700">Trạng thái xét duyệt</p>
                  <div className="mt-3">
                    <StatusBadge tone={DOCTOR_PUBLIC_PROFILE_STATUS_TONES[doctor.public_profile_status]}>
                      {DOCTOR_PUBLIC_PROFILE_STATUS_LABELS[doctor.public_profile_status]}
                    </StatusBadge>
                  </div>
                  <div className="mt-4 grid gap-1 text-sm text-slate-600">
                    <p>Ngày gửi duyệt: {formatDoctorReviewDate(doctor.public_profile_submitted_at)}</p>
                    <p>Ngày duyệt/từ chối: {formatDoctorReviewDate(doctor.public_profile_reviewed_at)}</p>
                    <p>Người duyệt: {doctor.public_profile_reviewed_by || "Chưa có"}</p>
                  </div>
                  {doctor.public_profile_rejection_reason ? (
                    <p className="mt-4 rounded-lg bg-rose-50 px-3 py-2 text-sm font-semibold text-rose-700">
                      Lý do từ chối: {doctor.public_profile_rejection_reason}
                    </p>
                  ) : null}
                </div>
                {doctor.public_profile_status === "submitted" ? (
                  <div className="flex flex-wrap gap-2">
                    <Button type="button" onClick={() => void approve()} disabled={saving}>
                      <Check className="mr-2 h-4 w-4" />
                      Phê duyệt
                    </Button>
                  </div>
                ) : null}
              </div>

              {doctor.public_profile_status === "submitted" ? (
                <div className="mt-6 grid gap-3">
                  <label className="grid gap-1.5 text-sm font-semibold text-slate-700">
                    Lý do từ chối
                    <textarea
                      className="min-h-24 rounded-lg border border-slate-300 px-3 py-2 font-normal text-slate-900 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-100"
                      value={rejectionReason}
                      onChange={(event) => setRejectionReason(event.target.value)}
                      placeholder="Nhập lý do để bác sĩ chỉnh sửa và gửi lại."
                    />
                  </label>
                  <Button
                    type="button"
                    variant="ghost"
                    className="w-fit text-rose-700 hover:bg-rose-50"
                    onClick={() => void reject()}
                    disabled={saving}
                  >
                    <X className="mr-2 h-4 w-4" />
                    Từ chối
                  </Button>
                </div>
              ) : null}
            </Card>
          </div>
        ) : null}
      </section>
    </RequireAdmin>
  );
}
