// File: src/pages/admin/AdminAvailability.jsx
import React, { useEffect, useState } from "react";
import { supabase } from "../../lib/supabaseClient.js";

function Row({ label, children }) {
  return (
    <div className="grid grid-cols-3 items-center gap-3 py-2">
      <div className="text-sm text-white/70">{label}</div>
      <div className="col-span-2">{children}</div>
    </div>
  );
}

export default function AdminAvailability() {
  const [row, setRow] = useState(null);
  const [saving, setSaving] = useState(false);

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

      {["mon", "tue", "wed", "thu", "fri", "sat", "sun"].map((d) => (
        <div key={d} className="rounded-xl bg-black/20 border border-white/10 p-3 mb-2">
          <div className="flex items-center justify-between mb-2">
            <div className="capitalize font-semibold">{d}</div>
            <button className="px-2 py-1 rounded bg-white text-black text-sm" onClick={() => addRange(d)}>Add range</button>
          </div>
          <div className="space-y-2">
            {(row.weekly?.[d] || []).map((pair, idx) => (
              <div key={idx} className="grid grid-cols-[1fr,1fr,auto] gap-2">
                <input className="bg-white/5 border border-white/15 p-2 rounded"
                  value={pair[0]} onChange={(e) => updateRange(d, idx, "start", e.target.value)} placeholder="09:00" />
                <input className="bg-white/5 border border-white/15 p-2 rounded"
                  value={pair[1]} onChange={(e) => updateRange(d, idx, "end", e.target.value)} placeholder="18:00" />
                <button className="px-2 py-1 rounded bg-white/10" onClick={() => removeRange(d, idx)}>Delete</button>
              </div>
            ))}
            {!(row.weekly?.[d] || []).length && <div className="text-white/60 text-sm">No hours</div>}
          </div>
        </div>
      ))}

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
      <button className="px-3 py-1.5 rounded bg-white text-black" onClick={add}>Add blackout</button>
      {rows.map((b) => (
        <div key={b.id} className="grid sm:grid-cols-[1fr,1fr,1fr,auto] gap-2">
          <input className="bg-white/5 border border-white/15 p-2 rounded"
            value={b.start_utc} onChange={(e) => update(b.id, { start_utc: e.target.value })} />
          <input className="bg-white/5 border border-white/15 p-2 rounded"
            value={b.end_utc} onChange={(e) => update(b.id, { end_utc: e.target.value })} />
          <input className="bg-white/5 border border-white/15 p-2 rounded"
            value={b.reason || ""} onChange={(e) => update(b.id, { reason: e.target.value })} />
          <button className="px-2 py-1 rounded bg-white/10" onClick={() => remove(b.id)}>Delete</button>
        </div>
      ))}
      {!rows.length && <div className="text-white/60 text-sm">No blackouts</div>}
    </div>
  );
}
