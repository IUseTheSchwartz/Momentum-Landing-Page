export async function createAppointment({ leadId, startDateTime, durationMin = 30, tz = "America/Chicago" }) {
  const res = await fetch("/.netlify/functions/appointment-create", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      lead_id: leadId,
      start_utc: new Date(startDateTime).toISOString(),
      duration_min: durationMin,
      tz
    }),
  });
  if (!res.ok) {
    const msg = await res.text().catch(() => "Failed");
    throw new Error(msg || "Failed to create appointment");
  }
  return res.json(); // { ok: true, appt_id: ... }
}
