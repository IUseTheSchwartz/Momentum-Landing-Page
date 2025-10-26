// SMTP email via Mailjet (or any SMTP) using nodemailer
const nodemailer = require("nodemailer");

exports.handler = async (event) => {
  try {
    if (event.httpMethod !== "POST") {
      return { statusCode: 405, body: "Method Not Allowed" };
    }

    const payload = JSON.parse(event.body || "{}"); // { subject, text, html?, to?, replyTo? }

    const toList = (payload.to || process.env.SMTP_TO || "")
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);

    const host = process.env.SMTP_HOST;
    const user = process.env.SMTP_USER;
    const pass = process.env.SMTP_PASS;
    const fromEmail = process.env.SMTP_FROM || user;
    const fromName = process.env.SMTP_FROM_NAME || "Momentum Financial";
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

    // Compose "From" with a friendly name
    const fromHeader = `"${fromName.replace(/"/g, "'")}" <${fromEmail}>`;

    await transporter.sendMail({
      from: fromHeader,
      to: toList,
      subject: payload.subject || "Notification",
      text: payload.text || "",
      html: payload.html || undefined, // keep optional; text-only is fine
      replyTo: payload.replyTo || fromEmail, // so replies go somewhere useful
    });

    return { statusCode: 200, body: "ok" };
  } catch (e) {
    console.error(e);
    return { statusCode: 200, body: "ok (email skipped due to error)" };
  }
};
