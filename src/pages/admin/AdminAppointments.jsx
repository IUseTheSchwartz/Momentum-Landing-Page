// File: src/pages/admin/AdminAppointments.jsx
import React, { useEffect, useState } from "react";
import { supabase } from "../../lib/supabaseClient.js";

export default function AdminAppointments() {
  const [rows, setRows] = useState([]);

  async function load() {
    const { data } = await supabase
      .from("mf_appointments")
      .select("*")
      .order("start_utc", { ascending: false })
      .limit(500);
    setRows(data || []);
  }

  useEffect(() => { load(); }, []);

  async function updateStatus(id, status) {
    const { error } = await supabase.from("mf_appointments").update({ status }).eq("id", id);
    if (!error) setRows((rs) => rs.map((r) => (r.id === id ? { ...r, status } : r)));
  }

  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-lg font-semibold">Appointments</h3>
        <button className="px-3 py-1.5 rounded bg-white/10" onClick={load}>Refresh</button>
      </div>
      <div className="overflow-auto">
        <table className="min-w-full text-sm">
          <thead className="text-white/60">
            <tr>
              <th className="p-2 text-left">When (local)</th>
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
                    value={r.status || "scheduled"}
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
