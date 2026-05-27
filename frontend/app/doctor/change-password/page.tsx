"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/Button";
import { Card } from "@/components/Card";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/useToast";
import { getSupabaseClient, getSupabaseConfigError } from "@/lib/supabase-client";
import { updateCurrentUserProfile } from "@/services/users.service";

export default function DoctorChangePasswordPage() {
  const router = useRouter();
  const { profile } = useAuth();
  const { pushToast } = useToast();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  async function submit(event: FormEvent) {
    event.preventDefault();
    setError("");
    setSuccess("");

    if (!profile?.email) {
      setError("Không tìm thấy email tài khoản.");
      return;
    }
    if (newPassword.length < 6) {
      setError("Mật khẩu mới cần tối thiểu 6 ký tự.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("Mật khẩu nhập lại không khớp.");
      return;
    }

    const supabase = getSupabaseClient();
    if (!supabase) {
      setError(getSupabaseConfigError());
      return;
    }

    setLoading(true);
    const { error: signInError } = await supabase.auth.signInWithPassword({ email: profile.email, password: currentPassword });
    if (signInError) {
      setLoading(false);
      setError("Mật khẩu hiện tại không đúng.");
      return;
    }

    const { error: updateError } = await supabase.auth.updateUser({ password: newPassword });
    if (updateError) {
      setLoading(false);
      setError(updateError.message);
      return;
    }

    await updateCurrentUserProfile({ must_change_password: false });
    
    // Refresh auth session to trigger onAuthStateChange across all useAuth hooks
    // so they load the latest profile with must_change_password = false
    await supabase.auth.refreshSession();

    setLoading(false);
    setSuccess("Đổi mật khẩu thành công.");
    pushToast("Đổi mật khẩu thành công", "Đang chuyển đến dashboard bác sĩ.");
    
    // Use window.location.href instead of router.push to force a full hard reload
    // This ensures DoctorLayout mounts freshly with the updated auth state
    window.location.href = "/doctor/dashboard";
  }

  return (
    <section className="mx-auto max-w-xl">
      <Card>
        <h1 className="text-2xl font-bold text-slate-950">Đổi mật khẩu</h1>
        <p className="mt-2 text-sm text-slate-600">Bác sĩ cần đổi mật khẩu trước khi sử dụng hệ thống.</p>
        <form onSubmit={submit} className="mt-6 grid gap-4">
          <PasswordInput label="Mật khẩu hiện tại" value={currentPassword} onChange={setCurrentPassword} />
          <PasswordInput label="Mật khẩu mới" value={newPassword} onChange={setNewPassword} />
          <PasswordInput label="Nhập lại mật khẩu mới" value={confirmPassword} onChange={setConfirmPassword} />
          {error ? <p className="rounded-lg bg-rose-50 p-3 text-sm font-semibold text-rose-700">{error}</p> : null}
          {success ? <p className="rounded-lg bg-emerald-50 p-3 text-sm font-semibold text-emerald-700">{success}</p> : null}
          <Button disabled={loading}>{loading ? "Đang đổi mật khẩu..." : "Đổi mật khẩu"}</Button>
        </form>
      </Card>
    </section>
  );
}

function PasswordInput({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return (
    <label className="grid gap-1.5">
      <span className="text-sm font-semibold text-slate-700">{label}</span>
      <input
        className="rounded-lg border border-slate-300 px-3 py-2 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-100"
        type="password"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        required
      />
    </label>
  );
}
