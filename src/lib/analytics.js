// File: src/lib/analytics.js
import { readUTM } from "./utm.js";

function uuid() {
  if (crypto?.randomUUID) return crypto.randomUUID();
  return ([1e7]+-1e3+-4e3+-8e3+-1e11).replace(/[018]/g,c=>(c^crypto.getRandomValues(new Uint8Array(1))[0]&15>>c/4).toString(16));
}

export function initAnalytics() {
  try {
    const now = Date.now();
    const sessionId = uuid();
    const startedAt = new Date(now).toISOString();
    const path = location.pathname + location.search;
    const referrer = document.referrer || null;
    const utm = readUTM();
    const user_agent = navigator.userAgent;

    // Start session
    fetch("/.netlify/functions/analytics", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type: "page_view",
        session_id: sessionId,
        started_at: startedAt,
        path,
        referrer,
        utm,
        user_agent,
      }),
      keepalive: true,
    }).catch(() => {});

    // End session on unload (time on page)
    const end = () => {
      const duration_ms = Date.now() - now;
      navigator.sendBeacon(
        "/.netlify/functions/analytics",
        new Blob([JSON.stringify({
          type: "session_end",
          session_id: sessionId,
          ended_at: new Date().toISOString(),
          duration_ms
        })], { type: "application/json" })
      );
      window.removeEventListener("pagehide", end);
      window.removeEventListener("beforeunload", end);
      document.removeEventListener("visibilitychange", vcHandler);
    };

    const vcHandler = () => {
      // treat hidden tab as leaving (good enough; keeps logic simple)
      if (document.visibilityState === "hidden") end();
    };

    window.addEventListener("pagehide", end);
    window.addEventListener("beforeunload", end);
    document.addEventListener("visibilitychange", vcHandler);
  } catch {}
}
