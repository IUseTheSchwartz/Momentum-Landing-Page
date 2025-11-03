// File: src/pages/admin/AdminAnalytics.jsx
import React, { useEffect, useMemo, useState } from "react";
import { supabase } from "../../lib/supabaseClient.js";

function Stat({ label, value, sub }) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/5 p-4">
      <div className="text-sm text-white/60">{label}</div>
      <div className="text-2xl font-bold">{value}</div>
      {sub && <div className="text-xs text-white/50 mt-1">{sub}</div>}
    </div>
  );
}

export default function AdminAnalytics() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);

  async function load() {
    setLoading(true);
    const { data, error } = await supabase
      .from("mf_analytics_sessions")
      .select("*")
      .gte("started_at", new Date(Date.now() - 30*24*60*60*1000).toISOString()) // last 30d
      .order("started_at", { ascending: false })
      .limit(2000);
    if (!error) setRows(data || []);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  const totals = useMemo(() => {
    const totalSessions = rows.length;
    const withDur = rows.filter(r => typeof r.duration_ms === "number" && r.duration_ms >= 0);
    const avgMs = withDur.length
      ? Math.round(withDur.reduce((a, r) => a + (r.duration_ms || 0), 0) / withDur.length)
      : 0;

    // pageview per path
    const byPath = {};
    rows.forEach(r => { const p = r.path || "/"; byPath[p] = (byPath[p] || 0) + 1; });

    // daily counts
    const byDate = {};
    rows.forEach(r => {
      const key = (r.started_at || "").slice(0,10);
      if (key) byDate[key] = (byDate[key] || 0) + 1;
    });

    // referrers
    const byRef = {};
    rows.forEach(r => { const k = r.referrer || "(direct)"; byRef[k] = (byRef[k] || 0) + 1; });

    return {
      totalSessions,
      avgSec: Math.round(avgMs / 1000),
      byPath: Object.entries(byPath).sort((a,b)=>b[1]-a[1]),
      byDate: Object.entries(byDate).sort((a,b)=>a[0].localeCompare(b[0])),
      byRef: Object.entries(byRef).sort((a,b)=>b[1]-a[1]),
      recent: rows.slice(0, 50),
    };
  }, [rows]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Analytics (last 30 days)</h3>
        <button onClick={load} className="px-3 py-1.5 rounded bg-white/10">{loading ? "…" : "Refresh"}</button>
      </div>

      <div className="grid sm:grid-cols-3 gap-3">
        <Stat label="Visitors (sessions)" value={totals.totalSessions} />
        <Stat label="Avg time on page" value={`${totals.avgSec || 0}s`} sub="Across sessions with recorded end" />
        <Stat label="Top path" value={totals.byPath[0]?.[0] || "/"} sub={`${totals.byPath[0]?.[1] || 0} views`} />
      </div>

      <div className="grid lg:grid-cols-2 gap-4">
        <div className="rounded-xl border border-white/10 bg-white/5 p-4">
          <div className="font-semibold mb-2">Top Pages</div>
          <ul className="space-y-1">
            {totals.byPath.slice(0,10).map(([p,c]) => (
              <li key={p} className="flex justify-between gap-3">
                <span className="truncate">{p}</span><span className="text-white/60">{c}</span>
              </li>
            ))}
            {!totals.byPath.length && <div className="text-white/60 text-sm">No data yet.</div>}
          </ul>
        </div>

        <div className="rounded-xl border border-white/10 bg-white/5 p-4">
          <div className="font-semibold mb-2">Top Referrers</div>
          <ul className="space-y-1">
            {totals.byRef.slice(0,10).map(([r,c]) => (
              <li key={r} className="flex justify-between gap-3">
                <span className="truncate">{r}</span><span className="text-white/60">{c}</span>
              </li>
            ))}
            {!totals.byRef.length && <div className="text-white/60 text-sm">No data yet.</div>}
          </ul>
        </div>
      </div>

      <div className="rounded-xl border border-white/10 bg-white/5 p-4">
        <div className="font-semibold mb-2">Daily Visitors</div>
        <table className="w-full text-sm">
          <thead className="text-white/60">
            <tr><th className="py-1 text-left">Date</th><th className="py-1 text-right">Sessions</th></tr>
          </thead>
          <tbody>
            {totals.byDate.map(([d,c]) => (
              <tr key={d} className="border-t border-white/10">
                <td className="py-1">{d}</td>
                <td className="py-1 text-right">{c}</td>
              </tr>
            ))}
            {!totals.byDate.length && (
              <tr><td className="py-2 text-white/60" colSpan={2}>No data yet.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="rounded-xl border border-white/10 bg-white/5 p-4">
        <div className="font-semibold mb-2">Recent Sessions</div>
        <div className="overflow-auto">
          <table className="w-full text-sm">
            <thead className="text-white/60">
              <tr>
                <th className="p-2 text-left">Started</th>
                <th className="p-2 text-left">Path</th>
                <th className="p-2 text-left">Referrer</th>
                <th className="p-2 text-right">Duration</th>
              </tr>
            </thead>
            <tbody>
              {totals.recent.map((r) => (
                <tr key={r.id} className="border-t border-white/10">
                  <td className="p-2 whitespace-nowrap">{new Date(r.started_at).toLocaleString()}</td>
                  <td className="p-2 truncate max-w-[280px]">{r.path || "/"}</td>
                  <td className="p-2 truncate max-w-[280px]">{r.referrer || "(direct)"}</td>
                  <td className="p-2 text-right">{typeof r.duration_ms === "number" ? Math.round(r.duration_ms/1000)+"s" : "—"}</td>
                </tr>
              ))}
              {!totals.recent.length && (
                <tr><td className="p-3 text-white/60" colSpan={4}>No data yet.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
