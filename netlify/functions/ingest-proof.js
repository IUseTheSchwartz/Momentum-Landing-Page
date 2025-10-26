import { createClient } from "@supabase/supabase-js";

export default async (req) => {
  try {
    if (req.method !== "POST") {
      return new Response(JSON.stringify({ error: "Method not allowed" }), {
        status: 405,
        headers: { "content-type": "application/json" },
      });
    }

    let body;
    try {
      body = await req.json();
    } catch {
      return new Response(JSON.stringify({ error: "Invalid JSON body" }), {
        status: 400,
        headers: { "content-type": "application/json" },
      });
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

    if (!shared_secret || shared_secret !== process.env.PROOF_INGEST_SECRET) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { "content-type": "application/json" },
      });
    }

    if (!discord_message_id || !discord_user_id || !message_text) {
      return new Response(
        JSON.stringify({ error: "Missing fields: discord_message_id, discord_user_id, message_text" }),
        { status: 400, headers: { "content-type": "application/json" } }
      );
    }

    const roleNames = (roles || []).map((r) => (r || "").toString());
    const allowAuto = ["Manager", "Closer"];
    const is_published = client_auto_publish || roleNames.some((r) => allowAuto.includes(r));

    const url = process.env.SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE;
    if (!url || !key) {
      return new Response(
        JSON.stringify({ error: "Supabase env missing", haveUrl: !!url, haveServiceRole: !!key }),
        { status: 500, headers: { "content-type": "application/json" } }
      );
    }
    const sb = createClient(url, key);

    const happened_at = timestamp || new Date().toISOString();

    const row = {
      discord_message_id: String(discord_message_id),
      discord_user_id: String(discord_user_id),
      display_name: display_name || null,
      avatar_url: avatar_url || null,
      message_text: String(message_text).slice(0, 2000),
      happened_at,
      is_published,
      is_pinned: false,
      // amount_cents, currency, screenshot_url are optional; omit if you’re not using them
    };

    const { data, error } = await sb
      .from("mf_proof_posts")
      .upsert(row, { onConflict: "discord_message_id" })
      .select()
      .single();

    if (error) {
      console.error("supabase error", error);
      return new Response(
        JSON.stringify({
          error: "supabase",
          code: error.code,
          details: error.details,
          message: error.message,
          hint: error.hint,
        }),
        { status: 500, headers: { "content-type": "application/json" } }
      );
    }

    return new Response(JSON.stringify({ ok: true, id: data?.id }), {
      status: 200,
      headers: { "content-type": "application/json" },
    });
  } catch (e) {
    console.error(e);
    return new Response(JSON.stringify({ error: "Server error", message: String(e) }), {
      status: 500,
      headers: { "content-type": "application/json" },
    });
  }
};
