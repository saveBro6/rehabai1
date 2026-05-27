import { assertNoSupabaseError, getSupabase } from "@/services/common";
import type { Exercise } from "@/types";
import type { Insert, Row, Update } from "@/types/supabase";

const exerciseDifficulties: Array<Row<"exercises">["difficulty"]> = ["Cơ bản", "Trung cấp", "Nâng cao"];

function isExerciseDifficulty(value: string): value is Row<"exercises">["difficulty"] {
  return exerciseDifficulties.includes(value as Row<"exercises">["difficulty"]);
}

export type ExerciseFilters = {
  category?: string;
  difficulty?: string;
  body_region?: string;
  search?: string;
};

export type ExerciseFilterOptions = {
  categories: string[];
  difficulties: string[];
  bodyRegions: string[];
};

function uniqueSorted(values: Array<string | null | undefined>) {
  return Array.from(new Set(values.filter((value): value is string => Boolean(value)))).sort((a, b) =>
    a.localeCompare(b, "vi")
  );
}

export async function getExercises(filters?: ExerciseFilters) {
  const supabase = getSupabase();
  let query = supabase.from("exercises").select("*").eq("is_active", true).order("created_at", { ascending: false });

  if (filters?.category) query = query.eq("category", filters.category);
  if (filters?.difficulty && isExerciseDifficulty(filters.difficulty)) {
    query = query.eq("difficulty", filters.difficulty);
  }
  if (filters?.body_region) query = query.eq("body_region", filters.body_region);

  const { data, error } = await query;
  assertNoSupabaseError(error);

  const search = filters?.search?.trim().toLowerCase();
  const rows = (data || []) as Exercise[];
  if (!search) return rows;

  return rows.filter((exercise) => {
    const haystack = `${exercise.title} ${exercise.description} ${exercise.category}`.toLowerCase();
    return haystack.includes(search);
  });
}

export async function getExerciseFilterOptions(): Promise<ExerciseFilterOptions> {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("exercises")
    .select("category,difficulty,body_region")
    .eq("is_active", true);
  assertNoSupabaseError(error);

  const rows = data || [];

  return {
    categories: uniqueSorted(rows.map((row) => row.category)),
    difficulties: uniqueSorted(rows.map((row) => row.difficulty)),
    bodyRegions: uniqueSorted(rows.map((row) => row.body_region))
  };
}

export async function getExerciseById(idOrSlug: string) {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("exercises")
    .select("*")
    .or(`id.eq.${idOrSlug},slug.eq.${idOrSlug}`)
    .maybeSingle();
  assertNoSupabaseError(error);
  return data as Exercise | null;
}

export async function createExercise(payload: Insert<"exercises">) {
  const supabase = getSupabase();
  const { data, error } = await supabase.from("exercises").insert(payload).select("*").single();
  assertNoSupabaseError(error);
  return data as Exercise;
}

export async function updateExercise(id: string, payload: Update<"exercises">) {
  const supabase = getSupabase();
  const { data, error } = await supabase.from("exercises").update(payload).eq("id", id).select("*").single();
  assertNoSupabaseError(error);
  return data as Exercise;
}

export async function deleteExercise(id: string) {
  const supabase = getSupabase();
  const { error } = await supabase.from("exercises").delete().eq("id", id);
  assertNoSupabaseError(error);
}
