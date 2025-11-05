// File: src/pages/Landing.jsx
import React, { useEffect, useMemo, useState } from "react";
import { supabase } from "../lib/supabaseClient.js";
import { readUTM } from "../lib/utm.js";
import ProofFeed from "../components/ProofFeed.jsx";
import QualifyForm from "../components/QualifyForm.jsx";
import { initAnalytics } from "../lib/analytics.js";

/* ---------------------- Minimal Creator Bar (icon + label pills) ---------------------- */
function CreatorBar({ settings }) {
  const name   = settings?.about_name || "Logan Harris";
  const avatar = settings?.headshot_url || null;

  const ytUrl  = settings?.social_youtube_url || "";
  const igUrl  = settings?.social_instagram_url || "";
  const scUrl  = settings?.social_snapchat_url || "";

  const items = [
    ytUrl && {
      key: "yt", label: "YouTube", href: ytUrl, Icon: () => (
        <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden="true">
          <path fill="currentColor" d="M23.5 6.2a4 4 0 0 0-2.8-2.9C18.8 2.8 12 2.8 12 2.8s-6.8 0-8.7.5A4 4 0 0 0 .5 6.2 41.7 41.7 0 0 0 0 12a41.7 41.7 0 0 0 .5 5.8 4 4 0 0 0 2.8 2.9c1.9.5 8.7.5 8.7.5s6.8 0 8.7-.5a4 4 0 0 0 2.8-2.9c.4-1.9.5-5.8.5-5.8s0-3.9-.5-5.8ZM9.6 15.5v-7l6.6 3.5-6.6 3.5Z"/>
        </svg>
      )
    },
igUrl && {
  key: "ig",
  label: "Instagram",
  href: igUrl,
  Icon: () => (
    <svg viewBox="0 0 16 16" className="h-4 w-4" aria-hidden="true">
      <path
        fill="currentColor"
        d="M8 0C5.79 0 5.491.01 4.659.048c-.832.038-1.402.177-1.9.378-.514.207-.95.484-1.385.919-.435.435-.712.871-.919 1.385-.201.498-.34 1.068-.378 1.9C0 5.491.01 5.79.048 6.622.086 7.454.225 8.024.426 8.522c.207.514.484.95.919 1.385.435.435.871.712 1.385.919.498.201 1.068.34 1.9.378.832.038 1.131.048 2.963.048s2.131-.01 2.963-.048c.832-.038 1.402-.177 1.9-.378a4.02 4.02 0 0 0 1.385-.919 4.02 4.02 0 0 0 .919-1.385c.201-.498.34-1.068.378-1.9.038-.832.048-1.131.048-2.963s-.01-2.131-.048-2.963c-.038-.832-.177-1.402-.378-1.9a4.02 4.02 0 0 0-.919-1.385A4.02 4.02 0 0 0 13.3.426c-.498-.201-1.068-.34-1.9-.378C10.568.01 10.269 0 8 0Zm0 1.454c2.2 0 2.469.008 3.341.048.806.037 1.243.172 1.535.287.387.15.663.33.954.621.291.291.471.567.621.954.115.292.25.729.287 1.535.04.872.048 1.141.048 3.341s-.008 2.469-.048 3.341c-.037.806-.172 1.243-.287 1.535a2.57 2.57 0 0 1-.621.954 2.57 2.57 0 0 1-.954.621c-.292.115-.729.25-1.535.287-.872.04-1.141.048-3.341.048s-2.469-.008-3.341-.048c-.806-.037-1.243-.172-1.535-.287a2.57 2.57 0 0 1-.954-.621 2.57 2.57 0 0 1-.621-.954c-.115-.292-.25-.729-.287-1.535-.04-.872-.048-1.141-.048-3.341s.008-2.469.048-3.341c.037-.806.172-1.243.287-1.535.15-.387.33-.663.621-.954.291-.291.567-.471.954-.621.292-.115.729-.25 1.535-.287.872-.04 1.141-.048 3.341-.048Zm0 2.486a4.06 4.06 0 1 0 0 8.12 4.06 4.06 0 0 0 0-8.12Zm0 6.706a2.646 2.646 0 1 1 0-5.292 2.646 2.646 0 0 1 0 5.292Zm4.943-6.937a.95.95 0 1 1-1.9 0 .95.95 0 0 1 1.9 0Z"
      />
    </svg>
  ),
},
    scUrl && {
      key: "sc", label: "Snapchat", href: scUrl, Icon: () => (
        <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden="true">
          <path fill="currentColor" d="M12 2c3.4 0 6.2 2.7 6.2 6 0 1.2-.3 2.2-.9 3 .5.4 1 .7 1.5.9.4.2.7.6.7 1 0 .7-.7 1-1.3 1.1-.7.2-1.3.3-1.8.6.3.8.9 1.3 2 1.6.4.1.7.4.7.8 0 .6-.6 1-1.4 1-1.7 0-3-.6-3.9-1.5-.9.9-2.2 1.5-3.9 1.5s-3-.6-3.9-1.5c-.9.9-2.2 1.5-3.9 1.5-.8 0-1.4-.4-1.4-1 0-.4.3-.7.7-.8 1.1-.3 1.7-.8 2-1.6-.5-.3-1.1-.4-1.8-.6C1.7 14 1 13.7 1 13c0-.4.3-.8.7-1 0 0 1-.4 1.5-.9-.6-.8-.9-1.8-.9-3C2.3 4.7 5.1 2 8.5 2H12Z"/>
        </svg>
      )
    },
  ].filter(Boolean);

  if (!items.length) return null;

  return (
    <section className="mt-5">
      <div className="rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3">
        {/* On small screens stack; on >=sm keep in one row */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          {/* avatar + name */}
          <div className="flex items-center gap-3">
            <div className="shrink-0">
              {avatar ? (
                <img src={avatar} alt={name} className="h-10 w-10 rounded-xl object-cover border border-white/10" />
              ) : (
                <div className="h-10 w-10 rounded-xl bg-white/10" />
              )}
            </div>
            <div className="min-w-0">
              <div className="text-sm text-white/60 leading-tight">Personal page</div>
              <div className="font-semibold leading-tight">{name}</div>
            </div>
          </div>

          {/* social buttons — responsive grid on mobile, inline on desktop */}
          <div className="sm:ml-auto">
            <div className="grid grid-cols-2 gap-2 max-[380px]:grid-cols-1 sm:flex sm:flex-row sm:items-center">
              {items.map(({ key, label, href, Icon }) => (
                <a
                  key={key}
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/20 bg-white/10 px-4 py-2 text-sm text-white/90 hover:bg-white/15 transition"
                  aria-label={label}
                >
                  <span className="inline-grid h-5 w-5 place-items-center rounded-full bg-white/10">
                    <Icon />
                  </span>
                  <span className="font-medium">{label}</span>
                </a>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ---------------------- YouTube ID helper ---------------------- */
function extractYouTubeId(url = "") {
  if (!url) return "";
  try {
    const u = new URL(url);
    if (u.hostname.includes("youtu.be")) return u.pathname.slice(1);
    if (u.searchParams.get("v")) return u.searchParams.get("v");
    const parts = u.pathname.split("/").filter(Boolean);
    const idx = parts.findIndex((p) => ["embed", "shorts"].includes(p));
    if (idx >= 0 && parts[idx + 1]) return parts[idx + 1];
    return parts[0] || "";
  } catch {
    return "";
  }
}

/* -------------------- Timezone math (no libs) ------------------ */
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

/* ---------------------------- Page ----------------------------- */
export default function Landing() {
  const [settings, setSettings] = useState(null);
  const [proof, setProof] = useState([]);
  const [questions, setQuestions] = useState([]);

  // modal/booking state
  const [open, setOpen] = useState(false);
  // step state: "contact" -> "qualify" -> "slots"
  const [step, setStep] = useState("contact");

  // lead state
  const [leadId, setLeadId] = useState(null);
  const [leadDraft, setLeadDraft] = useState(null); // {full_name,email,phone,answers?}

  const [slots, setSlots] = useState([]);
  const [booking, setBooking] = useState(false);

  // local contact form fields
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");

  useEffect(() => {
    initAnalytics();

    (async () => {
      const { data: s } = await supabase
        .from("mf_site_settings")
        .select("*")
        .order("updated_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      setSettings(s || {});

      const { data: q } = await supabase
        .from("mf_questions")
        .select("*")
        .eq("is_active", true)
        .order("sort_order", { ascending: true });
      setQuestions(q || []);

      const { data: p } = await supabase
        .from("mf_proof_posts")
        .select(
          "id, display_name, avatar_url, message_text, amount_cents, currency, happened_at, screenshot_url, created_at, is_pinned, is_published"
        )
        .eq("is_published", true)
        .order("is_pinned", { ascending: false })
        .order("happened_at", { ascending: false })
        .order("created_at", { ascending: false });
      setProof(p || []);
    })();
  }, []);

  const brandVars = useMemo(() => {
    const primary = settings?.brand_primary || "#6b8cff";
    const accent = settings?.brand_accent || "#9b5cff";
    return { primary, accent };
  }, [settings]);

  /* -------- Slots that honor Admin tz + parse weekly JSON string -------- */
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

    // All taken ranges (use stored end_utc for exact duration)
    const { data: taken } = await supabase
      .from("mf_appointments")
      .select("start_utc, end_utc, status")
      .in("status", ["booked", "rescheduled", "scheduled"]);

    // Blackouts
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

      // Move to next day (noon in tz)
      const nextNoonUtcISO = zonedDateTimeToUTCISO({ y, m, d: d + 1, hh: 12, mm: 0, tz });
      cursorUtc = new Date(nextNoonUtcISO);
    }

    return out.slice(0, 120);
  }

  /* -------------------- CONTACT → create lead (no email) -------------------- */
  async function handleContactNext() {
    const name = (fullName || "").trim();
    const em = (email || "").trim();
    const ph = (phone || "").trim();

    if (!name && !em && !ph) {
      alert("Please provide at least a name, email, or phone.");
      return;
    }

    const utm = readUTM();
    const nowIso = new Date().toISOString();
    const { data, error } = await supabase
      .from("mf_leads")
      .insert([
        {
          full_name: name || null,
          email: em || null,
          phone: ph || null,
          utm,
          is_complete: false,
          stage: "new",
          started_at: nowIso,
          last_activity_at: nowIso,
          incomplete_notified: false,
        },
      ])
      .select("id")
      .single();

    if (error) {
      console.error(error);
      alert("Could not start your application. Please try again.");
      return;
    }

    setLeadId(data.id);
    setLeadDraft({ full_name: name || null, email: em || null, phone: ph || null });
    setStep("qualify");
  }

  // Open modal fresh
  function openModal() {
    setOpen(true);
    setStep("contact");
    setLeadId(null);
    setLeadDraft(null);
    setFullName("");
    setEmail("");
    setPhone("");
    setSlots([]);
    setBooking(false);
  }

  const ytId =
    extractYouTubeId(settings?.hero_youtube_url) ||
    extractYouTubeId(settings?.youtube_url) ||
    "";

  return (
    <div
      className="min-h-screen bg-[#1e1f22] text-white"
      style={{ "--brand-primary": brandVars.primary, "--brand-accent": brandVars.accent }}
    >
      {/* Header */}
      <header className="mx-auto max-w-6xl px-4 py-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          {settings?.logo_url ? (
            <img src={settings.logo_url} alt="logo" className="h-9" />
          ) : (
            <div className="h-9 w-32 bg-white/10 rounded" />
          )}
          <span className="text-white/60">{settings?.site_name || "Momentum Financial"}</span>
        </div>
        <div />
      </header>

      <main className="mx-auto max-w-6xl px-4 pb-24">
        {/* HERO — YouTube FIRST */}
        <section className="pt-2">
          {ytId ? (
            <div className="mx-auto w-full max-w-[720px]">
              <div className="relative aspect-video overflow-hidden rounded-2xl border border-white/10 shadow-2xl shadow-black/40">
                <iframe
                  className="absolute inset-0 h-full w-full"
                  src={`https://www.youtube.com/embed/${ytId}?rel=0&modestbranding=1&playsinline=1`}
                  title="Intro"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                  allowFullScreen
                  loading="lazy"
                />
              </div>
            </div>
          ) : (
            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-6">
              <div className="aspect-video w-full rounded-xl bg-black/30 border border-white/10 grid place-items-center">
                <div className="text-center">
                  <div className="text-sm uppercase tracking-wide text-white/50">Video Coming Soon</div>
                  <div className="mt-2 text-white/70 text-xs">
                    Add <code>hero_youtube_url</code> in <em>mf_site_settings</em>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* CTA */}
          <div className="mt-4">
            <button
              onClick={openModal}
              className="mx-auto w-full sm:w-[min(680px,92vw)] rounded-xl bg-white px-5 py-3 font-semibold text-black shadow active:scale-[.99]"
            >
              Book Call
            </button>
          </div>

          {/* Personal bar */}
          <CreatorBar settings={settings} />

          <h1 className="mt-8 text-3xl sm:text-5xl font-extrabold tracking-tight">
            {settings?.hero_title || "We build closers"}
          </h1>
          <p className="mt-3 text-white/70 text-lg">
            {settings?.hero_sub || "High standards. High pay. No excuses."}
          </p>

          {/* PROOF only */}
          <div className="mt-6">
            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-3">
              <ProofFeed items={proof} visibleCount={4} cycleMs={3000} blurTransition bigSlides />
            </div>
          </div>
        </section>

        {/* ABOUT */}
        <section className="mt-16 grid gap-6 sm:grid-cols-[160px,1fr] items-start">
          {settings?.headshot_url ? (
            <img src={settings.headshot_url} alt="headshot" className="h-40 w-40 rounded-2xl object-cover" />
          ) : (
            <div className="h-40 w-40 rounded-2xl bg-white/10" />
          )}
          <div>
            <h2 className="text-xl font-bold">About {settings?.about_name || "Your Mentor"}</h2>
            <p className="text-white/80 mt-2">{settings?.about_bio || "Upload headshot and edit this in Admin."}</p>
          </div>
        </section>
      </main>

      {/* BOOKING MODAL */}
      {open && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4">
          <div className="w-full max-w-2xl rounded-2xl bg-[#2b2d31] border border-white/10 p-4">
            {/* HEADER */}
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-lg font-semibold">
                {step === "contact" ? "Start your application" : step === "qualify" ? "Answer a few questions" : "Pick a time"}
              </h3>
              <button onClick={() => setOpen(false)} className="text-white/60 hover:text-white">✕</button>
            </div>

            {/* STEP: CONTACT */}
            {step === "contact" && (
              <div className="grid gap-3">
                <div className="grid gap-2">
                  <label className="text-sm text-white/70">Full Name</label>
                  <input
                    className="w-full rounded-lg bg-black/30 border border-white/10 px-3 py-2 outline-none"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="John Carter"
                  />
                </div>
                <div className="grid gap-2">
                  <label className="text-sm text-white/70">Phone</label>
                  <input
                    className="w-full rounded-lg bg-black/30 border border-white/10 px-3 py-2 outline-none"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="(555) 555-5555"
                  />
                </div>
                <div className="grid gap-2">
                  <label className="text-sm text-white/70">Email</label>
                  <input
                    type="email"
                    className="w-full rounded-lg bg-black/30 border border-white/10 px-3 py-2 outline-none"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                  />
                </div>

                <div className="flex items-center justify-end gap-2 mt-2">
                  <button
                    onClick={() => setOpen(false)}
                    className="px-3 py-2 rounded-lg border border-white/15 text-white/80 hover:bg-white/5"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleContactNext}
                    className="px-4 py-2 rounded-lg bg-white text-black font-semibold"
                  >
                    Next
                  </button>
                </div>
                <p className="text-xs text-white/50">
                  You can finish later; we’ll save your info as an incomplete application.
                </p>
              </div>
            )}

            {/* STEP: QUALIFY */}
            {step === "qualify" && (
              <div>
                <button onClick={() => setStep("contact")} className="text-white/60 hover:text-white mb-3">← Back</button>
                <QualifyForm
                  questions={questions}
                  onSubmit={async (values) => {
                    const answers = questions.map((q) => ({
                      question_id: q.id,
                      question: q.question_text,
                      value: values[q.id] || "",
                    }));

                    const nowIso = new Date().toISOString();
                    const { error: upErr } = await supabase
                      .from("mf_leads")
                      .update({
                        full_name: leadDraft?.full_name || fullName || null,
                        email: leadDraft?.email || email || null,
                        phone: leadDraft?.phone || phone || null,
                        answers,
                        is_complete: true,
                        last_activity_at: nowIso,
                      })
                      .eq("id", leadId);

                    if (upErr) {
                      console.error(upErr);
                      alert("Submission failed.");
                      return;
                    }

                    setLeadDraft((prev) => ({
                      ...(prev || {}),
                      full_name: prev?.full_name || fullName || null,
                      email: prev?.email || email || null,
                      phone: prev?.phone || phone || null,
                      answers,
                    }));

                    const slotsComputed = await computeSlots();
                    setSlots(slotsComputed);
                    setStep("slots");
                  }}
                />
              </div>
            )}

            {/* STEP: SLOTS */}
            {step === "slots" && (
              <div>
                <button onClick={() => setStep("qualify")} className="text-white/60 hover:text-white mb-3">← Back</button>
                {!slots.length ? (
                  <div className="text-white/70">No slots available. Try different days.</div>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-80 overflow-auto">
                    {slots.map((slt) => {
                      const disabled = slt.isTaken || slt.isBlocked || booking;
                      return (
                        <button
                          key={slt.startUtc}
                          disabled={disabled}
                          onClick={async () => {
                            try {
                              setBooking(true);
                              // Re-read availability to match Admin tz/duration on submit
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
                              alert("Booked! We’ll email the details.");
                              setOpen(false);
                            } catch (e) {
                              alert(e.message || "Could not book. Try another slot.");
                            } finally {
                              setBooking(false);
                            }
                          }}
                          className={`rounded-lg border px-3 py-2 text-left ${
                            slt.isTaken || slt.isBlocked
                              ? "border-white/10 bg-white/[0.03] text-white/40 cursor-not-allowed"
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
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
