// netlify/functions/ingest-proof.js
import { createClient } from "@supabase/supabase-js";

export async function handler(event, context) {
  try {
    if (event.httpMethod !== "POST") {
      return json(405, { error: "Method not allowed" });
    }

    const body = safeJson(event.body);
    const {
      discord_message_id,
      discord_user_id,
      display_name,
      avatar_url,
      message_text,
      timestamp,
      roles = [],
      client_auto_publish = false,
      shared_secret,
    } = body || {};

    if (!shared_secret || shared_secret !== process.env.PROOF_INGEST_SECRET) {
      console.warn("Unauthorized ingest attempt");
      return json(401, { error: "Unauthorized" });
    }
    if (!discord_message_id || !discord_user_id || !message_text) {
      return json(400, { error: "Missing fields" });
    }

    // Decide publish policy (server-side)
    const roleNames = (roles || []).map((r) => (r || "").toString());
    const allowAuto = ["Manager", "Closer"];
    const is_published =
      client_auto_publish || roleNames.some((r) => allowAuto.includes(r));

    // Supabase (service role) — set these in Netlify env
    const url = process.env.SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE;
    const sb = createClient(url, key);

    const happened_at = timestamp || new Date().toISOString();

    // Upsert by discord_message_id (requires a unique index on that column)
    const row = {
      discord_message_id: discord_message_id.toString(),
      discord_user_id: discord_user_id.toString(),
      display_name: display_name || null,
      avatar_url: avatar_url || null,
      message_text: (message_text || "").slice(0, 2000),
      happened_at,
      is_published,
      is_pinned: false,
    };

    console.log("Ingest row (sanitized):", {
      ...row,
      message_text: `${row.message_text.slice(0, 60)}...`,
    });

    const { data, error } = await sb
      .from("mf_proof_posts")
      .upsert(row, { onConflict: "discord_message_id" })
      .select()
      .single();

    if (error) {
      console.error("Supabase error:", error);
      return json(500, { error: error.message });
    }

    console.log("Ingest OK id:", data?.id);
    return json(200, { ok: true, id: data?.id });
  } catch (e) {
    console.error("Server error:", e);
    return json(500, { error: "Server error" });
  }
}

// --- helpers ---
function json(statusCode, obj) {
  return {
    statusCode,
    headers: { "content-type": "application/json" },
    body: JSON.stringify(obj),
  };
}
function safeJson(s) {
  try {
    return JSON.parse(s || "{}");
  } catch {
    return {};
  }
}
