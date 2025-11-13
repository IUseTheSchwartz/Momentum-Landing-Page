// File: src/pages/ThankYou.jsx
import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "../lib/supabaseClient.js";

function Skeleton({ className = "" }) {
  return <div className={`animate-pulse rounded-md bg-white/10 ${className}`} />;
}

export default function ThankYou() {
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);

  // Load site settings for logo + name
  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("mf_site_settings")
        .select("*")
        .order("updated_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      setSettings(data || {});
      setLoading(false);
    })();
  }, []);

  // 🔹 Meta Pixel: Schedule event on thank-you page
  useEffect(() => {
    if (window.fbq) {
      window.fbq("track", "Schedule");
    }
  }, []);

  return (
    <div className="min-h-screen bg-[#1e1f22] text-white">
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

        <Link
          to="/"
          className="text-sm text-white/70 hover:text-white underline-offset-2 hover:underline"
        >
          Back to homepage
        </Link>
      </header>

      <main className="mx-auto max-w-6xl px-4 pb-24 flex flex-col items-start justify-center gap-4">
        <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight">
          You’re booked in. ✅
        </h1>
        <p className="text-white/75 text-lg max-w-xl">
          We’ve locked in your appointment. You’ll receive a confirmation with all the details.
          Have your notes ready, and be on time — this is your shot
          to change your income and life.
        </p>
        <p className="text-white/60 text-sm">
          If you need to make any changes, click the reschedule button in the email.
        </p>
        <Link
          to="/"
          className="mt-4 inline-flex items-center justify-center rounded-xl bg-white px-6 py-3 font-semibold text-black shadow hover:shadow-lg active:scale-[.99]"
        >
          Back to main page
        </Link>
      </main>
    </div>
  );
}
