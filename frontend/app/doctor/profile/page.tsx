"use client";

import { useState } from "react";

import { DoctorProfileForm, ErrorState } from "@/components/doctor/DoctorComponents";
import { useDoctor } from "@/components/doctor/DoctorLayout";
import { useToast } from "@/hooks/useToast";
import { submitDoctorPublicProfile, updateDoctor, uploadDoctorAvatar } from "@/services/doctors.service";
import type { Doctor } from "@/types";

export default function DoctorProfilePage() {
  const { doctor, reloadDoctor } = useDoctor();
  const { pushToast } = useToast();
  const [loading, setLoading] = useState(false);
  const [submittingReview, setSubmittingReview] = useState(false);
  const [error, setError] = useState("");

  async function submit(payload: Partial<Doctor>, avatarFile?: File | null) {
    setLoading(true);
    setError("");
    let uploadedAvatarPath: string | null = null;

    try {
      const nextPayload = { ...payload };

      if (avatarFile) {
        uploadedAvatarPath = await uploadDoctorAvatar(doctor.id, avatarFile);
        nextPayload.avatar_url = uploadedAvatarPath;
      }

      await updateDoctor(doctor.id, nextPayload);
      await reloadDoctor();
      pushToast("Đã lưu hồ sơ bác sĩ", "Thông tin hồ sơ đã được cập nhật.");
    } catch (saveError) {
      const baseMessage = saveError instanceof Error ? saveError.message : "Không thể lưu hồ sơ bác sĩ.";
      const message = uploadedAvatarPath
        ? `Ảnh đã upload thành công nhưng không thể lưu hồ sơ: ${baseMessage}`
        : avatarFile
          ? `Không thể upload ảnh đại diện: ${baseMessage}`
          : baseMessage;

      setError(message);
      pushToast("Lưu hồ sơ thất bại", message);
    } finally {
      setLoading(false);
    }
  }

  async function submitForReview() {
    setSubmittingReview(true);
    setError("");

    try {
      await submitDoctorPublicProfile(doctor.id);
      await reloadDoctor();
      pushToast("Đã gửi hồ sơ để duyệt", "Admin sẽ xem xét hồ sơ công khai của bạn.");
    } catch (submitError) {
      const message = submitError instanceof Error ? submitError.message : "Không thể gửi hồ sơ để duyệt.";
      setError(message);
      pushToast("Gửi duyệt thất bại", message);
    } finally {
      setSubmittingReview(false);
    }
  }

  return (
    <section className="mx-auto grid max-w-3xl gap-6 pb-20 lg:pb-6">
      <div>
        <p className="text-sm font-bold uppercase text-emerald-700">Hồ sơ bác sĩ</p>
        <h1 className="text-3xl font-bold text-slate-950">Chỉnh sửa hồ sơ</h1>
      </div>
      {error ? <ErrorState message={error} /> : null}
      <DoctorProfileForm doctor={doctor} loading={loading} reviewSubmitting={submittingReview} onSubmit={submit} onSubmitForReview={submitForReview} />
    </section>
  );
}
