import { getRequiredSupabaseClient } from "@/lib/supabase/client";
import { throwSupabaseError } from "@/lib/supabase/errors";

export function getSupabase() {
  return getRequiredSupabaseClient();
}

export function assertNoSupabaseError(error: unknown): void {
  if (error) throwSupabaseError(error);
}

export function todayIsoDate() {
  return new Date().toISOString().slice(0, 10);
}
