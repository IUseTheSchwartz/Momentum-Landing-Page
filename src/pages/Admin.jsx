import React, { useEffect, useMemo, useState } from "react";
import { supabase, uploadPublic } from "../lib/supabaseClient";

export default function Admin() {
  const [tab, setTab] = useState("settings");
  return (
    <div className="min-h-screen bg-[#1e1f22] text-white p-6">
      <div className="max-w-5xl mx-auto">
        <div className="flex gap-2 mb-6">
          {["settings", "questions", "proof", "leads"].map((t) => (
            <button key={t} onClick={() => setTab(t)} className={`px-4 py-2 rounded-lg ${tab === t ? "bg-white text-black" : "bg-white/10"}`}>
              {t}
            </button>
          ))}
        </div>
        {tab === "settings" && <AdminSettings />}
        {tab === "questions" && <AdminQuestions />}
        {tab === "proof" && <AdminProof />}
        {tab === "leads" && <AdminLeads />}
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

function AdminSettings() {
  const [s, setS] = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from("mf_site_settings").select("*").limit(1).maybeSingle();
      setS(data || {});
    })();
  }, []);

  async function uploadLogo(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    const url = await uploadPublic(file, "logos");
    setS((x) => ({ ...x, logo_url: url }));
  }
  async function uploadHeadshot(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    const url = await uploadPublic(file, "headshots");
    setS((x) => ({ ...x, headshot_url: url }));
  }

  async function save() {
    setSaving(true);
    try {
      if (s?.id) {
        const { error } = await supabase.from("mf_site_settings").update({ ...s, updated_at: new Date().toISOString() }).eq("id", s.id);
        if (error) throw error;
      } else {
        const { data, error } = await supabase.from("mf_site_settings").insert([{ ...s }]).select().single();
        if (error) throw error;
        setS(data);
      }
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

      <Row label="Logo">
        <div className="flex items-center gap-3">
          <input type="file" onChange={uploadLogo} />
          {s.logo_url && <img src={s.logo_url} className="h-8" />}
        </div>
      </Row>

      <Row label="Headshot">
        <div className="flex items-center gap-3">
          <input type="file" onChange={uploadHeadshot} />
          {s.headshot_url && <img src={s.headshot_url} className="h-12 w-12 rounded-xl object-cover" />}
        </div>
      </Row>

      <Row label="Site Name">
        <input className="w-full bg-white/5 border border-white/15 p-2 rounded"
          value={s.site_name || ""} onChange={(e) => setS({ ...s, site_name: e.target.value })} />
      </Row>

      <Row label="Hero Title">
        <input className="w-full bg-white/5 border border-white/15 p-2 rounded"
          value={s.hero_title || ""} onChange={(e) => setS({ ...s, hero_title: e.target.value })} />
      </Row>

      <Row label="Hero Sub">
        <input className="w-full bg-white/5 border border-white/15 p-2 rounded"
          value={s.hero_sub || ""} onChange={(e) => setS({ ...s, hero_sub: e.target.value })} />
      </Row>

      <Row label="About Name">
        <input className="w-full bg-white/5 border border-white/15 p-2 rounded"
          value={s.about_name || ""} onChange={(e) => setS({ ...s, about_name: e.target.value })} />
      </Row>

      <Row label="About Bio">
        <textarea className="w-full bg-white/5 border border-white/15 p-2 rounded"
          value={s.about_bio || ""} onChange={(e) => setS({ ...s, about_bio: e.target.value })} />
      </Row>

      <Row label="Primary Color">
        <input type="color" value={s.brand_primary || "#6b8cff"} onChange={(e) => setS({ ...s, brand_primary: e.target.value })} />
      </Row>

      <Row label="Accent Color">
        <input type="color" value={s.brand_accent || "#9b5cff"} onChange={(e) => setS({ ...s, brand_accent: e.target.value })} />
      </Row>

      <Row label="Calendly (optional)">
        <input className="w-full bg-white/5 border border-white/15 p-2 rounded"
          value={s.calendly_url || ""} onChange={(e) => setS({ ...s, calendly_url: e.target.value })} />
      </Row>

      <button onClick={save} disabled={saving} className="mt-4 px-4 py-2 rounded-lg bg-white text-black">
        {saving ? "Saving…" : "Save"}
      </button>
    </div>
  );
}

function AdminQuestions() {
  const [list, setList] = useState([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("mf_questions")
        .select("*")
        .order("sort_order", { ascending: true });
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
      // Upsert rows
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
        <button onClick={add} className="px-3 py-1.5 rounded bg-white text-black">Add</button>
      </div>

      {list.map((q, i) => (
        <div key={q.id} className="rounded-xl bg-black/20 p-3 border border-white/10">
          <div className="grid sm:grid-cols-2 gap-2">
            <input
              className="bg-white/5 border border-white/15 p-2 rounded"
              value={q.question_text}
              onChange={(e) => update(i, { question_text: e.target.value })}
            />
            <select
              className="bg-white/5 border border-white/15 p-2 rounded"
              value={q.input_type}
              onChange={(e) => update(i, { input_type: e.target.value })}
            >
              {["text", "textarea", "number", "email", "phone", "select", "radio", "checkbox"].map((t) => (
                <option key={t}>{t}</option>
              ))}
            </select>
          </div>
          <input
            className="mt-2 w-full bg-white/5 border border-white/15 p-2 rounded"
            placeholder="Options (comma-separated, for select/radio)"
            value={(q.input_options || []).join(",")}
            onChange={(e) => update(i, { input_options: e.target.value.split(",").map((s) => s.trim()).filter(Boolean) })}
          />
          <div className="mt-2 grid grid-cols-3 gap-3 text-sm">
            <label className="flex items-center gap-2">
              <input type="checkbox" checked={!!q.required} onChange={(e) => update(i, { required: e.target.checked })} /> Required
            </label>
            <label className="flex items-center gap-2">
              <input type="checkbox" checked={!!q.is_active} onChange={(e) => update(i, { is_active: e.target.checked })} /> Active
            </label>
            <input
              type="number"
              className="bg-white/5 border border-white/15 p-2 rounded"
              value={q.sort_order || 0}
              onChange={(e) => update(i, { sort_order: Number(e.target.value) })}
              title="Order"
            />
          </div>
        </div>
      ))}

      <button onClick={save} disabled={saving} className="px-4 py-2 rounded-lg bg-white text-black">
        {saving ? "Saving…" : "Save Questions"}
      </button>
    </div>
  );
}

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
    const url = await uploadPublic(file, "avatars");
    update(i, { avatar_url: url });
  }
  async function uploadScreenshot(i, file) {
    const url = await uploadPublic(file, "screenshots");
    update(i, { screenshot_url: url });
  }

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
        <button onClick={add} className="px-3 py-1.5 rounded bg-white text-black">Add</button>
      </div>

      {items.map((it, i) => (
        <div key={it.id} className="rounded-xl bg-black/20 p-3 border border-white/10 grid sm:grid-cols-[80px,1fr] gap-3">
          <div className="space-y-2">
            <input type="file" onChange={(e) => uploadAvatar(i, e.target.files?.[0])} />
            {it.avatar_url && <img src={it.avatar_url} className="h-16 w-16 rounded-full object-cover" />}
          </div>
          <div className="space-y-2">
            <div className="grid sm:grid-cols-3 gap-2">
              <input
                className="bg-white/5 border border-white/15 p-2 rounded"
                placeholder="Name"
                value={it.display_name || ""}
                onChange={(e) => update(i, { display_name: e.target.value })}
              />
              <input
                className="bg-white/5 border border-white/15 p-2 rounded"
                placeholder="Amount (USD)"
                value={Number((it.amount_cents || 0) / 100)}
                onChange={(e) => update(i, { amount_cents: Math.round(Number(e.target.value || 0) * 100) })}
              />
              <input
                className="bg-white/5 border border-white/15 p-2 rounded"
                placeholder="When (ISO)"
                value={it.happened_at || ""}
                onChange={(e) => update(i, { happened_at: e.target.value })}
              />
            </div>
            <textarea
              className="w-full bg-white/5 border border-white/15 p-2 rounded"
              placeholder="Message text"
              value={it.message_text || ""}
              onChange={(e) => update(i, { message_text: e.target.value })}
            />
            <div className="flex items-center gap-3 text-sm">
              <label className="flex items-center gap-2">
                <input type="checkbox" checked={!!it.is_published} onChange={(e) => update(i, { is_published: e.target.checked })} /> Published
              </label>
              <label className="flex items-center gap-2">
                <input type="checkbox" checked={!!it.is_pinned} onChange={(e) => update(i, { is_pinned: e.target.checked })} /> Pinned
              </label>
              <input type="file" onChange={(e) => uploadScreenshot(i, e.target.files?.[0])} />
            </div>
            {it.screenshot_url && <img src={it.screenshot_url} alt="screenshot" className="rounded-lg border border-white/10 max-h-40" />}
          </div>
        </div>
      ))}

      <button onClick={save} disabled={saving} className="px-4 py-2 rounded-lg bg-white text-black">
        {saving ? "Saving…" : "Save Proof"}
      </button>
    </div>
  );
}

function AdminLeads() {
  const [rows, setRows] = useState([]);
  useEffect(() => {
    (async () => {
      const { data } = await supabase.from("mf_leads").select("*").order("submitted_at", { ascending: false }).limit(200);
      setRows(data || []);
    })();
  }, []);
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
      <h3 className="text-lg font-semibold mb-3">Recent Leads</h3>
      <div className="overflow-auto">
        <table className="min-w-full text-sm">
          <thead className="text-white/60">
            <tr>
              <th className="text-left p-2">When</th>
              <th className="text-left p-2">Name</th>
              <th className="text-left p-2">Email</th>
              <th className="text-left p-2">Phone</th>
              <th className="text-left p-2">UTM</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className="border-t border-white/10">
                <td className="p-2">{new Date(r.submitted_at).toLocaleString()}</td>
                <td className="p-2">{r.full_name || "-"}</td>
                <td className="p-2">{r.email || "-"}</td>
                <td className="p-2">{r.phone || "-"}</td>
                <td className="p-2">
                  <pre className="whitespace-pre-wrap text-white/70">{JSON.stringify(r.utm || {}, null, 0)}</pre>
                </td>
              </tr>
            ))}
            {!rows.length && (
              <tr><td className="p-3 text-white/60" colSpan={5}>No leads yet.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
