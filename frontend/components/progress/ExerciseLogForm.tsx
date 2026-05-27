"use client";

import { FormEvent, useEffect, useState } from "react";

import { Button } from "@/components/Button";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/useToast";
import { getExercises } from "@/services/exercises.service";
import { createExerciseLog } from "@/services/progress.service";
import type { Exercise } from "@/types";

export function ExerciseLogForm({ onSaved }: { onSaved?: () => void }) {
  const { pushToast } = useToast();
  const { user } = useAuth();
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [form, setForm] = useState({ exercise_id: "", pain_level: 2, fatigue_level: 3, mobility_score: 70, notes: "" });

  useEffect(() => {
    void getExercises().then((data) => {
      setExercises(data);
      setForm((current) => ({ ...current, exercise_id: data[0]?.id || "" }));
    });
  }, []);

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!user) return;
    await createExerciseLog({
      user_id: user.id,
      recovery_plan_id: null,
      exercise_id: form.exercise_id || null,
      pain_level: form.pain_level,
      fatigue_level: form.fatigue_level,
      mobility_score: form.mobility_score,
      notes: form.notes
    });
    pushToast("Da ghi nhan tien trinh", "Thong tin sau buoi tap da duoc luu.");
    onSaved?.();
  }

  return (
    <form onSubmit={submit} className="grid gap-4">
      <select className="rounded-lg border border-slate-300 px-3 py-2" value={form.exercise_id} onChange={(event) => setForm({ ...form, exercise_id: event.target.value })}>
        {exercises.map((exercise) => <option key={exercise.id} value={exercise.id}>{exercise.title}</option>)}
      </select>
      <div className="grid gap-3 sm:grid-cols-3">
        <label className="grid gap-1 text-sm font-medium text-slate-700">Dau: {form.pain_level}
          <input type="range" min={0} max={10} value={form.pain_level} onChange={(event) => setForm({ ...form, pain_level: Number(event.target.value) })} />
        </label>
        <label className="grid gap-1 text-sm font-medium text-slate-700">Met: {form.fatigue_level}
          <input type="range" min={0} max={10} value={form.fatigue_level} onChange={(event) => setForm({ ...form, fatigue_level: Number(event.target.value) })} />
        </label>
        <label className="grid gap-1 text-sm font-medium text-slate-700">Mobility: {form.mobility_score}
          <input type="range" min={0} max={100} value={form.mobility_score} onChange={(event) => setForm({ ...form, mobility_score: Number(event.target.value) })} />
        </label>
      </div>
      <textarea className="min-h-24 rounded-lg border border-slate-300 px-3 py-2" placeholder="Cam nhan sau buoi tap" value={form.notes} onChange={(event) => setForm({ ...form, notes: event.target.value })} />
      <Button>Ghi nhan sau buoi tap</Button>
    </form>
  );
}
