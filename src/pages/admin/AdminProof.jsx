// File: src/pages/admin/AdminProof.jsx
import React, { useEffect, useMemo, useState } from "react";
import { supabase, uploadPublic } from "../../lib/supabaseClient.js";

export default function AdminProof() {
  const [items, setItems] = useState([]);
  const [saving, setSaving] = useState(false);
  const [q, setQ] = useState("");
  const [onlyPinned, setOnlyPinned] = useState(false);
  const [onlyPublished, setOnlyPublished] = useState(false);
  const [compact, setCompact] = useState(true);
  const [sort, setSort] = useState("newest");

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("mf_proof_posts")
        .select("*")
        .order("created_at", { ascending: false });
      setItems(data || []);
    })();
  }, []);

  function add() {
    setItems((ls) => [
      {
        id: crypto.randomUUID(),
        display_name: "New",
        message_text: "Closed FE policy",
        happened_at: new Date().toISOString(),
        is_published: true,
        is_pinned: false,
        _new: true,
      },
      ...ls,
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

  function toLocalDtValue(iso) {
    try {
      const d = iso ? new Date(iso) : new Date();
      const pad = (n) => String(n).padStart(2, "0");
      const yyyy = d.getFullYear(); const mm = pad(d.getMonth() + 1);
      const dd = pad(d.getDate()); const hh = pad(d.getHours()); const mi = pad(d.getMinutes());
      return `${yyyy}-${mm}-${dd}T${hh}:${mi}`;
    } catch { return ""; }
  }
  function fromLocalDtValue(local) {
    if (!local) return new Date().toISOString();
    const d = new Date(local);
    return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString();
  }

  const DEFAULT_AVATAR =
    "data:image/svg+xml;utf8," +
    encodeURIComponent(`<svg xmlns='http://www.w3.org/2000/svg' width='64' height='64'>
      <rect width='100%' height='100%' fill='#2f3136'/>
      <circle cx='32' cy='24' r='12' fill='#b9bbbe'/>
      <rect x='14' y='38' width='36' height='12' rx='6' fill='#b9bbbe'/>
    </svg>`);

  async function remove(id) {
    const row = items.find((x) => x.id === id);
    const go = window.confirm(`Delete this proof from ${row?.display_name || "rep"}?`);
    if (!go) return;
    try {
      if (!row?._new) {
        const { error } = await supabase.from("mf_proof_posts").delete().eq("id", id);
        if (error) throw error;
      }
      setItems((ls) => ls.filter((x) => x.id !== id));
    } catch (e) {
      console.error(e);
      alert("Delete failed");
    }
  }

  async function save() {
    setSaving(true);
    try {
      for (const it of items) {
        const row = { ...it }; delete row._new;
        if (it._new) {
          const { error } = await supabase.from("mf_proof_posts").insert([row]);
          if (error) throw error;
        } else {
          const { error } = await supabase.from("mf_proof_posts").update(row).eq("id", it.id);
          if (error) throw error;
        }
      }
      alert("Saved");
      const { data } = await supabase.from("mf_proof_posts").select("*").order("created_at", { ascending: false });
      setItems(data || []);
    } catch (e) {
      console.error(e); alert("Save failed");
    } finally { setSaving(false); }
  }

  const organized = useMemo(() => {
    let arr = [...(items || [])];
    if (q.trim()) {
      const needle = q.toLowerCase();
      arr = arr.filter(
        (x) =>
          (x.display_name || "").toLowerCase().includes(needle) ||
          (x.message_text || "").toLowerCase().includes(needle)
      );
    }
    if (onlyPinned) arr = arr.filter((x) => !!x.is_pinned);
    if (onlyPublished) arr = arr.filter((x) => !!x.is_published);

    if (sort === "newest") {
      arr.sort((a, b) => new Date(b.happened_at || b.created_at || 0) - new Date(a.happened_at || a.created_at || 0));
    } else if (sort === "oldest") {
      arr.sort((a, b) => new Date(a.happened_at || a.created_at || 0) - new Date(b.happened_at || b.created_at || 0));
    } else if (sort === "pinned") {
      arr.sort((a, b) => (b.is_pinned ? 1 : 0) - (a.is_pinned ? 1 : 0));
    }
    return arr;
  }, [items, q, onlyPinned, onlyPublished, sort]);

  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-4 space-y-3">
      <div className="flex flex-col sm:flex-row gap-2 sm:items-center sm:justify-between">
        <h3 className="text-lg font-semibold">Proof Posts</h3>
        <div className="flex gap-2">
          <button onClick={add} className="px-3 py-1.5 rounded bg-white text-black">Add</button>
          <button onClick={save} disabled={saving} className="px-3 py-1.5 rounded bg-white/10">
            {saving ? "Saving…" : "Save"}
          </button>
        </div>
      </div>

      <div className="grid gap-2 sm:grid-cols-[1fr,auto,auto,auto]">
        <input
          className="bg-white/5 border border-white/15 p-2 rounded w-full"
          placeholder="Search by name or message…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={onlyPinned} onChange={(e) => setOnlyPinned(e.target.checked)} /> Pinned only
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={onlyPublished} onChange={(e) => setOnlyPublished(e.target.checked)} /> Published only
        </label>
        <div className="flex items-center justify-end gap-2">
          <select
            className="bg-white/5 border border-white/15 p-2 rounded text-sm"
            value={sort}
            onChange={(e) => setSort(e.target.value)}
            title="Sort"
          >
            <option value="newest">Newest</option>
            <option value="oldest">Oldest</option>
            <option value="pinned">Pinned first</option>
          </select>
          <button className="px-2 py-1 rounded bg-white/10 text-sm" onClick={() => setCompact((v) => !v)}>
            {compact ? "Expanded" : "Compact"}
          </button>
        </div>
      </div>

      {compact ? (
        <div className="overflow-auto rounded-xl border border-white/10">
          <table className="min-w-full text-sm">
            <thead className="text-white/60 bg-black/20">
              <tr>
                <th className="p-2 text-left">Rep</th>
                <th className="p-2 text-left">Message</th>
                <th className="p-2 text-left">When</th>
                <th className="p-2 text-left">Published</th>
                <th className="p-2 text-left">Pinned</th>
                <th className="p-2 text-left">Actions</th>
              </tr>
            </thead>
            <tbody>
              {organized.map((it) => {
                const idx = items.findIndex((x) => x.id === it.id);
                return (
                  <tr key={it.id} className="border-t border-white/10 align-top">
                    <td className="p-2">
                      <div className="flex items-center gap-2">
                        <img src={it.avatar_url || DEFAULT_AVATAR} alt="" className="h-8 w-8 rounded-full object-cover border border-white/10" />
                        <input className="bg-white/5 border border-white/15 p-1.5 rounded w-40"
                          value={it.display_name || ""} onChange={(e) => update(idx, { display_name: e.target.value })} placeholder="Rep name" />
                      </div>
                    </td>
                    <td className="p-2">
                      <textarea className="bg-white/5 border border-white/15 p-1.5 rounded w-full min-h-[40px]"
                        value={it.message_text || ""} onChange={(e) => update(idx, { message_text: e.target.value })} placeholder="Short highlight" />
                    </td>
                    <td className="p-2">
                      <input type="datetime-local" className="bg-white/5 border border-white/15 p-1.5 rounded"
                        value={toLocalDtValue(it.happened_at)} onChange={(e) => update(idx, { happened_at: fromLocalDtValue(e.target.value) })} />
                    </td>
                    <td className="p-2">
                      <input type="checkbox" checked={!!it.is_published} onChange={(e) => update(idx, { is_published: e.target.checked })} />
                    </td>
                    <td className="p-2">
                      <input type="checkbox" checked={!!it.is_pinned} onChange={(e) => update(idx, { is_pinned: e.target.checked })} />
                    </td>
                    <td className="p-2">
                      <div className="flex items-center gap-2">
                        <label className="px-2 py-1 rounded bg-white/10 cursor-pointer">
                          Upload Avatar
                          <input type="file" accept="image/*" className="hidden"
                            onChange={(e) => uploadAvatar(idx, e.target.files?.[0])} />
                        </label>
                        <button className="px-2 py-1 rounded bg-[#ff4040]/80 hover:bg-[#ff4040] text-white" onClick={() => remove(it.id)}>
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {!organized.length && (
                <tr><td className="p-3 text-white/60" colSpan={6}>No proof yet.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      ) : null}
    </div>
  );
}
