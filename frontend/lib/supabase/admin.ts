import "server-only";

import { createClient } from "@supabase/supabase-js";

import { getSupabaseUrl } from "@/lib/supabase/config";
import type { Database } from "@/types/supabase";

export function createAdminClient() {
  const supabaseUrl = getSupabaseUrl();
  const serviceRoleKey = process.env.SUPABASE_SECRET_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SECRET_KEY for server-side Supabase access.");
  }

  return createClient<Database>(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });
}
