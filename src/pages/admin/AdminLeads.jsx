// File: src/pages/admin/AdminLeads.jsx
import React, { useEffect, useMemo, useState } from "react";
import { supabase } from "../../lib/supabaseClient.js";

const STAGES = ["new", "qualified", "booked", "no-show", "closed-won", "closed-lost"];

export default function AdminLeads() {
  const [rows, setRows] = useState([]);
  const [q, setQ] = useState("");
  const [stageFilter, setStageFilter] = useState("");
  const [onlyIncomplete, setOnlyIncomplete] = useState(false);
  const [loading, setLoading] = useState(false);

  async function load() {
    setLoading(true);
    const { data, error } = await supabase
      .from("mf_leads")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(1000);
    if (!error) setRows(data || []);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  async function patch(id, patch) {
    const { error } = await supabase.from("mf_leads").update(patch).eq("id", id);
    if (!error) setRows((rs) => rs.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  }

  function clearFilters() {
    setQ("");
    setStageFilter("");
    setOnlyIncomplete(false);
  }

  const filtered = useMemo(() => {
    let arr = [...rows];

    // Apply text search only if 2+ characters to avoid accidental hiding
    const needle = q.trim().toLowerCase();
    if (needle.length >= 2) {
      arr = arr.filter((r) =>
        (r.full_name || "").toLowerCase().includes(needle) ||
        (r.email || "").toLowerCase().includes(needle) ||
        (r.phone || "").toLowerCase().includes(needle) ||
        JSON.stringify(r.answers || []).toLowerCase().includes(needle)
      );
    }

    if (stageFilter) arr = arr.filter((r) => (r.stage || "") === stageFilter);
    if (onlyIncomplete) arr = arr.filter((r) => r.is_complete === false); // explicit false

    return arr;
  }, [rows, q, stageFilter, onlyIncomplete]);

  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
      <div className="flex flex-col sm:flex-row gap-2 sm:items-center sm:justify-between mb-3">
        <h3 className="text-lg font-semibold">Leads</h3>
        <div className="flex gap-2 items-center">
          <span className="text-xs text-white/60">
            Showing <b>{filtered.length}</b> of <b>{rows.length}</b>
          </span>
          <button onClick={load} className="px-3 py-1.5 rounded bg-white/10">
            {loading ? "…" : "Refresh"}
          </button>
        </div>
      </div>

      <div className="flex flex-wrap gap-2 mb-3">
        <input
          className="bg-white/5 border border-white/15 p-2 rounded w-56"
          placeholder="Search (min 2 chars)…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        <select
          className="bg-white/5 border border-white/15 p-2 rounded text-sm"
          value={stageFilter}
          onChange={(e) => setStageFilter(e.target.value)}
        >
          <option value="">All stages</option>
          {STAGES.map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
        <label className="text-sm flex items-center gap-2">
          <input
            type="checkbox"
            checked={onlyIncomplete}
            onChange={(e) => setOnlyIncomplete(e.target.checked)}
          />
          Incomplete only
        </label>
        <button onClick={clearFilters} className="px-3 py-1.5 rounded bg-white/10">Clear filters</button>
      </div>

      <div className="overflow-auto rounded-xl border border-white/10">
        <table className="min-w-full text-sm">
          <thead className="text-white/60 bg-black/20">
            <tr>
              <th className="p-2 text-left">When</th>
              <th className="p-2 text-left">Name</th>
              <th className="p-2 text-left">Email</th>
              <th className="p-2 text-left">Phone</th>
              <th className="p-2 text-left">Stage</th>
              <th className="p-2 text-left">Complete</th>
              <th className="p-2 text-left">Note</th>
              <th className="p-2 text-left">Answers</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((r) => (
              <tr key={r.id} className="border-t border-white/10 align-top">
                <td className="p-2">{new Date(r.created_at).toLocaleString()}</td>
                <td className="p-2">
                  <input
                    className="bg-white/5 border border-white/15 p-1.5 rounded w-44"
                    value={r.full_name || ""}
                    onChange={(e) => patch(r.id, { full_name: e.target.value })}
                  />
                </td>
                <td className="p-2">
                  <input
                    className="bg-white/5 border border-white/15 p-1.5 rounded w-56"
                    value={r.email || ""}
                    onChange={(e) => patch(r.id, { email: e.target.value })}
                  />
                </td>
                <td className="p-2">
                  <input
                    className="bg-white/5 border border-white/15 p-1.5 rounded w-40"
                    value={r.phone || ""}
                    onChange={(e) => patch(r.id, { phone: e.target.value })}
                  />
                </td>
                <td className="p-2">
                  <select
                    className="bg-white/5 border border-white/15 p-1.5 rounded"
                    value={r.stage || ""}
                    onChange={(e) => patch(r.id, { stage: e.target.value || null })}
                  >
                    <option value="">(none)</option>
                    {STAGES.map((s) => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </td>
                <td className="p-2">
                  <input
                    type="checkbox"
                    checked={!!r.is_complete}
                    onChange={(e) => patch(r.id, { is_complete: e.target.checked })}
                  />
                </td>
                <td className="p-2">
                  <textarea
                    className="bg-white/5 border border-white/15 p-1.5 rounded w-64 min-h-[40px]"
                    placeholder="Internal notes…"
                    value={r.note || ""}
                    onChange={(e) => patch(r.id, { note: e.target.value })}
                  />
                </td>
                <td className="p-2">
                  <ul className="space-y-1 max-w-[420px]">
                    {(r.answers || []).map((a, i) => (
                      <li key={i} className="text-white/80">
                        <span className="text-white/50">{a.question || a.question_id}:</span>{" "}
                        {a.value}
                      </li>
                    ))}
                  </ul>
                </td>
              </tr>
            ))}
            {!filtered.length && (
              <tr>
                <td className="p-3 text-white/60" colSpan={8}>
                  No leads match.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
