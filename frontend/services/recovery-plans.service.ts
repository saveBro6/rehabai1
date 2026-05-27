import { assertNoSupabaseError, getSupabase } from "@/services/common";
import { getExercises } from "@/services/exercises.service";
import { selectExercisesForPlan } from "@/services/recovery-plan-generator";
import type { RecoveryPlan, RecoveryPlanExercise } from "@/types";

type RecoveryPlanCreate = Omit<RecoveryPlan, "id" | "created_at" | "exercises">;

function sortPlanExercises(rows: RecoveryPlanExercise[]) {
  return [...rows].sort((a, b) => a.week_number - b.week_number || a.day_number - b.day_number || a.order_index - b.order_index);
}

export async function getRecoveryPlans(userId?: string) {
  const supabase = getSupabase();
  let query = supabase
    .from("recovery_plans")
    .select("*, exercises:recovery_plan_exercises(*, exercise:exercises(*))")
    .order("created_at", { ascending: false });

  if (userId) query = query.eq("user_id", userId);

  const { data, error } = await query;
  assertNoSupabaseError(error);

  return ((data || []) as RecoveryPlan[]).map((plan) => ({
    ...plan,
    exercises: sortPlanExercises(plan.exercises || [])
  }));
}

export async function getRecoveryPlanById(planId: string) {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("recovery_plans")
    .select("*, exercises:recovery_plan_exercises(*, exercise:exercises(*))")
    .eq("id", planId)
    .maybeSingle();
  assertNoSupabaseError(error);

  if (!data) return null;
  const plan = data as RecoveryPlan;
  return { ...plan, exercises: sortPlanExercises(plan.exercises || []) };
}

export async function createRecoveryPlan(payload: RecoveryPlanCreate) {
  const supabase = getSupabase();
  const { data, error } = await supabase.from("recovery_plans").insert(payload).select("*").single();
  assertNoSupabaseError(error);
  return { ...(data as RecoveryPlan), exercises: [] };
}

export async function updateRecoveryPlan(planId: string, payload: Partial<RecoveryPlanCreate>) {
  const supabase = getSupabase();
  const { data, error } = await supabase.from("recovery_plans").update(payload).eq("id", planId).select("*").single();
  assertNoSupabaseError(error);
  return data as RecoveryPlan;
}

export async function deleteRecoveryPlan(planId: string) {
  const supabase = getSupabase();
  const { error } = await supabase.from("recovery_plans").delete().eq("id", planId);
  assertNoSupabaseError(error);
}

export async function generateRecoveryPlanExercises(planId: string) {
  const supabase = getSupabase();
  const plan = await getRecoveryPlanById(planId);
  if (!plan) throw new Error("Recovery plan not found.");

  const { error: deleteError } = await supabase.from("recovery_plan_exercises").delete().eq("recovery_plan_id", planId);
  assertNoSupabaseError(deleteError);

  const selected = selectExercisesForPlan(plan, await getExercises());
  const rows = Array.from({ length: plan.sessions_per_week }).flatMap((_, sessionIndex) => {
    const dayNumber = Math.min(7, 1 + sessionIndex * Math.max(1, Math.floor(7 / plan.sessions_per_week)));
    return selected.map((exercise, index) => ({
      recovery_plan_id: planId,
      exercise_id: exercise.id,
      day_number: dayNumber,
      week_number: 1,
      order_index: index + 1,
      recommended_sets: exercise.sets || null,
      recommended_repetitions: exercise.repetitions || null,
      recommended_duration_minutes: exercise.duration_minutes || null
    }));
  });

  if (!rows.length) return [];

  const { data, error } = await supabase
    .from("recovery_plan_exercises")
    .insert(rows)
    .select("*, exercise:exercises(*)");
  assertNoSupabaseError(error);
  return sortPlanExercises((data || []) as RecoveryPlanExercise[]);
}
