"use client";

import { FormEvent, useEffect, useState } from "react";

import { Button } from "@/components/Button";
import { Card } from "@/components/Card";
import { RequireAuth } from "@/components/auth/RequireAuth";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/useToast";
import { updateCurrentUserProfile } from "@/services/users.service";
import type { User } from "@/types";

export default function ProfilePage() {
  const { pushToast } = useToast();
  const { user: authUser, profile } = useAuth();
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    if (!authUser || !profile) return;
    setUser({
      ...profile,
      id: authUser.id,
      email: authUser.email || profile.email
    });
  }, [authUser, profile]);

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!user) return;
    const updated = await updateCurrentUserProfile({
      full_name: user.full_name,
      phone: user.phone,
      role: user.role,
      date_of_birth: user.date_of_birth,
      address: user.address,
      medical_condition: user.medical_condition
    });
    setUser({ ...user, ...updated });
    pushToast("Đã cập nhật hồ sơ", "Thông tin cá nhân đã được lưu.");
  }

  if (!user) {
    return <RequireAuth><section className="mx-auto max-w-3xl px-4 py-10 text-slate-500">Đang tải hồ sơ...</section></RequireAuth>;
  }

  return (
    <RequireAuth>
    <section className="mx-auto max-w-3xl px-4 py-10">
      <Card>
        <h1 className="text-3xl font-bold text-slate-950">Hồ sơ người dùng</h1>
        <form onSubmit={submit} className="mt-6 grid gap-4">
          
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-slate-700">Họ và tên</label>
            <input className="rounded-lg border border-slate-300 px-3 py-2" value={user.full_name} onChange={(event) => setUser({ ...user, full_name: event.target.value })} />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-slate-700">Email</label>
            <input className="rounded-lg border border-slate-300 px-3 py-2 bg-slate-50 text-slate-500" value={user.email} readOnly />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-slate-700">Số điện thoại</label>
            <input className="rounded-lg border border-slate-300 px-3 py-2" value={user.phone || ""} onChange={(event) => setUser({ ...user, phone: event.target.value })} placeholder="Nhập số điện thoại" />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-slate-700">Ngày sinh</label>
            <input className="rounded-lg border border-slate-300 px-3 py-2" type="date" value={user.date_of_birth || ""} onChange={(event) => setUser({ ...user, date_of_birth: event.target.value })} />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-slate-700">Địa chỉ</label>
            <textarea className="min-h-24 rounded-lg border border-slate-300 px-3 py-2" value={user.address || ""} onChange={(event) => setUser({ ...user, address: event.target.value })} placeholder="Nhập địa chỉ hiện tại" />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-slate-700">Tình trạng cần hỗ trợ</label>
            <textarea className="min-h-24 rounded-lg border border-slate-300 px-3 py-2" value={user.medical_condition || ""} onChange={(event) => setUser({ ...user, medical_condition: event.target.value })} placeholder="Mô tả tình trạng sức khỏe hoặc yêu cầu hỗ trợ" />
          </div>

          <Button>Lưu hồ sơ</Button>
        </form>
      </Card>
    </section>

    </RequireAuth>
  );
}
