// File: src/pages/Schedule.jsx
import React, { useEffect, useState } from "react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import { supabase } from "../lib/supabaseClient.js";

function Skeleton({ className = "" }) {
  return <div className={`animate-pulse rounded-md bg-white/10 ${className}`} />;
}

/* -------------------- Timezone math helpers (copied from Landing) ------------------ */
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

/* --------------------------- computeSlots (same logic) --------------------------- */
async function computeSlots() {
  const { data: av } = await supabase
    .from("mf_availability")
    .select("*")
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const tz = av?.tz || "America/Chicago";
  const slotMin = av?.slot_minutes ?? 30;
  const buffer = av?.buffer_minutes ?? 15;
  const minLeadH = av?.min_lead_hours ?? 12;
  const windowDays = av?.booking_window_days ?? 14;

  let weekly = av?.weekly || {};
  if (typeof weekly === "string") {
    try { weekly = JSON.parse(weekly); } catch { weekly = {}; }
  }

  const { data: taken } = await supabase
    .from("mf_appointments")
    .select("start_utc, end_utc, status")
    .in("status", ["booked", "rescheduled", "scheduled"]);

  const { data: blackouts } = await supabase.from("mf_blackouts").select("*");

  const overlaps = (aStart, aEnd, bStart, bEnd) => aStart < bEnd && bStart < aEnd;

  const nowUtc = new Date();
  const startWindowUtc = new Date(nowUtc.getTime() + minLeadH * 3600 * 1000);
  const endWindowUtc = new Date(nowUtc.getTime() + windowDays * 24 * 3600 * 1000);

  const out = [];
  let cursorUtc = startWindowUtc;
  while (cursorUtc <= endWindowUtc) {
    const parts = new Intl.DateTimeFormat("en-CA", {
      timeZone: tz,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    })
      .format(cursorUtc)
      .split("-");
    const y = parseInt(parts[0], 10);
    const m = parseInt(parts[1], 10);
    const d = parseInt(parts[2], 10);

    const dow = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"][
      new Date(zonedDateTimeToUTCISO({ y, m, d, hh: 12, mm: 0, tz })).getUTCDay()
    ];
    const ranges = weekly[dow] || [];

    for (const [startStr, endStr] of ranges) {
      const [sH, sM] = startStr.split(":").map(Number);
      const [eH, eM] = endStr.split(":").map(Number);

      let slotStartUtc = new Date(zonedDateTimeToUTCISO({ y, m, d, hh: sH, mm: sM, tz }));
      const rangeEndUtc = new Date(zonedDateTimeToUTCISO({ y, m, d, hh: eH, mm: eM, tz }));

      while (slotStartUtc < rangeEndUtc) {
        const slotEndUtc = new Date(slotStartUtc.getTime() + slotMin * 60000);
        const withBufEndUtc = new Date(slotEndUtc.getTime() + buffer * 60000);

        if (withBufEndUtc <= rangeEndUtc && slotStartUtc >= startWindowUtc) {
          const isTaken = (taken || []).some((t) =>
            overlaps(slotStartUtc, withBufEndUtc, new Date(t.start_utc), new Date(t.end_utc))
          );
          const isBlocked = (blackouts || []).some((b) =>
            overlaps(slotStartUtc, withBufEndUtc, new Date(b.start_utc), new Date(b.end_utc))
          );

          out.push({
            startUtc: slotStartUtc.toISOString(),
            endUtc: slotEndUtc.toISOString(),
            labelLocal: prettyInTz(slotStartUtc.toISOString(), tz),
            labelTz: `Ends ${new Intl.DateTimeFormat("en-US", {
              timeZone: tz,
              hour: "numeric",
              minute: "2-digit",
              hour12: true,
            }).format(slotEndUtc)}`,
            isTaken,
            isBlocked,
          });
        }
        slotStartUtc = new Date(slotStartUtc.getTime() + slotMin * 60000);
      }
    }

    const nextNoonUtcISO = zonedDateTimeToUTCISO({ y, m, d: d + 1, hh: 12, mm: 0, tz });
    cursorUtc = new Date(nextNoonUtcISO);
  }

  return out.slice(0, 120);
}

export default function Schedule() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const leadId = searchParams.get("lead_id");

  const [slots, setSlots] = useState([]);
  const [booking, setBooking] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  // 🔹 Meta Pixel: Lead on schedule page
  useEffect(() => {
    if (window.fbq) {
      window.fbq("track", "Lead");
    }
  }, []);

  useEffect(() => {
    if (!leadId) {
      setLoading(false);
      return;
    }

    (async () => {
      try {
        const s = await computeSlots();
        setSlots(s);
      } catch (e) {
        console.error(e);
        setLoadError("Could not load available times. Please try again later.");
      } finally {
        setLoading(false);
      }
    })();
  }, [leadId]);

  const handleBook = async (slt) => {
    if (!leadId) {
      alert("We couldn't find your application. Please return to the main page and start again.");
      return;
    }

    try {
      setBooking(true);
      const { data: av } = await supabase
        .from("mf_availability")
        .select("*")
        .order("updated_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      const tz = av?.tz || "America/Chicago";
      const durationMin = av?.slot_minutes ?? 30;

      const res = await fetch("/.netlify/functions/appointment-create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          lead_id: leadId,
          start_utc: slt.startUtc,
          duration_min: durationMin,
          tz,
        }),
      });
      if (!res.ok) {
        const txt = await res.text().catch(() => "");
        let msg = "Could not book. Try another slot.";
        try {
          const j = JSON.parse(txt);
          if (j?.error) msg = j.error;
        } catch {}
        if (res.status === 409) msg = "That slot was just taken. Pick another.";
        throw new Error(msg);
      }

      // On success, go to Thank You page
      navigate("/thank-you");
    } catch (e) {
      alert(e.message || "Could not book. Try another slot.");
    } finally {
      setBooking(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#1e1f22] text-white">
      <header className="mx-auto max-w-6xl px-4 py-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-9 w-32 bg-white/10 rounded" />
          <span className="text-white/60">Momentum Financial</span>
        </div>
        <Link
          to="/"
          className="text-sm text-white/70 hover:text-white underline-offset-2 hover:underline"
        >
          Back to homepage
        </Link>
      </header>

      <main className="mx-auto max-w-6xl px-4 pb-24">
        <h1 className="text-2xl sm:text-3xl font-bold mb-2">Pick a time</h1>
        <p className="text-white/70 mb-6">
          Choose a time that works best for you. You’ll get a confirmation with all the details.
        </p>

        {!leadId && (
          <div className="rounded-xl border border-red-500/40 bg-red-500/10 p-4 mb-6 text-sm">
            We couldn’t find your application. Please{" "}
            <Link to="/" className="underline underline-offset-2">
              return to the main page
            </Link>{" "}
            and start again.
          </div>
        )}

        {loading && (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-80">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-20 w-full rounded-lg" />
            ))}
          </div>
        )}

        {!loading && loadError && (
          <div className="rounded-xl border border-red-500/40 bg-red-500/10 p-4 text-sm">
            {loadError}
          </div>
        )}

        {!loading && !loadError && leadId && (
          <>
            {!slots.length ? (
              <div className="text-white/70">
                No slots available right now. Please check back later or reach out directly.
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-80 overflow-auto">
                {slots.map((slt) => {
                  const disabled = slt.isTaken || slt.isBlocked || booking;
                  return (
                    <button
                      key={slt.startUtc}
                      disabled={disabled}
                      onClick={() => handleBook(slt)}
                      className={`rounded-lg border px-3 py-2 text-left ${
                        slt.isTaken || slt.isBlocked
                          ? "border-white/10 bg-white/[0.03] text.white/40 cursor-not-allowed"
                          : "border-white/15 bg-white/5 hover:bg-white/10"
                      }`}
                    >
                      <div className="font-semibold">{slt.labelLocal}</div>
                      <div className="text-xs text-white/60">
                        {slt.isTaken ? "Booked" : slt.labelTz}
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}
