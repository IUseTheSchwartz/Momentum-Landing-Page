import { useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";
import { formatLocal } from "../lib/timeClient";

export default function ReschedulePage() {
  const url = new URL(window.location.href);
  const appt_id = url.searchParams.get("appt");
  const token = url.searchParams.get("t");

  const [appt, setAppt] = useState(null);
  const [start, setStart] = useState(""); // ISO local text input, e.g., 2025-11-04T09:00
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        // (Optional) fetch existing appt for display with RLS-safe RPC or public endpoint
        setLoading(false);
      } catch {
        setLoading(false);
      }
    })();
  }, [appt_id]);

  async function submit() {
    setSaving(true);
    setMsg("");
    try {
      const res = await fetch("/.netlify/functions/reschedule", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ appt_id, token, new_start_utc: new Date(start).toISOString() })
      });
      if (!res.ok) throw new Error("Failed");
      setMsg("Updated. We just emailed you your new time.");
    } catch (e) {
      setMsg("Could not reschedule. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <div className="p-6 text-white/80">Loading…</div>;

  return (
    <div className="min-h-screen bg-[#1e1f22] text-white p-6">
      <div className="max-w-md mx-auto rounded-2xl border border-white/10 bg-white/5 p-4">
        <h1 className="text-xl font-semibold mb-2">Reschedule your call</h1>
        <p className="text-white/70 text-sm mb-4">Pick a new time below.</p>

        <label className="text-sm text-white/70">New start time</label>
        <input
          type="datetime-local"
          className="w-full bg-white/5 border border-white/15 p-2 rounded mt-1"
          value={start}
          onChange={(e) => setStart(e.target.value)}
        />

        <button
          className="mt-4 px-4 py-2 rounded-lg bg-white text-black disabled:opacity-60"
          onClick={submit}
          disabled={!start || saving}
        >
          {saving ? "Saving…" : "Confirm new time"}
        </button>

        {msg && <div className="mt-3 text-sm text-white/80">{msg}</div>}
      </div>
    </div>
  );
}
