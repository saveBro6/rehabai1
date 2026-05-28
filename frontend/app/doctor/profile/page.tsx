"use client";

import { useState } from "react";

import { Button } from "@/components/Button";
import { Card } from "@/components/Card";
import { DoctorProfileForm, ErrorState, StatusBadge, formatDateTime } from "@/components/doctor/DoctorComponents";
import { useDoctor } from "@/components/doctor/DoctorLayout";
import { useToast } from "@/hooks/useToast";
import { submitDoctorPublicProfile, updateDoctor, uploadDoctorAvatar } from "@/services/doctors.service";
import type { Doctor, DoctorPublicProfileStatus } from "@/types";

const reviewStatusLabels: Record<DoctorPublicProfileStatus, string> = {
  draft: "Bản nháp",
  submitted: "Đang chờ duyệt",
  approved: "Đã được duyệt",
  rejected: "Bị từ chối"
};

const reviewStatusTones: Record<DoctorPublicProfileStatus, "neutral" | "success" | "warning" | "danger"> = {
  draft: "neutral",
  submitted: "warning",
  approved: "success",
  rejected: "danger"
};

export default function DoctorProfilePage() {
  const { doctor, reloadDoctor } = useDoctor();
  const { pushToast } = useToast();
  const [loading, setLoading] = useState(false);
  const [submittingReview, setSubmittingReview] = useState(false);
  const [error, setError] = useState("");

  async function submit(payload: Partial<Doctor>) {
    setLoading(true);
    setError("");
    try {
      await updateDoctor(doctor.id, payload);
      await reloadDoctor();
      pushToast("Đã lưu hồ sơ bác sĩ", "Thông tin hồ sơ đã được cập nhật.");
    } catch (saveError) {
      const message = saveError instanceof Error ? saveError.message : "Không thể lưu hồ sơ bác sĩ.";
      setError(message);
      pushToast("Lưu hồ sơ thất bại", message);
    } finally {
      setLoading(false);
    }
  }

  async function uploadAvatar(file: File) {
    try {
      const avatarUrl = await uploadDoctorAvatar(doctor.id, file);
      pushToast("Đã upload ảnh đại diện", "Nhấn lưu thay đổi để cập nhật hồ sơ.");
      return avatarUrl;
    } catch (uploadError) {
      const message = "Không thể tải ảnh đại diện lên. Vui lòng kiểm tra cấu hình lưu trữ.";
      pushToast("Upload ảnh thất bại", message);
      throw uploadError;
    }
  }

  async function submitForReview() {
    setSubmittingReview(true);
    setError("");
    try {
      await submitDoctorPublicProfile(doctor.id);
      await reloadDoctor();
      pushToast("Đã gửi hồ sơ để duyệt", "Admin sẽ kiểm tra hồ sơ công khai của bạn.");
    } catch (reviewError) {
      const message = reviewError instanceof Error ? reviewError.message : "Không thể gửi hồ sơ để duyệt.";
      setError(message);
      pushToast("Gửi hồ sơ thất bại", message);
    } finally {
      setSubmittingReview(false);
    }
  }

  const reviewStatus = doctor.public_profile_status || "draft";
  const canSubmitForReview = reviewStatus === "draft" || reviewStatus === "rejected";

  return (
    <section className="mx-auto grid max-w-3xl gap-6 pb-20 lg:pb-6">
      <div>
        <p className="text-sm font-bold uppercase text-emerald-700">Hồ sơ bác sĩ</p>
        <h1 className="text-3xl font-bold text-slate-950">Chỉnh sửa hồ sơ</h1>
      </div>
      {error ? <ErrorState message={error} /> : null}
      <Card>
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
          <div>
            <p className="text-sm font-bold uppercase text-emerald-700">Duyệt hồ sơ công khai</p>
            <h2 className="mt-1 text-xl font-bold text-slate-950">Trạng thái hồ sơ</h2>
            <div className="mt-3">
              <StatusBadge tone={reviewStatusTones[reviewStatus]}>
                {reviewStatusLabels[reviewStatus]}
              </StatusBadge>
            </div>
            <div className="mt-4 grid gap-1 text-sm text-slate-600">
              <p>Ngày gửi duyệt: {formatDateTime(doctor.public_profile_submitted_at)}</p>
              <p>Ngày duyệt/từ chối: {formatDateTime(doctor.public_profile_reviewed_at)}</p>
            </div>
            {reviewStatus === "rejected" && doctor.public_profile_rejection_reason ? (
              <p className="mt-4 rounded-lg bg-rose-50 px-3 py-2 text-sm font-semibold text-rose-700">
                Lý do từ chối: {doctor.public_profile_rejection_reason}
              </p>
            ) : null}
          </div>
          {canSubmitForReview ? (
            <Button type="button" onClick={() => void submitForReview()} disabled={submittingReview}>
              {submittingReview ? "Đang gửi..." : "Gửi hồ sơ để duyệt"}
            </Button>
          ) : null}
        </div>
      </Card>
      <DoctorProfileForm doctor={doctor} loading={loading} onAvatarUpload={uploadAvatar} onSubmit={submit} />
    </section>
  );
}
