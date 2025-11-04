// File: netlify/functions/reschedule.js
import { getServiceClient } from "./_supabase.js";

// -------- helpers (mirror Landing logic) ----------
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
    hour: "numeric", minute: "2-digit", hour12: true, timeZone: tz,
  }).format(d);
  return `${day}, ${mon} ${date} · ${time}`;
}
function overlaps(aStart, aEnd, bStart, bEnd) {
  return aStart < bEnd && bStart < aEnd;
}

async function computeSlots(supabase, tz, slotMin, buffer, minLeadH, windowDays, weekly) {
  // appointments to block
  const { data: taken } = await supabase
    .from("mf_appointments")
    .select("start_utc, end_utc, status")
    .in("status", ["booked", "rescheduled", "scheduled"]);

  // blackouts
  const { data: blackouts } = await supabase.from("mf_blackouts").select("*");

  const nowUtc = new Date();
  const startWindowUtc = new Date(nowUtc.getTime() + minLeadH * 3600 * 1000);
  const endWindowUtc = new Date(nowUtc.getTime() + windowDays * 24 * 3600 * 1000);

  const out = [];
  let cursorUtc = startWindowUtc;
  while (cursorUtc <= endWindowUtc) {
    const parts = new Intl.DateTimeFormat("en-CA", {
      timeZone: tz, year: "numeric", month: "2-digit", day: "2-digit",
    })
      .format(cursorUtc)
      .split("-");
    const y = parseInt(parts[0], 10);
    const m = parseInt(parts[1], 10);
    const d = parseInt(parts[2], 10);

    const dow = ["sun","mon","tue","wed","thu","fri","sat"][
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

        let isTaken = false;
        let isBlocked = false;
        if (withBufEndUtc <= rangeEndUtc && slotStartUtc >= startWindowUtc) {
          isTaken = (taken || []).some((t) => {
            const tStart = new Date(t.start_utc);
            const tEnd = new Date(t.end_utc);
            return overlaps(slotStartUtc, withBufEndUtc, tStart, tEnd);
          });
          isBlocked = (blackouts || []).some((b) =>
            overlaps(slotStartUtc, withBufEndUtc, new Date(b.start_utc), new Date(b.end_utc))
          );
          out.push({
            startUtc: slotStartUtc.toISOString(),
            endUtc: slotEndUtc.toISOString(),
            labelLocal: prettyInTz(slotStartUtc.toISOString(), tz),
            labelTz: `Ends ${new Intl.DateTimeFormat("en-US", {
              timeZone: tz, hour: "numeric", minute: "2-digit", hour12: true
            }).format(slotEndUtc)}`,
            isTaken, isBlocked,
          });
        }
        slotStartUtc = new Date(slotStartUtc.getTime() + slotMin * 60000);
      }
    }

    const nextNoonUtcISO = zonedDateTimeToUTCISO({ y, m, d: d + 1, hh: 12, mm: 0, tz });
    cursorUtc = new Date(nextNoonUtcISO);
  }

  // sort available first, then by time
  out.sort((a, b) => {
    const ax = (a.isTaken || a.isBlocked) ? 1 : 0;
    const bx = (b.isTaken || b.isBlocked) ? 1 : 0;
    if (ax !== bx) return ax - bx;
    return new Date(a.startUtc) - new Date(b.startUtc);
  });

  return out.slice(0, 120);
}

export const handler = async (event) => {
  if (event.httpMethod !== "POST") return { statusCode: 405, body: "Method Not Allowed" };
  try {
    const supabase = getServiceClient();
    const body = JSON.parse(event.body || "{}");
    const action = body.action;

    if (action === "lookup") {
      const email = (body.email || "").trim().toLowerCase();
      const appt_id = body.appt_id || null;
      const token = body.token || null;

      if (!email) return { statusCode: 400, body: JSON.stringify({ ok: false, error: "Email is required." }) };

      // 1) If appt_id+token provided, trust them (but still confirm email matches)
      let appt = null;
      if (appt_id && token) {
        const { data, error } = await supabase.from("mf_appointments").select("*").eq("id", appt_id).single();
        if (!error && data && data.token === token && (data.email || "").toLowerCase() === email) {
          appt = data;
        }
      }

      // 2) Else, find the next upcoming appointment for this email
      if (!appt) {
        const { data: list } = await supabase
          .from("mf_appointments")
          .select("*")
          .ilike("email", email) // case-insensitive
          .in("status", ["booked", "rescheduled", "scheduled"])
          .gt("start_utc", new Date().toISOString())
          .order("start_utc", { ascending: true })
          .limit(1);
        appt = (list && list[0]) || null;
      }

      if (!appt) {
        return { statusCode: 404, body: JSON.stringify({ ok: false, error: "We couldn't find an upcoming appointment for that email." }) };
      }

      // availability
      const { data: av } = await supabase
        .from("mf_availability")
        .select("*")
        .order("updated_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      const tz = av?.tz || appt.timezone || "America/Chicago";
      const slotMin = av?.slot_minutes ?? 30;
      const buffer = av?.buffer_minutes ?? 15;
      const minLeadH = av?.min_lead_hours ?? 12;
      const windowDays = av?.booking_window_days ?? 14;

      let weekly = av?.weekly || {};
      if (typeof weekly === "string") {
        try { weekly = JSON.parse(weekly); } catch { weekly = {}; }
      }

      const slots = await computeSlots(supabase, tz, slotMin, buffer, minLeadH, windowDays, weekly);

      return {
        statusCode: 200,
        body: JSON.stringify({
          ok: true,
          appt_id: appt.id,
          token: appt.token, // frontend will send this back on reschedule
          current_label: prettyInTz(appt.start_utc, tz),
          slots,
        }),
      };
    }

    if (action === "reschedule") {
      const { appt_id, token, start_utc } = body;
      if (!appt_id || !token || !start_utc) {
        return { statusCode: 400, body: JSON.stringify({ ok: false, error: "Missing appt_id, token, or start_utc." }) };
      }

      // fetch appointment
      const { data: appt, error: apptErr } = await supabase.from("mf_appointments").select("*").eq("id", appt_id).single();
      if (apptErr || !appt) return { statusCode: 404, body: JSON.stringify({ ok: false, error: "Appointment not found." }) };
      if (appt.token !== token) return { statusCode: 403, body: JSON.stringify({ ok: false, error: "Invalid token." }) };

      // availability for duration/tz
      const { data: av } = await supabase
        .from("mf_availability")
        .select("*")
        .order("updated_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      const tz = av?.tz || appt.timezone || "America/Chicago";
      const durationMin = av?.slot_minutes ?? Math.round((new Date(appt.end_utc) - new Date(appt.start_utc)) / 60000);

      const start = new Date(start_utc);
      const end_utc = new Date(start.getTime() + durationMin * 60000).toISOString();

      // collision check (same unique start/end)
      // rely on unique index and catch constraint error gracefully
      const { error: updErr } = await supabase
        .from("mf_appointments")
        .update({ start_utc: start_utc, end_utc, status: "rescheduled" })
        .eq("id", appt_id);
      if (updErr) {
        return { statusCode: 409, body: JSON.stringify({ ok: false, error: "That slot was just taken. Pick another." }) };
      }

      // send fresh emails? (optional) — you already send confirmations on booking;
      // you can trigger another Netlify function here to re-send if desired.

      return { statusCode: 200, body: JSON.stringify({ ok: true }) };
    }

    return { statusCode: 400, body: JSON.stringify({ ok: false, error: "Unknown action." }) };
  } catch (e) {
    console.error(e);
    return { statusCode: 500, body: JSON.stringify({ ok: false, error: "Server error" }) };
  }
};
