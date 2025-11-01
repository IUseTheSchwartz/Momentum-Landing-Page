// File: src/pages/Landing.jsx
import React, { useEffect, useMemo, useState } from "react";
import { supabase } from "../lib/supabaseClient.js";
import { readUTM } from "../lib/utm.js";
import ProofFeed from "../components/ProofFeed.jsx";
import QualifyForm from "../components/QualifyForm.jsx";
import { buildICS } from "../lib/ics.js";

// helper: extract YT ID from various URL formats
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
    (async () => {
      // site settings
      const { data: s } = await supabase
        .from("mf_site_settings")
        .select("*")
        .order("updated_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      setSettings(s || {});

      // qualify questions
      const { data: q } = await supabase
        .from("mf_questions")
        .select("*")
        .eq("is_active", true)
        .order("sort_order", { ascending: true });
      setQuestions(q || []);

      // proof posts (STRICT to your schema + proper ordering)
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

  async function computeSlots() {
    const { data: av } = await supabase
      .from("mf_availability")
      .select("*")
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    const { data: taken } = await supabase
      .from("mf_appointments")
      .select("start_utc,end_utc")
      .eq("status", "scheduled");
    const { data: blackouts } = await supabase.from("mf_blackouts").select("*");

    const slotMin = av?.slot_minutes || 30;
    const buffer = av?.buffer_minutes || 15;
    const minLeadH = av?.min_lead_hours || 12;
    const windowDays = av?.booking_window_days || 14;
    const weekly = av?.weekly || {};

    const now = new Date();
    const startW = new Date(now.getTime() + minLeadH * 60 * 60 * 1000);
    const endW = new Date(now.getTime() + windowDays * 24 * 60 * 60 * 1000);

    function overlaps(aStart, aEnd, bStart, bEnd) {
      return aStart < bEnd && bStart < aEnd;
    }

    // Approximate local→UTC conversion using current offset
    function toUtcIso(dateLocal, timeHHMM) {
      const [hh, mm] = timeHHMM.split(":").map(Number);
      const d = new Date(dateLocal);
      d.setHours(hh, mm, 0, 0);
      return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString();
    }

    const out = [];
    for (let day = new Date(startW); day <= endW; day = new Date(day.getTime() + 86400000)) {
      const dow = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"][day.getDay()];
      const ranges = weekly[dow] || [];
      for (const [startStr, endStr] of ranges) {
        let cursor = new Date(toUtcIso(day, startStr));
        const rangeEnd = new Date(toUtcIso(day, endStr));
        while (cursor < rangeEnd) {
          const slotStart = new Date(cursor);
          const slotEnd = new Date(slotStart.getTime() + slotMin * 60000);
          const withBufEnd = new Date(slotEnd.getTime() + buffer * 60000);
          if (withBufEnd <= rangeEnd) {
            const takenHit = (taken || []).some((t) =>
              overlaps(slotStart, withBufEnd, new Date(t.start_utc), new Date(t.end_utc))
            );
            const boHit = (blackouts || []).some((b) =>
              overlaps(slotStart, withBufEnd, new Date(b.start_utc), new Date(b.end_utc))
            );
            if (!takenHit && !boHit) {
              out.push({
                startUtc: slotStart.toISOString(),
                endUtc: slotEnd.toISOString(),
                labelLocal: slotStart.toLocaleString(undefined, {
                  dateStyle: "medium",
                  timeStyle: "short",
                }),
                labelTz: `Ends ${slotEnd.toLocaleTimeString(undefined, { timeStyle: "short" })}`,
              });
            }
          }
          cursor = new Date(cursor.getTime() + slotMin * 60000);
        }
      }
    }
    return out.slice(0, 120);
  }

  // create incomplete lead as soon as contact info is submitted
  async function handleContactNext() {
    const name = (fullName || "").trim();
    const em = (email || "").trim();
    const ph = (phone || "").trim();

    if (!name && !em && !ph) {
      alert("Please provide at least a name, email, or phone.");
      return;
    }

    const utm = readUTM();
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
        },
      ])
      .select("id")
      .single();

    if (error) {
      console.error(error);
      alert("Could not start your application. Please try again.");
      return;
    }

    const newId = data?.id;
    setLeadId(newId);
    setLeadDraft({ full_name: name || null, email: em || null, phone: ph || null });
    setStep("qualify");

    if (settings?.notify_emails) {
      try {
        await fetch("/.netlify/functions/send-email", {
          method: "POST",
          body: JSON.stringify({
            to: settings.notify_emails,
            subject: `New lead (incomplete) — ${name || em || ph || "Unknown"}`,
            text: [
              `A new lead started the application but hasn't finished yet.`,
              `Name: ${name || "-"}`,
              `Email: ${em || "-"}`,
              `Phone: ${ph || "-"}`,
              ``,
              `UTM: ${JSON.stringify(utm || {})}`,
              `Lead ID: ${newId || "-"}`,
            ].join("\n"),
          }),
        });
      } catch {}
    }
  }

  // open modal fresh
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
      style={{
        "--brand-primary": brandVars.primary,
        "--brand-accent": brandVars.accent,
      }}
    >
      <header className="mx-auto max-w-6xl px-4 py-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          {settings?.logo_url ? (
            <img src={settings.logo_url} alt="logo" className="h-9" />
          ) : (
            <div className="h-9 w-32 bg-white/10 rounded" />
          )}
          <span className="text-white/60">
            {settings?.site_name || "Momentum Financial"}
          </span>
        </div>
        <a
          href="#apply"
          onClick={(e) => {
            e.preventDefault();
            openModal();
          }}
          className="rounded-lg bg-white text-black px-4 py-2 font-semibold no-underline"
        >
          Book Now
        </a>
      </header>

      <main className="mx-auto max-w-6xl px-4 pb-24">
        {/* HERO — YouTube FIRST */}
        <section className="pt-4">
          {ytId ? (
            <div className="rounded-2xl overflow-hidden border border-white/10 shadow-2xl shadow-black/40">
              <div className="aspect-video">
                <iframe
                  className="w-full h-full"
                  src={`https://www.youtube.com/embed/${ytId}?rel=0&modestbranding=1`}
                  title="Intro"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                  allowFullScreen
                />
              </div>
            </div>
          ) : (
            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-6">
              <div className="aspect-video w-full rounded-xl bg-black/30 border border-white/10 grid place-items-center">
                <div className="text-center">
                  <div className="text-sm uppercase tracking-wide text-white/50">
                    Video Coming Soon
                  </div>
                  <div className="mt-2 text-white/70 text-xs">
                    Add <code>hero_youtube_url</code> in <em>mf_site_settings</em>
                  </div>
                </div>
              </div>
            </div>
          )}

          <h1 className="mt-8 text-3xl sm:text-5xl font-extrabold tracking-tight">
            {settings?.hero_title || "We build closers"}
          </h1>
          <p className="mt-3 text-white/70 text-lg">
            {settings?.hero_sub || "High standards. High pay. No excuses."}
          </p>

          {/* PROOF + CTA */}
          <div className="mt-6 grid gap-6">
            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-3">
              {/* Show 4 with upgraded animation */}
              <ProofFeed items={proof} visibleCount={4} cycleMs={3000} blurTransition bigSlides />
            </div>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 rounded-2xl border border-white/10 bg-white/[0.03] p-4">
              <div>
                <h3 className="text-lg font-semibold">Ready to apply?</h3>
                <p className="text-sm text-white/70">
                  Click “Book Now” to answer a few quick questions and pick a time. No side
                  forms — straight to the point.
                </p>
              </div>
              <button
                onClick={() => openModal()}
                className="rounded-lg bg-white text-black px-4 py-2 font-semibold w-full sm:w-auto"
              >
                Book Now
              </button>
            </div>
          </div>
        </section>

        {/* ABOUT */}
        <section className="mt-16 grid gap-6 sm:grid-cols-[160px,1fr] items-start">
          {settings?.headshot_url ? (
            <img
              src={settings.headshot_url}
              alt="headshot"
              className="h-40 w-40 rounded-2xl object-cover"
            />
          ) : (
            <div className="h-40 w-40 rounded-2xl bg-white/10" />
          )}
          <div>
            <h2 className="text-xl font-bold">
              About {settings?.about_name || "Your Mentor"}
            </h2>
            <p className="text-white/80 mt-2">
              {settings?.about_bio || "Upload headshot and edit this in Admin."}
            </p>
          </div>
        </section>

        {/* Disclaimer removed by request */}
      </main>

      {/* BOOKING MODAL */}
      {open && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4">
          <div className="w-full max-w-2xl rounded-2xl bg-[#2b2d31] border border-white/10 p-4">
            {/* HEADER */}
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-lg font-semibold">
                {step === "contact"
                  ? "Start your application"
                  : step === "qualify"
                  ? "Answer a few questions"
                  : "Pick a time"}
              </h3>
              <button onClick={() => setOpen(false)} className="text-white/60 hover:text-white">
                ✕
              </button>
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
                <button
                  onClick={() => setStep("contact")}
                  className="text-white/60 hover:text-white mb-3"
                >
                  ← Back
                </button>
                <QualifyForm
                  questions={questions}
                  onSubmit={async (values) => {
                    const answers = questions.map((q) => ({
                      question_id: q.id,
                      question: q.question_text,
                      value: values[q.id] || "",
                    }));

                    const { error: upErr } = await supabase
                      .from("mf_leads")
                      .update({
                        full_name: leadDraft?.full_name || fullName || null,
                        email: leadDraft?.email || email || null,
                        phone: leadDraft?.phone || phone || null,
                        answers,
                        is_complete: true,
                        stage: "qualified",
                      })
                      .eq("id", leadId);

                    if (upErr) {
                      console.error(upErr);
                      alert("Submission failed.");
                      return;
                    }

                    await fetch("/.netlify/functions/send-email", {
                      method: "POST",
                      body: JSON.stringify({
                        to: settings?.notify_emails || "",
                        subject: `Lead completed — ${leadDraft?.full_name || fullName || "Unknown"}`,
                        text: [
                          `Lead completed the questionnaire.`,
                          `Name: ${leadDraft?.full_name || fullName || "-"}`,
                          `Email: ${leadDraft?.email || email || "-"}`,
                          `Phone: ${leadDraft?.phone || phone || "-"}`,
                          "",
                          "Answers:",
                          ...answers.map(
                            (a) => `- ${a.question || a.question_id}: ${a.value}`
                          ),
                          "",
                          `Lead ID: ${leadId || "-"}`,
                        ].join("\n"),
                      }),
                    });

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
                <button
                  onClick={() => setStep("qualify")}
                  className="text-white/60 hover:text-white mb-3"
                >
                  ← Back
                </button>
                {!slots.length ? (
                  <div className="text-white/70">No slots available. Try different days.</div>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-80 overflow-auto">
                    {slots.map((slt) => (
                      <button
                        key={slt.startUtc}
                        disabled={booking}
                        onClick={async () => {
                          setBooking(true);
                          const appt = {
                            full_name: leadDraft?.full_name || fullName || null,
                            email: leadDraft?.email || email || null,
                            phone: leadDraft?.phone || phone || null,
                            answers: leadDraft?.answers || [],
                            start_utc: slt.startUtc,
                            end_utc: slt.endUtc,
                            timezone: settings?.brand_tz || "America/Chicago",
                          };
                          const { error } = await supabase
                            .from("mf_appointments")
                            .insert([
                              {
                                lead_id: leadId || null,
                                full_name: appt.full_name,
                                email: appt.email,
                                phone: appt.phone,
                                answers: appt.answers,
                                start_utc: appt.start_utc,
                                end_utc: appt.end_utc,
                                timezone: appt.timezone,
                                status: "scheduled",
                              },
                            ]);
                          if (error) {
                            alert("Slot just got taken. Pick another.");
                            setBooking(false);
                            return;
                          }

                          if (leadId) {
                            await supabase
                              .from("mf_leads")
                              .update({ stage: "booked" })
                              .eq("id", leadId);
                          }

                          await fetch("/.netlify/functions/send-email", {
                            method: "POST",
                            body: JSON.stringify({
                              to: settings?.notify_emails || "",
                              subject: `New appointment — ${
                                appt.full_name || "Unknown"
                              } — ${slt.startUtc}`,
                              text: [
                                `New Appointment`,
                                `Name: ${appt.full_name || "-"}`,
                                `Email: ${appt.email || "-"}`,
                                `Phone: ${appt.phone || "-"}`,
                                `When (UTC): ${slt.start_utc} → ${slt.end_utc}`,
                                `Organizer TZ: ${settings?.brand_tz || "America/Chicago"}`,
                                "",
                                "Answers:",
                                ...(appt.answers || []).map(
                                  (a) => `- ${a.question || a.question_id}: ${a.value}`
                                ),
                                `Lead ID: ${leadId || "-"}`,
                              ].join("\n"),
                            }),
                          });

                          const ics = buildICS({
                            title: "Momentum Financial — Intro Call",
                            description: "Intro call with Momentum Financial",
                            startUtcISO: appt.start_utc,
                            endUtcISO: appt.end_utc,
                            location: "Google Meet / Phone",
                          });
                          const url = URL.createObjectURL(ics);
                          const a = document.createElement("a");
                          a.href = url;
                          a.download = "momentum-booking.ics";
                          a.click();
                          URL.revokeObjectURL(url);

                          alert("Booked! We’ll email the details.");
                          setOpen(false);
                          setBooking(false);
                        }}
                        className="rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-left hover:bg-white/10"
                      >
                        <div className="font-semibold">{slt.labelLocal}</div>
                        <div className="text-xs text-white/60">{slt.labelTz}</div>
                      </button>
                    ))}
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
