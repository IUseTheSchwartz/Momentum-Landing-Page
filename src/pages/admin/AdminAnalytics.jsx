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

function maskIp(ip) {
  // Keep it readable but not overly revealing (IPv4/IPv6 light mask)
  if (!ip) return "(unknown)";
  if (ip.includes(":")) {
    // IPv6 — keep first two blocks
    const parts = ip.split(":");
    return parts.slice(0, 2).join(":") + "::/masked";
  }
  const parts = ip.split(".");
  if (parts.length === 4) return `${parts[0]}.${parts[1]}.${parts[2]}.x`;
  return ip;
}

export default function AdminAnalytics() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);

  async function load() {
    setLoading(true);
    const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(); // last 30d
    const { data, error } = await supabase
      .from("mf_analytics_sessions")
      .select("*")
      .gte("started_at", since)
      .order("started_at", { ascending: false })
      .limit(3000);
    if (!error) setRows(data || []);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  const totals = useMemo(() => {
    const totalSessions = rows.length;

    // Avg time on page
    const completed = rows.filter(r => typeof r.duration_ms === "number" && r.duration_ms >= 0);
    const avgMs = completed.length
      ? Math.round(completed.reduce((a, r) => a + (r.duration_ms || 0), 0) / completed.length)
      : 0;

    // Unique IPs + frequency
    const byIp = {};
    rows.forEach(r => {
      const ip = r.ip || "(unknown)";
      if (!byIp[ip]) byIp[ip] = { ip, count: 0, totalMs: 0, first: r.started_at, last: r.started_at };
      const obj = byIp[ip];
      obj.count += 1;
      obj.totalMs += (typeof r.duration_ms === "number" ? r.duration_ms : 0);
      if (!obj.first || r.started_at < obj.first) obj.first = r.started_at;
      if (!obj.last || r.started_at > obj.last) obj.last = r.started_at;
    });
    const ipList = Object.values(byIp).sort((a, b) => b.count - a.count);

    const uniqueIps = ipList.length;
    const repeatIps = ipList.filter(x => x.count > 1).length;

    // Daily sessions (single page, but trend is useful)
    const byDate = {};
    rows.forEach(r => {
      const key = (r.started_at || "").slice(0, 10);
      if (key) byDate[key] = (byDate[key] || 0) + 1;
    });
    const daily = Object.entries(byDate).sort((a, b) => a[0].localeCompare(b[0]));

    // Referrers still useful for growth
    const byRef = {};
    rows.forEach(r => { const k = r.referrer || "(direct)"; byRef[k] = (byRef[k] || 0) + 1; });
    const referrers = Object.entries(byRef).sort((a, b) => b[1] - a[1]);

    return {
      totalSessions,
      avgSec: Math.round(avgMs / 1000),
      uniqueIps,
      repeatIps,
      ipList,
      daily,
      referrers,
      recent: rows.slice(0, 50),
    };
  }, [rows]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Analytics (last 30 days)</h3>
        <button onClick={load} className="px-3 py-1.5 rounded bg-white/10">
          {loading ? "…" : "Refresh"}
        </button>
      </div>

      <div className="grid sm:grid-cols-4 gap-3">
        <Stat label="Sessions" value={totals.totalSessions} />
        <Stat label="Unique visitors (IP)" value={totals.uniqueIps} />
        <Stat label="Repeat visitor IPs" value={totals.repeatIps} />
        <Stat label="Avg time on page" value={`${totals.avgSec || 0}s`} />
      </div>

      {/* Top repeat IPs */}
      <div className="rounded-xl border border-white/10 bg-white/5 p-4">
        <div className="font-semibold mb-2">Top Repeat Visitors (by IP)</div>
        <table className="w-full text-sm">
          <thead className="text-white/60">
            <tr>
              <th className="p-2 text-left">IP</th>
              <th className="p-2 text-right">Visits</th>
              <th className="p-2 text-right">Avg Time</th>
              <th className="p-2 text-left">Last Seen</th>
            </tr>
          </thead>
          <tbody>
            {totals.ipList.slice(0, 20).map((ip) => (
              <tr key={ip.ip} className="border-t border-white/10">
                <td className="p-2">{maskIp(ip.ip)}</td>
                <td className="p-2 text-right">{ip.count}</td>
                <td className="p-2 text-right">
                  {ip.count ? Math.round((ip.totalMs / Math.max(1, ip.count)) / 1000) + "s" : "—"}
                </td>
                <td className="p-2">{ip.last ? new Date(ip.last).toLocaleString() : "—"}</td>
              </tr>
            ))}
            {!totals.ipList.length && (
              <tr>
                <td className="p-3 text-white/60" colSpan={4}>
                  No visitors yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Daily trend */}
      <div className="rounded-xl border border-white/10 bg-white/5 p-4">
        <div className="font-semibold mb-2">Daily Sessions</div>
        <table className="w-full text-sm">
          <thead className="text-white/60">
            <tr>
              <th className="py-1 text-left">Date</th>
              <th className="py-1 text-right">Sessions</th>
            </tr>
          </thead>
          <tbody>
            {totals.daily.map(([d, c]) => (
              <tr key={d} className="border-t border-white/10">
                <td className="py-1">{d}</td>
                <td className="py-1 text-right">{c}</td>
              </tr>
            ))}
            {!totals.daily.length && (
              <tr>
                <td className="py-2 text-white/60" colSpan={2}>
                  No data yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Referrers (kept; helps growth) */}
      <div className="rounded-xl border border-white/10 bg-white/5 p-4">
        <div className="font-semibold mb-2">Referrers</div>
        <ul className="space-y-1">
          {totals.referrers.slice(0, 10).map(([r, c]) => (
            <li key={r} className="flex justify-between gap-3">
              <span className="truncate">{r}</span>
              <span className="text-white/60">{c}</span>
            </li>
          ))}
          {!totals.referrers.length && <div className="text-white/60 text-sm">No data yet.</div>}
        </ul>
      </div>

      {/* Recent raw sessions */}
      <div className="rounded-xl border border-white/10 bg-white/5 p-4">
        <div className="font-semibold mb-2">Recent Sessions</div>
        <div className="overflow-auto">
          <table className="w-full text-sm">
            <thead className="text-white/60">
              <tr>
                <th className="p-2 text-left">Started</th>
                <th className="p-2 text-left">Referrer</th>
                <th className="p-2 text-left">IP</th>
                <th className="p-2 text-right">Duration</th>
              </tr>
            </thead>
            <tbody>
              {totals.recent.map((r) => (
                <tr key={r.id} className="border-t border-white/10">
                  <td className="p-2 whitespace-nowrap">{new Date(r.started_at).toLocaleString()}</td>
                  <td className="p-2 truncate max-w-[280px]">{r.referrer || "(direct)"}</td>
                  <td className="p-2">{maskIp(r.ip)}</td>
                  <td className="p-2 text-right">
                    {typeof r.duration_ms === "number" ? Math.round(r.duration_ms / 1000) + "s" : "—"}
                  </td>
                </tr>
              ))}
              {!totals.recent.length && (
                <tr>
                  <td className="p-3 text-white/60" colSpan={4}>
                    No data yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
