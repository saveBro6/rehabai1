"use client";

import { useEffect, useState } from "react";

import { ExerciseCard } from "@/components/exercises/ExerciseCard";
import { ExerciseFilter, type ExerciseFilters } from "@/components/exercises/ExerciseFilter";
import { useAuth } from "@/hooks/useAuth";
import { getExerciseFilterOptions, getExercises, type ExerciseFilterOptions } from "@/services/exercises.service";
import type { Exercise } from "@/types";

const emptyFilterOptions: ExerciseFilterOptions = {
  categories: [],
  difficulties: [],
  bodyRegions: []
};

function ExercisesContent() {
  const { isAuthenticated } = useAuth();
  const [filters, setFilters] = useState<ExerciseFilters>({ category: "", difficulty: "", body_region: "", search: "" });
  const [filterOptions, setFilterOptions] = useState<ExerciseFilterOptions>(emptyFilterOptions);
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void getExerciseFilterOptions()
      .then(setFilterOptions)
      .catch(() => setFilterOptions(emptyFilterOptions));
  }, []);

  useEffect(() => {
    setLoading(true);
    void getExercises(filters)
      .then(setExercises)
      .catch(() => setExercises([]))
      .finally(() => setLoading(false));
  }, [filters]);

  return (
    <section className="mx-auto max-w-7xl px-4 py-10">
      <p className="text-sm font-bold uppercase text-emerald-700">Exercise Library</p>
      <h1 className="mt-2 text-3xl font-bold text-slate-950">Thư viện bài tập phục hồi chức năng</h1>
      <p className="mt-3 max-w-3xl text-slate-600">Lọc bài tập theo loại phục hồi, độ khó và vùng cơ thể để bắt đầu tập luyện có định hướng.</p>
      <div className="mt-6"><ExerciseFilter filters={filters} options={filterOptions} onChange={setFilters} /></div>
      {loading ? <p className="mt-8 text-slate-500">Đang tải bài tập...</p> : <div className="mt-8 grid gap-5 md:grid-cols-2 lg:grid-cols-3">{exercises.map((exercise) => <ExerciseCard key={exercise.id} exercise={exercise} isAuthenticated={isAuthenticated} />)}</div>}
      {!loading && !exercises.length ? <p className="mt-8 text-slate-500">Không tìm thấy bài tập phù hợp.</p> : null}
    </section>
  );
}

export default function ExercisesPage() {
  return <ExercisesContent />;
}
