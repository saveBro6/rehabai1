"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  Activity,
  ArrowRight,
  Brain,
  ChevronDown,
  Clock3,
  Flame,
  Hand,
  HeartPulse,
  RotateCcw,
  Search,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles,
  Star,
  UserRoundCheck,
  Zap
} from "lucide-react";

import { ExerciseCard } from "@/components/exercises/ExerciseCard";
import { useSubscriptionAccess } from "@/hooks/useSubscriptionAccess";
import { hasPlanAccess } from "@/lib/subscription-access";
import { clsx } from "@/lib/utils";
import { getExerciseDifficultyLabel, getExerciseFilterOptions, getExercises, type ExerciseFilterOptions } from "@/services/exercises.service";
import type { PublicExerciseMetadata } from "@/types";

const pricingHref = "/patient/pricing";

const emptyFilterOptions: ExerciseFilterOptions = {
  categories: [],
  difficulties: [],
  bodyRegions: []
};

const conditionOptions = [
  { label: "Tất cả tình trạng", value: "", keywords: [] },
  { label: "Sau đột quỵ", value: "stroke", keywords: ["đột quỵ", "dot quy", "cánh tay", "phối hợp"] },
  { label: "Chấn thương vai", value: "shoulder", keywords: ["vai", "cánh tay", "chấn thương"] },
  { label: "Đau cổ tay", value: "wrist", keywords: ["cổ tay", "bàn tay", "duỗi cổ tay"] },
  { label: "Phục hồi chân, gối", value: "leg-knee", keywords: ["chân", "gối", "chi dưới", "hông"] },
  { label: "Đau lưng", value: "back", keywords: ["lưng", "thân mình"] },
  { label: "Phục hồi toàn thân", value: "full-body", keywords: ["toàn thân", "thăng bằng", "vận động"] }
];

const durationOptions = [
  { label: "Tất cả thời lượng", value: "" },
  { label: "Dưới 10 phút", value: "under-10" },
  { label: "10 - 20 phút", value: "10-20" },
  { label: "20 - 30 phút", value: "20-30" },
  { label: "Trên 30 phút", value: "over-30" }
];

const comboOptions = [
  {
    id: "combo-7-day",
    title: "Combo 7 ngày",
    subtitle: "Phục hồi sau đột quỵ",
    meta: "7 bài tập • 15-20 phút/ngày",
    condition: "stroke",
    difficulty: "",
    bodyRegion: "",
    icon: Brain,
    tone: "from-emerald-50 to-lime-100",
    action: "bg-emerald-600"
  },
  {
    id: "shoulder",
    title: "Combo vai khỏe",
    subtitle: "Mỗi ngày",
    meta: "5 bài tập • 10-15 phút/ngày",
    condition: "shoulder",
    difficulty: "Cơ bản",
    bodyRegion: "Vai",
    icon: Activity,
    tone: "from-sky-50 to-cyan-100",
    action: "bg-sky-600"
  },
  {
    id: "hand",
    title: "Combo bàn tay",
    subtitle: "Linh hoạt",
    meta: "6 bài tập • 10-15 phút/ngày",
    condition: "wrist",
    difficulty: "",
    bodyRegion: "Bàn tay",
    icon: Hand,
    tone: "from-violet-50 to-fuchsia-100",
    action: "bg-violet-600"
  },
  {
    id: "full-body",
    title: "Combo vận động",
    subtitle: "Toàn thân",
    meta: "8 bài tập • 20-25 phút/ngày",
    condition: "full-body",
    difficulty: "Trung cấp",
    bodyRegion: "Toàn thân",
    icon: UserRoundCheck,
    tone: "from-orange-50 to-amber-100",
    action: "bg-orange-500"
  }
];

const tabOptions = [
  { label: "Tất cả bài tập", value: "all", disabled: false },
  { label: "Mới nhất", value: "latest", disabled: false },
  { label: "Yêu thích", value: "favorites", disabled: true },
  { label: "Đã xem gần đây", value: "recent", disabled: true }
] as const;

const sortOptions = [
  { label: "Mới nhất", value: "latest" },
  { label: "Thời lượng ngắn nhất", value: "duration-asc" },
  { label: "Thời lượng dài nhất", value: "duration-desc" },
  { label: "Độ khó tăng dần", value: "difficulty-asc" }
] as const;

type TabValue = (typeof tabOptions)[number]["value"];
type SortValue = (typeof sortOptions)[number]["value"];

type LibraryFilters = {
  search: string;
  condition: string;
  bodyRegion: string;
  difficulty: string;
  combo: string;
  duration: string;
};

const initialFilters: LibraryFilters = {
  search: "",
  condition: "",
  bodyRegion: "",
  difficulty: "",
  combo: "",
  duration: ""
};

const difficultyRank: Record<string, number> = {
  "Cơ bản": 1,
  "Trung cấp": 2,
  "Nâng cao": 3
};

const requiredPlanByDifficulty: Record<string, "Basic" | "Standard" | "Premium"> = {
  "Cơ bản": "Basic",
  "Trung cấp": "Standard",
  "Nâng cao": "Premium"
};

function normalize(value?: string | null) {
  return (value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D")
    .toLowerCase();
}

function exerciseText(exercise: PublicExerciseMetadata) {
  return normalize(`${exercise.title} ${exercise.description} ${exercise.category} ${exercise.body_region}`);
}

function matchesCondition(exercise: PublicExerciseMetadata, condition: string) {
  if (!condition) return true;
  const option = conditionOptions.find((item) => item.value === condition);
  if (!option || !option.keywords.length) return true;
  const text = exerciseText(exercise);
  return option.keywords.some((keyword) => text.includes(normalize(keyword)));
}

function matchesDuration(exercise: PublicExerciseMetadata, duration: string) {
  const minutes = exercise.duration_minutes || 0;
  if (!duration) return true;
  if (duration === "under-10") return minutes > 0 && minutes < 10;
  if (duration === "10-20") return minutes >= 10 && minutes <= 20;
  if (duration === "20-30") return minutes > 20 && minutes <= 30;
  if (duration === "over-30") return minutes > 30;
  return true;
}

function sortExercises(exercises: PublicExerciseMetadata[], sortBy: SortValue) {
  return [...exercises].sort((a, b) => {
    if (sortBy === "duration-asc") return (a.duration_minutes || 0) - (b.duration_minutes || 0);
    if (sortBy === "duration-desc") return (b.duration_minutes || 0) - (a.duration_minutes || 0);
    if (sortBy === "difficulty-asc") {
      return (difficultyRank[getExerciseDifficultyLabel(a.difficulty)] || 0) - (difficultyRank[getExerciseDifficultyLabel(b.difficulty)] || 0);
    }

    return new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime();
  });
}

function SelectField({
  label,
  value,
  onChange,
  options
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: Array<{ label: string; value: string }>;
}) {
  return (
    <label className="relative block min-w-0 rounded-2xl border border-emerald-100 bg-white px-4 py-2.5 shadow-sm shadow-emerald-950/5">
      <span className="block text-xs font-bold text-slate-500">{label}</span>
      <select
        className="mt-0.5 w-full appearance-none bg-transparent pr-7 text-sm font-black text-slate-800 outline-none"
        value={value}
        onChange={(event) => onChange(event.target.value)}
      >
        {options.map((option) => (
          <option key={`${label}-${option.value || "all"}`} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      <ChevronDown className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
    </label>
  );
}

function LoadingSkeleton() {
  return (
    <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
      {Array.from({ length: 6 }).map((_, index) => (
        <div key={index} className="overflow-hidden rounded-[22px] border border-emerald-100 bg-white shadow-sm">
          <div className="aspect-video animate-pulse bg-emerald-50" />
          <div className="space-y-3 p-4">
            <div className="h-4 w-24 animate-pulse rounded-full bg-slate-100" />
            <div className="h-5 w-3/4 animate-pulse rounded-full bg-slate-100" />
            <div className="h-4 w-full animate-pulse rounded-full bg-slate-100" />
            <div className="h-4 w-2/3 animate-pulse rounded-full bg-slate-100" />
          </div>
        </div>
      ))}
    </div>
  );
}

function ExercisesContent() {
  const { isAuthenticated, planName } = useSubscriptionAccess();
  const [filters, setFilters] = useState<LibraryFilters>(initialFilters);
  const [filterOptions, setFilterOptions] = useState<ExerciseFilterOptions>(emptyFilterOptions);
  const [exercises, setExercises] = useState<PublicExerciseMetadata[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<TabValue>("all");
  const [sortBy, setSortBy] = useState<SortValue>("latest");
  const [showMobileFilters, setShowMobileFilters] = useState(false);

  useEffect(() => {
    void getExerciseFilterOptions()
      .then(setFilterOptions)
      .catch(() => setFilterOptions(emptyFilterOptions));
  }, []);

  useEffect(() => {
    setLoading(true);
    setError(null);

    void getExercises()
      .then(setExercises)
      .catch((loadError) => {
        setExercises([]);
        setError(loadError instanceof Error ? loadError.message : "Không thể tải thư viện bài tập.");
      })
      .finally(() => setLoading(false));
  }, []);

  const bodyOptions = useMemo(() => {
    const defaults = ["Tay vai", "Cổ tay", "Bàn tay", "Chân", "Gối", "Lưng", "Toàn thân"];
    return Array.from(new Set([...filterOptions.bodyRegions, ...defaults].filter(Boolean))).sort((a, b) => a.localeCompare(b, "vi"));
  }, [filterOptions.bodyRegions]);

  const difficultyOptions = useMemo(() => {
    return Array.from(new Set([...filterOptions.difficulties, "Cơ bản", "Trung cấp", "Nâng cao"].filter(Boolean)));
  }, [filterOptions.difficulties]);

  const filteredExercises = useMemo(() => {
    const search = normalize(filters.search.trim());
    const filtered = exercises.filter((exercise) => {
      const difficulty = getExerciseDifficultyLabel(exercise.difficulty);
      const text = exerciseText(exercise);

      if (search && !text.includes(search)) return false;
      if (filters.difficulty && difficulty !== filters.difficulty) return false;
      if (filters.bodyRegion && normalize(exercise.body_region) !== normalize(filters.bodyRegion)) return false;
      if (!matchesCondition(exercise, filters.condition)) return false;
      if (!matchesDuration(exercise, filters.duration)) return false;
      return true;
    });

    return sortExercises(filtered, sortBy);
  }, [exercises, filters, sortBy]);

  function updateFilters(next: Partial<LibraryFilters>) {
    setFilters((current) => ({ ...current, ...next }));
    setActiveTab("all");
  }

  function resetFilters() {
    setFilters(initialFilters);
    setActiveTab("all");
    setSortBy("latest");
  }

  function applyCombo(comboId: string) {
    const combo = comboOptions.find((item) => item.id === comboId);
    if (!combo) return;
    setFilters({
      search: "",
      condition: combo.condition,
      bodyRegion: combo.bodyRegion,
      difficulty: combo.difficulty,
      combo: combo.id,
      duration: ""
    });
    setActiveTab("all");
  }

  function isExerciseLocked(exercise: PublicExerciseMetadata) {
    if (!isAuthenticated) return true;
    const difficulty = getExerciseDifficultyLabel(exercise.difficulty);
    const requiredPlan = requiredPlanByDifficulty[difficulty] || "Basic";
    return !hasPlanAccess(planName, requiredPlan);
  }

  return (
    <section className="w-full max-w-full overflow-x-hidden bg-gradient-to-b from-white via-emerald-50/30 to-white px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto w-full max-w-7xl min-w-0">
        <div className="grid w-full min-w-0 gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(360px,0.72fr)] lg:items-center">
          <div className="min-w-0">
            <p className="text-xs font-black uppercase tracking-[0.16em] text-emerald-700">EXERCISE LIBRARY</p>
            <h1 className="mt-4 max-w-full text-2xl font-black leading-tight text-slate-950 sm:max-w-3xl sm:text-4xl md:text-5xl">
              Thư viện bài tập phục hồi chức năng
            </h1>
            <p className="mt-4 max-w-full text-sm leading-7 text-slate-600 sm:max-w-3xl sm:text-base">
              Lọc bài tập theo tình trạng, độ khó và vùng cơ thể để bắt đầu tập luyện có định hướng.
            </p>
          </div>

          <div className="w-full min-w-0 overflow-hidden rounded-[26px] border border-emerald-100 bg-gradient-to-br from-emerald-50 via-teal-50 to-lime-50 p-5 shadow-sm shadow-emerald-950/5">
            <div className="flex items-center justify-between gap-5">
              <div className="min-w-0">
                <span className="inline-flex items-center gap-2 rounded-full bg-white/80 px-3 py-1 text-xs font-black text-emerald-700">
                  <Sparkles className="h-3.5 w-3.5" />
                  Đề xuất cho bạn
                </span>
                <h2 className="mt-4 text-xl font-black text-slate-950">Nâng cấp gói để mở khóa</h2>
                <p className="mt-2 break-words text-sm leading-6 text-emerald-900">
                  Bài tập nâng cao và combo chuyên sâu theo mục tiêu phục hồi.
                </p>
                <Link
                  href={pricingHref}
                  className="mt-4 inline-flex min-h-11 items-center justify-center rounded-xl bg-emerald-600 px-5 text-sm font-black text-white shadow-lg shadow-emerald-700/20 transition hover:bg-emerald-700"
                >
                  Xem gói tập
                </Link>
              </div>
              <div className="hidden h-28 w-28 shrink-0 place-items-center rounded-full bg-white/70 text-emerald-600 shadow-inner md:grid">
                <ShieldCheck className="h-14 w-14" />
              </div>
            </div>
          </div>
        </div>

        <div className="mt-7 w-full min-w-0 overflow-hidden rounded-[24px] border border-emerald-100 bg-white p-3 shadow-sm shadow-emerald-950/5">
          <div className="grid min-w-0 gap-3 lg:grid-cols-[minmax(240px,1.6fr)_repeat(4,minmax(150px,1fr))_auto]">
            <label className="relative block min-w-0">
              <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
              <input
                className="h-full min-h-14 w-full rounded-2xl border border-emerald-100 bg-white py-3 pl-12 pr-4 text-sm font-semibold text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-emerald-300 focus:ring-4 focus:ring-emerald-100"
                placeholder="Tìm bài tập..."
                value={filters.search}
                onChange={(event) => updateFilters({ search: event.target.value })}
              />
            </label>
            <SelectField
              label="Tình trạng"
              value={filters.condition}
              onChange={(value) => updateFilters({ condition: value })}
              options={conditionOptions.map((item) => ({ label: item.label.replace("Tất cả tình trạng", "Tất cả"), value: item.value }))}
            />
            <SelectField
              label="Vùng cơ thể"
              value={filters.bodyRegion}
              onChange={(value) => updateFilters({ bodyRegion: value })}
              options={[{ label: "Tất cả", value: "" }, ...bodyOptions.map((item) => ({ label: item, value: item }))]}
            />
            <SelectField
              label="Độ khó"
              value={filters.difficulty}
              onChange={(value) => updateFilters({ difficulty: value })}
              options={[{ label: "Tất cả", value: "" }, ...difficultyOptions.map((item) => ({ label: item, value: item }))]}
            />
            <SelectField
              label="Combo"
              value={filters.combo}
              onChange={(value) => (value ? applyCombo(value) : updateFilters({ combo: "" }))}
              options={[{ label: "Tất cả", value: "" }, ...comboOptions.map((item) => ({ label: item.title, value: item.id }))]}
            />
            <button
              type="button"
              className="inline-flex min-h-14 min-w-0 items-center justify-center gap-2 rounded-2xl border border-emerald-100 bg-white px-4 text-sm font-black text-slate-700 shadow-sm transition hover:border-emerald-200 hover:bg-emerald-50 hover:text-emerald-700"
              onClick={() => setShowMobileFilters((current) => !current)}
            >
              <SlidersHorizontal className="h-4 w-4" />
              Bộ lọc khác
            </button>
          </div>
        </div>

        {showMobileFilters ? (
          <div className="mt-4 rounded-[22px] border border-emerald-100 bg-white p-4 shadow-sm lg:hidden">
            <FilterChipGroup
              title="Thời lượng"
              options={durationOptions}
              value={filters.duration}
              onChange={(value) => updateFilters({ duration: value })}
            />
          </div>
        ) : null}

        <div className="mt-8 grid w-full min-w-0 gap-6 lg:grid-cols-[230px_minmax(0,1fr)]">
          <aside className="hidden lg:block">
            <div className="sticky top-24 space-y-7 rounded-[24px] border border-emerald-100 bg-white p-4 shadow-sm shadow-emerald-950/5">
              <FilterChipGroup
                title="Tình trạng phục hồi"
                options={conditionOptions}
                value={filters.condition}
                onChange={(value) => updateFilters({ condition: value })}
                vertical
              />
              <FilterChipGroup
                title="Độ khó"
                options={difficultyOptions.map((item) => ({ label: item, value: item }))}
                value={filters.difficulty}
                onChange={(value) => updateFilters({ difficulty: value })}
                vertical
              />
              <FilterChipGroup
                title="Thời lượng"
                options={durationOptions}
                value={filters.duration}
                onChange={(value) => updateFilters({ duration: value })}
                vertical
              />
            </div>
          </aside>

          <div className="min-w-0 space-y-6">
            <div className="w-full min-w-0 rounded-[24px] border border-emerald-100 bg-white p-4 shadow-sm shadow-emerald-950/5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.12em] text-slate-500">Gợi ý combo cho bạn</p>
                </div>
                <button type="button" className="inline-flex items-center gap-2 text-sm font-black text-emerald-700 hover:text-emerald-800">
                  Xem tất cả combo
                  <ArrowRight className="h-4 w-4" />
                </button>
              </div>

              <div className="mt-4 grid min-w-0 gap-4 md:grid-cols-2 xl:grid-cols-4">
                {comboOptions.map((combo, index) => {
                  const Icon = combo.icon;
                  const selected = filters.combo === combo.id;
                  return (
                    <button
                      key={combo.id}
                      type="button"
                      className={clsx(
                        "group min-h-40 min-w-0 rounded-[22px] bg-gradient-to-br p-4 text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg",
                        combo.tone,
                        selected && "ring-2 ring-emerald-500"
                      )}
                      onClick={() => applyCombo(combo.id)}
                    >
                      <div className="flex h-full flex-col justify-between">
                        <div>
                          {index === 0 ? (
                            <span className="inline-flex items-center gap-1 rounded-full bg-white/80 px-2 py-1 text-xs font-black text-orange-600">
                              <Flame className="h-3.5 w-3.5" />
                              Phổ biến
                            </span>
                          ) : null}
                          <h3 className="mt-3 text-lg font-black leading-snug text-slate-950">{combo.title}</h3>
                          <p className="mt-1 text-sm font-bold text-slate-700">{combo.subtitle}</p>
                          <p className="mt-3 text-sm text-slate-600">{combo.meta}</p>
                        </div>
                        <div className="mt-4 flex items-center justify-between">
                          <Icon className="h-10 w-10 text-slate-700/50" />
                          <span className={clsx("grid h-10 w-10 place-items-center rounded-full text-white shadow-lg transition group-hover:scale-105", combo.action)}>
                            <Zap className="h-4 w-4" />
                          </span>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="w-full min-w-0 rounded-[24px] border border-emerald-100 bg-white p-4 shadow-sm shadow-emerald-950/5">
              <div className="flex flex-col gap-4 border-b border-slate-100 pb-4 lg:flex-row lg:items-center lg:justify-between">
                <div className="flex min-w-0 gap-2 overflow-x-auto pb-1">
                  {tabOptions.map((tab) => (
                    <button
                      key={tab.value}
                      type="button"
                      className={clsx(
                        "whitespace-nowrap rounded-full px-4 py-2 text-sm font-black transition",
                        activeTab === tab.value && !tab.disabled
                          ? "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200"
                          : "text-slate-600 hover:bg-slate-50",
                        tab.disabled && "cursor-not-allowed opacity-50 hover:bg-transparent"
                      )}
                      disabled={tab.disabled}
                      onClick={() => setActiveTab(tab.value)}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>

                <label className="relative inline-flex w-full max-w-xs min-w-0 items-center rounded-2xl border border-emerald-100 bg-white px-4 py-2 text-sm font-semibold text-slate-600 shadow-sm">
                  <span className="mr-2">Sắp xếp:</span>
                  <select
                    className="appearance-none bg-transparent pr-7 font-black text-slate-800 outline-none"
                    value={sortBy}
                    onChange={(event) => setSortBy(event.target.value as SortValue)}
                  >
                    {sortOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="pointer-events-none absolute right-3 h-4 w-4 text-slate-500" />
                </label>
              </div>

              {loading ? <div className="mt-5"><LoadingSkeleton /></div> : null}

              {!loading && error ? (
                <div className="mt-5 rounded-[22px] border border-rose-100 bg-rose-50 p-6 text-rose-800">
                  <p className="font-black">Không thể tải thư viện bài tập.</p>
                  <p className="mt-2 text-sm">{error}</p>
                </div>
              ) : null}

              {!loading && !error && filteredExercises.length ? (
                <div className="mt-5 grid min-w-0 gap-5 sm:grid-cols-2 xl:grid-cols-3">
                  {filteredExercises.map((exercise) => (
                    <ExerciseCard
                      key={exercise.id}
                      exercise={exercise}
                      isAuthenticated={isAuthenticated}
                      isLocked={isExerciseLocked(exercise)}
                    />
                  ))}
                </div>
              ) : null}

              {!loading && !error && !filteredExercises.length ? (
                <div className="mt-5 rounded-[24px] border border-dashed border-emerald-200 bg-emerald-50/60 p-8 text-center">
                  <div className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-white text-emerald-600 shadow-sm">
                    <Search className="h-6 w-6" />
                  </div>
                  <h2 className="mt-4 text-xl font-black text-slate-950">Không tìm thấy bài tập phù hợp</h2>
                  <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-600">
                    Thử đổi bộ lọc hoặc tìm theo vùng cơ thể khác.
                  </p>
                  <button
                    type="button"
                    className="mt-5 inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-emerald-600 px-5 text-sm font-black text-white transition hover:bg-emerald-700"
                    onClick={resetFilters}
                  >
                    <RotateCcw className="h-4 w-4" />
                    Xóa bộ lọc
                  </button>
                </div>
              ) : null}
            </div>
          </div>
        </div>

        <div className="mt-7 w-full min-w-0 rounded-[26px] border border-emerald-100 bg-gradient-to-r from-emerald-50 via-teal-50 to-white p-5 shadow-sm shadow-emerald-950/5">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-start gap-4">
              <span className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-white text-emerald-600 shadow-sm">
                <Star className="h-7 w-7" />
              </span>
              <div>
                <h2 className="text-xl font-black text-emerald-950">Dùng thử miễn phí 7 ngày tất cả bài tập cao cấp</h2>
                <p className="mt-1 text-sm text-slate-600">Không cần thanh toán khi dùng thử.</p>
              </div>
            </div>
            <div className="flex flex-col gap-3 text-sm font-semibold text-slate-600 sm:flex-row sm:items-center">
              <span className="inline-flex items-center gap-2"><Clock3 className="h-4 w-4 text-emerald-600" />Hủy bất kỳ lúc nào</span>
              <span className="inline-flex items-center gap-2"><HeartPulse className="h-4 w-4 text-emerald-600" />Theo dõi tiến trình</span>
              <Link
                href={pricingHref}
                className="inline-flex min-h-11 items-center justify-center rounded-xl bg-emerald-600 px-5 text-sm font-black text-white shadow-lg shadow-emerald-700/20 transition hover:bg-emerald-700"
              >
                Dùng thử ngay
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function FilterChipGroup({
  title,
  options,
  value,
  onChange,
  vertical = false
}: {
  title: string;
  options: Array<{ label: string; value: string }>;
  value: string;
  onChange: (value: string) => void;
  vertical?: boolean;
}) {
  return (
    <div>
      <h2 className="mb-3 text-xs font-black uppercase tracking-[0.12em] text-slate-700">{title}</h2>
      <div className={clsx(vertical ? "space-y-1.5" : "flex gap-2 overflow-x-auto pb-1")}>
        {options.map((option) => {
          const active = value === option.value || (!value && !option.value);
          return (
            <button
              key={`${title}-${option.value || "all"}`}
              type="button"
              className={clsx(
                "inline-flex min-h-9 w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-sm font-bold transition",
                vertical ? "justify-start" : "w-auto shrink-0",
                active ? "bg-emerald-50 text-emerald-700" : "text-slate-600 hover:bg-slate-50 hover:text-emerald-700"
              )}
              onClick={() => onChange(option.value)}
            >
              <span className={clsx("h-2.5 w-2.5 rounded-full", active ? "bg-emerald-500" : "bg-slate-300")} />
              {option.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export default function ExercisesPage() {
  return <ExercisesContent />;
}
