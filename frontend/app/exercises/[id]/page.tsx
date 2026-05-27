"use client";

import { useEffect, useState } from "react";

import { RequireSubscription } from "@/components/auth/RequireSubscription";
import { ExerciseDetail } from "@/components/exercises/ExerciseDetail";
import { getExerciseById } from "@/services/exercises.service";
import type { Exercise } from "@/types";

function ExerciseDetailContent({ id }: { id: string }) {
  const [exercise, setExercise] = useState<Exercise | null>(null);

  useEffect(() => {
    void getExerciseById(id).then(setExercise);
  }, [id]);

  if (!exercise) return <section className="mx-auto max-w-7xl px-4 py-10 text-slate-500">Đang tải bài tập...</section>;

  return (
    <section className="mx-auto max-w-7xl px-4 py-10">
      <ExerciseDetail exercise={exercise} />
    </section>
  );
}

export default function ExerciseDetailPage({ params }: { params: { id: string } }) {
  return (
    <RequireSubscription requiredPlan="Basic">
      <ExerciseDetailContent id={params.id} />
    </RequireSubscription>
  );
}
