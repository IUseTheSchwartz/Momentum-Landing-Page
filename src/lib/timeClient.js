export function formatLocal(iso, tz = "America/Chicago") {
  const d = new Date(iso);
  const opts = { timeZone: tz, weekday: "short", month: "short", day: "numeric", hour: "numeric", minute: "2-digit", hour12: true };
  const str = new Intl.DateTimeFormat("en-US", opts).format(d);
  // We usually display CT always; you can add abbrev if you like.
  return `${str} CT`;
}
