// SMTP email via Mailjet (or any SMTP) using nodemailer
const nodemailer = require("nodemailer");

exports.handler = async (event) => {
  try {
    if (event.httpMethod !== "POST") {
      return { statusCode: 405, body: "Method Not Allowed" };
    }

    const payload = JSON.parse(event.body || "{}"); // { subject, text, html?, to? }
    const toList = (payload.to || process.env.SMTP_TO || "")
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);

    const host = process.env.SMTP_HOST;
    const user = process.env.SMTP_USER;
    const pass = process.env.SMTP_PASS;
    const from = process.env.SMTP_FROM || user;
    const port = Number(process.env.SMTP_PORT || 587);
    const secure = port === 465; // true for 465, false for 587/25

    // Soft no-op if not configured
    if (!host || !user || !pass || toList.length === 0) {
      console.log("[send-email] Skipping (missing SMTP env or recipients)", {
        hasHost: !!host,
        hasUser: !!user,
        hasPass: !!pass,
        toList,
      });
      return { statusCode: 200, body: "ok (email skipped)" };
    }

    const transporter = nodemailer.createTransport({
      host,
      port,
      secure,
      auth: { user, pass },
    });

    await transporter.sendMail({
      from,
      to: toList,
      subject: payload.subject || "Notification",
      text: payload.text || "",
      html: payload.html || undefined,
    });

    return { statusCode: 200, body: "ok" };
  } catch (e) {
    console.error(e);
    // Don’t break UX if email fails
    return { statusCode: 200, body: "ok (email skipped due to error)" };
  }
};
