import { assertNoSupabaseError, getSupabase } from "@/services/common";
import type { ExerciseLog, ProgressSummary } from "@/types";

type ExerciseLogCreate = Omit<ExerciseLog, "id" | "completed_at" | "created_at" | "exercise"> & { completed_at?: string };

const EXERCISE_METADATA_SELECT = [
  "id",
  "title",
  "slug",
  "description",
  "category",
  "difficulty",
  "body_region",
  "duration_minutes",
  "repetitions",
  "sets",
  "instructions",
  "precautions",
  "image_url",
  "is_active",
  "created_at"
].join(",");

function parseDate(value: string) {
  return new Date(value);
}

export async function getExerciseLogs(userId?: string) {
  const supabase = getSupabase();
  let query = supabase
    .from("exercise_logs")
    .select(`*, exercise:exercises(${EXERCISE_METADATA_SELECT})`)
    .order("completed_at", { ascending: false });

  if (userId) query = query.eq("user_id", userId);

  const { data, error } = await query;
  assertNoSupabaseError(error);
  return (data || []) as unknown as ExerciseLog[];
}

export async function createExerciseLog(payload: ExerciseLogCreate) {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("exercise_logs")
    .insert({ ...payload, completed_at: payload.completed_at || new Date().toISOString() })
    .select(`*, exercise:exercises(${EXERCISE_METADATA_SELECT})`)
    .single();
  assertNoSupabaseError(error);
  return data as unknown as ExerciseLog;
}

export async function updateExerciseLog(logId: string, payload: Partial<ExerciseLogCreate>) {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("exercise_logs")
    .update(payload)
    .eq("id", logId)
    .select(`*, exercise:exercises(${EXERCISE_METADATA_SELECT})`)
    .single();
  assertNoSupabaseError(error);
  return data as unknown as ExerciseLog;
}

export async function deleteExerciseLog(logId: string) {
  const supabase = getSupabase();
  const { error } = await supabase.from("exercise_logs").delete().eq("id", logId);
  assertNoSupabaseError(error);
}

export async function getProgressSummary(userId: string): Promise<ProgressSummary> {
  const logs = await getExerciseLogs(userId);

  if (!logs.length) {
    return {
      completed_sessions: 0,
      completed_exercises: 0,
      current_streak: 0,
      average_pain_level: 0,
      average_fatigue_level: 0,
      latest_mobility_score: 0,
      weekly_completion: [],
      mobility_trend: [],
      recent_logs: []
    };
  }

  const uniqueDays = [...new Set(logs.map((log) => parseDate(log.completed_at).toISOString().slice(0, 10)))].sort().reverse();
  let streak = 0;
  const cursor = new Date();
  cursor.setHours(0, 0, 0, 0);
  for (const day of uniqueDays) {
    const currentDay = cursor.toISOString().slice(0, 10);
    if (day === currentDay) {
      streak += 1;
      cursor.setDate(cursor.getDate() - 1);
    } else if (day < currentDay) {
      break;
    }
  }

  const weekly = new Map<string, number>();
  const mobilityTrend: Array<{ date: string; mobility_score: number }> = [];
  logs.forEach((log) => {
    const completedAt = parseDate(log.completed_at);
    const firstDayOfYear = new Date(Date.UTC(completedAt.getUTCFullYear(), 0, 1));
    const week = Math.ceil((((completedAt.getTime() - firstDayOfYear.getTime()) / 86400000) + firstDayOfYear.getUTCDay() + 1) / 7);
    const weekKey = `${completedAt.getUTCFullYear()}-W${String(week).padStart(2, "0")}`;
    weekly.set(weekKey, (weekly.get(weekKey) || 0) + 1);
    if (log.mobility_score !== undefined && log.mobility_score !== null) {
      mobilityTrend.push({ date: completedAt.toISOString().slice(0, 10), mobility_score: log.mobility_score });
    }
  });

  const painValues = logs.map((log) => log.pain_level).filter((value): value is number => value !== null && value !== undefined);
  const fatigueValues = logs.map((log) => log.fatigue_level).filter((value): value is number => value !== null && value !== undefined);
  const latestMobility = logs.find((log) => log.mobility_score !== null && log.mobility_score !== undefined)?.mobility_score || 0;

  return {
    completed_sessions: uniqueDays.length,
    completed_exercises: logs.length,
    current_streak: streak,
    average_pain_level: painValues.length ? Math.round((painValues.reduce((sum, value) => sum + value, 0) / painValues.length) * 10) / 10 : 0,
    average_fatigue_level: fatigueValues.length ? Math.round((fatigueValues.reduce((sum, value) => sum + value, 0) / fatigueValues.length) * 10) / 10 : 0,
    latest_mobility_score: latestMobility,
    weekly_completion: [...weekly.entries()].sort().map(([week, completed_exercises]) => ({ week, completed_exercises })),
    mobility_trend: mobilityTrend.reverse(),
    recent_logs: logs.slice(0, 6)
  };
}
