// File: netlify/functions/reschedule.js
import { getServiceClient } from "./_supabase.js";
import { sendMail } from "./_mailer.js";
import { clientConfirm, agentApptNotice } from "./_emailTemplates.js";

export const handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: JSON.stringify({ error: "Method Not Allowed" }) };
  }
  try {
    const supabase = getServiceClient();
    const { appt_id, email, new_start_utc } = JSON.parse(event.body || "{}");
    if (!appt_id || !email || !new_start_utc) {
      return { statusCode: 400, body: JSON.stringify({ error: "Missing appt_id, email, or new_start_utc" }) };
    }

    // Load appointment
    const { data: appt, error: apptErr } = await supabase
      .from("mf_appointments")
      .select("*")
      .eq("id", appt_id)
      .single();
    if (apptErr || !appt) return { statusCode: 404, body: JSON.stringify({ error: "Appointment not found" }) };

    // Verify email matches
    const norm = (s) => String(s || "").trim().toLowerCase();
    if (norm(appt.email) !== norm(email)) {
      return { statusCode: 403, body: JSON.stringify({ error: "Email does not match this appointment" }) };
    }

    // Read availability for duration + tz
    const { data: av } = await supabase
      .from("mf_availability")
      .select("*")
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    const tz = appt.timezone || av?.tz || "America/Chicago";
    const durationMin = av?.slot_minutes ?? 30;
    const newStart = new Date(new_start_utc);
    const newEnd = new Date(newStart.getTime() + durationMin * 60000).toISOString();

    // Optional: basic overlap check (unique index will also protect)
    const { data: conflicts } = await supabase
      .from("mf_appointments")
      .select("id,start_utc,end_utc")
      .neq("id", appt_id)
      .in("status", ["booked", "rescheduled", "scheduled"]);
    const overlaps = (aS, aE, bS, bE) => aS < bE && bS < aE;
    const anyHit = (conflicts || []).some((c) =>
      overlaps(newStart, new Date(newEnd), new Date(c.start_utc), new Date(c.end_utc))
    );
    if (anyHit) {
      return { statusCode: 409, body: JSON.stringify({ error: "That time just got booked. Pick another." }) };
    }

    // Update appointment
    const { data: updated, error: upErr } = await supabase
      .from("mf_appointments")
      .update({ start_utc: new_start_utc, end_utc: newEnd, status: "scheduled" })
      .eq("id", appt_id)
      .select()
      .single();
    if (upErr) {
      const msg = upErr.message || "Update failed";
      const lower = msg.toLowerCase();
      const status = (lower.includes("unique") || lower.includes("conflict")) ? 409 : 400;
      return { statusCode: status, body: JSON.stringify({ error: msg }) };
    }

    // Emails
    const phoneHref = `tel:+16187953409`;
    const phoneLabel = `618-795-3409`;
    const vcardUrl = `${process.env.SITE_URL || ""}/logan-harris.vcf`.replace(/\/\//g, "/").replace(":/", "://");

    // Client - re-use confirm (subject indicates reschedule)
    if (updated.email) {
      const c = clientConfirm({
        whenIso: updated.start_utc,
        tz,
        durationMin: durationMin,
        rescheduleUrl: `${process.env.SITE_URL || ""}/reschedule?appt=${updated.id}`,
        phoneHref,
        phoneLabel,
        vcardUrl,
        subjectPrefix: "Updated: ", // optional support in template
      });
      await sendMail({
        to: updated.email,
        subject: c.subject || `Updated: Your call is set`,
        html: c.html,
        text: c.text,
        replyTo: "hello@logantharris.com",
      });
    }

    // Admin/Agent — includes answers
    const a = agentApptNotice({
      lead: {
        full_name: updated.full_name,
        email: updated.email,
        phone: updated.phone,
        answers: updated.answers || [],
        id: updated.lead_id,
      },
      whenIso: updated.start_utc,
      tz,
      durationMin: durationMin,
      adminUrl: `${process.env.SITE_URL || ""}/app/admin?tab=leads&lead=${updated.lead_id}`,
      subjectPrefix: "Rescheduled: ",
    });
    const adminRecipients = (process.env.SMTP_TO || "").split(",").map((s) => s.trim()).filter(Boolean);
    if (adminRecipients.length) {
      await sendMail({ to: adminRecipients.join(","), subject: a.subject, html: a.html, text: a.text });
    }

    return { statusCode: 200, body: JSON.stringify({ ok: true, appt_id }) };
  } catch (e) {
    console.error(e);
    return { statusCode: 500, body: JSON.stringify({ error: "Server error" }) };
  }
};
