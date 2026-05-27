"use client";

import { createBrowserClient } from "@supabase/ssr";

import { getSupabaseConfigError, getSupabaseKey, getSupabaseUrl } from "@/lib/supabase/config";
import type { Database } from "@/types/supabase";

export function createClient() {
  const supabaseUrl = getSupabaseUrl();
  const supabaseKey = getSupabaseKey();

  if (!supabaseUrl || !supabaseKey) {
    throw new Error(getSupabaseConfigError());
  }

  return createBrowserClient<Database>(supabaseUrl, supabaseKey);
}
