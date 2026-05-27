"use client";

import { bodyRegions, exerciseCategories, exerciseDifficulties } from "@/lib/constants";

export interface ExerciseFilters {
  category: string;
  difficulty: string;
  body_region: string;
  search: string;
}

export function ExerciseFilter({ filters, onChange }: { filters: ExerciseFilters; onChange: (filters: ExerciseFilters) => void }) {
  return (
    <div className="grid gap-3 rounded-lg border border-slate-200 bg-white p-4 md:grid-cols-4">
      <input className="rounded-lg border border-slate-300 px-3 py-2 text-sm" placeholder="Tim bai tap..." value={filters.search} onChange={(event) => onChange({ ...filters, search: event.target.value })} />
      <select className="rounded-lg border border-slate-300 px-3 py-2 text-sm" value={filters.category} onChange={(event) => onChange({ ...filters, category: event.target.value })}>
        <option value="">Tất cả loại phục hồi</option>
        {exerciseCategories.map((item) => <option key={item} value={item}>{item}</option>)}
      </select>
      <select className="rounded-lg border border-slate-300 px-3 py-2 text-sm" value={filters.difficulty} onChange={(event) => onChange({ ...filters, difficulty: event.target.value })}>
        <option value="">Tất cả độ khó</option>
        {exerciseDifficulties.map((item) => <option key={item} value={item}>{item}</option>)}
      </select>
      <select className="rounded-lg border border-slate-300 px-3 py-2 text-sm" value={filters.body_region} onChange={(event) => onChange({ ...filters, body_region: event.target.value })}>
        <option value="">Tất cả vùng cơ thể</option>
        {bodyRegions.map((item) => <option key={item} value={item}>{item}</option>)}
      </select>
    </div>
  );
}
