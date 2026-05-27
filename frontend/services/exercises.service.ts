import { assertNoSupabaseError, getSupabase } from "@/services/common";
import type { Exercise, ExerciseDifficulty } from "@/types";

export type ExerciseFilters = {
  category?: string;
  difficulty?: ExerciseDifficulty | string;
  body_region?: string;
  search?: string;
};

export async function getExercises(filters?: ExerciseFilters) {
  const supabase = getSupabase();
  let query = supabase.from("exercises").select("*").eq("is_active", true).order("created_at", { ascending: false });

  if (filters?.category) query = query.eq("category", filters.category);
  if (filters?.difficulty) query = query.eq("difficulty", filters.difficulty as ExerciseDifficulty);
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

export async function createExercise(payload: Omit<Exercise, "id" | "created_at">) {
  const supabase = getSupabase();
  const { data, error } = await supabase.from("exercises").insert(payload).select("*").single();
  assertNoSupabaseError(error);
  return data as Exercise;
}

export async function updateExercise(id: string, payload: Partial<Omit<Exercise, "id" | "created_at">>) {
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
