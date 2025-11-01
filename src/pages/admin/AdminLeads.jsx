// File: src/pages/admin/AdminLeads.jsx
import React, { useEffect, useMemo, useState } from "react";
import { supabase } from "../../lib/supabaseClient.js";

const STAGES = ["new", "no-show", "passed", "failed"];

export default function AdminLeads() {
  const [rows, setRows] = useState([]);
  const [q, setQ] = useState("");
  const [stageFilter, setStageFilter] = useState("");
  const [onlyIncomplete, setOnlyIncomplete] = useState(false);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  const [apptsByLead, setApptsByLead] = useState({});
  const [loadingAppts, setLoadingAppts] = useState(false);

  async function loadLeads() {
    setLoading(true);
    setErr("");
    const { data, error } = await supabase
      .from("mf_leads")
      .select("*")
      .order("submitted_at", { ascending: false })
      .limit(1000);
    if (error) {
      console.error(error);
      setErr(error.message || "Load failed");
      setRows([]);
    } else {
      setRows(data || []);
    }
    setLoading(false);
  }

  async function loadAppts() {
    setLoadingAppts(true);
    const { data, error } = await supabase
      .from("mf_appointments")
      .select("id, lead_id, start_utc, end_utc, status, full_name, email, phone")
      .order("start_utc", { ascending: false })
      .limit(2000);
    if (!error) {
      const map = {};
      (data || []).forEach((a) => {
        if (!a.lead_id) return;
        (map[a.lead_id] ||= []).push(a);
      });
      setApptsByLead(map);
    }
    setLoadingAppts(false);
  }

  useEffect(() => {
    loadLeads();
    loadAppts();
  }, []);

  async function patchLead(id, patch) {
    const { error } = await supabase.from("mf_leads").update(patch).eq("id", id);
    if (!error) {
      setRows((rs) => rs.map((r) => (r.id === id ? { ...r, ...patch } : r)));
    } else {
      console.error(error);
      alert("Update failed");
    }
  }

  async function updateApptStatus(id, status, leadId) {
    const { error } = await supabase.from("mf_appointments").update({ status }).eq("id", id);
    if (!error) {
      setApptsByLead((prev) => {
        const list = prev[leadId] || [];
        const next = list.map((r) => (r.id === id ? { ...r, status } : r));
        return { ...prev, [leadId]: next };
      });
    } else {
      alert("Appointment update failed");
    }
  }

  function clearFilters() {
    setQ("");
    setStageFilter("");
    setOnlyIncomplete(false);
  }

  const filtered = useMemo(() => {
    let arr = [...rows];
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
    if (onlyIncomplete) arr = arr.filter((r) => r.is_complete === false);
    return arr;
  }, [rows, q, stageFilter, onlyIncomplete]);

  const fmtWhen = (iso) => {
    if (!iso) return "—";
    const d = new Date(iso);
    return isNaN(d.getTime()) ? "—" : d.toLocaleString();
  };
  const fmtEndTime = (iso) => {
    if (!iso) return "—";
    const d = new Date(iso);
    return isNaN(d.getTime()) ? "—" : d.toLocaleTimeString();
  };

  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
      <div className="flex flex-col sm:flex-row gap-2 sm:items-center sm:justify-between mb-3">
        <h3 className="text-lg font-semibold">Leads</h3>
        <div className="flex gap-2 items-center">
          <span className="text-xs text-white/60">
            Showing <b>{filtered.length}</b> of <b>{rows.length}</b>
          </span>
          <button onClick={loadLeads} className="px-3 py-1.5 rounded bg-white/10">
            {loading ? "…" : "Refresh Leads"}
          </button>
          <button onClick={loadAppts} className="px-3 py-1.5 rounded bg-white/10">
            {loadingAppts ? "…" : "Refresh Appointments"}
          </button>
        </div>
      </div>

      {err && (
        <div className="mb-3 text-sm text-red-300 bg-red-900/30 border border-red-500/30 rounded px-3 py-2">
          {err}
        </div>
      )}

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

      {/* No horizontal scroll: make table fluid and wrap content */}
      <div className="rounded-xl border border-white/10">
        <table className="w-full text-sm table-auto">
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
            {filtered.map((r) => {
              const appts = apptsByLead[r.id] || [];
              return (
                <React.Fragment key={r.id}>
                  {/* Lead row */}
                  <tr className="border-t border-white/10 align-top">
                    <td className="p-2 whitespace-nowrap">{fmtWhen(r.submitted_at || r.created_at)}</td>
                    <td className="p-2">
                      <input
                        className="bg-white/5 border border-white/15 p-1.5 rounded w-full max-w-[220px]"
                        value={r.full_name || ""}
                        onChange={(e) => patchLead(r.id, { full_name: e.target.value })}
                      />
                    </td>
                    <td className="p-2 break-words max-w-[240px]">
                      <input
                        className="bg-white/5 border border-white/15 p-1.5 rounded w-full"
                        value={r.email || ""}
                        onChange={(e) => patchLead(r.id, { email: e.target.value })}
                      />
                    </td>
                    <td className="p-2 break-words max-w-[160px]">
                      <input
                        className="bg-white/5 border border-white/15 p-1.5 rounded w-full"
                        value={r.phone || ""}
                        onChange={(e) => patchLead(r.id, { phone: e.target.value })}
                      />
                    </td>
                    <td className="p-2">
                      <select
                        className="bg-white/5 border border-white/15 p-1.5 rounded"
                        value={r.stage || ""}
                        onChange={(e) => patchLead(r.id, { stage: e.target.value || null })}
                      >
                        <option value="">(none)</option>
                        {STAGES.map((s) => (
                          <option key={s} value={s}>{s}</option>
                        ))}
                      </select>
                    </td>
                    {/* READ-ONLY badge for completion */}
                    <td className="p-2">
                      {r.is_complete ? (
                        <span className="px-2 py-0.5 rounded text-xs bg-green-500/20 text-green-300 border border-green-400/30">
                          Complete
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded text-xs bg-yellow-500/20 text-yellow-200 border border-yellow-400/30">
                          Incomplete
                        </span>
                      )}
                    </td>
                    <td className="p-2 max-w-[240px]">
                      <textarea
                        className="bg-white/5 border border-white/15 p-1.5 rounded w-full min-h-[40px]"
                        placeholder="Internal notes…"
                        value={r.note || ""}
                        onChange={(e) => patchLead(r.id, { note: e.target.value })}
                      />
                    </td>
                    <td className="p-2 max-w-[360px]">
                      <ul className="space-y-1">
                        {(r.answers || []).map((a, i) => (
                          <li key={i} className="text-white/80 break-words">
                            <span className="text-white/50">{a.question || a.question_id}:</span>{" "}
                            {a.value}
                          </li>
                        ))}
                      </ul>
                    </td>
                  </tr>

                  {/* Appointments sub-row (only if the lead booked) */}
                  {appts.length > 0 && (
                    <tr className="border-t border-white/10 bg-black/10">
                      <td className="p-2" colSpan={8}>
                        <div className="text-white/80">
                          <div className="mb-1 font-semibold">Appointments</div>
                          <div className="grid gap-2">
                            {appts.map((a) => (
                              <div
                                key={a.id}
                                className="flex flex-wrap items-center gap-3 rounded border border-white/10 p-2"
                              >
                                <div className="text-white/70 whitespace-nowrap">
                                  {fmtWhen(a.start_utc)} → {fmtEndTime(a.end_utc)}
                                </div>
                                <div className="text-white/50 truncate">
                                  {(a.full_name || r.full_name || "-")} · {(a.email || r.email || "-")} · {(a.phone || r.phone || "-")}
                                </div>
                                <div className="ml-auto">
                                  <select
                                    className="bg-white/5 border border-white/15 p-1 rounded"
                                    value={a.status || "scheduled"}
                                    onChange={(e) => updateApptStatus(a.id, e.target.value, r.id)}
                                  >
                                    {["scheduled", "canceled", "completed", "no-show"].map((s) => (
                                      <option key={s} value={s}>{s}</option>
                                    ))}
                                  </select>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              );
            })}
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

      {/* Hint under the table */}
      <p className="mt-3 text-xs text-white/50">
        Appointments only appear under a lead when they’ve booked (linked by <code>lead_id</code>).
      </p>
    </div>
  );
}
