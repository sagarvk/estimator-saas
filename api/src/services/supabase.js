import { createClient } from "@supabase/supabase-js";
export function makeSupabaseServiceClient({ url, serviceRoleKey }) {
  return createClient(url, serviceRoleKey, { auth: { persistSession: false } });
}
