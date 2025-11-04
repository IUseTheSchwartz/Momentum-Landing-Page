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

    const start = new Date(start_utc);
    const end_utc = new Date(start.getTime() + duration_min * 60000).toISOString();
    const token = crypto.randomBytes(16).toString("hex");

    // Insert using YOUR table's column names
    const { data: appt, error: apptErr } = await supabase
      .from("mf_appointments")
      .insert([{
        lead_id,
        full_name: lead.full_name || null,
        email: lead.email || null,
        phone: lead.phone || null,
        answers: lead.answers || [],
        start_utc,
        end_utc,
        timezone: tz,
        status: "booked",   // you previously used "scheduled"; both are now treated as blocked
        token
      }])
      .select()
      .single();
    if (apptErr) throw apptErr;

    // Keep lead fresh for the incomplete-grace logic
    await supabase.from("mf_leads").update({
      stage: "appointment",
      last_activity_at: new Date().toISOString()
    }).eq("id", lead_id);

    const base = process.env.SITE_URL || "https://example.com";
    const rescheduleUrl = `${base}/reschedule?appt=${appt.id}&t=${appt.token}`;
    const phoneHref = `tel:+16187953409`;
    const phoneLabel = `618-795-3409`;
    const vcardUrl = `${base}/logan-harris.vcf`;

    // Client email
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

    // Agent/admin email
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

    // Log
    await supabase.from("mf_email_log").insert([ ...(lead.email ? [{ lead_id, type: "appointment" }] : []) ]);

    return { statusCode: 200, body: JSON.stringify({ ok: true, appt_id: appt.id }) };
  } catch (e) {
    console.error(e);
    return { statusCode: 500, body: "Server error" };
  }
};
