// File: src/pages/admin/AdminSettings.jsx
import React, { useEffect, useState } from "react";
import { supabase, uploadPublic } from "../../lib/supabaseClient.js";

function Row({ label, children }) {
  return (
    <div className="grid grid-cols-3 items-center gap-3 py-2">
      <div className="text-sm text-white/70">{label}</div>
      <div className="col-span-2">{children}</div>
    </div>
  );
}

export default function AdminSettings() {
  const [s, setS] = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("mf_site_settings")
        .select("*")
        .order("updated_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      setS(data || {});
    })();
  }, []);

  async function ensureRow() {
    if (s?.id) return s;
    const base = { ...(s || {}), updated_at: new Date().toISOString() };
    const { data, error } = await supabase.from("mf_site_settings").insert([base]).select().single();
    if (error) throw error;
    setS(data);
    return data;
  }

  async function savePartial(patch) {
    const current = await ensureRow();
    const payload = { ...current, ...patch, updated_at: new Date().toISOString() };
    const { error } = await supabase.from("mf_site_settings").update(payload).eq("id", current.id);
    if (error) throw error;
    setS(payload);
  }

  async function uploadAndSave(e, field, folder) {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const url = await uploadPublic(file, folder);
      await savePartial({ [field]: url });
    } catch (err) {
      console.error(err);
      alert("Upload failed. Check bucket/policies and that you are logged in.");
    } finally {
      e.target.value = "";
    }
  }

  async function saveAll() {
    if (!s) return;
    setSaving(true);
    try {
      await savePartial({});
      alert("Saved");
    } catch (e) {
      console.error(e);
      alert("Save failed");
    } finally {
      setSaving(false);
    }
  }

  if (!s) return <div>Loading…</div>;

  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
      <h3 className="text-lg font-semibold mb-3">Site Settings</h3>

      <Row label="Logo (upload)">
        <div className="flex items-center gap-3">
          <input type="file" accept="image/*" onChange={(e) => uploadAndSave(e, "logo_url", "logos")} />
          {s.logo_url && <img src={s.logo_url} className="h-8" alt="logo preview" />}
        </div>
      </Row>

      <Row label="Headshot (upload)">
        <div className="flex items-center gap-3">
          <input type="file" accept="image/*" onChange={(e) => uploadAndSave(e, "headshot_url", "headshots")} />
          {s.headshot_url && (
            <img src={s.headshot_url} className="h-12 w-12 rounded-xl object-cover" alt="headshot preview" />
          )}
        </div>
      </Row>

      <Row label="Notification recipients (emails)">
        <input
          className="w-full bg-white/5 border border-white/15 p-2 rounded"
          value={s.notify_emails || ""}
          onChange={(e) => setS({ ...s, notify_emails: e.target.value })}
          onBlur={() => savePartial({ notify_emails: s.notify_emails || "" })}
          placeholder="you@agency.com, manager@agency.com"
        />
      </Row>

      <Row label="Site Name">
        <input
          className="w-full bg-white/5 border border-white/15 p-2 rounded"
          value={s.site_name || ""}
          onChange={(e) => setS({ ...s, site_name: e.target.value })}
          onBlur={() => savePartial({ site_name: s.site_name || null })}
        />
      </Row>

      <Row label="Hero Title">
        <input
          className="w-full bg-white/5 border border-white/15 p-2 rounded"
          value={s.hero_title || ""}
          onChange={(e) => setS({ ...s, hero_title: e.target.value })}
          onBlur={() => savePartial({ hero_title: s.hero_title || null })}
        />
      </Row>

      <Row label="Hero Sub">
        <input
          className="w-full bg-white/5 border border-white/15 p-2 rounded"
          value={s.hero_sub || ""}
          onChange={(e) => setS({ ...s, hero_sub: e.target.value })}
          onBlur={() => savePartial({ hero_sub: s.hero_sub || null })}
        />
      </Row>

      <Row label="About Name">
        <input
          className="w-full bg-white/5 border border-white/15 p-2 rounded"
          value={s.about_name || ""}
          onChange={(e) => setS({ ...s, about_name: e.target.value })}
          onBlur={() => savePartial({ about_name: s.about_name || null })}
        />
      </Row>

      <Row label="About Bio">
        <textarea
          className="w-full bg-white/5 border border-white/15 p-2 rounded"
          value={s.about_bio || ""}
          onChange={(e) => setS({ ...s, about_bio: e.target.value })}
          onBlur={() => savePartial({ about_bio: s.about_bio || null })}
        />
      </Row>

      {/* NEW: YouTube controls */}
      <Row label="Hero YouTube URL">
        <input
          className="w-full bg-white/5 border border-white/15 p-2 rounded"
          value={s.hero_youtube_url || ""}
          onChange={(e) => setS({ ...s, hero_youtube_url: e.target.value })}
          onBlur={() => savePartial({ hero_youtube_url: s.hero_youtube_url || null })}
          placeholder="https://www.youtube.com/watch?v=..."
        />
      </Row>

      <Row label="YouTube URL (fallback)">
        <input
          className="w-full bg-white/5 border border-white/15 p-2 rounded"
          value={s.youtube_url || ""}
          onChange={(e) => setS({ ...s, youtube_url: e.target.value })}
          onBlur={() => savePartial({ youtube_url: s.youtube_url || null })}
          placeholder="https://www.youtube.com/watch?v=..."
        />
      </Row>

      {/* Removed: Primary/Accent color pickers */}
      {/* Removed: Calendly URL */}

      <button onClick={saveAll} disabled={saving} className="mt-4 px-4 py-2 rounded-lg bg-white text-black">
        {saving ? "Saving…" : "Save"}
      </button>
    </div>
  );
}
