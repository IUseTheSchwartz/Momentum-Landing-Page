const sg = require("@sendgrid/mail");

exports.handler = async (event) => {
  try {
    if (event.httpMethod !== "POST") return { statusCode: 405, body: "Method Not Allowed" };
    const { SENDGRID_API_KEY, NOTIFY_FROM_EMAIL, NOTIFY_TO_EMAILS } = process.env;
    if (!SENDGRID_API_KEY || !NOTIFY_FROM_EMAIL || !NOTIFY_TO_EMAILS) {
      return { statusCode: 500, body: "Missing email env vars" };
    }
    sg.setApiKey(SENDGRID_API_KEY);

    const payload = JSON.parse(event.body || "{}"); // { full_name, email, phone, answers, utm }
    const to = NOTIFY_TO_EMAILS.split(",").map((s) => s.trim()).filter(Boolean);

    const lines = [];
    lines.push(`New Lead from Momentum Financial`);
    lines.push(`Name: ${payload.full_name || "-"}`);
    lines.push(`Email: ${payload.email || "-"}`);
    lines.push(`Phone: ${payload.phone || "-"}`);
    lines.push("");
    lines.push("Answers:");
    (payload.answers || []).forEach((a) => lines.push(`- ${a.question || a.question_id}: ${a.value}`));
    lines.push("");
    lines.push(`UTM: ${JSON.stringify(payload.utm || {}, null, 0)}`);

    await sg.send({
      to,
      from: NOTIFY_FROM_EMAIL,
      subject: `New lead — ${payload.full_name || "Unknown"}`,
      text: lines.join("\n"),
    });

    return { statusCode: 200, body: "ok" };
  } catch (e) {
    console.error(e);
    return { statusCode: 500, body: "error" };
  }
};
