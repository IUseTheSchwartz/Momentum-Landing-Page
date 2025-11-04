const { getServiceClient } = require("./_supabase");
const { sendMail } = require("./_mailer");
const { clientConfirm, agentApptNotice } = require("./_emailTemplates");

exports.handler = async (event) => {
  if (event.httpMethod !== "POST") return { statusCode: 405, body: "Method Not Allowed" };
  try {
    const supabase = getServiceClient();
    const { appt_id, token, new_start_utc } = JSON.parse(event.body || "{}");
    if (!appt_id || !token || !new_start_utc) return { statusCode: 400, body: "Missing fields" };

    const { data: appt, error: apptErr } = await supabase.from("mf_appointments").select("*").eq("id", appt_id).single();
    if (apptErr || !appt) return { statusCode: 404, body: "Appointment not found" };
    if (appt.token !== token) return { statusCode: 403, body: "Invalid token" };

    const { data: lead, error: leadErr } = await supabase.from("mf_leads").select("*").eq("id", appt.lead_id).single();
    if (leadErr || !lead) return { statusCode: 404, body: "Lead not found" };

    const { error: upErr } = await supabase
      .from("mf_appointments")
      .update({ start_utc: new_start_utc, status: "rescheduled", updated_at: new Date().toISOString() })
      .eq("id", appt_id);
    if (upErr) throw upErr;

    const base = process.env.SITE_URL || "https://example.com";
    const rescheduleUrl = `${base}/reschedule?appt=${appt.id}&t=${appt.token}`;
    const phoneHref = `tel:+16187953409`;
    const phoneLabel = `618-795-3409`;
    const vcardUrl = `${base}/logan-harris.vcf`;

    // Notify client
    if (lead.email) {
      const c = clientConfirm({
        whenIso: new_start_utc,
        tz: appt.tz || "America/Chicago",
        durationMin: appt.duration_min || 30,
        rescheduleUrl,
        phoneHref,
        phoneLabel,
        vcardUrl,
      });
      await sendMail({ to: lead.email, subject: `Updated: ${c.subject}`, html: c.html, text: c.text });
    }

    // Notify agent/admin
    const a = agentApptNotice({
      lead,
      whenIso: new_start_utc,
      tz: appt.tz || "America/Chicago",
      durationMin: appt.duration_min || 30,
      adminUrl: `${base}/app/admin?tab=leads&lead=${lead.id}`,
    });
    const adminRecipients = (process.env.SMTP_TO || "").split(",").map(s => s.trim()).filter(Boolean);
    if (adminRecipients.length) {
      await sendMail({ to: adminRecipients.join(","), subject: `Rescheduled – ${a.subject}`, html: a.html, text: a.text });
    }

    // Log
    await supabase.from("mf_email_log").insert([{ lead_id: lead.id, type: "rescheduled" }]);

    return { statusCode: 200, body: JSON.stringify({ ok: true }) };
  } catch (e) {
    console.error(e);
    return { statusCode: 500, body: "Server error" };
  }
};
