// File: src/pages/Landing.jsx
import React, { useEffect, useMemo, useState } from "react";
import { supabase } from "../lib/supabaseClient.js";
import { readUTM } from "../lib/utm.js";
import ProofFeed from "../components/ProofFeed.jsx";
import QualifyForm from "../components/QualifyForm.jsx";
import { initAnalytics } from "../lib/analytics.js";

/* --------------------------- tiny skeleton helpers --------------------------- */
function Skeleton({ className = "" }) {
  return <div className={`animate-pulse rounded-md bg-white/10 ${className}`} />;
}

/* ---------------------- Minimal Creator Bar (clean icons) ---------------------- */
function CreatorBar({ settings }) {
  const name   = settings?.about_name || "Logan Harris";
  const avatar = settings?.headshot_url || null;

  const ytUrl  = settings?.social_youtube_url || "";
  const igUrl  = settings?.social_instagram_url || "";
  const scUrl  = settings?.social_snapchat_url || "";

  const items = [
    ytUrl && {
      key: "yt",
      label: "YouTube",
      href: ytUrl,
      Icon: (props) => (
        <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden="true" fill="currentColor" {...props}>
          <path d="M23.5 6.2a4 4 0 0 0-2.8-2.9C18.8 2.8 12 2.8 12 2.8s-6.8 0-8.7.5A4 4 0 0 0 .5 6.2 41.7 41.7 0 0 0 0 12a41.7 41.7 0 0 0 .5 5.8 4 4 0 0 0 2.8 2.9c1.9.5 8.7.5 8.7.5s6.8 0 8.7-.5a4 4 0 0 0 2.8-2.9c.4-1.9.5-5.8.5-5.8s0-3.9-.5-5.8ZM9.6 15.5v-7l6.6 3.5-6.6 3.5Z"/>
        </svg>
      )
    },
    igUrl && {
      key: "ig",
      label: "Instagram",
      href: igUrl,
      // Crisp outline IG; no background circle
      Icon: (props) => (
        <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" {...props}>
          <rect x="2.5" y="2.5" width="19" height="19" rx="5" />
          <circle cx="12" cy="12" r="4" />
          <circle cx="17.5" cy="6.5" r="1.2" fill="currentColor" stroke="none" />
        </svg>
      )
    },
    scUrl && {
      key: "sc",
      label: "Snapchat",
      href: scUrl,
      Icon: (props) => (
        <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden="true" fill="currentColor" {...props}>
          <path d="M12 2c3.4 0 6.2 2.7 6.2 6 0 1.2-.3 2.2-.9 3 .5.4 1 .7 1.5.9.4.2.7.6.7 1 0 .7-.7 1-1.3 1.1-.7.2-1.3.3-1.8.6.3.8.9 1.3 2 1.6.4.1.7.4.7.8 0 .6-.6 1-1.4 1-1.7 0-3-.6-3.9-1.5-.9.9-2.2 1.5-3.9 1.5s-3-.6-3.9-1.5c-.9.9-2.2 1.5-3.9 1.5-.8 0-1.4-.4-1.4-1 0-.4.3-.7.7-.8 1.1-.3 1.7-.8 2-1.6-.5-.3-1.1-.4-1.8-.6C1.7 14 1 13.7 1 13c0-.4.3-.8.7-1 0 0 1-.4 1.5-.9-.6-.8-.9-1.8-.9-3C2.3 4.7 5.1 2 8.5 2H12Z"/>
        </svg>
      )
    },
  ].filter(Boolean);

  if (!items.length) return null;

  return (
    <section className="mt-5">
      <div className="rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3">
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

          {/* socials — responsive, no icon background circle */}
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
                  <Icon />
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

  // loading gate to avoid flicker
  const [loading, setLoading] = useState(true);

  // modal/booking state
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState("contact");

  // lead state
  const [leadId, setLeadId] = useState(null);
  const [leadDraft, setLeadDraft] = useState(null);

  const [slots, setSlots] = useState([]);
  const [booking, setBooking] = useState(false);

  // local contact form fields
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");

  useEffect(() => {
    initAnalytics();

    (async () => {
      const [sRes, qRes, pRes] = await Promise.all([
        supabase.from("mf_site_settings").select("*").order("updated_at", { ascending: false }).limit(1).maybeSingle(),
        supabase.from("mf_questions").select("*").eq("is_active", true).order("sort_order", { ascending: true }),
        supabase
          .from("mf_proof_posts")
          .select(
            "id, display_name, avatar_url, message_text, amount_cents, currency, happened_at, screenshot_url, created_at, is_pinned, is_published"
          )
          .eq("is_published", true)
          .order("is_pinned", { ascending: false })
          .order("happened_at", { ascending: false })
          .order("created_at", { ascending: false }),
      ]);

      setSettings(sRes?.data || {});
      setQuestions(qRes?.data || []);
      setProof(pRes?.data || []);
      setLoading(false);
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

  /* -------------------- CONTACT → create lead -------------------- */
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
          {loading ? (
            <Skeleton className="h-9 w-32 rounded" />
          ) : settings?.logo_url ? (
            <img src={settings.logo_url} alt="logo" className="h-9" />
          ) : (
            <div className="h-9 w-32 bg-white/10 rounded" />
          )}
          <span className="text-white/60">
            {loading ? <span className="inline-block h-4 w-28 animate-pulse bg-white/10 rounded" /> : (settings?.site_name || "Momentum Financial")}
          </span>
        </div>
        <div />
      </header>

      <main className="mx-auto max-w-6xl px-4 pb-24">
        {/* HERO — video */}
        <section className="pt-2">
          {loading ? (
            <div className="mx-auto w-full max-w-[720px]">
              <Skeleton className="aspect-video w-full rounded-2xl border border-white/10" />
            </div>
          ) : ytId ? (
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
                </div>
              </div>
            </div>
          )}

          {/* CTA (mobile full width, desktop auto/centered) */}
          <div className="mt-4 text-center">
            {loading ? (
              <Skeleton className="mx-auto h-12 w-full sm:w-72 rounded-xl" />
            ) : (
              <button
                onClick={openModal}
                className="inline-flex w-full sm:w-auto items-center justify-center rounded-xl bg-white px-6 py-3
                           font-semibold text-black shadow hover:shadow-lg active:scale-[.99]"
              >
                Book Call
              </button>
            )}
          </div>

          {/* Creator / socials */}
          {loading ? (
            <div className="mt-5">
              <div className="rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3">
                <div className="flex items-center gap-3">
                  <Skeleton className="h-10 w-10 rounded-xl" />
                  <div className="flex-1">
                    <Skeleton className="h-3 w-24 rounded mb-2" />
                    <Skeleton className="h-4 w-40 rounded" />
                  </div>
                  <Skeleton className="h-9 w-28 rounded-xl" />
                  <Skeleton className="h-9 w-28 rounded-xl" />
                </div>
              </div>
            </div>
          ) : (
            <CreatorBar settings={settings} />
          )}

          {/* Headline + sub */}
          <div className="mt-8">
            {loading ? (
              <>
                <Skeleton className="h-8 w-3/4 rounded mb-2" />
                <Skeleton className="h-4 w-1/2 rounded" />
              </>
            ) : (
              <>
                <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight">
                  {settings?.hero_title || "We build closers"}
                </h1>
                <p className="mt-3 text-white/70 text-lg">
                  {settings?.hero_sub || "High standards. High pay. No excuses."}
                </p>
              </>
            )}
          </div>

          {/* PROOF */}
          <div className="mt-6">
            {loading ? (
              <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-3">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <Skeleton key={i} className="h-28 w-full rounded-xl" />
                  ))}
                </div>
              </div>
            ) : (
              <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-3">
                <ProofFeed items={proof} visibleCount={4} cycleMs={3000} blurTransition bigSlides />
              </div>
            )}
          </div>
        </section>

        {/* ABOUT */}
        <section className="mt-16 grid gap-6 sm:grid-cols-[160px,1fr] items-start">
          {loading ? (
            <>
              <Skeleton className="h-40 w-40 rounded-2xl" />
              <div>
                <Skeleton className="h-5 w-40 rounded mb-3" />
                <Skeleton className="h-4 w-full rounded mb-2" />
                <Skeleton className="h-4 w-5/6 rounded" />
              </div>
            </>
          ) : (
            <>
              {settings?.headshot_url ? (
                <img src={settings.headshot_url} alt="headshot" className="h-40 w-40 rounded-2xl object-cover" />
              ) : (
                <div className="h-40 w-40 rounded-2xl bg-white/10" />
              )}
              <div>
                <h2 className="text-xl font-bold">About {settings?.about_name || "Your Mentor"}</h2>
                <p className="text-white/80 mt-2">{settings?.about_bio || "Upload headshot and edit this in Admin."}</p>
              </div>
            </>
          )}
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
