import { type SupabaseClient } from "@supabase/supabase-js";

import { createClient } from "@/lib/supabase/browser";
import { getSupabaseConfigError, getSupabaseKey, getSupabaseUrl } from "@/lib/supabase/config";
import type { Database } from "@/types/supabase";

let browserClient: SupabaseClient<Database> | null = null;

export function getSupabaseClient(): SupabaseClient<Database> | null {
  const supabaseUrl = getSupabaseUrl();
  const supabaseKey = getSupabaseKey();

  if (!supabaseUrl || !supabaseKey) {
    return null;
  }

  if (!browserClient) {
    browserClient = createClient();
  }

  return browserClient;
}

export function getRequiredSupabaseClient(): SupabaseClient<Database> {
  const client = getSupabaseClient();

  if (!client) {
    throw new Error(getSupabaseConfigError());
  }

  return client;
}
export { getSupabaseConfigError };
