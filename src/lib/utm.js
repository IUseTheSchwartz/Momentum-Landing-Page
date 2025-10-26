export function readUTM() {
  const u = new URL(window.location.href);
  const get = (k) => u.searchParams.get(k) || undefined;
  return {
    source: get("utm_source"),
    medium: get("utm_medium"),
    campaign: get("utm_campaign"),
    content: get("utm_content"),
    term: get("utm_term"),
    url: u.toString(),
  };
}
