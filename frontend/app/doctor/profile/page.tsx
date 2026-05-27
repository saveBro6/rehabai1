"use client";

import { useState } from "react";

import { DoctorProfileForm, ErrorState } from "@/components/doctor/DoctorComponents";
import { useDoctor } from "@/components/doctor/DoctorLayout";
import { useToast } from "@/hooks/useToast";
import { updateDoctor, uploadDoctorAvatar } from "@/services/doctors.service";
import type { Doctor } from "@/types";

export default function DoctorProfilePage() {
  const { doctor, reloadDoctor } = useDoctor();
  const { pushToast } = useToast();
  const [loading, setLoading] = useState(false);
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
      const message = uploadError instanceof Error ? uploadError.message : "Không thể upload ảnh đại diện.";
      pushToast("Upload ảnh thất bại", message);
      throw uploadError;
    }
  }

  return (
    <section className="mx-auto grid max-w-3xl gap-6 pb-20 lg:pb-6">
      <div>
        <p className="text-sm font-bold uppercase text-emerald-700">Hồ sơ bác sĩ</p>
        <h1 className="text-3xl font-bold text-slate-950">Chỉnh sửa hồ sơ</h1>
      </div>
      {error ? <ErrorState message={error} /> : null}
      <DoctorProfileForm doctor={doctor} loading={loading} onAvatarUpload={uploadAvatar} onSubmit={submit} />
    </section>
  );
}
