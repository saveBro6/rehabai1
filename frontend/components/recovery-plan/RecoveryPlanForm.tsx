"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/Button";
import { useAuth } from "@/hooks/useAuth";
import { bodyRegions } from "@/lib/constants";
import { useToast } from "@/hooks/useToast";
import { createRecoveryPlan, generateRecoveryPlanExercises } from "@/services/recovery-plans.service";
import type { ExerciseDifficulty } from "@/types";

export function RecoveryPlanForm() {
  const router = useRouter();
  const { pushToast } = useToast();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    condition_type: "stroke",
    recovery_goal: "improve_mobility",
    affected_body_region: "arm",
    current_mobility_level: "moderate",
    preferred_difficulty: "beginner" as ExerciseDifficulty,
    sessions_per_week: 3,
    notes: ""
  });

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!user) return;
    setLoading(true);
    const plan = await createRecoveryPlan({
      user_id: user.id,
      ...form,
      status: "active"
    });
    await generateRecoveryPlanExercises(plan.id);
    setLoading(false);
    pushToast("Da tao lo trinh", "He thong da sinh lich tap theo rule-based logic.");
    router.push(`/recovery-plan/${plan.id}`);
  }

  return (
    <form onSubmit={submit} className="grid gap-4">
      <div className="grid gap-4 md:grid-cols-2">
        <label className="grid gap-1 text-sm font-medium text-slate-700">Tinh trang
          <select className="rounded-lg border border-slate-300 px-3 py-2" value={form.condition_type} onChange={(event) => setForm({ ...form, condition_type: event.target.value })}>
            <option value="stroke">Sau dot quy</option>
            <option value="injury">Chan thuong</option>
            <option value="post_surgery">Sau phau thuat</option>
            <option value="elderly_mobility">Van dong nguoi cao tuoi</option>
            <option value="general_rehabilitation">Phuc hoi tong quat</option>
          </select>
        </label>
        <label className="grid gap-1 text-sm font-medium text-slate-700">Muc tieu
          <select className="rounded-lg border border-slate-300 px-3 py-2" value={form.recovery_goal} onChange={(event) => setForm({ ...form, recovery_goal: event.target.value })}>
            <option value="improve_mobility">Cai thien van dong</option>
            <option value="improve_strength">Tang suc manh</option>
            <option value="improve_balance">Cai thien thang bang</option>
            <option value="improve_coordination">Cai thien phoi hop</option>
            <option value="reduce_stiffness">Giam co cung</option>
            <option value="daily_activity_independence">Doc lap sinh hoat</option>
          </select>
        </label>
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        <label className="grid gap-1 text-sm font-medium text-slate-700">Vung tap trung
          <select className="rounded-lg border border-slate-300 px-3 py-2" value={form.affected_body_region} onChange={(event) => setForm({ ...form, affected_body_region: event.target.value })}>
            {bodyRegions.map((region) => <option key={region} value={region}>{region}</option>)}
          </select>
        </label>
        <label className="grid gap-1 text-sm font-medium text-slate-700">Muc van dong
          <select className="rounded-lg border border-slate-300 px-3 py-2" value={form.current_mobility_level} onChange={(event) => setForm({ ...form, current_mobility_level: event.target.value })}>
            <option value="low">Thap</option>
            <option value="moderate">Trung binh</option>
            <option value="good">Tot</option>
          </select>
        </label>
        <label className="grid gap-1 text-sm font-medium text-slate-700">Do kho
          <select className="rounded-lg border border-slate-300 px-3 py-2" value={form.preferred_difficulty} onChange={(event) => setForm({ ...form, preferred_difficulty: event.target.value as ExerciseDifficulty })}>
            <option value="beginner">Beginner</option>
            <option value="intermediate">Intermediate</option>
            <option value="advanced">Advanced</option>
          </select>
        </label>
      </div>
      <label className="grid gap-1 text-sm font-medium text-slate-700">So buoi moi tuan
        <input className="rounded-lg border border-slate-300 px-3 py-2" type="number" min={1} max={7} value={form.sessions_per_week} onChange={(event) => setForm({ ...form, sessions_per_week: Number(event.target.value) })} />
      </label>
      <textarea className="min-h-28 rounded-lg border border-slate-300 px-3 py-2" placeholder="Ghi chu them" value={form.notes} onChange={(event) => setForm({ ...form, notes: event.target.value })} />
      <Button disabled={loading}>{loading ? "Dang tao..." : "Tao lo trinh ca nhan hoa"}</Button>
    </form>
  );
}
