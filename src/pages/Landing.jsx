import React, { useEffect, useMemo, useState } from "react";
import { supabase } from "../lib/supabaseClient";
import { readUTM } from "../lib/utm";
import ProofFeed from "../components/ProofFeed";
import QualifyForm from "../components/QualifyForm";

export default function Landing() {
  const [settings, setSettings] = useState(null);
  const [proof, setProof] = useState([]);
  const [questions, setQuestions] = useState([]);

  // Fetch public data
  useEffect(() => {
    (async () => {
      const { data: s } = await supabase.from("mf_site_settings").select("*").limit(1).maybeSingle();
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

  async function submitLead(values) {
    // Map question answers
    const answers = Object.entries(values).map(([question_id, value]) => ({ question_id, value }));
    const utm = readUTM();

    // Optional: pull basic identity from questions if you included inputs for name/email/phone
    const full_name = answers.find((a) => a.question_id === "full_name")?.value || null;
    const email = answers.find((a) => a.question_id === "email")?.value || null;
    const phone = answers.find((a) => a.question_id === "phone")?.value || null;

    const { error } = await supabase.from("mf_leads").insert([{ full_name, email, phone, answers, utm }]);
    if (error) {
      alert("Submission failed. Try again.");
      return;
    }
    alert("Submitted — we’ll review and reach out.");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  return (
    <div className="min-h-screen bg-[#1e1f22] text-white" style={{
      "--brand-primary": brandVars.primary,
      "--brand-accent": brandVars.accent,
    }}>
      <header className="mx-auto max-w-6xl px-4 py-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          {settings?.logo_url ? (
            <img src={settings.logo_url} alt="logo" className="h-9" />
          ) : (
            <div className="h-9 w-32 bg-white/10 rounded" />
          )}
          <span className="text-white/60">{settings?.site_name || "Momentum Financial"}</span>
        </div>
        <a href="#apply" className="rounded-lg bg-white text-black px-4 py-2 font-semibold">Book Now</a>
      </header>

      <main className="mx-auto max-w-6xl px-4 pb-24">
        {/* Hero */}
        <section className="py-10">
          <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight">
            {settings?.hero_title || "We build closers"}
          </h1>
          <p className="mt-3 text-white/70 text-lg">{settings?.hero_sub || "High standards. High pay. No excuses."}</p>

          <div className="mt-6 grid gap-6 sm:grid-cols-3">
            <div className="sm:col-span-2">
              <ProofFeed items={proof} />
            </div>

            <aside id="apply" className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <h3 className="text-lg font-semibold">Apply to Book a Call</h3>
              <p className="text-sm text-white/70 mb-3">
                We only take driven, coachable people. If that’s you, answer honestly.
              </p>
              <QualifyForm questions={questions} onSubmit={submitLead} />
            </aside>
          </div>
        </section>

        {/* About */}
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

        {/* Disclaimer */}
        <section className="mt-16">
          <h2 className="text-xl font-bold">Disclaimer</h2>
          <p className="text-sm text-white/60 mt-2">
            This is an independent contractor opportunity. Earnings are commission-based and vary by individual effort,
            skill, and market conditions. No guarantees of income. You must be 18+.
          </p>
        </section>
      </main>
    </div>
  );
}
