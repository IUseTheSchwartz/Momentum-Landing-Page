// File: src/pages/Landing.jsx
import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
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
      // Official brand glyph via Simple Icons CDN (perfectly centered)
      Icon: () => (
        <img
          src="https://cdn.simpleicons.org/snapchat/FFFFFF"
          alt=""
          className="h-4 w-4 object-contain"
          loading="lazy"
        />
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

export default function Landing() {
  const navigate = useNavigate();

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

  // local contact form fields
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");

  // Analytics + load data
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

  // 🔹 Meta Pixel: PageView on landing
  useEffect(() => {
    if (window.fbq) {
      window.fbq("track", "PageView");
    }
  }, []);

  const brandVars = useMemo(() => {
    const primary = settings?.brand_primary || "#6b8cff";
    const accent = settings?.brand_accent || "#9b5cff";
    return { primary, accent };
  }, [settings]);

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
            {loading ? (
              <span className="inline-block h-4 w-28 animate-pulse bg-white/10 rounded" />
            ) : (
              settings?.site_name || "Momentum Financial"
            )}
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

          {/* CTA */}
          <div className="mt-4 text-center">
            {loading ? (
              <Skeleton className="mx-auto h-12 w-full sm:w-72 rounded-xl" />
            ) : (
              <button
                onClick={openModal}
                className="inline-flex w-full sm:w-auto items-center justify-center rounded-xl bg.white px-6 py-3
                           font-semibold text-black shadow hover:shadow-lg active:scale-[.99] bg-white"
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
              <div className="rounded-2xl border border.white/10 bg-white/[0.03] p-3">
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
                {step === "contact" ? "Start your application" : "Answer a few questions"}
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

                    if (!leadId) {
                      alert("Something went wrong starting your application. Please try again.");
                      return;
                    }

                    // Close modal and navigate to /schedule with lead_id in query
                    setOpen(false);
                    navigate(`/schedule?lead_id=${encodeURIComponent(leadId)}`);
                  }}
                />
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
