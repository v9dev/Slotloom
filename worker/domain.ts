import { createRemoteJWKSet, jwtVerify, type JWTPayload } from "jose";
import { render } from "react-email";
import { createElement } from "react";
import { SlotloomEmail } from "../src/emails/SlotloomEmail";
import { presentationFor } from "../src/emails/presentation";

export interface Env {
  DB: D1Database;
  BRAND_ASSETS?: R2Bucket;
  NOTIFICATION_HUB?: DurableObjectNamespace;
  EMAIL?: { send(message: MailMessage): Promise<{ messageId: string }> };
  ADMIN_TOKEN: string;
  ALLOW_ADMIN_TOKEN: string;
  TEAM_DOMAIN: string;
  POLICY_AUD: string;
  BOOTSTRAP_OWNER_EMAIL: string;
  TURNSTILE_SECRET?: string;
  TURNSTILE_SITE_KEY?: string;
  APP_NAME: string;
  ORGANIZER_EMAIL: string;
  FROM_EMAIL: string;
  APP_URL: string;
  TIME_ZONE: string;
}

export type MailMessage = {
  to: string;
  from: string | { email: string; name?: string };
  replyTo?: string;
  subject: string;
  text: string;
  html: string;
  attachments?: Array<{
    content: string;
    filename: string;
    type: string;
    disposition: "attachment" | "inline";
  }>;
};
export type WorkspaceBrand = {
  name: string;
  tagline: string;
  logo: string;
  logoDark: string;
  favicon: string;
  primaryColor: string;
  accentColor: string;
};

export async function getWorkspaceBrand(env: Env): Promise<WorkspaceBrand> {
  const rows = await env.DB.prepare(
    "SELECT setting_key,setting_value FROM workspace_settings WHERE setting_key IN ('app_name','brand_tagline','brand_logo_url','brand_logo_dark_url','brand_favicon_url','brand_mark_url','brand_primary_color','brand_accent_color')",
  ).all<{ setting_key: string; setting_value: string }>();
  const values = Object.fromEntries(
    rows.results.map((row) => [row.setting_key, row.setting_value]),
  );
  return {
    name: values.app_name || env.APP_NAME,
    tagline: values.brand_tagline || "Scheduling, without the overhead.",
    logo: values.brand_logo_url || values.brand_mark_url || "/brand/logo-light.svg",
    logoDark: values.brand_logo_dark_url || values.brand_logo_url || "/brand/logo-dark.svg",
    favicon: values.brand_favicon_url || values.brand_mark_url || "/brand/mark.svg",
    primaryColor: values.brand_primary_color || "#2563eb",
    accentColor: values.brand_accent_color || "#7c3aed",
  };
}
export type WorkflowStatus =
  | "new"
  | "under_review"
  | "awaiting_visitor"
  | "confirmed"
  | "completed"
  | "missed"
  | "cancelled"
  | "rescheduling";
export type LinkStatus = "draft" | "active" | "paused" | "archived";
export type UserRole = "owner" | "admin" | "member" | "viewer";
export type WorkspaceUser = {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  status: "active" | "suspended";
  invited_by: string | null;
  last_seen_at: string | null;
  created_at: string;
  updated_at: string;
};
export type BookingRow = {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  company: string | null;
  starts_at: string;
  final_starts_at: string | null;
  time_zone: string;
  message: string | null;
  status: string;
  workflow_status: WorkflowStatus;
  admin_note: string | null;
  meeting_url: string | null;
  meeting_notes: string | null;
  meeting_sent_at: string | null;
  assigned_to: string | null;
  booking_link_id: string;
  created_at: string;
  updated_at: string;
  email_count?: number;
  link_title?: string;
  link_slug?: string;
  link_created_by?: string | null;
  duration_minutes?: number;
  device_type?: string | null;
  user_agent?: string | null;
  browser_language?: string | null;
  referrer?: string | null;
  country?: string | null;
  region?: string | null;
  city?: string | null;
};
export type LinkRow = {
  id: string;
  slug: string;
  internal_name: string;
  title: string;
  description: string | null;
  duration_minutes: number;
  slot_interval_minutes: number;
  buffer_minutes: number;
  time_zone: string;
  days_ahead: number;
  minimum_notice_hours: number;
  valid_from: string | null;
  valid_until: string | null;
  status: LinkStatus;
  allow_slot_holds: number;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  response_count?: number;
  pending_count?: number;
  confirmed_count?: number;
};
export type RuleRow = {
  id: string;
  booking_link_id: string;
  weekday: number;
  start_time: string;
  end_time: string;
};

export const JSON_HEADERS = {
  "content-type": "application/json; charset=utf-8",
};
export const WORKFLOW_STATUSES = new Set<WorkflowStatus>([
  "new",
  "under_review",
  "awaiting_visitor",
  "confirmed",
  "completed",
  "missed",
  "cancelled",
  "rescheduling",
]);
export const LINK_STATUSES = new Set<LinkStatus>([
  "draft",
  "active",
  "paused",
  "archived",
]);
export const EMAIL_TEMPLATES = new Set([
  "received",
  "meeting_details",
  "rescheduled_confirmation",
  "reminder",
  "missed",
  "reschedule",
  "cancelled",
]);

export function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: JSON_HEADERS });
}
export function safeText(value: unknown, max: number) {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}
export function safeNumber(
  value: unknown,
  fallback: number,
  min: number,
  max: number,
) {
  const parsed = Number(value);
  return Number.isFinite(parsed)
    ? Math.min(Math.max(Math.round(parsed), min), max)
    : fallback;
}
export function escapeHtml(value: string) {
  return value.replace(
    /[&<>'"]/g,
    (character) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" })[
        character
      ]!,
  );
}
export async function sha256(value: string) {
  const bytes = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(value),
  );
  return Array.from(new Uint8Array(bytes), (byte) =>
    byte.toString(16).padStart(2, "0"),
  ).join("");
}
export async function enforcePublicRateLimit(request: Request, env: Env) {
  const address = request.headers.get("cf-connecting-ip") || "local";
  const bucket = await sha256(`${address}:${new URL(request.url).pathname}`);
  const windowStart = new Date(
    Math.floor(Date.now() / 900000) * 900000,
  ).toISOString();
  await env.DB.prepare(
    `INSERT INTO request_rate_limits (bucket_key,window_start,request_count) VALUES (?,?,1)
     ON CONFLICT(bucket_key,window_start) DO UPDATE SET request_count=request_count+1`,
  )
    .bind(bucket, windowStart)
    .run();
  const row = await env.DB.prepare(
    "SELECT request_count FROM request_rate_limits WHERE bucket_key=? AND window_start=?",
  )
    .bind(bucket, windowStart)
    .first<{ request_count: number }>();
  return Number(row?.request_count || 0) <= 30;
}
export async function verifyTurnstile(
  token: string,
  request: Request,
  env: Env,
) {
  const configuration = turnstileConfiguration(env);
  if (!configuration.valid) {
    console.error("Turnstile requires both the site key and secret.");
    return false;
  }
  if (!configuration.enabled) return true;
  if (!token) return false;
  const form = new FormData();
  form.set("secret", env.TURNSTILE_SECRET!);
  form.set("response", token);
  const ip = request.headers.get("cf-connecting-ip");
  if (ip) form.set("remoteip", ip);
  try {
    const response = await fetch(
      "https://challenges.cloudflare.com/turnstile/v0/siteverify",
      {
        method: "POST",
        body: form,
        signal: AbortSignal.timeout(8_000),
      },
    );
    if (!response.ok) return false;
    const result = await response.json<{
      success?: boolean;
      hostname?: string;
      action?: string;
      "error-codes"?: string[];
    }>();
    const expectedHostname = new URL(env.APP_URL).hostname;
    const valid = Boolean(
      result.success &&
      result.hostname === expectedHostname &&
      result.action === TURNSTILE_ACTION,
    );
    if (!valid)
      console.warn("Rejected Turnstile token", {
        hostname: result.hostname,
        action: result.action,
        errorCodes: result["error-codes"],
      });
    return valid;
  } catch (error) {
    console.warn("Turnstile verification failed", error);
    return false;
  }
}

export const TURNSTILE_ACTION = "booking-submit";

export function turnstileConfiguration(env: Env) {
  const siteKey = env.TURNSTILE_SITE_KEY?.trim() || "";
  const hasSecret = Boolean(env.TURNSTILE_SECRET?.trim());
  return {
    enabled: Boolean(siteKey && hasSecret),
    siteKey: siteKey || null,
    valid: Boolean(siteKey) === hasSecret,
  };
}
export function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 80);
}
export function deviceType(userAgent: string) {
  if (/bot|crawler|spider|crawling/i.test(userAgent)) return "bot";
  if (/ipad|tablet|kindle|silk/i.test(userAgent)) return "tablet";
  if (/mobi|iphone|android/i.test(userAgent)) return "mobile";
  return "desktop";
}
export function partsAt(date: Date, timeZone: string) {
  return Object.fromEntries(
    new Intl.DateTimeFormat("en-CA", {
      timeZone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hourCycle: "h23",
    })
      .formatToParts(date)
      .map(({ type, value }) => [type, value]),
  );
}
export function zonedLocalToUtc(
  year: number,
  month: number,
  day: number,
  hour: number,
  minute: number,
  timeZone: string,
) {
  const wanted = Date.UTC(year, month - 1, day, hour, minute);
  let guess = wanted;
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const actual = partsAt(new Date(guess), timeZone);
    guess +=
      wanted -
      Date.UTC(
        +actual.year,
        +actual.month - 1,
        +actual.day,
        +actual.hour,
        +actual.minute,
      );
  }
  return new Date(guess);
}
export function formatMeetingTime(value: string, timeZone: string) {
  return new Intl.DateTimeFormat("en", {
    dateStyle: "full",
    timeStyle: "short",
    timeZone,
  }).format(new Date(value));
}

export function slotsForSchedule(
  link: Pick<
    LinkRow,
    | "time_zone"
    | "days_ahead"
    | "minimum_notice_hours"
    | "duration_minutes"
    | "slot_interval_minutes"
    | "buffer_minutes"
  > &
    Partial<Pick<LinkRow, "valid_from" | "valid_until">>,
  rules: RuleRow[],
  now = new Date(),
) {
  const today = partsAt(now, link.time_zone);
  const base = new Date(Date.UTC(+today.year, +today.month - 1, +today.day));
  const earliest = now.getTime() + link.minimum_notice_hours * 3_600_000;
  const slots: { startsAt: string; label: string }[] = [];
  for (let offset = 0; offset <= link.days_ahead; offset += 1) {
    const day = new Date(base.getTime() + offset * 86_400_000);
    const dateKey = day.toISOString().slice(0, 10);
    if (link.valid_from && dateKey < link.valid_from) continue;
    if (link.valid_until && dateKey > link.valid_until) continue;
    for (const rule of rules.filter(
      (item) => item.weekday === day.getUTCDay(),
    )) {
      const [startHour, startMinute] = rule.start_time.split(":").map(Number);
      const [endHour, endMinute] = rule.end_time.split(":").map(Number);
      let cursor = startHour * 60 + startMinute;
      const end = endHour * 60 + endMinute;
      while (cursor + link.duration_minutes <= end) {
        const starts = zonedLocalToUtc(
          day.getUTCFullYear(),
          day.getUTCMonth() + 1,
          day.getUTCDate(),
          Math.floor(cursor / 60),
          cursor % 60,
          link.time_zone,
        );
        if (starts.getTime() >= earliest)
          slots.push({
            startsAt: starts.toISOString(),
            label: formatMeetingTime(starts.toISOString(), link.time_zone),
          });
        cursor += Math.max(
          link.slot_interval_minutes,
          link.duration_minutes + link.buffer_minutes,
          5,
        );
      }
    }
  }
  return slots;
}

export function normalizeLink(row: LinkRow, rules: RuleRow[] = []) {
  return {
    id: row.id,
    slug: row.slug,
    internalName: row.internal_name,
    title: row.title,
    description: row.description,
    durationMinutes: row.duration_minutes,
    slotIntervalMinutes: row.slot_interval_minutes,
    bufferMinutes: row.buffer_minutes,
    timeZone: row.time_zone,
    daysAhead: row.days_ahead,
    minimumNoticeHours: row.minimum_notice_hours,
    validFrom: row.valid_from,
    validUntil: row.valid_until,
    status: row.status,
    allowSlotHolds: Boolean(row.allow_slot_holds),
    createdBy: row.created_by,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    responseCount: Number(row.response_count || 0),
    pendingCount: Number(row.pending_count || 0),
    confirmedCount: Number(row.confirmed_count || 0),
    availability: rules.map((rule) => ({
      id: rule.id,
      weekday: rule.weekday,
      startTime: rule.start_time,
      endTime: rule.end_time,
    })),
  };
}
export function normalizeBooking(row: BookingRow) {
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    phone: row.phone,
    company: row.company,
    startsAt: row.starts_at,
    finalStartsAt: row.final_starts_at,
    timeZone: row.time_zone,
    message: row.message,
    status: row.workflow_status || row.status,
    adminNote: row.admin_note,
    meetingUrl: row.meeting_url,
    meetingNotes: row.meeting_notes,
    meetingSentAt: row.meeting_sent_at,
    assignedTo: row.assigned_to,
    bookingLinkId: row.booking_link_id,
    linkTitle: row.link_title,
    linkSlug: row.link_slug,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    emailCount: Number(row.email_count || 0),
    deviceType: row.device_type || null,
    userAgent: row.user_agent || null,
    browserLanguage: row.browser_language || null,
    referrer: row.referrer || null,
    location:
      [row.city, row.region, row.country].filter(Boolean).join(", ") || null,
  };
}

const jwksByTeam = new Map<string, ReturnType<typeof createRemoteJWKSet>>();
export async function authorizeAdmin(
  request: Request,
  env: Env,
): Promise<JWTPayload | null> {
  const accessToken = request.headers.get("cf-access-jwt-assertion");
  if (accessToken && env.TEAM_DOMAIN && env.POLICY_AUD) {
    try {
      const teamDomain = env.TEAM_DOMAIN.replace(/\/$/, "");
      let jwks = jwksByTeam.get(teamDomain);
      if (!jwks) {
        jwks = createRemoteJWKSet(
          new URL(`${teamDomain}/cdn-cgi/access/certs`),
        );
        jwksByTeam.set(teamDomain, jwks);
      }
      return (
        await jwtVerify(accessToken, jwks, {
          issuer: teamDomain,
          audience: env.POLICY_AUD,
        })
      ).payload;
    } catch (error) {
      console.warn("Rejected invalid Cloudflare Access JWT", error);
      return null;
    }
  }
  if (env.ALLOW_ADMIN_TOKEN !== "true") return null;
  const supplied =
    request.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ||
    readWebSocketAdminToken(request) ||
    "";
  if (!env.ADMIN_TOKEN || supplied.length !== env.ADMIN_TOKEN.length)
    return null;
  let different = 0;
  for (let index = 0; index < supplied.length; index += 1)
    different |= supplied.charCodeAt(index) ^ env.ADMIN_TOKEN.charCodeAt(index);
  return different === 0 ? { email: "local-development" } : null;
}

function readWebSocketAdminToken(request: Request) {
  const encoded = request.headers
    .get("sec-websocket-protocol")
    ?.split(",")
    .map((value) => value.trim())
    .find((value) => value.startsWith("slotloom-auth."))
    ?.slice("slotloom-auth.".length);
  if (!encoded) return "";
  try {
    const base64 = encoded.replaceAll("-", "+").replaceAll("_", "/");
    const binary = atob(base64.padEnd(Math.ceil(base64.length / 4) * 4, "="));
    return new TextDecoder().decode(
      Uint8Array.from(binary, (character) => character.charCodeAt(0)),
    );
  } catch {
    return "";
  }
}

export async function getLink(env: Env, key: string, bySlug = false) {
  return env.DB.prepare(
    `SELECT * FROM booking_links WHERE ${bySlug ? "slug" : "id"} = ?`,
  )
    .bind(key)
    .first<LinkRow>();
}
export async function getRules(env: Env, linkId: string) {
  return (
    await env.DB.prepare(
      "SELECT * FROM availability_rules WHERE booking_link_id = ? ORDER BY weekday, start_time",
    )
      .bind(linkId)
      .all<RuleRow>()
  ).results;
}
export async function getBooking(env: Env, id: string) {
  return env.DB.prepare(
    `SELECT b.*, l.title AS link_title, l.slug AS link_slug, l.created_by AS link_created_by,
    l.duration_minutes,
    (SELECT COUNT(*) FROM email_events e WHERE e.booking_id = b.id AND e.status = 'sent') AS email_count
    FROM bookings b LEFT JOIN booking_links l ON l.id = b.booking_link_id WHERE b.id = ?`,
  )
    .bind(id)
    .first<BookingRow>();
}

export function meetingOwner(
  booking: Pick<BookingRow, "assigned_to" | "link_created_by">,
  organizerEmail: string,
) {
  return booking.assigned_to || booking.link_created_by || organizerEmail;
}

export async function recordActivity(
  env: Env,
  details: {
    bookingId?: string;
    linkId?: string;
    actor?: string;
    type: string;
    summary: string;
    metadata?: unknown;
  },
) {
  await env.DB.prepare(
    "INSERT INTO activity_events (id, booking_id, booking_link_id, actor_email, event_type, summary, metadata, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
  )
    .bind(
      crypto.randomUUID(),
      details.bookingId || null,
      details.linkId || null,
      details.actor || null,
      details.type,
      details.summary,
      details.metadata ? JSON.stringify(details.metadata) : null,
      new Date().toISOString(),
    )
    .run();
  if (details.actor)
    await recordUserActivity(
      env,
      details.actor,
      details.type,
      details.summary,
      undefined,
      details.metadata,
    );
}
export async function createNotification(
  env: Env,
  userEmail: string | null,
  type: string,
  title: string,
  body: string,
  actionUrl?: string,
) {
  const id = crypto.randomUUID();
  const createdAt = new Date().toISOString();
  await env.DB.prepare(
    "INSERT INTO notifications (id,user_email,type,title,body,action_url,created_at) VALUES (?,?,?,?,?,?,?)",
  )
    .bind(
      id,
      userEmail,
      type,
      title,
      body,
      actionUrl || null,
      createdAt,
    )
    .run();
  if (env.NOTIFICATION_HUB) {
    const notification = {
      id,
      user_email: userEmail,
      type,
      title,
      body,
      action_url: actionUrl || null,
      read_at: null,
      created_at: createdAt,
    };
    try {
      await env.NOTIFICATION_HUB.getByName("workspace").fetch(
        "https://notification-hub.internal/broadcast",
        {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ userEmail, notification }),
        },
      );
    } catch (error) {
      console.warn("Notification was stored but could not be broadcast", error);
    }
  }
}

export function emailContent(
  template: string,
  booking: BookingRow,
  env: Env,
  manageUrl?: string,
) {
  const startsAt = booking.final_starts_at || booking.starts_at;
  const time = formatMeetingTime(startsAt, env.TIME_ZONE || "UTC");
  const bookingPage =
    manageUrl ||
    `${env.APP_URL.replace(/\/$/, "")}/book/${booking.link_slug || "consultation"}`;
  const meetingLine = booking.meeting_url
    ? `\n\nJoin the meeting: ${booking.meeting_url}`
    : "";
  const messages: Record<
    string,
    { subject: string; intro: string; action?: string }
  > = {
    received: {
      subject: `We received your availability: ${time}`,
      intro: `We received your availability for ${time}. This is not yet a confirmed meeting; we’ll follow up shortly.`,
    },
    meeting_details: {
      subject: `Your meeting is confirmed: ${booking.link_title || "Meeting"}`,
      intro: `${booking.link_title || "Your meeting"} is confirmed for ${time}.`,
      action: meetingLine,
    },
    rescheduled_confirmation: {
      subject: `${booking.link_title || "Your meeting"} is confirmed`,
      intro: `Your rescheduled meeting is confirmed for ${time}.`,
      action: meetingLine,
    },
    reminder: {
      subject: `Reminder: our meeting on ${time}`,
      intro: `This is a friendly reminder about our meeting on ${time}.`,
      action: meetingLine,
    },
    missed: {
      subject: "Sorry we missed our meeting",
      intro:
        "It looks like we were unable to connect. We’re sorry for the inconvenience.",
    },
    reschedule: {
      subject: "Let’s find another meeting time",
      intro: "We need to choose another time for our conversation.",
    },
    cancelled: {
      subject: "Meeting cancelled",
      intro: `Our meeting planned for ${time} has been cancelled.`,
    },
  };
  const selected = messages[template] || messages.received;
  const contact = meetingOwner(booking, env.ORGANIZER_EMAIL);
  const actionHtml =
    booking.meeting_url && ["meeting_details", "rescheduled_confirmation", "reminder"].includes(template)
      ? `<p><a href="${escapeHtml(booking.meeting_url)}">Join the meeting</a></p>`
      : `<p><a href="${escapeHtml(bookingPage)}">Choose another time</a></p>`;
  return {
    subject: selected.subject,
    text: `Hi ${booking.name},\n\n${selected.intro}${selected.action || ""}\n\nChoose another time if needed: ${bookingPage}\n\nContact: ${contact}\n\n${env.APP_NAME}`,
    html: `<p>Hi ${escapeHtml(booking.name)},</p><p>${escapeHtml(selected.intro)}</p>${actionHtml}<p>Contact: <a href="mailto:${escapeHtml(contact)}">${escapeHtml(contact)}</a></p><p>${escapeHtml(env.APP_NAME)}</p>`,
  };
}
export async function createManageUrl(env: Env, bookingId: string) {
  const token =
    crypto.randomUUID().replaceAll("-", "") +
    crypto.randomUUID().replaceAll("-", "");
  const hash = await sha256(token);
  const now = new Date();
  const expires = new Date(now.getTime() + 30 * 86_400_000).toISOString();
  await env.DB.prepare(
    "INSERT INTO booking_manage_tokens (token_hash,booking_id,expires_at,created_at) VALUES (?,?,?,?)",
  )
    .bind(hash, bookingId, expires, now.toISOString())
    .run();
  return `${env.APP_URL.replace(/\/$/, "")}/manage/${token}`;
}
export function replaceVariables(
  value: string,
  variables: Record<string, string>,
) {
  return value.replace(
    /\{\{([a-z_]+)\}\}/g,
    (_, key: string) => variables[key] || "",
  );
}

const calendarDate = (value: Date) =>
  value.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z");
const calendarText = (value: string) =>
  value.replace(/\\/g, "\\\\").replace(/\n/g, "\\n").replace(/([,;])/g, "\\$1");
const base64Text = (value: string) => {
  const bytes = new TextEncoder().encode(value);
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
};

export function calendarInvite(booking: BookingRow, env: Env, appName = env.APP_NAME) {
  const start = new Date(booking.final_starts_at || booking.starts_at);
  const end = new Date(
    start.getTime() + (booking.duration_minutes || 30) * 60_000,
  );
  const organizer = meetingOwner(booking, env.ORGANIZER_EMAIL);
  const title = booking.link_title || "Meeting";
  const description = booking.meeting_url
    ? `Join the meeting: ${booking.meeting_url}`
    : `Meeting arranged through ${appName}`;
  const host = new URL(env.APP_URL).hostname;
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    `PRODID:-//${calendarText(appName)}//Meeting Invite//EN`,
    "CALSCALE:GREGORIAN",
    "METHOD:REQUEST",
    "BEGIN:VEVENT",
    `UID:${calendarText(booking.id)}@${host}`,
    `DTSTAMP:${calendarDate(new Date())}`,
    `DTSTART:${calendarDate(start)}`,
    `DTEND:${calendarDate(end)}`,
    `SUMMARY:${calendarText(title)}`,
    `DESCRIPTION:${calendarText(description)}`,
    `ORGANIZER:mailto:${organizer}`,
    `ATTENDEE;RSVP=TRUE:mailto:${booking.email}`,
    ...(booking.meeting_url
      ? [`LOCATION:${calendarText(booking.meeting_url)}`, `URL:${booking.meeting_url}`]
      : []),
    "STATUS:CONFIRMED",
    "END:VEVENT",
    "END:VCALENDAR",
  ];
  return base64Text(lines.join("\r\n"));
}

export async function renderEmailHtml(
  env: Env,
  subject: string,
  text: string,
  contact: string,
  meetingUrl?: string | null,
  manageUrl?: string,
  meetingTime?: string,
  calendarAttached = false,
  template = "received",
  meetingTitle?: string,
  workspaceBrand?: WorkspaceBrand,
) {
  const actionUrl = meetingUrl || manageUrl;
  const presentation = presentationFor(template);
  return render(
    createElement(SlotloomEmail, {
      preview: subject,
      heading: presentation.heading,
      label: presentation.label,
      message: text,
      appName: workspaceBrand?.name || env.APP_NAME,
      logoUrl: new URL(
        workspaceBrand?.logo || "/brand/logo-light.svg",
        `${env.APP_URL.replace(/\/$/, "")}/`,
      ).toString(),
      primaryColor: workspaceBrand?.primaryColor,
      accentColor: workspaceBrand?.accentColor,
      contact,
      actionUrl: actionUrl || undefined,
      actionLabel: presentation.actionLabel,
      meetingTime,
      meetingTitle,
      calendarAttached,
    }),
  );
}
export async function configuredEmailContent(
  env: Env,
  template: string,
  booking: BookingRow,
  manageUrl: string,
) {
  const configured = await env.DB.prepare(
    "SELECT subject,text_body,enabled FROM email_templates WHERE template_key=?",
  )
    .bind(template)
    .first<{ subject: string; text_body: string; enabled: number }>();
  if (!configured) return emailContent(template, booking, env, manageUrl);
  if (!configured.enabled) throw new Error("This email template is disabled.");
  const startsAt = booking.final_starts_at || booking.starts_at;
  const contact = meetingOwner(booking, env.ORGANIZER_EMAIL);
  const workspaceBrand = await getWorkspaceBrand(env);
  const variables = {
    name: booking.name,
    time: formatMeetingTime(startsAt, env.TIME_ZONE || "UTC"),
    contact,
    meeting_url: booking.meeting_url || "",
    manage_url: manageUrl,
    app_name: workspaceBrand.name,
    meeting_title: booking.link_title || "Meeting",
  };
  const text = replaceVariables(configured.text_body, variables).replaceAll(
    "\\n",
    "\n",
  );
  const subject = replaceVariables(configured.subject, variables);
  return {
    subject,
    text,
    html: await renderEmailHtml(
      env,
      subject,
      text,
      contact,
      booking.meeting_url,
      manageUrl,
      variables.time,
      Boolean(
        booking.meeting_url &&
          ["meeting_details", "rescheduled_confirmation", "reminder"].includes(template),
      ),
      template,
      template !== "received" ? variables.meeting_title : undefined,
      workspaceBrand,
    ),
  };
}
export async function sendAndLog(
  env: Env,
  booking: BookingRow,
  template: string,
) {
  const eventId = crypto.randomUUID();
  const createdAt = new Date().toISOString();
  try {
    if (!env.EMAIL) throw new Error("Email binding is not configured.");
    const manageUrl = await createManageUrl(env, booking.id);
    const content = await configuredEmailContent(
      env,
      template,
      booking,
      manageUrl,
    );
    const attachCalendar = Boolean(
      booking.meeting_url &&
        ["meeting_details", "rescheduled_confirmation", "reminder"].includes(template),
    );
    const workspaceBrand = await getWorkspaceBrand(env);
    const result = await env.EMAIL.send({
      to: booking.email,
      from: env.FROM_EMAIL,
      replyTo: meetingOwner(booking, env.ORGANIZER_EMAIL),
      ...content,
      ...(attachCalendar
        ? {
            attachments: [
              {
                content: calendarInvite(booking, env, workspaceBrand.name),
                filename: "meeting.ics",
                type: "text/calendar; charset=utf-8; method=REQUEST",
                disposition: "attachment" as const,
              },
            ],
          }
        : {}),
    });
    await env.DB.prepare(
      "INSERT INTO email_events (id, booking_id, template, recipient, provider_message_id, status, created_at) VALUES (?, ?, ?, ?, ?, 'sent', ?)",
    )
      .bind(
        eventId,
        booking.id,
        template,
        booking.email,
        result.messageId,
        createdAt,
      )
      .run();
    return result.messageId;
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unknown email error";
    await env.DB.prepare(
      "INSERT INTO email_events (id, booking_id, template, recipient, status, error, created_at) VALUES (?, ?, ?, ?, 'failed', ?, ?)",
    )
      .bind(
        eventId,
        booking.id,
        template,
        booking.email,
        message.slice(0, 1000),
        createdAt,
      )
      .run();
    await createNotification(
      env,
      meetingOwner(booking, env.ORGANIZER_EMAIL),
      "email.failed",
      "Email delivery failed",
      `The ${template.replaceAll("_", " ")} email to ${booking.email} could not be delivered.`,
      `/admin/requests?open=${booking.id}`,
    );
    throw error;
  }
}

export async function recordUserActivity(
  env: Env,
  actor: string,
  type: string,
  summary: string,
  target?: string,
  metadata?: unknown,
) {
  await env.DB.prepare(
    "INSERT INTO user_activity_events (id,actor_email,target_user_email,event_type,summary,metadata,created_at) VALUES (?,?,?,?,?,?,?)",
  )
    .bind(
      crypto.randomUUID(),
      actor,
      target || null,
      type,
      summary,
      metadata ? JSON.stringify(metadata) : null,
      new Date().toISOString(),
    )
    .run();
}
