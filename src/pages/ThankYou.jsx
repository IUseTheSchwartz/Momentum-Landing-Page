// File: src/pages/ThankYou.jsx
import React from "react";
import { Link } from "react-router-dom";

export default function ThankYou() {
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
