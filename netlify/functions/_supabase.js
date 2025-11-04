import { createClient } from "@supabase/supabase-js";

export function getServiceClient() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE;
  if (!url || !key) {
    throw new Error("[_supabase] Supabase env missing");
  }
  // Service role client — server-side only
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
