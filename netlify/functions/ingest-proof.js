// netlify/functions/ingest-proof.js
import { createClient } from "@supabase/supabase-js";

/**
 * Netlify Functions v2 handler
 * - Use `new Response(...)` instead of res.status(...)
 * - Reads JSON body with `await request.json()`
 */
export default async (request, context) => {
  const json = (obj, status = 200) =>
    new Response(JSON.stringify(obj), {
      status,
      headers: { "content-type": "application/json; charset=utf-8" },
    });

  try {
    if (request.method !== "POST") {
      return json({ error: "Method not allowed" }, 405);
    }

    let body;
    try {
      body = await request.json();
    } catch {
      return json({ error: "Invalid JSON body" }, 400);
    }

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

    // Auth
    if (!shared_secret || shared_secret !== process.env.PROOF_INGEST_SECRET) {
      return json({ error: "Unauthorized" }, 401);
    }
    if (!discord_message_id || !discord_user_id || !message_text) {
      return json({ error: "Missing fields" }, 400);
    }

    // Publish policy
    const roleNames = (roles || []).map((r) => (r || "").toString());

    // 👇 NEW: env switch to publish by default
    const DEFAULT_PUBLISH =
      (process.env.PROOF_DEFAULT_PUBLISH || "").toLowerCase() === "true";

    // Optional role-based allowlist (keep/edit as you like)
    const allowAuto = ["Manager", "Closer"];

    const is_published =
      DEFAULT_PUBLISH ||
      client_auto_publish ||
      roleNames.some((r) => allowAuto.includes(r));

    // Supabase (service role)
    const url = process.env.SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE;

    if (!url || !key) {
      return json(
        {
          error: "Supabase env missing",
          haveUrl: !!url,
          haveServiceRole: !!key,
        },
        500
      );
    }

    const sb = createClient(url, key);
    const happened_at = timestamp || new Date().toISOString();

    // Upsert by discord_message_id (requires a unique index on that column)
    const row = {
      discord_message_id: String(discord_message_id),
      discord_user_id: String(discord_user_id),
      display_name: display_name || null,
      avatar_url: avatar_url || null,
      message_text: String(message_text).slice(0, 2000),
      happened_at,
      is_published,
      is_pinned: false,
    };

    const { data, error } = await sb
      .from("mf_proof_posts")
      .upsert(row, { onConflict: "discord_message_id" })
      .select()
      .single();

    if (error) {
      console.error("supabase error", error);
      return json({ error: error.message }, 500);
    }

    return json({ ok: true, id: data?.id, is_published: data?.is_published }, 200);
  } catch (e) {
    console.error(e);
    return json({ error: "Server error" }, 500);
  }
};
