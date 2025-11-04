import crypto from "crypto";
import { getServiceClient } from "./_supabase.js";
import { sendMail } from "./_mailer.js";
import { clientConfirm, agentApptNotice } from "./_emailTemplates.js";

export const handler = async (event) => {
  if (event.httpMethod !== "POST") return { statusCode: 405, body: "Method Not Allowed" };
  try {
    const supabase = getServiceClient();
    const { lead_id, start_utc, duration_min = 30, tz = "America/Chicago" } = JSON.parse(event.body || "{}");
    if (!lead_id || !start_utc) return { statusCode: 400, body: JSON.stringify({ error: "Missing lead_id or start_utc" }) };

    const { data: lead, error: leadErr } = await supabase.from("mf_leads").select("*").eq("id", lead_id).single();
    if (leadErr || !lead) return { statusCode: 404, body: JSON.stringify({ error: "Lead not found" }) };

    const start = new Date(start_utc);
    const end_utc = new Date(start.getTime() + duration_min * 60000).toISOString();
    const token = crypto.randomBytes(16).toString("hex");

    // Insert appointment
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
        duration_min,              // ✅ include duration_min if your table has it
        timezone: tz,
        status: "booked",
        token
      }])
      .select()
      .single();

    if (apptErr) {
      console.error("appt insert failed:", apptErr);
      const msg = apptErr?.message || "Insert failed";
      const lower = String(msg).toLowerCase();
      // If you have unique or overlap constraints, return 409 so UI shows “taken”
      const status = (lower.includes("unique") || lower.includes("conflict") || lower.includes("overlap")) ? 409 : 400;
      return { statusCode: status, body: JSON.stringify({ error: msg }) };
    }

    // Update lead stage/last activity
    await supabase
      .from("mf_leads")
      .update({ stage: "appointment", last_activity_at: new Date().toISOString() })
      .eq("id", lead_id);

    const base = process.env.SITE_URL || "https://example.com";
    const rescheduleUrl = `${base}/reschedule?appt=${appt.id}&t=${appt.token}`;
    const phoneHref = `tel:+16187953409`;
    const phoneLabel = `618-795-3409`;
    const vcardUrl = `${base}/logan-harris.vcf`;

    // Client email (NO answers)
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
      await sendMail({
        to: lead.email,
        subject: c.subject,
        html: c.html,
        text: c.text,
        replyTo: "hello@logantharris.com",
      });
    }

    // Agent/admin email (INCLUDES answers)
    const a = agentApptNotice({
      lead, // includes answers
      whenIso: start_utc,
      tz,
      durationMin: duration_min,
      adminUrl: `${base}/app/admin?tab=leads&lead=${lead.id}`,
    });
    const adminRecipients = (process.env.SMTP_TO || "").split(",").map((s) => s.trim()).filter(Boolean);
    if (adminRecipients.length) {
      await sendMail({ to: adminRecipients.join(","), subject: a.subject, html: a.html, text: a.text });
    }

    await supabase.from("mf_email_log").insert([ ...(lead.email ? [{ lead_id, type: "appointment" }] : []) ]);

    return { statusCode: 200, body: JSON.stringify({ ok: true, appt_id: appt.id }) };
  } catch (e) {
    console.error(e);
    return { statusCode: 500, body: JSON.stringify({ error: "Server error" }) };
  }
};
