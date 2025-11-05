// File: src/pages/admin/AdminSocials.jsx
import React, { useEffect, useState } from "react";
import { supabase } from "../../lib/supabaseClient.js";

export default function AdminSocials() {
  const [row, setRow] = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("mf_site_settings")
        .select("*")
        .order("updated_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      setRow(data || {});
    })();
  }, []);

  async function save() {
    setSaving(true);
    const payload = {
      social_instagram_handle: row?.social_instagram_handle || null,
      social_instagram_url:    row?.social_instagram_url || null,
      social_youtube_url:      row?.social_youtube_url || null,
      social_snapchat_handle:  row?.social_snapchat_handle || null,
      social_snapchat_url:     row?.social_snapchat_url || null,
      updated_at: new Date().toISOString(),
    };
    let q = supabase.from("mf_site_settings");
    if (row?.id) {
      await q.update(payload).eq("id", row.id);
    } else {
      const { data } = await q.insert([payload]).select("id").single();
      if (data?.id) setRow((r) => ({ ...(r || {}), id: data.id }));
    }
    setSaving(false);
    alert("Saved.");
  }

  function set(k, v) {
    setRow((r) => ({ ...(r || {}), [k]: v }));
  }

  if (!row) return <div className="text-white/60">Loading…</div>;

  return (
    <div className="grid gap-4">
      <h3 className="text-lg font-semibold">Socials</h3>

      <div className="grid sm:grid-cols-2 gap-3">
        <div className="grid gap-1">
          <label className="text-sm text-white/60">Instagram @handle</label>
          <input className="bg-black/30 border border-white/10 rounded px-3 py-2"
            placeholder="@yourhandle"
            value={row.social_instagram_handle || ""}
            onChange={(e) => set("social_instagram_handle", e.target.value)} />
        </div>
        <div className="grid gap-1">
          <label className="text-sm text-white/60">Instagram URL</label>
          <input className="bg-black/30 border border-white/10 rounded px-3 py-2"
            placeholder="https://instagram.com/yourhandle"
            value={row.social_instagram_url || ""}
            onChange={(e) => set("social_instagram_url", e.target.value)} />
        </div>

        <div className="grid gap-1">
          <label className="text-sm text-white/60">YouTube URL</label>
          <input className="bg-black/30 border border-white/10 rounded px-3 py-2"
            placeholder="https://youtube.com/@yourchannel"
            value={row.social_youtube_url || ""}
            onChange={(e) => set("social_youtube_url", e.target.value)} />
        </div>

        <div className="grid gap-1">
          <label className="text-sm text-white/60">Snapchat @handle</label>
          <input className="bg-black/30 border border-white/10 rounded px-3 py-2"
            placeholder="@yourhandle"
            value={row.social_snapchat_handle || ""}
            onChange={(e) => set("social_snapchat_handle", e.target.value)} />
        </div>
        <div className="grid gap-1">
          <label className="text-sm text-white/60">Snapchat URL</label>
          <input className="bg-black/30 border border-white/10 rounded px-3 py-2"
            placeholder="https://www.snapchat.com/add/yourhandle"
            value={row.social_snapchat_url || ""}
            onChange={(e) => set("social_snapchat_url", e.target.value)} />
        </div>
      </div>

      <div className="flex justify-end">
        <button
          disabled={saving}
          onClick={save}
          className="px-4 py-2 rounded bg-white text-black font-semibold disabled:opacity-60"
        >
          {saving ? "Saving…" : "Save"}
        </button>
      </div>
    </div>
  );
}
