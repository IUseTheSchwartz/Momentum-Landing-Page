// File: src/pages/Admin.jsx
import React, { useEffect, useState } from "react";
import { supabase, uploadPublic } from "../lib/supabaseClient.js";

export default function Admin() {
  const [tab, setTab] = useState("settings");
  return (
    <div className="min-h-screen bg-[#1e1f22] text-white p-6">
      <div className="max-w-5xl mx-auto">
        <div className="flex gap-2 mb-6 items-center">
          {["settings", "questions", "proof", "leads", "availability", "appointments"].map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-4 py-2 rounded-lg ${tab === t ? "bg-white text-black" : "bg-white/10"}`}
            >
              {t}
            </button>
          ))}
          <div className="flex-1" />
          <button
            onClick={async () => {
              await supabase.auth.signOut();
              window.location.reload();
            }}
            className="px-4 py-2 rounded-lg bg-white/10 hover:bg-white/20"
          >
            Sign out
          </button>
        </div>
        {tab === "settings" && <AdminSettings />}
        {tab === "questions" && <AdminQuestions />}
        {tab === "proof" && <AdminProof />}
        {tab === "leads" && <AdminLeads />}
        {tab === "availability" && <AdminAvailability />}
        {tab === "appointments" && <AdminAppointments />}
      </div>
    </div>
  );
}

function Row({ label, children }) {
  return (
    <div className="grid grid-cols-3 items-center gap-3 py-2">
      <div className="text-sm text-white/70">{label}</div>
      <div className="col-span-2">{children}</div>
    </div>
  );
}

/* ---------------- SETTINGS (with upload -> auto-save URL) ---------------- */
function AdminSettings() {
  const [s, setS] = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      const { data, error } = await supabase
        .from("mf_site_settings")
        .select("*")
        .order("updated_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) console.error(error);
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
      const url = await uploadPublic(file, folder); // momentum-public bucket
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

      <Row label="Primary Color">
        <input
          type="color"
          value={s.brand_primary || "#6b8cff"}
          onChange={(e) => {
            const v = e.target.value;
            setS({ ...s, brand_primary: v });
            savePartial({ brand_primary: v }).catch(console.error);
          }}
        />
      </Row>

      <Row label="Accent Color">
        <input
          type="color"
          value={s.brand_accent || "#9b5cff"}
          onChange={(e) => {
            const v = e.target.value;
            setS({ ...s, brand_accent: v });
            savePartial({ brand_accent: v }).catch(console.error);
          }}
        />
      </Row>

      <Row label="Calendly (optional)">
        <input
          className="w-full bg-white/5 border border-white/15 p-2 rounded"
          value={s.calendly_url || ""}
          onChange={(e) => setS({ ...s, calendly_url: e.target.value })}
          onBlur={() => savePartial({ calendly_url: s.calendly_url || null })}
          placeholder="https://calendly.com/..."
        />
      </Row>

      <button onClick={saveAll} disabled={saving} className="mt-4 px-4 py-2 rounded-lg bg-white text-black">
        {saving ? "Saving…" : "Save"}
      </button>
    </div>
  );
}

/* ---------------- QUESTIONS ---------------- */
function AdminQuestions() {
  const [list, setList] = useState([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from("mf_questions").select("*").order("sort_order", { ascending: true });
      setList(data || []);
    })();
  }, []);

  function add() {
    setList((ls) => [
      ...ls,
      {
        id: crypto.randomUUID(),
        question_text: "Are you prepared to work 12–14 hours/day for the first 60 days?",
        input_type: "radio",
        input_options: ["Yes", "No"],
        required: true,
        is_active: true,
        sort_order: (ls?.length || 0) + 1,
        _new: true,
      },
    ]);
  }

  function update(i, patch) {
    setList((ls) => {
      const n = [...ls];
      n[i] = { ...n[i], ...patch };
      return n;
    });
  }

  async function save() {
    setSaving(true);
    try {
      for (const q of list) {
        const row = { ...q };
        delete row._new;
        if (q._new) {
          const { error } = await supabase.from("mf_questions").insert([row]);
          if (error) throw error;
        } else {
          const { error } = await supabase.from("mf_questions").update(row).eq("id", q.id);
          if (error) throw error;
        }
      }
      alert("Questions saved");
    } catch (e) {
      console.error(e);
      alert("Save failed");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-4 space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Questions</h3>
        <button onClick={add} className="px-3 py-1.5 rounded bg-white text-black">
          Add
        </button>
      </div>

      {list.map((q, i) => (
        <div key={q.id} className="rounded-xl bg-black/20 p-3 border border-white/10">
          <div className="grid sm:grid-cols-2 gap-2">
            <label className="text-xs text-white/60">
              Question
              <input
                className="mt-1 bg-white/5 border border-white/15 p-2 rounded w-full"
                value={q.question_text}
                onChange={(e) => update(i, { question_text: e.target.value })}
              />
            </label>
            <label className="text-xs text-white/60">
              Input type
              <select
                className="mt-1 bg-white/5 border border-white/15 p-2 rounded w-full"
                value={q.input_type}
                onChange={(e) => update(i, { input_type: e.target.value })}
              >
                {["text", "textarea", "number", "email", "phone", "select", "radio", "checkbox"].map((t) => (
                  <option key={t}>{t}</option>
                ))}
              </select>
            </label>
          </div>
          <label className="text-xs text-white/60 block mt-2">
            Options (comma-separated, for select/radio)
            <input
              className="mt-1 w-full bg-white/5 border border-white/15 p-2 rounded"
              placeholder="Yes,No"
              value={(q.input_options || []).join(",")}
              onChange={(e) =>
                update(i, {
                  input_options: e.target.value
                    .split(",")
                    .map((s) => s.trim())
                    .filter(Boolean),
                })
              }
            />
          </label>
          <div className="mt-2 grid grid-cols-3 gap-3 text-sm">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={!!q.required}
                onChange={(e) => update(i, { required: e.target.checked })}
              />{" "}
              Required
            </label>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={!!q.is_active}
                onChange={(e) => update(i, { is_active: e.target.checked })}
              />{" "}
              Active
            </label>
            <label className="text-xs text-white/60">
              Order
              <input
                type="number"
                className="mt-1 bg-white/5 border border-white/15 p-2 rounded w-full"
                value={q.sort_order || 0}
                onChange={(e) => update(i, { sort_order: Number(e.target.value) })}
              />
            </label>
          </div>
        </div>
      ))}

      <button onClick={save} disabled={saving} className="px-4 py-2 rounded-lg bg-white text-black">
        {saving ? "Saving…" : "Save Questions"}
      </button>
    </div>
  );
}

/* ---------------- PROOF (CLEAN & LABELED, WITH DEFAULT AVATAR) ---------------- */
function AdminProof() {
  const [items, setItems] = useState([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from("mf_proof_posts").select("*").order("created_at", { ascending: false });
      setItems(data || []);
    })();
  }, []);

  function add() {
    setItems((ls) => [
      ...ls,
      {
        id: crypto.randomUUID(),
        display_name: "New",
        message_text: "Closed FE policy",
        amount_cents: 120000,
        happened_at: new Date().toISOString(),
        is_published: true,
        is_pinned: false,
        _new: true,
      },
    ]);
  }

  function update(i, patch) {
    setItems((ls) => {
      const n = [...ls];
      n[i] = { ...n[i], ...patch };
      return n;
    });
  }

  async function uploadAvatar(i, file) {
    if (!file) return;
    const url = await uploadPublic(file, "avatars");
    update(i, { avatar_url: url });
  }
  async function uploadScreenshot(i, file) {
    if (!file) return;
    const url = await uploadPublic(file, "screenshots");
    update(i, { screenshot_url: url });
  }

  function toLocalDtValue(iso) {
    try {
      const d = iso ? new Date(iso) : new Date();
      const pad = (n) => String(n).padStart(2, "0");
      const yyyy = d.getFullYear();
      const mm = pad(d.getMonth() + 1);
      const dd = pad(d.getDate());
      const hh = pad(d.getHours());
      const mi = pad(d.getMinutes());
      return `${yyyy}-${mm}-${dd}T${hh}:${mi}`;
    } catch {
      return "";
    }
  }
  function fromLocalDtValue(local) {
    if (!local) return new Date().toISOString();
    const d = new Date(local);
    return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString();
  }

  // Discord-style default avatar (embedded SVG)
  const DEFAULT_AVATAR =
    "data:image/svg+xml;utf8," +
    encodeURIComponent(`
      <svg xmlns="http://www.w3.org/2000/svg" width="64" height="64">
        <rect width="100%" height="100%" fill="#2f3136"/>
        <circle cx="32" cy="24" r="12" fill="#b9bbbe"/>
        <rect x="14" y="38" width="36" height="12" rx="6" fill="#b9bbbe"/>
      </svg>
    `);

  async function save() {
    setSaving(true);
    try {
      for (const it of items) {
        const row = { ...it };
        delete row._new;
        if (it._new) {
          const { error } = await supabase.from("mf_proof_posts").insert([row]);
          if (error) throw error;
        } else {
          const { error } = await supabase.from("mf_proof_posts").update(row).eq("id", it.id);
          if (error) throw error;
        }
      }
      alert("Saved");
    } catch (e) {
      console.error(e);
      alert("Save failed");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-4 space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Proof Posts</h3>
        <button onClick={add} className="px-3 py-1.5 rounded bg-white text-black">
          Add
        </button>
      </div>

      {items.map((it, i) => {
        const avatarId = `avatar_${it.id}`;
        const ssId = `screenshot_${it.id}`;
        const nameId = `name_${it.id}`;
        const amtId = `amt_${it.id}`;
        const whenId = `when_${it.id}`;
        const msgId = `msg_${it.id}`;
        const pubId = `pub_${it.id}`;
        const pinId = `pin_${it.id}`;

        return (
          <div
            key={it.id}
            className="rounded-xl bg-black/20 p-3 border border-white/10 space-y-3"
          >
            {/* Uploads Row */}
            <div className="grid sm:grid-cols-2 gap-3">
              <label htmlFor={avatarId} className="text-xs text-white/60">
                Avatar (upload)
                <input
                  id={avatarId}
                  type="file"
                  accept="image/*"
                  className="mt-1 block w-full text-sm"
                  onChange={(e) => uploadAvatar(i, e.target.files?.[0])}
                />
                <div className="mt-2">
                  <img
                    src={it.avatar_url || DEFAULT_AVATAR}
                    className="h-16 w-16 rounded-full object-cover border border-white/10"
                    alt="avatar preview"
                  />
                </div>
              </label>

              <label htmlFor={ssId} className="text-xs text-white/60">
                Screenshot (upload)
                <input
                  id={ssId}
                  type="file"
                  accept="image/*"
                  className="mt-1 block w-full text-sm"
                  onChange={(e) => uploadScreenshot(i, e.target.files?.[0])}
                />
                {it.screenshot_url && (
                  <div className="mt-2">
                    <img
                      src={it.screenshot_url}
                      alt="screenshot preview"
                      className="rounded-lg border border-white/10 max-h-40"
                    />
                  </div>
                )}
              </label>
            </div>

            {/* Labeled Inputs Row */}
            <div className="grid sm:grid-cols-3 gap-3">
              <label htmlFor={nameId} className="text-xs text-white/60">
                Display name
                <input
                  id={nameId}
                  className="mt-1 bg-white/5 border border-white/15 p-2 rounded w-full"
                  placeholder="e.g., Logan H."
                  value={it.display_name || ""}
                  onChange={(e) => update(i, { display_name: e.target.value })}
                />
              </label>

              <label htmlFor={amtId} className="text-xs text-white/60">
                Amount (USD)
                <input
                  id={amtId}
                  type="number"
                  step="1"
                  min="0"
                  className="mt-1 bg-white/5 border border-white/15 p-2 rounded w-full"
                  placeholder="e.g., 1200"
                  value={Number((it.amount_cents || 0) / 100)}
                  onChange={(e) =>
                    update(i, { amount_cents: Math.round(Number(e.target.value || 0) * 100) })
                  }
                />
                <div className="text-[11px] text-white/50 mt-1">Stored as cents for accuracy.</div>
              </label>

              <label htmlFor={whenId} className="text-xs text-white/60">
                When (local)
                <input
                  id={whenId}
                  type="datetime-local"
                  className="mt-1 bg-white/5 border border-white/15 p-2 rounded w-full"
                  value={toLocalDtValue(it.happened_at)}
                  onChange={(e) => update(i, { happened_at: fromLocalDtValue(e.target.value) })}
                />
                <div className="text-[11px] text-white/50 mt-1">
                  Saved as ISO (UTC) under the hood.
                </div>
              </label>
            </div>

            <label htmlFor={msgId} className="text-xs text-white/60 block">
              Message text
              <textarea
                id={msgId}
                className="mt-1 w-full bg-white/5 border border-white/15 p-2 rounded"
                placeholder="Short highlight / context"
                value={it.message_text || ""}
                onChange={(e) => update(i, { message_text: e.target.value })}
              />
            </label>

            <div className="grid sm:grid-cols-3 gap-3 text-sm">
              <label htmlFor={pubId} className="flex items-center gap-2">
                <input
                  id={pubId}
                  type="checkbox"
                  checked={!!it.is_published}
                  onChange={(e) => update(i, { is_published: e.target.checked })}
                />
                <span>Published</span>
              </label>

              <label htmlFor={pinId} className="flex items-center gap-2">
                <input
                  id={pinId}
                  type="checkbox"
                  checked={!!it.is_pinned}
                  onChange={(e) => update(i, { is_pinned: e.target.checked })}
                />
                <span>Pinned</span>
              </label>

              <div className="text-white/60 text-xs self-center">
                Tip: Pin 1–2 top posts to show first.
              </div>
            </div>
          </div>
        );
      })}

      <button onClick={save} disabled={saving} className="px-4 py-2 rounded-lg bg-white text-black">
        {saving ? "Saving…" : "Save Proof"}
      </button>
    </div>
  );
}

/* ---------------- LEADS ---------------- */
function AdminLeads() {
  const [rows, setRows] = useState([]);
  useEffect(() => {
    (async () => {
      const { data } = await supabase.from("mf_leads").select("*").order("created_at", { ascending: false }).limit(500);
      setRows(data || []);
    })();
  }, []);

  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
      <h3 className="text-lg font-semibold mb-3">Leads</h3>
      <div className="overflow-auto">
        <table className="min-w-full text-sm">
          <thead className="text-white/60">
            <tr>
              <th className="p-2 text-left">When</th>
              <th className="p-2 text-left">Name</th>
              <th className="p-2 text-left">Email</th>
              <th className="p-2 text-left">Phone</th>
              <th className="p-2 text-left">Answers</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className="border-t border-white/10 align-top">
                <td className="p-2">{new Date(r.created_at).toLocaleString()}</td>
                <td className="p-2">{r.full_name || "-"}</td>
                <td className="p-2">{r.email || "-"}</td>
                <td className="p-2">{r.phone || "-"}</td>
                <td className="p-2">
                  <ul className="space-y-1">
                    {(r.answers || []).map((a, i) => (
                      <li key={i} className="text-white/80">
                        <span className="text-white/50">{a.question || a.question_id}:</span> {a.value}
                      </li>
                    ))}
                  </ul>
                </td>
              </tr>
            ))}
            {!rows.length && (
              <tr>
                <td className="p-3 text-white/60" colSpan={5}>
                  No leads yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ---------------- AVAILABILITY + BLACKOUTS ---------------- */
function AdminAvailability() {
  const [row, setRow] = useState(null);
  const [saving, setSaving] = useState(false);
  const weekdays = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"];

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("mf_availability")
        .select("*")
        .order("updated_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      setRow(
        data || {
          tz: "America/Chicago",
          slot_minutes: 30,
          buffer_minutes: 15,
          min_lead_hours: 12,
          booking_window_days: 14,
          weekly: {
            mon: [["09:00", "18:00"]],
            tue: [["09:00", "18:00"]],
            wed: [["09:00", "18:00"]],
            thu: [["09:00", "18:00"]],
            fri: [["09:00", "18:00"]],
            sat: [],
            sun: [],
          },
        }
      );
    })();
  }, []);

  async function save() {
    setSaving(true);
    try {
      if (row?.id) {
        const { error } = await supabase
          .from("mf_availability")
          .update({ ...row, updated_at: new Date().toISOString() })
          .eq("id", row.id);
        if (error) throw error;
      } else {
        const { data, error } = await supabase.from("mf_availability").insert([{ ...row }]).select().single();
        if (error) throw error;
        setRow(data);
      }
      alert("Saved");
    } catch (e) {
      console.error(e);
      alert("Save failed");
    } finally {
      setSaving(false);
    }
  }

  function updateRange(dow, idx, field, value) {
    setRow((r) => {
      const w = structuredClone(r.weekly || {});
      const pair = w[dow]?.[idx] || ["09:00", "18:00"];
      const next = field === "start" ? [value, pair[1]] : [pair[0], value];
      w[dow][idx] = next;
      return { ...r, weekly: w };
    });
  }

  function addRange(dow) {
    setRow((r) => {
      const w = structuredClone(r.weekly || {});
      w[dow] = w[dow] || [];
      w[dow].push(["09:00", "17:00"]);
      return { ...r, weekly: w };
    });
  }

  function removeRange(dow, idx) {
    setRow((r) => {
      const w = structuredClone(r.weekly || {});
      w[dow].splice(idx, 1);
      return { ...r, weekly: w };
    });
  }

  if (!row) return <div>Loading…</div>;

  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-4 space-y-4">
      <h3 className="text-lg font-semibold">Availability</h3>
      <Row label="Timezone">
        <input
          className="w-full bg-white/5 border border-white/15 p-2 rounded"
          value={row.tz}
          onChange={(e) => setRow({ ...row, tz: e.target.value })}
          placeholder="America/Chicago"
        />
      </Row>
      <div className="grid grid-cols-2 gap-3">
        <Row label="Slot minutes">
          <input
            type="number"
            className="w-full bg-white/5 border border-white/15 p-2 rounded"
            value={row.slot_minutes}
            onChange={(e) => setRow({ ...row, slot_minutes: Number(e.target.value) })}
          />
        </Row>
        <Row label="Buffer minutes">
          <input
            type="number"
            className="w-full bg-white/5 border border-white/15 p-2 rounded"
            value={row.buffer_minutes}
            onChange={(e) => setRow({ ...row, buffer_minutes: Number(e.target.value) })}
          />
        </Row>
        <Row label="Min lead (hours)">
          <input
            type="number"
            className="w-full bg-white/5 border border-white/15 p-2 rounded"
            value={row.min_lead_hours}
            onChange={(e) => setRow({ ...row, min_lead_hours: Number(e.target.value) })}
          />
        </Row>
        <Row label="Window (days)">
          <input
            type="number"
            className="w-full bg-white/5 border border-white/15 p-2 rounded"
            value={row.booking_window_days}
            onChange={(e) => setRow({ ...row, booking_window_days: Number(e.target.value) })}
          />
        </Row>
      </div>

      <div className="space-y-3">
        {["mon", "tue", "wed", "thu", "fri", "sat", "sun"].map((d) => (
          <div key={d} className="rounded-xl bg-black/20 border border-white/10 p-3">
            <div className="flex items-center justify-between mb-2">
              <div className="capitalize font-semibold">{d}</div>
              <button className="px-2 py-1 rounded bg-white text-black text-sm" onClick={() => addRange(d)}>
                Add range
              </button>
            </div>
            <div className="space-y-2">
              {(row.weekly?.[d] || []).map((pair, idx) => (
                <div key={idx} className="grid grid-cols-[1fr,1fr,auto] gap-2">
                  <input
                    className="bg-white/5 border border-white/15 p-2 rounded"
                    value={pair[0]}
                    onChange={(e) => updateRange(d, idx, "start", e.target.value)}
                    placeholder="09:00"
                  />
                  <input
                    className="bg-white/5 border border-white/15 p-2 rounded"
                    value={pair[1]}
                    onChange={(e) => updateRange(d, idx, "end", e.target.value)}
                    placeholder="18:00"
                  />
                  <button className="px-2 py-1 rounded bg-white/10" onClick={() => removeRange(d, idx)}>
                    Delete
                  </button>
                </div>
              ))}
              {!(row.weekly?.[d] || []).length && <div className="text-white/60 text-sm">No hours</div>}
            </div>
          </div>
        ))}
      </div>

      <h4 className="text-md font-semibold">Blackouts</h4>
      <AdminBlackouts />

      <button onClick={save} disabled={saving} className="mt-2 px-4 py-2 rounded-lg bg-white text-black">
        {saving ? "Saving…" : "Save Availability"}
      </button>
    </div>
  );
}

function AdminBlackouts() {
  const [rows, setRows] = useState([]);
  useEffect(() => {
    (async () => {
      const { data } = await supabase.from("mf_blackouts").select("*").order("start_utc", { ascending: true });
      setRows(data || []);
    })();
  }, []);

  async function add() {
    const start = new Date().toISOString();
    const end = new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString();
    const { data, error } = await supabase
      .from("mf_blackouts")
      .insert([{ start_utc: start, end_utc: end, reason: "Block" }])
      .select()
      .single();
    if (!error) setRows((r) => [...r, data]);
  }
  async function update(id, patch) {
    const { error } = await supabase.from("mf_blackouts").update(patch).eq("id", id);
    if (!error) setRows((r) => r.map((x) => (x.id === id ? { ...x, ...patch } : x)));
  }
  async function remove(id) {
    const { error } = await supabase.from("mf_blackouts").delete().eq("id", id);
    if (!error) setRows((r) => r.filter((x) => x.id !== id));
  }

  return (
    <div className="rounded-xl bg-black/20 border border-white/10 p-3 space-y-2">
      <button className="px-3 py-1.5 rounded bg-white text-black" onClick={add}>
        Add blackout
      </button>
      {rows.map((b) => (
        <div key={b.id} className="grid sm:grid-cols-[1fr,1fr,1fr,auto] gap-2">
          <input
            className="bg-white/5 border border-white/15 p-2 rounded"
            value={b.start_utc}
            onChange={(e) => update(b.id, { start_utc: e.target.value })}
          />
          <input
            className="bg-white/5 border border-white/15 p-2 rounded"
            value={b.end_utc}
            onChange={(e) => update(b.id, { end_utc: e.target.value })}
          />
          <input
            className="bg-white/5 border border-white/15 p-2 rounded"
            value={b.reason || ""}
            onChange={(e) => update(b.id, { reason: e.target.value })}
          />
          <button className="px-2 py-1 rounded bg-white/10" onClick={() => remove(b.id)}>
            Delete
          </button>
        </div>
      ))}
      {!rows.length && <div className="text-white/60 text-sm">No blackouts</div>}
    </div>
  );
}

/* ---------------- APPOINTMENTS ---------------- */
function AdminAppointments() {
  const [rows, setRows] = useState([]);
  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("mf_appointments")
        .select("*")
        .order("start_utc", { ascending: false })
        .limit(500);
      setRows(data || []);
    })();
  }, []);

  async function updateStatus(id, status) {
    const { error } = await supabase.from("mf_appointments").update({ status }).eq("id", id);
    if (!error) setRows((rs) => rs.map((r) => (r.id === id ? { ...r, status } : r)));
  }

  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
      <h3 className="text-lg font-semibold mb-3">Appointments</h3>
      <div className="overflow-auto">
        <table className="min-w-full text-sm">
          <thead className="text-white/60">
            <tr>
              <th className="p-2 text-left">When (UTC)</th>
              <th className="p-2 text-left">Name</th>
              <th className="p-2 text-left">Email</th>
              <th className="p-2 text-left">Phone</th>
              <th className="p-2 text-left">Status</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className="border-t border-white/10">
                <td className="p-2">
                  {new Date(r.start_utc).toLocaleString()} → {new Date(r.end_utc).toLocaleTimeString()}
                </td>
                <td className="p-2">{r.full_name || "-"}</td>
                <td className="p-2">{r.email || "-"}</td>
                <td className="p-2">{r.phone || "-"}</td>
                <td className="p-2">
                  <select
                    className="bg-white/5 border border-white/15 p-1 rounded"
                    value={r.status}
                    onChange={(e) => updateStatus(r.id, e.target.value)}
                  >
                    {["scheduled", "canceled", "completed", "no-show"].map((s) => (
                      <option key={s}>{s}</option>
                    ))}
                  </select>
                </td>
              </tr>
            ))}
            {!rows.length && (
              <tr>
                <td className="p-3 text-white/60" colSpan={5}>
                  No appointments yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
