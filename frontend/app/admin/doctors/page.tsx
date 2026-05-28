"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Check, Eye, X } from "lucide-react";

import { Button } from "@/components/Button";
import { Card } from "@/components/Card";
import { RequireAdmin } from "@/components/auth/RequireAdmin";
import { StatusBadge } from "@/components/doctor/DoctorComponents";
import {
  DOCTOR_PUBLIC_PROFILE_STATUS_LABELS,
  DOCTOR_PUBLIC_PROFILE_STATUS_TONES,
  approveDoctorPublicProfile,
  formatDoctorReviewDate,
  getAdminDoctors,
  rejectDoctorPublicProfile,
  type AdminDoctor
} from "@/services/admin-doctors.service";

function getAccountStatusLabel(status?: string) {
  if (status === "active") return "Đang hoạt động";
  if (status === "inactive") return "Tạm ngưng";
  if (status === "locked") return "Đã khóa";
  return "Không rõ";
}

export default function AdminDoctorsPage() {
  const [doctors, setDoctors] = useState<AdminDoctor[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionDoctorId, setActionDoctorId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  async function loadDoctors() {
    setLoading(true);
    setErrorMessage(null);
    try {
      setDoctors(await getAdminDoctors());
    } catch {
      setErrorMessage("Không thể tải danh sách bác sĩ. Vui lòng kiểm tra quyền admin hoặc RLS.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadDoctors();
  }, []);

  async function approveDoctor(doctor: AdminDoctor) {
    setActionDoctorId(doctor.id);
    try {
      await approveDoctorPublicProfile(doctor.id);
      await loadDoctors();
    } catch {
      setErrorMessage("Không thể phê duyệt hồ sơ. Chỉ hồ sơ đang chờ duyệt mới có thể được phê duyệt.");
    } finally {
      setActionDoctorId(null);
    }
  }

  async function rejectDoctor(doctor: AdminDoctor) {
    const reason = window.prompt(`Lý do từ chối hồ sơ "${doctor.full_name}"`);
    if (!reason?.trim()) {
      setErrorMessage("Vui lòng nhập lý do từ chối.");
      return;
    }

    setActionDoctorId(doctor.id);
    try {
      await rejectDoctorPublicProfile(doctor.id, reason);
      await loadDoctors();
    } catch {
      setErrorMessage("Không thể từ chối hồ sơ. Chỉ hồ sơ đang chờ duyệt mới có thể được từ chối.");
    } finally {
      setActionDoctorId(null);
    }
  }

  return (
    <RequireAdmin>
      <section className="mx-auto max-w-7xl px-4 py-10">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-sm font-bold uppercase text-emerald-700">Admin</p>
            <h1 className="text-3xl font-bold text-slate-950">Quản lý bác sĩ</h1>
            <p className="mt-2 max-w-3xl text-sm text-slate-600">
              Duyệt hồ sơ công khai. Tài khoản bác sĩ hoạt động không tự động hiển thị công khai.
            </p>
          </div>
          <Link href="/admin">
            <Button variant="secondary">Về admin</Button>
          </Link>
        </div>

        {errorMessage ? (
          <Card className="mt-8 border-rose-100 bg-rose-50">
            <p className="text-sm font-semibold text-rose-700">{errorMessage}</p>
          </Card>
        ) : null}

        {loading ? <p className="mt-8 text-slate-500">Đang tải danh sách bác sĩ...</p> : null}

        {!loading ? (
          <Card className="mt-8 p-0">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[980px] text-left text-sm">
                <thead className="border-b border-slate-200 bg-slate-50 text-slate-500">
                  <tr>
                    <th className="px-5 py-3 font-semibold">Bác sĩ</th>
                    <th className="px-5 py-3 font-semibold">Chuyên khoa</th>
                    <th className="px-5 py-3 font-semibold">Trạng thái tài khoản</th>
                    <th className="px-5 py-3 font-semibold">Hồ sơ công khai</th>
                    <th className="px-5 py-3 font-semibold">Ngày gửi duyệt</th>
                    <th className="px-5 py-3 text-right font-semibold">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {doctors.map((doctor) => {
                    const isSubmitted = doctor.public_profile_status === "submitted";
                    const isBusy = actionDoctorId === doctor.id;

                    return (
                      <tr key={doctor.id} className="align-middle">
                        <td className="px-5 py-4">
                          <p className="font-bold text-slate-950">{doctor.full_name}</p>
                          <p className="mt-1 text-xs text-slate-500">{doctor.account?.email || "Không rõ"}</p>
                        </td>
                        <td className="px-5 py-4 text-slate-700">{doctor.specialty || "Chưa có"}</td>
                        <td className="px-5 py-4 text-slate-700">{getAccountStatusLabel(doctor.account?.account_status)}</td>
                        <td className="px-5 py-4">
                          <StatusBadge tone={DOCTOR_PUBLIC_PROFILE_STATUS_TONES[doctor.public_profile_status]}>
                            {DOCTOR_PUBLIC_PROFILE_STATUS_LABELS[doctor.public_profile_status]}
                          </StatusBadge>
                        </td>
                        <td className="px-5 py-4 text-slate-600">{formatDoctorReviewDate(doctor.public_profile_submitted_at)}</td>
                        <td className="px-5 py-4">
                          <div className="flex justify-end gap-2">
                            <Link href={`/admin/doctors/${doctor.id}`}>
                              <Button variant="secondary">
                                <Eye className="mr-2 h-4 w-4" />
                                Chi tiết
                              </Button>
                            </Link>
                            {isSubmitted ? (
                              <>
                                <Button type="button" onClick={() => void approveDoctor(doctor)} disabled={isBusy}>
                                  <Check className="mr-2 h-4 w-4" />
                                  Phê duyệt
                                </Button>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  className="text-rose-700 hover:bg-rose-50"
                                  onClick={() => void rejectDoctor(doctor)}
                                  disabled={isBusy}
                                >
                                  <X className="mr-2 h-4 w-4" />
                                  Từ chối
                                </Button>
                              </>
                            ) : null}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {!doctors.length ? (
              <div className="p-8 text-center">
                <h2 className="text-xl font-bold text-slate-950">Chưa có bác sĩ</h2>
                <p className="mt-2 text-sm text-slate-600">Tài khoản bác sĩ cần được tạo bởi Admin trước khi duyệt hồ sơ công khai.</p>
              </div>
            ) : null}
          </Card>
        ) : null}
      </section>
    </RequireAdmin>
  );
}
