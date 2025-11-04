import crypto from "crypto";
import { getServiceClient } from "./_supabase.js";
import { sendMail } from "./_mailer.js";
import { clientConfirm, agentApptNotice } from "./_emailTemplates.js";

export const handler = async (event) => {
  if (event.httpMethod !== "POST") return { statusCode: 405, body: "Method Not Allowed" };
  try {
    const supabase = getServiceClient();
    const { lead_id, start_utc, duration_min = 30, tz = "America/Chicago" } = JSON.parse(event.body || "{}");

    if (!lead_id || !start_utc) return { statusCode: 400, body: "Missing lead_id or start_utc" };

    const { data: lead, error: leadErr } = await supabase.from("mf_leads").select("*").eq("id", lead_id).single();
    if (leadErr || !lead) return { statusCode: 404, body: "Lead not found" };

    const token = crypto.randomBytes(16).toString("hex");

    const { data: appt, error: apptErr } = await supabase
      .from("mf_appointments")
      .insert([{ lead_id, start_utc, duration_min, tz, token, status: "booked" }])
      .select()
      .single();
    if (apptErr) throw apptErr;

    await supabase.from("mf_leads").update({ stage: "appointment" }).eq("id", lead_id);

    const base = process.env.SITE_URL || "https://example.com";
    const rescheduleUrl = `${base}/reschedule?appt=${appt.id}&t=${appt.token}`;
    const phoneHref = `tel:+16187953409`;
    const phoneLabel = `618-795-3409`;
    const vcardUrl = `${base}/logan-harris.vcf`;

    if (lead.email) {
      const c = clientConfirm({
        whenIso: start_utc,
        tz,
        durationMin: duration_min,
        rescheduleUrl,
        phoneHref,
        phoneLabel,
        vcardUrl,
      });
      await sendMail({ to: lead.email, subject: c.subject, html: c.html, text: c.text, replyTo: "hello@logantharris.com" });
    }

    const a = agentApptNotice({
      lead,
      whenIso: start_utc,
      tz,
      durationMin: duration_min,
      adminUrl: `${base}/app/admin?tab=leads&lead=${lead.id}`,
    });
    const adminRecipients = (process.env.SMTP_TO || "").split(",").map((s) => s.trim()).filter(Boolean);
    if (adminRecipients.length) {
      await sendMail({ to: adminRecipients.join(","), subject: a.subject, html: a.html, text: a.text });
    }

    await supabase.from("mf_email_log").insert([...(lead.email ? [{ lead_id, type: "appointment" }] : [])]);

    return { statusCode: 200, body: JSON.stringify({ ok: true, appt_id: appt.id }) };
  } catch (e) {
    console.error(e);
    return { statusCode: 500, body: "Server error" };
  }
};
