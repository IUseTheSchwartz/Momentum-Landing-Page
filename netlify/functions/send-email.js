// SMTP email via Mailjet (or any SMTP) using nodemailer
const nodemailer = require("nodemailer");

exports.handler = async (event) => {
  try {
    if (event.httpMethod !== "POST") {
      return { statusCode: 405, body: "Method Not Allowed" };
    }

    const payload = JSON.parse(event.body || "{}"); // { subject, text, html?, to?, replyTo?, to? }

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
      // If caller didn't provide text, derive it from HTML (better for deliverability)
      text: payload.text || (payload.html ? stripHtml(payload.html) : ""),
      html: payload.html || undefined, // keep optional; text-only is fine
      replyTo: payload.replyTo || fromEmail, // so replies go somewhere useful

      // 🔽 Deliverability helpers (good for warmup on a new domain)
      headers: {
        // Disable tracking for warmup so links aren't rewritten
        "X-MJ-TrackOpen": "0",
        "X-MJ-TrackClick": "0",

        // Gmail-friendly unsubscribe (replace with your real mailbox/URL)
        "List-Unsubscribe":
          `<mailto:support@logantharris.com>, <https://logantharris.com/unsubscribe>`,
        "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
      },
    });

    return { statusCode: 200, body: "ok" };
  } catch (e) {
    console.error(e);
    // Keep non-fatal to avoid breaking UX; logs will show the error
    return { statusCode: 200, body: "ok (email skipped due to error)" };
  }
};

// Minimal HTML→text fallback for inboxing
function stripHtml(html = "") {
  return html
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<\/(p|div|br|h\d)>/gi, "\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}
