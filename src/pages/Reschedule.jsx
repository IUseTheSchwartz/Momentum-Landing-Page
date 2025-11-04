// File: src/pages/Reschedule.jsx
import React, { useEffect, useState } from "react";

export default function Reschedule() {
  const params = new URLSearchParams(window.location.search);
  const apptFromUrl = params.get("appt") || "";
  const tokenFromUrl = params.get("t") || "";

  const [email, setEmail] = useState("");
  const [step, setStep] = useState("verify"); // verify -> pick -> done
  const [currentWhen, setCurrentWhen] = useState("");
  const [slots, setSlots] = useState([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  const [apptId, setApptId] = useState(apptFromUrl || "");
  const [token, setToken] = useState(tokenFromUrl || "");

  useEffect(() => {
    // Do NOT error if appt/token are missing; we support email-only.
    setErr("");
  }, []);

  async function verify() {
    try {
      setErr("");
      setLoading(true);
      const res = await fetch("/.netlify/functions/reschedule", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "lookup",
          // email is always used; appt/token are optional
          email: email.trim(),
          appt_id: apptId || undefined,
          token: token || undefined,
        }),
      });
      const json = await res.json();
      if (!res.ok || !json?.ok) throw new Error(json?.error || "Could not verify your appointment.");

      // Save what the backend resolved (works for email-only and token links)
      setApptId(json.appt_id);
      setToken(json.token);
      setCurrentWhen(json.current_label || "");
      setSlots(json.slots || []);
      setStep("pick");
    } catch (e) {
      setErr(e.message || "Verification failed.");
    } finally {
      setLoading(false);
    }
  }

  async function doReschedule(startUtc) {
    try {
      setErr("");
      setLoading(true);
      const res = await fetch("/.netlify/functions/reschedule", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "reschedule",
          appt_id: apptId,
          token,
          start_utc: startUtc,
        }),
      });
      const json = await res.json();
      if (!res.ok || !json?.ok) throw new Error(json?.error || "Could not reschedule.");
      setStep("done");
    } catch (e) {
      setErr(e.message || "Reschedule failed.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#1e1f22] text-white p-6">
      <div className="max-w-xl mx-auto">
        <h1 className="text-2xl font-bold mb-4">Reschedule your call</h1>

        {err && <div className="rounded-lg border border-red-400/30 bg-red-400/10 p-3 mb-4">{err}</div>}

        {step === "verify" && (
          <div className="space-y-3">
            <p className="text-white/70">
              Enter the email you used to book. We’ll find your appointment and show you available times.
            </p>
            <input
              type="email"
              className="w-full rounded-lg bg-black/30 border border-white/10 px-3 py-2 outline-none"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
            />
            <button
              onClick={verify}
              disabled={loading || !email}
              className="rounded-lg bg-white text-black px-4 py-2 font-semibold"
            >
              {loading ? "Checking..." : "Continue"}
            </button>
            {/* Tip: if the link included appt/token, we’ll use them automatically after you confirm the email. */}
          </div>
        )}

        {step === "pick" && (
          <div className="space-y-4">
            <div className="rounded-lg border border-white/10 bg-white/5 p-3">
              <div className="text-white/70 text-sm">Your current time</div>
              <div className="font-semibold">{currentWhen || "—"}</div>
            </div>

            <div className="text-white/70">Pick a new time</div>
            {slots.length ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-80 overflow-auto">
                {slots.map((s) => (
                  <button
                    key={s.startUtc}
                    onClick={() => doReschedule(s.startUtc)}
                    disabled={loading || s.isTaken || s.isBlocked}
                    className={`rounded-lg border px-3 py-2 text-left ${
                      s.isTaken || s.isBlocked
                        ? "border-white/10 bg-white/[0.03] text-white/40 cursor-not-allowed"
                        : "border-white/15 bg-white/5 hover:bg-white/10"
                    }`}
                  >
                    <div className="font-semibold">{s.labelLocal}</div>
                    <div className="text-xs text-white/60">
                      {s.isTaken ? "Booked" : s.labelTz}
                    </div>
                  </button>
                ))}
              </div>
            ) : (
              <div className="text-white/60">No alternative times right now.</div>
            )}
          </div>
        )}

        {step === "done" && (
          <div className="space-y-3">
            <div className="rounded-lg border border-white/10 bg-white/5 p-3">
              <div className="font-semibold">All set!</div>
              <div className="text-white/70 text-sm">
                We’ve emailed your updated confirmation with the new time and a reschedule link if needed.
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
