"use client";

import type { ExerciseFilterOptions } from "@/services/exercises.service";

export interface ExerciseFilters {
  category: string;
  difficulty: string;
  body_region: string;
  search: string;
}

const emptyOptions: ExerciseFilterOptions = {
  categories: [],
  difficulties: [],
  bodyRegions: []
};

export function ExerciseFilter({
  filters,
  options = emptyOptions,
  onChange
}: {
  filters: ExerciseFilters;
  options?: ExerciseFilterOptions;
  onChange: (filters: ExerciseFilters) => void;
}) {
  const selectClassName = "cursor-pointer rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm";

  return (
    <div className="grid gap-3 rounded-lg border border-slate-200 bg-white p-4 md:grid-cols-4">
      <input className="rounded-lg border border-slate-300 px-3 py-2 text-sm" placeholder="Tìm bài tập..." value={filters.search} onChange={(event) => onChange({ ...filters, search: event.target.value })} />
      <select aria-label="Loại phục hồi" className={selectClassName} value={filters.category} onChange={(event) => onChange({ ...filters, category: event.target.value })}>
        <option value="">Tất cả loại phục hồi</option>
        {options.categories.map((item) => <option key={item} value={item}>{item}</option>)}
      </select>
      <select aria-label="Độ khó" className={selectClassName} value={filters.difficulty} onChange={(event) => onChange({ ...filters, difficulty: event.target.value })}>
        <option value="">Tất cả độ khó</option>
        {options.difficulties.map((item) => <option key={item} value={item}>{item}</option>)}
      </select>
      <select aria-label="Vùng cơ thể" className={selectClassName} value={filters.body_region} onChange={(event) => onChange({ ...filters, body_region: event.target.value })}>
        <option value="">Tất cả vùng cơ thể</option>
        {options.bodyRegions.map((item) => <option key={item} value={item}>{item}</option>)}
      </select>
    </div>
  );
}
