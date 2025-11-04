const BASE = process.env.SITE_URL || "http://localhost:8888"; // set SITE_URL in Netlify env

async function sendMail({ to, subject, html, text, replyTo }) {
  const res = await fetch(`${BASE}/.netlify/functions/send-email`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ to, subject, html, text, replyTo }),
  });
  if (!res.ok) {
    const t = await res.text();
    console.error("[_mailer] send-email failed:", res.status, t);
  }
}

module.exports = { sendMail };
