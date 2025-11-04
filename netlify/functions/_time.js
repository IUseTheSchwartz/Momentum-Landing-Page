// formatAppt('2025-11-04T15:00:00Z', 'America/Chicago') -> "Tue, Nov 4 · 9:00 AM CT"
function getTzAbbrev(d, tz) {
  try {
    const fmt = new Intl.DateTimeFormat("en-US", { timeZone: tz, timeZoneName: "short" });
    const parts = fmt.formatToParts(d);
    const part = parts.find((p) => p.type === "timeZoneName");
    return part?.value?.replace(/^GMT[+\-]\d+$/, "");
  } catch {
    return "CT";
  }
}

export function formatAppt(iso, tz = "America/Chicago") {
  const d = new Date(iso);
  const day = new Intl.DateTimeFormat("en-US", { weekday: "short", timeZone: tz }).format(d);
  const mon = new Intl.DateTimeFormat("en-US", { month: "short", timeZone: tz }).format(d);
  const date = new Intl.DateTimeFormat("en-US", { day: "numeric", timeZone: tz }).format(d);
  const time = new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
    timeZone: tz,
  }).format(d);
  const abbr = getTzAbbrev(d, tz) || "CT";
  return `${day}, ${mon} ${date} · ${time} ${abbr}`;
}
