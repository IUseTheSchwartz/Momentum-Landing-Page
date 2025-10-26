export function buildICS({ title, description, startUtcISO, endUtcISO, location = "" }) {
  const uid = crypto.randomUUID();
  const dt = (iso) => iso.replace(/[-:]/g, "").replace(".000Z", "Z");
  const ics = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Momentum//Booking//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:${uid}`,
    `DTSTAMP:${dt(new Date().toISOString())}`,
    `DTSTART:${dt(startUtcISO)}`,
    `DTEND:${dt(endUtcISO)}`,
    `SUMMARY:${escapeICS(title)}`,
    `DESCRIPTION:${escapeICS(description)}`,
    `LOCATION:${escapeICS(location)}`,
    "END:VEVENT",
    "END:VCALENDAR",
  ].join("\r\n");
  return new Blob([ics], { type: "text/calendar;charset=utf-8" });
}
function escapeICS(s = "") {
  return String(s).replace(/\\n/g, "\\n").replace(/,/g, "\\,").replace(/;/g, "\\;");
}
