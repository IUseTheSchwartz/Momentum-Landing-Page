const sg = require("@sendgrid/mail");

exports.handler = async (event) => {
  try {
    if (event.httpMethod !== "POST") return { statusCode: 405, body: "Method Not Allowed" };
    const { SENDGRID_API_KEY, NOTIFY_FROM_EMAIL, NOTIFY_TO_EMAILS } = process.env;
    if (!SENDGRID_API_KEY || !NOTIFY_FROM_EMAIL || !NOTIFY_TO_EMAILS) {
      return { statusCode: 500, body: "Missing email env vars" };
    }
    sg.setApiKey(SENDGRID_API_KEY);

    const payload = JSON.parse(event.body || "{}"); // { full_name, email, phone, answers, start_utc, end_utc, timezone }
    const to = NOTIFY_TO_EMAILS.split(",").map((s) => s.trim()).filter(Boolean);

    const lines = [];
    lines.push(`New Appointment`);
    lines.push(`Name: ${payload.full_name || "-"}`);
    lines.push(`Email: ${payload.email || "-"}`);
    lines.push(`Phone: ${payload.phone || "-"}`);
    lines.push(`When (UTC): ${payload.start_utc} → ${payload.end_utc}`);
    lines.push(`Organizer TZ: ${payload.timezone || "-"}`);
    lines.push("");
    lines.push("Answers:");
    (payload.answers || []).forEach((a) => lines.push(`- ${a.question || a.question_id}: ${a.value}`));

    await sg.send({
      to,
      from: NOTIFY_FROM_EMAIL,
      subject: `New appointment — ${payload.full_name || "Unknown"} — ${payload.start_utc}`,
      text: lines.join("\n"),
    });

    return { statusCode: 200, body: "ok" };
  } catch (e) {
    console.error(e);
    return { statusCode: 500, body: "error" };
  }
};
