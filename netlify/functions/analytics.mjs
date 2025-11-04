// File: netlify/functions/analytics.mjs
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE;

function json(body, statusCode = 200) {
  return { statusCode, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) };
}

function getIp(headers = {}) {
  // Netlify puts the client IP here:
  const nf = headers["x-nf-client-connection-ip"];
  if (nf) return nf;
  const xff = headers["x-forwarded-for"];
  if (xff) return String(xff).split(",")[0].trim();
  return null;
}

export async function handler(event) {
  if (event.httpMethod !== "POST") return json({ error: "Method not allowed" }, 405);

  let payload;
  try {
    payload = JSON.parse(event.body || "{}");
  } catch {
    return json({ error: "Bad JSON" }, 400);
  }

  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE);

  try {
    if (payload.type === "page_view") {
      const row = {
        id: payload.session_id,
        started_at: new Date(payload.started_at).toISOString(),
        path: payload.path || null,              // still stored, but we won’t chart it
        referrer: payload.referrer || null,
        utm: payload.utm || null,
        user_agent: payload.user_agent || null,
        ip: getIp(event.headers) || null,        // ← store IP
      };
      const { error } = await supabase.from("mf_analytics_sessions").insert([row]);
      if (error) return json({ error: error.message }, 400);
      return json({ ok: true });
    }

    if (payload.type === "session_end") {
      const endedAt = new Date(payload.ended_at).toISOString();
      const duration = Math.max(0, Number(payload.duration_ms || 0) | 0);
      const { error } = await supabase
        .from("mf_analytics_sessions")
        .update({ ended_at: endedAt, duration_ms: duration })
        .eq("id", payload.session_id);
      if (error) return json({ error: error.message }, 400);
      return json({ ok: true });
    }

    return json({ error: "Unknown type" }, 400);
  } catch (e) {
    return json({ error: "Server error", detail: String(e) }, 500);
  }
}
