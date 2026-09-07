export type CalendarEventBooking = {
  name: string;
  email: string;
  link_title?: string | null;
  meeting_title?: string | null;
  meeting_notes?: string | null;
  duration_minutes?: number | null;
};

export type CalendarEventAttendee = {
  name: string;
  email: string;
};

export type CalendarEventBrand = {
  name: string;
  tagline: string;
  primaryColor: string;
  accentColor: string;
};

const defaultBrand: CalendarEventBrand = {
  name: "Slotloom",
  tagline: "Scheduling, without the overhead.",
  primaryColor: "#2563eb",
  accentColor: "#7c3aed",
};

const singleLine = (value: string | null | undefined) =>
  (value || "").replace(/\s+/g, " ").trim();

const sameText = (left: string, right: string) =>
  left.localeCompare(right, undefined, { sensitivity: "accent" }) === 0;

const escapeHtml = (value: string) =>
  value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");

const safeColor = (value: string, fallback: string) =>
  /^#[0-9a-f]{6}$/i.test(value) ? value : fallback;

function clippedTitle(prefix: string, visitor: string, maximum = 240) {
  const suffix = ` — ${visitor}`;
  const full = `${prefix}${suffix}`;
  if (full.length <= maximum) return full;
  const available = Math.max(1, maximum - suffix.length - 1);
  return `${prefix.slice(0, available).trimEnd()}…${suffix}`;
}

export function calendarEventParts(booking: CalendarEventBooking) {
  const visitor = singleLine(booking.name) || "Visitor";
  const storedTitle = singleLine(booking.meeting_title);
  const linkTitle = singleLine(booking.link_title) || storedTitle || "Meeting";
  const storedLower = storedTitle.toLocaleLowerCase();
  const linkLower = linkTitle.toLocaleLowerCase();
  const visitorLower = visitor.toLocaleLowerCase();
  const hasVisitorSuffix = ["—", "–", "-"].some((separator) =>
    storedLower.endsWith(` ${separator} ${visitorLower}`),
  );
  const alreadyFormatted =
    hasVisitorSuffix &&
    (storedLower.startsWith(`${linkLower}: `) ||
      ["—", "–", "-"].some(
        (separator) =>
          storedLower === `${linkLower} ${separator} ${visitorLower}`,
      ));
  if (storedTitle && alreadyFormatted)
    return { visitor, linkTitle, topic: "", title: storedTitle };
  const topic =
    storedTitle && !sameText(storedTitle, linkTitle) ? storedTitle : "";
  const prefix = topic ? `${linkTitle}: ${topic}` : linkTitle;
  return {
    visitor,
    linkTitle,
    topic,
    title: clippedTitle(prefix, visitor),
  };
}

function detailRow(label: string, value: string) {
  return `<tr>
    <td style="width:124px;padding:9px 12px 9px 0;border-bottom:1px solid #e5e7eb;color:#64748b;font-family:Arial,'Segoe UI',sans-serif;font-size:12px;font-weight:700;line-height:18px;vertical-align:top;">${escapeHtml(label)}</td>
    <td style="padding:9px 0;border-bottom:1px solid #e5e7eb;color:#111827;font-family:Arial,'Segoe UI',sans-serif;font-size:14px;line-height:20px;vertical-align:top;word-break:break-word;">${escapeHtml(value)}</td>
  </tr>`;
}

export function calendarEventDescriptionHtml(
  booking: CalendarEventBooking,
  attendees: CalendarEventAttendee[],
  workspaceBrand?: CalendarEventBrand,
) {
  const brand = workspaceBrand || defaultBrand;
  const primaryColor = safeColor(brand.primaryColor, defaultBrand.primaryColor);
  const accentColor = safeColor(brand.accentColor, defaultBrand.accentColor);
  const parts = calendarEventParts(booking);
  const primaryEmail = singleLine(booking.email).toLowerCase();
  const additional = attendees.filter(
    (attendee) => singleLine(attendee.email).toLowerCase() !== primaryEmail,
  );
  const notes = (booking.meeting_notes || "").trim();
  const duration = booking.duration_minutes || 30;
  const rows = [
    detailRow("Meeting type", parts.linkTitle),
    ...(parts.topic ? [detailRow("Topic", parts.topic)] : []),
    detailRow("Booked by", `${parts.visitor} · ${singleLine(booking.email)}`),
    detailRow("Duration", `${duration} minute${duration === 1 ? "" : "s"}`),
  ].join("");
  const guests = additional.length
    ? `<div style="margin-top:18px;">
        <div style="margin-bottom:8px;color:#64748b;font-family:Arial,'Segoe UI',sans-serif;font-size:11px;font-weight:700;letter-spacing:.08em;line-height:16px;text-transform:uppercase;">Additional guest${additional.length === 1 ? "" : "s"}</div>
        ${additional
          .map(
            (attendee) =>
              `<div style="margin-top:6px;color:#111827;font-family:Arial,'Segoe UI',sans-serif;font-size:14px;line-height:20px;word-break:break-word;"><strong>${escapeHtml(singleLine(attendee.name) || "Guest")}</strong> <span style="color:#64748b;">· ${escapeHtml(singleLine(attendee.email))}</span></div>`,
          )
          .join("")}
      </div>`
    : "";
  const agenda = notes
    ? `<div style="margin-top:18px;padding:14px 16px;border-left:3px solid ${accentColor};background-color:#f8fafc;">
        <div style="margin-bottom:5px;color:#64748b;font-family:Arial,'Segoe UI',sans-serif;font-size:11px;font-weight:700;letter-spacing:.08em;line-height:16px;text-transform:uppercase;">Agenda or instructions</div>
        <div style="color:#334155;font-family:Arial,'Segoe UI',sans-serif;font-size:14px;line-height:21px;word-break:break-word;">${escapeHtml(notes).replace(/\r?\n/g, "<br>")}</div>
      </div>`
    : "";

  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="width:100%;max-width:620px;margin:0 0 24px;border:1px solid #dfe3ea;border-collapse:separate;border-spacing:0;border-radius:14px;background-color:#ffffff;overflow:hidden;">
    <tr>
      <td style="padding:0;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="width:100%;border-collapse:collapse;">
          <tr>
            <td width="64%" height="5" style="width:64%;height:5px;background-color:${primaryColor};font-size:0;line-height:0;">&nbsp;</td>
            <td width="36%" height="5" style="width:36%;height:5px;background-color:${accentColor};font-size:0;line-height:0;">&nbsp;</td>
          </tr>
        </table>
        <div style="padding:22px 24px 24px;">
          <div style="color:#64748b;font-family:Arial,'Segoe UI',sans-serif;font-size:11px;font-weight:700;letter-spacing:.1em;line-height:16px;text-transform:uppercase;">${escapeHtml(singleLine(brand.name) || defaultBrand.name)} · Confirmed meeting</div>
          <div style="margin-top:7px;color:#111827;font-family:Arial,'Segoe UI',sans-serif;font-size:22px;font-weight:700;letter-spacing:-.02em;line-height:28px;word-break:break-word;">${escapeHtml(parts.title)}</div>
          <div style="margin-top:8px;color:#475569;font-family:Arial,'Segoe UI',sans-serif;font-size:14px;line-height:21px;">Your meeting is booked. Use the RSVP and joining controls included with this invitation.</div>
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="width:100%;margin-top:18px;border-collapse:collapse;">${rows}</table>
          ${guests}
          ${agenda}
          <div style="margin-top:18px;color:#64748b;font-family:Arial,'Segoe UI',sans-serif;font-size:11px;line-height:17px;">Scheduled through ${escapeHtml(singleLine(brand.name) || defaultBrand.name)} · ${escapeHtml(singleLine(brand.tagline) || defaultBrand.tagline)}</div>
        </div>
      </td>
    </tr>
  </table>`;
}
