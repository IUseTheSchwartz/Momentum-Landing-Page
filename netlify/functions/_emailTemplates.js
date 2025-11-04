import { formatAppt } from "./_time.js";

function btn(href, label, solid = true) {
  return `<a href="${href}" style="${
    solid ? "background:#111;color:#fff;" : "border:1px solid #111;color:#111;"
  }padding:10px 14px;border-radius:8px;text-decoration:none;display:inline-block;">${label}</a>`;
}

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

export function agentApptNotice({ lead, whenIso, tz, durationMin = 30, adminUrl }) {
  const when = formatAppt(whenIso, tz);
  const html = `
  <h3 style="margin:0 0 8px;">New appointment</h3>
  <p style="margin:0 8px 12px 0;color:#555">${lead.full_name} booked a call.</p>
  <ul style="margin:0 0 12px 0;padding-left:18px;color:#111">
    <li><strong>When:</strong> ${when} (${durationMin} min)</li>
    <li><strong>Lead:</strong> ${lead.full_name || ""} — ${lead.phone || ""} — ${lead.email || ""}</li>
  </ul>
  ${adminUrl ? `<div>${btn(adminUrl, "Open in Admin")}</div>` : ""}`;
  const text = `New appointment
When: ${when} (${durationMin} min)
Lead: ${lead.full_name || ""} — ${lead.phone || ""} — ${lead.email || ""}`;
  return { html, text, subject: `New appointment – ${lead.full_name || "Lead"} · ${when}` };
}

export function incompleteNotice({ lead, resumeUrl, lastActiveRel }) {
  const html = `
  <h3 style="margin:0 0 8px;">Form not finished</h3>
  <p style="margin:0 0 8px;color:#555">${lead.full_name || "Lead"} started but didn't finish.</p>
  <p style="margin:0 0 12px;color:#555">Last activity: ${lastActiveRel} ago.</p>
  <a href="${resumeUrl}" style="background:#111;color:#fff;padding:10px 14px;border-radius:8px;text-decoration:none;display:inline-block;">Open lead</a>`;
  const text = `Form not finished
Lead: ${lead.full_name || ""}
Last activity: ${lastActiveRel} ago
Open: ${resumeUrl}`;
  return { html, text, subject: `Form not finished – ${lead.full_name || "Lead"}` };
}
