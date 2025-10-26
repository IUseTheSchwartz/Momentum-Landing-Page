// netlify/functions/ingest-proof.js
import { createClient } from "@supabase/supabase-js";

export default async (req, res) => {
  try {
    if (req.method !== "POST") {
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

    if (!shared_secret || shared_secret !== process.env.PROOF_INGEST_SECRET) {
      return res.status(401).json({ error: "Unauthorized" });
    }
    if (!discord_message_id || !discord_user_id || !message_text) {
      return res.status(400).json({ error: "Missing fields" });
    }

    // Decide publish policy (server-side)
    // Example: auto-publish if role contains 'Manager' or 'Closer'
    const roleNames = (roles || []).map((r) => (r || "").toString());
    const allowAuto = ["Manager", "Closer"];
    const is_published =
      client_auto_publish || roleNames.some((r) => allowAuto.includes(r));

    // Supabase (service role) — set these in Netlify env
    const url = process.env.SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE;
    const sb = createClient(url, key);

    const happened_at = timestamp || new Date().toISOString();

    // Upsert by discord_message_id (make sure your table has a unique index on this)
    const row = {
      discord_message_id: discord_message_id.toString(),
      discord_user_id: discord_user_id.toString(),
      display_name: display_name || null,
      avatar_url: avatar_url || null,
      message_text: message_text.slice(0, 2000),
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
      return res.status(500).json({ error: error.message });
    }

    return res.status(200).json({ ok: true, id: data?.id });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: "Server error" });
  }
};
