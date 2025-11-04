import { getServiceClient } from "./_supabase.js";
import { sendMail } from "./_mailer.js";
import { incompleteNotice } from "./_emailTemplates.js";

const GRACE_MINUTES = parseInt(process.env.INCOMPLETE_GRACE_MIN || "15", 10);

export const handler = async () => {
  try {
    const supabase = getServiceClient();

    // fallback: simple filter if no RPC
    const { data, error: err2 } = await supabase
      .from("mf_leads")
      .select("*")
      .eq("is_complete", false)
      .eq("incomplete_notified", false)
      .lte("last_activity_at", new Date(Date.now() - GRACE_MINUTES * 60 * 1000).toISOString());
    if (err2) throw err2;

    const leadIds = data.map((l) => l.id);
    let noAppt = data;
    if (leadIds.length) {
      const { data: appts } = await supabase.from("mf_appointments").select("lead_id").in("lead_id", leadIds);
      const apptSet = new Set(appts?.map((a) => a.lead_id));
      noAppt = data.filter((l) => !apptSet.has(l.id));
    }

    const adminRecipients = (process.env.SMTP_TO || "").split(",").map((s) => s.trim()).filter(Boolean);
    if (!adminRecipients.length) return { statusCode: 200, body: "ok (no recipients)" };

    for (const lead of noAppt) {
      const { data: recent } = await supabase
        .from("mf_email_log")
        .select("id")
        .eq("lead_id", lead.id)
        .eq("type", "incomplete")
        .gte("created_at", new Date(Date.now() - 24 * 3600 * 1000).toISOString());
      if (recent?.length) continue;

      const lastActiveRel = relTime(lead.last_activity_at);
      const resumeUrl = `${process.env.SITE_URL || "https://example.com"}/app/admin?tab=leads&lead=${lead.id}`;
      const t = incompleteNotice({ lead, resumeUrl, lastActiveRel });

      await sendMail({ to: adminRecipients.join(","), subject: t.subject, html: t.html, text: t.text });
      await supabase.from("mf_email_log").insert([{ lead_id: lead.id, type: "incomplete" }]);
      await supabase.from("mf_leads").update({ incomplete_notified: true }).eq("id", lead.id);
    }

    return { statusCode: 200, body: "ok" };
  } catch (e) {
    console.error(e);
    return { statusCode: 200, body: "ok (errors logged)" };
  }
};

function relTime(iso) {
  const ms = Date.now() - new Date(iso).getTime();
  const m = Math.round(ms / 60000);
  if (m < 60) return `${m}m`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h}h`;
  const d = Math.round(h / 24);
  return `${d}d`;
}
