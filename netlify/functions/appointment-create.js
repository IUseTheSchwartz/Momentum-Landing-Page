import { formatAppt } from "./_time.js";

function btn(href, label, solid = true) {
  return `<a href="${href}" style="${
    solid ? "background:#111;color:#fff;" : "border:1px solid #111;color:#111;"
  }padding:10px 14px;border-radius:8px;text-decoration:none;display:inline-block;">${label}</a>`;
}

/* -------- CLIENT CONFIRMATION (no answers) -------- */
export function clientConfirm({ whenIso, tz, durationMin = 30, rescheduleUrl, phoneHref, phoneLabel, vcardUrl }) {
  const when = formatAppt(whenIso, tz);
  const html = `
  <h2 style="margin:0 0 8px;">You're booked with Logan Harris</h2>
  <p style="margin:0 0 12px;color:#555">Thanks for scheduling—here are the details.</p>
  <p style="margin:0 0 6px;"><strong>When:</strong> ${when} (${durationMin} min)</p>
  <p style="margin:0 0 6px;"><strong>Where:</strong> Phone call — Logan will call you.</p>
  <p style="margin:0 0 6px;"><strong>Call will come from:</strong> <a href="${phoneHref}" style="color:#0ea5e9;text-decoration:none;">${phoneLabel}</a></p>
  <div style="margin:16px 0;">
    ${btn(rescheduleUrl, "Reschedule")}
    &nbsp;&nbsp;
    ${btn(vcardUrl, "Save Logan’s Contact", false)}
  </div>
  <p style="margin-top:16px;color:#777;font-size:13px;">If you need anything before the call, just reply to this email.</p>`;
  const text = `You're booked with Logan Harris
When: ${when} (${durationMin} min)
Where: Phone call — Logan will call you.
Call will come from: ${phoneLabel}
Reschedule: ${rescheduleUrl}
Save Logan’s Contact: ${vcardUrl}`;
  return { html, text, subject: `Your call with Logan Harris – ${when}` };
}

/* -------- AGENT NOTICE (includes answers) -------- */
export function agentApptNotice({ lead, whenIso, tz, durationMin = 30, adminUrl }) {
  const when = formatAppt(whenIso, tz);

  const answers = Array.isArray(lead?.answers) ? lead.answers : [];
  // normalize answers -> [{question,value}]
  const norm = answers.map((a) => ({
    question: a?.question || a?.question_text || a?.question_id || "Question",
    value: a?.value ?? a?.answer ?? "",
  }));

  const answersHtml = norm.length
    ? `<h4 style="margin:14px 0 6px;">Answers</h4>
       <ul style="margin:0 0 12px 0;padding-left:18px;color:#111">
         ${norm.map((a) => `<li><strong>${String(a.question)}:</strong> ${String(a.value)}</li>`).join("")}
       </ul>`
    : `<p style="margin:8px 0 12px;color:#777">No answers on file.</p>`;

  const html = `
  <h3 style="margin:0 0 8px;">New appointment</h3>
  <p style="margin:0 8px 12px 0;color:#555">${lead.full_name || ""} booked a call.</p>
  <ul style="margin:0 0 12px 0;padding-left:18px;color:#111">
    <li><strong>When:</strong> ${when} (${durationMin} min)</li>
    <li><strong>Lead:</strong> ${lead.full_name || ""} — ${lead.phone || ""} — ${lead.email || ""}</li>
  </ul>
  ${answersHtml}
  ${adminUrl ? `<div>${btn(adminUrl, "Open in Admin")}</div>` : ""}`;

  const answersText = norm.length
    ? `\nAnswers:\n${norm.map((a) => `- ${a.question}: ${a.value}`).join("\n")}`
    : `\nAnswers: (none)`;

  const text = `New appointment
When: ${when} (${durationMin} min)
Lead: ${lead.full_name || ""} — ${lead.phone || ""} — ${lead.email || ""}${answersText}`;

  return { html, text, subject: `New appointment – ${lead.full_name || "Lead"} · ${when}` };
}
