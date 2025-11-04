// File: src/components/booking/ConfirmBooking.jsx
import { useState } from "react";
import { createAppointment } from "../../lib/appointments";

export default function ConfirmBooking({ leadId, selectedDateTimeIso }) {
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState("");

  async function onConfirm() {
    try {
      setLoading(true);
      setMsg("");
      await createAppointment({
        leadId,
        startDateTime: selectedDateTimeIso, // e.g., "2025-11-04T15:00:00Z" or local -> new Date(...).toISOString()
        durationMin: 30,
        tz: "America/Chicago",
      });
      setMsg("Booked! We just emailed you the confirmation.");
    } catch (e) {
      setMsg("Could not book. Please try again.");
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex items-center gap-2">
      <button className="px-4 py-2 rounded bg-white text-black disabled:opacity-60"
              onClick={onConfirm} disabled={loading}>
        {loading ? "Booking…" : "Confirm"}
      </button>
      {msg && <span className="text-white/70 text-sm">{msg}</span>}
    </div>
  );
}
