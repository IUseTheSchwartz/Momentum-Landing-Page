import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnon = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseAnon, {
  auth: { persistSession: true, autoRefreshToken: true },
});

export async function uploadPublic(file, folder) {
  if (!file) return null;
  const ext = file.name.split(".").pop();
  const path = `${folder}/${crypto.randomUUID()}.${ext}`;
  const { error } = await supabase.storage.from("momentum-public").upload(path, file, {
    cacheControl: "3600",
    upsert: false,
  });
  if (error) throw error;
  const { data: urlData } = supabase.storage.from("momentum-public").getPublicUrl(path);
  return urlData.publicUrl;
}
