// File: src/pages/Reschedule.jsx
import React, { useEffect, useMemo, useState } from "react";
import { supabase } from "../lib/supabaseClient.js";

/* ---------- tiny tz helpers (same pattern as Landing) ---------- */
function tzOffsetMinutes(instant, tz) {
  const asTz = new Date(instant.toLocaleString("en-US", { timeZone: tz }));
  const asUtc = new Date(instant.toLocaleString("en-US", { timeZone: "UTC" }));
  return Math.round((asTz - asUtc) / 60000);
}
function zonedDateTimeToUTCISO({ y, m, d, hh, mm, tz }) {
  const pseudoUtc = new Date(Date.UTC(y, m - 1, d, hh, mm, 0, 0));
  const off = tzOffsetMinutes(pseudoUtc, tz);
  return new Date(pseudoUtc.getTime() - off * 60000).toISOString();
}
function prettyInTz(utcISO, tz = "America/Chicago") {
  const d = new Date(utcISO);
  const day = new Intl.DateTimeFormat("en-US", { weekday: "short", timeZone: tz }).format(d);
  const mon = new Intl.DateTimeFormat("en-US", { month: "short", timeZone: tz }).format(d);
  const date = new Intl.DateTimeFormat("en-US", { day: "numeric", timeZone: tz }).format(d);
  const time = new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
    timeZone: tz,
  }).format(d);
  return `${day}, ${mon} ${date} · ${time}`;
}

export default function Reschedule() {
  const params = new URLSearchParams(window.location.search);
  const apptId = params.get("appt");

  const [settings, setSettings] = useState(null);
  const [appt, setAppt] = useState(null);
  const [email, setEmail] = useState("");
  const [verified, setVerified] = useState(false);

  const [slots, setSlots] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const brand = useMemo(() => {
    const primary = settings?.brand_primary || "#6b8cff";
    const accent = settings?.brand_accent || "#9b5cff";
    return { primary, accent };
  }, [settings]);

  useEffect(() => {
    (async () => {
      const { data: s } = await supabase
        .from("mf_site_settings")
        .select("*")
        .order("updated_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      setSettings(s || {});
    })();
  }, []);

  async function loadAppt() {
    setError("");
    if (!apptId || !email) {
      setError("Enter your email to look up your appointment.");
      return;
    }
    const { data, error: e } = await supabase
      .from("mf_appointments")
      .select("*")
      .eq("id", apptId)
      .maybeSingle();
    if (e || !data) {
      setError("Appointment not found.");
      return;
    }
    const norm = (s) => String(s || "").trim().toLowerCase();
    if (norm(data.email) !== norm(email)) {
      setError("Email doesn’t match this appointment.");
      return;
    }
    setAppt(data);
    setVerified(true);
    computeSlots(data.timezone || "America/Chicago");
  }

  async function computeSlots(tz) {
    // availability
    const { data: av } = await supabase
      .from("mf_availability")
      .select("*")
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    const slotMin = av?.slot_minutes ?? 30;
    const buffer = av?.buffer_minutes ?? 15;
    const minLeadH = av?.min_lead_hours ?? 12;
    const windowDays = av?.booking_window_days ?? 14;
    let weekly = av?.weekly || {};
    if (typeof weekly === "string") {
      try { weekly = JSON.parse(weekly); } catch { weekly = {}; }
    }

    // taken/reserved
    const { data: taken } = await supabase
      .from("mf_appointments")
      .select("start_utc,end_utc,status")
      .in("status", ["booked", "rescheduled", "scheduled"]);
    const { data: blackouts } = await supabase.from("mf_blackouts").select("*");

    const nowUtc = new Date();
    const startWindowUtc = new Date(nowUtc.getTime() + minLeadH * 3600 * 1000);
    const endWindowUtc = new Date(nowUtc.getTime() + windowDays * 24 * 3600 * 1000);

    function overlaps(aStart, aEnd, bStart, bEnd) {
      return aStart < bEnd && bStart < aEnd;
    }

    const out = [];
    let cursorUtc = startWindowUtc;
    while (cursorUtc <= endWindowUtc) {
      const parts = new Intl.DateTimeFormat("en-CA", {
        timeZone: tz,
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      }).format(cursorUtc).split("-");
      const y = +parts[0], m = +parts[1], d = +parts[2];

      const ranges = (weekly[["sun","mon","tue","wed","thu","fri","sat"][
        new Date(zonedDateTimeToUTCISO({ y, m, d, hh: 12, mm: 0, tz })).getUTCDay()
      ]] || []);

      for (const [startStr, endStr] of ranges) {
        const [sH, sM] = startStr.split(":").map(Number);
        const [eH, eM] = endStr.split(":").map(Number);

        let slotStartUtc = new Date(zonedDateTimeToUTCISO({ y, m, d, hh: sH, mm: sM, tz }));
        const rangeEndUtc = new Date(zonedDateTimeToUTCISO({ y, m, d, hh: eH, mm: eM, tz }));

        while (slotStartUtc < rangeEndUtc) {
          const slotEndUtc = new Date(slotStartUtc.getTime() + (av?.slot_minutes ?? 30) * 60000);
          const withBufEndUtc = new Date(slotEndUtc.getTime() + buffer * 60000);

          if (withBufEndUtc <= rangeEndUtc && slotStartUtc >= startWindowUtc) {
            const takenHit = (taken || []).some((t) =>
              overlaps(slotStartUtc, withBufEndUtc, new Date(t.start_utc), new Date(t.end_utc))
            );
            const boHit = (blackouts || []).some((b) =>
              overlaps(slotStartUtc, withBufEndUtc, new Date(b.start_utc), new Date(b.end_utc))
            );

            out.push({
              startUtc: slotStartUtc.toISOString(),
              endUtc: slotEndUtc.toISOString(),
              labelLocal: prettyInTz(slotStartUtc.toISOString(), tz),
              isTaken: !!takenHit,
              isBlocked: !!boHit,
            });
          }
          slotStartUtc = new Date(slotStartUtc.getTime() + (av?.slot_minutes ?? 30) * 60000);
        }
      }

      const next = zonedDateTimeToUTCISO({ y, m, d: d + 1, hh: 12, mm: 0, tz });
      cursorUtc = new Date(next);
    }

    setSlots(out.slice(0, 120));
  }

  async function doReschedule(newStartUtc) {
    setSubmitting(true);
    setError("");
    try {
      const res = await fetch("/.netlify/functions/reschedule", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          appt_id: apptId,
          email,
          new_start_utc: newStartUtc,
        }),
      });
      const txt = await res.text();
      const j = (() => { try { return JSON.parse(txt); } catch { return {}; } })();
      if (!res.ok) {
        throw new Error(j?.error || "Could not reschedule. Try another time.");
      }
      alert("Updated. We emailed the new time.");
      // refresh appointment display
      loadAppt();
    } catch (e) {
      setError(e.message || "Could not reschedule.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div
      className="min-h-screen bg-[#1e1f22] text-white"
      style={{ "--brand-primary": brand.primary, "--brand-accent": brand.accent }}
    >
      <header className="mx-auto max-w-3xl px-4 py-6">
        <h1 className="text-2xl font-bold">Reschedule</h1>
        <p className="text-white/70">Enter your email to view and change your time.</p>
      </header>

      <main className="mx-auto max-w-3xl px-4 pb-24">
        <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4 space-y-4">
          <div className="grid gap-2">
            <label className="text-sm text-white/70">Email on the appointment</label>
            <input
              className="w-full rounded-lg bg-black/30 border border-white/10 px-3 py-2 outline-none"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
            />
            <button
              onClick={loadAppt}
              className="mt-2 rounded-lg bg-white text-black px-4 py-2 font-semibold w-full sm:w-auto"
            >
              Look up
            </button>
          </div>

          {error && <div className="text-sm text-red-400">{error}</div>}

          {verified && appt && (
            <div className="space-y-3">
              <div className="rounded-xl bg-black/20 border border-white/10 p-3">
                <div className="text-white/70 text-sm">Current time</div>
                <div className="text-lg font-semibold">
                  {prettyInTz(appt.start_utc, appt.timezone || "America/Chicago")}
                </div>
              </div>

              <div>
                <div className="mb-2 text-white/80">Pick a new time</div>
                {!slots.length ? (
                  <div className="text-white/70">No slots available right now.</div>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-[60vh] overflow-auto">
                    {slots.map((s) => {
                      const disabled = s.isTaken || s.isBlocked;
                      return (
                        <button
                          key={s.startUtc}
                          disabled={submitting || disabled}
                          onClick={() => doReschedule(s.startUtc)}
                          className={`rounded-lg border px-3 py-2 text-left ${
                            disabled
                              ? "border-white/10 bg-white/[0.03] text-white/40 cursor-not-allowed"
                              : "border-white/15 bg-white/5 hover:bg-white/10"
                          }`}
                        >
                          <div className="font-semibold">{s.labelLocal}</div>
                          {disabled && (
                            <div className="text-xs">{s.isTaken ? "Booked" : "Unavailable"}</div>
                          )}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
