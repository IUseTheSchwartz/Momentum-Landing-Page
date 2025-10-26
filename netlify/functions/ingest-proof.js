// netlify/functions/ingest-proof.js
import { createClient } from "@supabase/supabase-js";

export default async (req, res) => {
  const startedAt = new Date().toISOString();
  try {
    // ---- entry logs ----
    console.log("🔔 ingest-proof HIT", {
      startedAt,
      method: req.method,
      url: req.url,
      ip: req.headers["x-forwarded-for"] || req.socket?.remoteAddress,
      ua: req.headers["user-agent"],
      contentType: req.headers["content-type"],
      contentLength: req.headers["content-length"],
    });

    if (req.method !== "POST") {
      console.warn("⛔ 405 method not allowed:", req.method);
      return res.status(405).json({ error: "Method not allowed" });
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
    } = req.body || {};

    // safe body preview (no secret)
    console.log("🧾 body preview", {
      hasBody: !!req.body,
      discord_message_id,
      discord_user_id,
      display_name,
      avatar_present: !!avatar_url,
      message_len: (message_text || "").length,
      roles_count: Array.isArray(roles) ? roles.length : 0,
      client_auto_publish,
      timestamp,
      secret_supplied: Boolean(shared_secret), // do not log the value
    });

    if (!shared_secret || shared_secret !== process.env.PROOF_INGEST_SECRET) {
      console.warn("🔒 unauthorized: bad or missing shared_secret");
      return res.status(401).json({ error: "Unauthorized" });
    }
    if (!discord_message_id || !discord_user_id || !message_text) {
      console.warn("⚠️ 400 missing required fields");
      return res.status(400).json({ error: "Missing fields" });
    }

    // publish policy
    const roleNames = (roles || []).map((r) => (r || "").toString());
    const allowAuto = ["Manager", "Closer"];
    const is_published =
      client_auto_publish || roleNames.some((r) => allowAuto.includes(r));

    console.log("🧮 publish decision", {
      client_auto_publish,
      roleNames,
      allowAuto,
      is_published,
    });

    // Supabase client
    const url = process.env.SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE;
    const sb = createClient(url, key);

    const happened_at = timestamp || new Date().toISOString();

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

    // trim what we log to keep things readable
    console.log("⬆️ upserting row", {
      ...row,
      message_text: `${row.message_text.slice(0, 140)}${row.message_text.length > 140 ? "…" : ""}`,
    });

    const { data, error } = await sb
      .from("mf_proof_posts")
      .upsert(row, { onConflict: "discord_message_id" })
      .select()
      .single();

    if (error) {
      console.error("🟥 supabase error", { code: error.code, message: error.message, details: error.details });
      return res.status(500).json({ error: error.message });
    }

    console.log("🟩 supabase upsert OK", { id: data?.id, discord_message_id: row.discord_message_id });

    const finishedAt = new Date().toISOString();
    console.log("✅ ingest-proof DONE", { startedAt, finishedAt });

    return res.status(200).json({ ok: true, id: data?.id });
  } catch (e) {
    console.error("🟥 server error", { message: e?.message, stack: e?.stack });
    return res.status(500).json({ error: "Server error" });
  }
};
