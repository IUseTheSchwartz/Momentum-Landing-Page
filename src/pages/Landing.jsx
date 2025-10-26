// File: src/pages/Landing.jsx
import React, { useEffect, useMemo, useState } from "react";
import { supabase } from "../lib/supabaseClient.js";
import { readUTM } from "../lib/utm.js";
import ProofFeed from "../components/ProofFeed.jsx";
import QualifyForm from "../components/QualifyForm.jsx";
import { buildICS } from "../lib/ics.js";

export default function Landing() {
  const [settings, setSettings] = useState(null);
  const [proof, setProof] = useState([]);
  const [questions, setQuestions] = useState([]);

  // modal/booking state
  const [open, setOpen] = useState(false);
  const [leadDraft, setLeadDraft] = useState(null); // {full_name,email,phone,answers}
  const [slots, setSlots] = useState([]);
  const [booking, setBooking] = useState(false);

  useEffect(() => {
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
        .select("*")
        .eq("is_published", true);
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
            setOpen(true);
          }}
          className="rounded-lg bg-white text-black px-4 py-2 font-semibold"
        >
          Book Now
        </a>
      </header>

      <main className="mx-auto max-w-6xl px-4 pb-24">
        {/* HERO */}
        <section className="py-10">
          <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight">
            {settings?.hero_title || "We build closers"}
          </h1>
          <p className="mt-3 text-white/70 text-lg">
            {settings?.hero_sub || "High standards. High pay. No excuses."}
          </p>

        {/* PROOF + CTA (no sidebar form) */}
          <div className="mt-6 grid gap-6">
            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-3">
              <ProofFeed items={proof} />
            </div>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 rounded-2xl border border-white/10 bg-white/[0.03] p-4">
              <div>
                <h3 className="text-lg font-semibold">Ready to apply?</h3>
                <p className="text-sm text-white/70">
                  Click “Book Now” to answer a few quick questions and pick a
                  time. No side forms — straight to the point.
                </p>
              </div>
              <button
                onClick={() => setOpen(true)}
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

        {/* DISCLAIMER */}
        <section className="mt-16">
          <h2 className="text-xl font-bold">Disclaimer</h2>
          <p className="text-sm text-white/60 mt-2">
            This is an independent contractor opportunity. Earnings are
            commission-based and vary by individual effort, skill, and market
            conditions. No guarantees of income. You must be 18+.
          </p>
        </section>
      </main>

      {/* BOOKING MODAL */}
      {open && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4">
          <div className="w-full max-w-2xl rounded-2xl bg-[#2b2d31] border border-white/10 p-4">
            {!leadDraft ? (
              // STEP 1: Form
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-lg font-semibold">Apply to Book a Call</h3>
                  <button
                    onClick={() => setOpen(false)}
                    className="text-white/60 hover:text-white"
                  >
                    ✕
                  </button>
                </div>
                <QualifyForm
                  questions={questions}
                  onSubmit={async (values) => {
                    const answers = questions.map((q) => ({
                      question_id: q.id,
                      question: q.question_text,
                      value: values[q.id] || "",
                    }));
                    const utm = readUTM();
                    const full_name =
                      answers.find((a) => /full name/i.test(a.question))?.value ||
                      null;
                    const email =
                      answers.find((a) => /^email$/i.test(a.question))?.value ||
                      null;
                    const phone =
                      answers.find((a) => /^phone$/i.test(a.question))?.value ||
                      null;

                    // Insert lead
                    const { error } = await supabase
                      .from("mf_leads")
                      .insert([{ full_name, email, phone, answers, utm }]);
                    if (error) {
                      alert("Submission failed.");
                      return;
                    }

                    // Email "new lead" via SMTP (Mailjet) - safe no-op if env not set
                    await fetch("/.netlify/functions/send-email", {
                      method: "POST",
                      body: JSON.stringify({
                        to: settings?.notify_emails || "",
                        subject: `New lead — ${full_name || "Unknown"}`,
                        text: [
                          `New Lead from Momentum Financial`,
                          `Name: ${full_name || "-"}`,
                          `Email: ${email || "-"}`,
                          `Phone: ${phone || "-"}`,
                          "",
                          "Answers:",
                          ...answers.map(
                            (a) => `- ${a.question || a.question_id}: ${a.value}`
                          ),
                          "",
                          `UTM: ${JSON.stringify(utm || {})}`,
                        ].join("\n"),
                      }),
                    });

                    // Move to slot step
                    setLeadDraft({ full_name, email, phone, answers });
                    const slotsComputed = await computeSlots();
                    setSlots(slotsComputed);
                  }}
                />
              </div>
            ) : (
              // STEP 2: Slots
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-lg font-semibold">Pick a time</h3>
                  <button
                    onClick={() => {
                      setLeadDraft(null);
                    }}
                    className="text-white/60 hover:text-white"
                  >
                    ← Back
                  </button>
                </div>
                {!slots.length ? (
                  <div className="text-white/70">
                    No slots available. Try different days.
                  </div>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-80 overflow-auto">
                    {slots.map((slt) => (
                      <button
                        key={slt.startUtc}
                        disabled={booking}
                        onClick={async () => {
                          setBooking(true);
                          const appt = {
                            full_name: leadDraft.full_name,
                            email: leadDraft.email,
                            phone: leadDraft.phone,
                            answers: leadDraft.answers,
                            start_utc: slt.startUtc,
                            end_utc: slt.endUtc,
                            timezone: settings?.brand_tz || "America/Chicago",
                          };
                          // Insert appointment (unique index prevents double-book)
                          const { error } = await supabase
                            .from("mf_appointments")
                            .insert([
                              {
                                full_name: appt.full_name,
                                email: appt.email,
                                phone: appt.phone,
                                answers: appt.answers,
                                start_utc: appt.start_utc,
                                end_utc: appt.end_utc,
                                timezone: appt.timezone,
                              },
                            ]);
                          if (error) {
                            alert("Slot just got taken. Pick another.");
                            setBooking(false);
                            return;
                          }

                          // Email "appointment"
                          await fetch("/.netlify/functions/send-email", {
                            method: "POST",
                            body: JSON.stringify({
                              to: settings?.notify_emails || "",
                              subject: `New appointment — ${
                                leadDraft?.full_name || "Unknown"
                              } — ${slt.startUtc}`,
                              text: [
                                `New Appointment`,
                                `Name: ${leadDraft?.full_name || "-"}`,
                                `Email: ${leadDraft?.email || "-"}`,
                                `Phone: ${leadDraft?.phone || "-"}`,
                                `When (UTC): ${slt.startUtc} → ${slt.endUtc}`,
                                `Organizer TZ: ${
                                  settings?.brand_tz || "America/Chicago"
                                }`,
                                "",
                                "Answers:",
                                ...(leadDraft?.answers || []).map(
                                  (a) =>
                                    `- ${a.question || a.question_id}: ${a.value}`
                                ),
                              ].join("\n"),
                            }),
                          });

                          // Offer ICS
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
