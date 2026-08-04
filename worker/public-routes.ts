import {
  EMAIL_TEMPLATES,
  LINK_STATUSES,
  WORKFLOW_STATUSES,
  authorizeAdmin,
  createNotification,
  deviceType,
  formatMeetingTime,
  getBooking,
  getLink,
  getRules,
  json,
  normalizeBooking,
  normalizeLink,
  partsAt,
  recordActivity,
  recordUserActivity,
  safeNumber,
  safeText,
  sendAndLog,
  sha256,
  slotsForSchedule,
  slugify,
  verifyTurnstile,
  enforcePublicRateLimit,
  type BookingRow,
  type Env,
  type LinkRow,
  type LinkStatus,
  type RuleRow,
  type UserRole,
  type WorkspaceUser,
} from "./domain";
import type { JWTPayload } from "jose";
export async function publicLink(request: Request, env: Env, slug: string) {
  const link = await getLink(env, slug, true);
  if (!link || link.status !== "active")
    return json({ error: "This booking link is not available." }, 404);
  const linkToday = partsAt(new Date(), link.time_zone);
  const localDate = `${linkToday.year}-${linkToday.month}-${linkToday.day}`;
  if (link.valid_until && localDate > link.valid_until)
    return json({ error: "This booking link has expired." }, 410);
  const rules = await getRules(env, link.id);
  const occupied = await env.DB.prepare(
    "SELECT starts_at FROM bookings WHERE booking_link_id = ? AND workflow_status != 'cancelled'",
  )
    .bind(link.id)
    .all<{ starts_at: string }>();
  const unavailable = new Set(occupied.results.map((row) => row.starts_at));
  if (request.method === "GET") {
    const cf = request.cf as { country?: string } | undefined;
    await env.DB.prepare(
      "INSERT INTO link_page_views (id,booking_link_id,device_type,country,created_at) VALUES (?,?,?,?,?)",
    )
      .bind(
        crypto.randomUUID(),
        link.id,
        deviceType(safeText(request.headers.get("user-agent"), 500)),
        safeText(cf?.country, 100) || null,
        new Date().toISOString(),
      )
      .run();
    return json({
      link: normalizeLink(link, rules),
      turnstileSiteKey: env.TURNSTILE_SITE_KEY || null,
      slots: slotsForSchedule(link, rules).map((slot) => ({
        ...slot,
        booked: unavailable.has(slot.startsAt),
      })),
    });
  }
  if (request.method !== "POST")
    return json({ error: "Method not allowed." }, 405);
  if (!(await enforcePublicRateLimit(request, env)))
    return json(
      { error: "Too many attempts. Please wait and try again." },
      429,
    );
  const body = await request.json<Record<string, unknown>>().catch(() => null);
  if (!body) return json({ error: "Invalid request." }, 400);
  if (safeText(body.website, 200))
    return json({ id: crypto.randomUUID() }, 201);
  if (
    !(await verifyTurnstile(safeText(body.turnstileToken, 2048), request, env))
  )
    return json(
      { error: "Security verification failed. Please try again." },
      400,
    );
  const name = safeText(body.name, 80);
  const email = safeText(body.email, 254).toLowerCase();
  const phone = safeText(body.phone, 40);
  const startsAt = safeText(body.startsAt, 40);
  const timeZone = safeText(body.timeZone, 80) || "UTC";
  if (name.length < 2) return json({ error: "Please enter your name." }, 400);
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
    return json({ error: "Please enter a valid email." }, 400);
  if (
    !slotsForSchedule(link, rules).some((slot) => slot.startsAt === startsAt) ||
    unavailable.has(startsAt)
  )
    return json(
      { error: "That time is no longer available. Please choose another." },
      409,
    );
  const id = crypto.randomUUID();
  const now = new Date().toISOString();
  const userAgent = safeText(request.headers.get("user-agent"), 500);
  const cf = request.cf as
    | (IncomingRequestCfProperties & {
        city?: string;
        region?: string;
        country?: string;
      })
    | undefined;
  try {
    await env.DB.prepare(
      `INSERT INTO bookings (id, booking_link_id, name, email, phone, company, starts_at, time_zone, message, workflow_status, device_type, user_agent, browser_language, referrer, country, region, city, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'new', ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
      .bind(
        id,
        link.id,
        name,
        email,
        phone || null,
        null,
        startsAt,
        timeZone,
        null,
        deviceType(userAgent),
        userAgent || null,
        safeText(request.headers.get("accept-language"), 120) || null,
        safeText(request.headers.get("referer"), 500) || null,
        safeText(cf?.country, 100) || null,
        safeText(cf?.region, 120) || null,
        safeText(cf?.city, 120) || null,
        now,
        now,
      )
      .run();
  } catch (error) {
    if (String(error).includes("UNIQUE"))
      return json(
        { error: "Someone just requested that time. Please choose another." },
        409,
      );
    throw error;
  }
  await recordActivity(env, {
    bookingId: id,
    linkId: link.id,
    type: "booking.created",
    summary: `${name} submitted availability`,
  });
  await createNotification(
    env,
    link.created_by || env.ORGANIZER_EMAIL,
    "booking.created",
    "New availability response",
    `${name} selected ${formatMeetingTime(startsAt, link.time_zone)} through ${link.internal_name}.`,
    `/admin/requests?open=${id}`,
  );
  const booking = await getBooking(env, id);
  if (booking)
    await sendAndLog(env, booking, "received").catch(() => undefined);
  return json({ id }, 201);
}

export async function parseLinkInput(request: Request) {
  const body = await request.json<Record<string, unknown>>().catch(() => null);
  if (!body) return null;
  const title = safeText(body.title, 140);
  const internalName = safeText(body.internalName, 140) || title;
  const slug = slugify(safeText(body.slug, 100) || title);
  const rawRules = Array.isArray(body.availability) ? body.availability : [];
  const availability = rawRules.flatMap((item) => {
    if (!item || typeof item !== "object") return [];
    const candidate = item as Record<string, unknown>;
    const weekday = safeNumber(candidate.weekday, -1, -1, 6);
    const startTime = safeText(candidate.startTime, 5);
    const endTime = safeText(candidate.endTime, 5);
    return weekday >= 0 &&
      /^\d{2}:\d{2}$/.test(startTime) &&
      /^\d{2}:\d{2}$/.test(endTime) &&
      startTime < endTime
      ? [{ weekday, startTime, endTime }]
      : [];
  });
  const status = safeText(body.status, 20) as LinkStatus;
  const validFrom = safeText(body.validFrom, 10);
  const validUntil = safeText(body.validUntil, 10);
  const validDate = (value: string) =>
    !value || /^\d{4}-\d{2}-\d{2}$/.test(value);
  if (!title || !slug || !availability.length || !LINK_STATUSES.has(status))
    return null;
  if (
    !validDate(validFrom) ||
    !validDate(validUntil) ||
    (validFrom && validUntil && validFrom > validUntil)
  )
    return null;
  return {
    title,
    internalName,
    slug,
    description: safeText(body.description, 1000),
    durationMinutes: safeNumber(body.durationMinutes, 30, 10, 240),
    slotIntervalMinutes: safeNumber(body.slotIntervalMinutes, 30, 5, 240),
    bufferMinutes: safeNumber(body.bufferMinutes, 0, 0, 120),
    timeZone: safeText(body.timeZone, 80) || "UTC",
    daysAhead: safeNumber(body.daysAhead, 14, 1, 365),
    minimumNoticeHours: safeNumber(body.minimumNoticeHours, 4, 0, 720),
    validFrom: validFrom || null,
    validUntil: validUntil || null,
    status,
    allowSlotHolds: Boolean(body.allowSlotHolds),
    availability,
  };
}

export async function saveRules(
  env: Env,
  linkId: string,
  rules: { weekday: number; startTime: string; endTime: string }[],
) {
  await env.DB.batch([
    env.DB.prepare(
      "DELETE FROM availability_rules WHERE booking_link_id = ?",
    ).bind(linkId),
    ...rules.map((rule) =>
      env.DB.prepare(
        "INSERT INTO availability_rules (id, booking_link_id, weekday, start_time, end_time) VALUES (?, ?, ?, ?, ?)",
      ).bind(
        crypto.randomUUID(),
        linkId,
        rule.weekday,
        rule.startTime,
        rule.endTime,
      ),
    ),
  ]);
}

export async function manageBooking(request: Request, env: Env, token: string) {
  const hash = await sha256(token);
  const managed = await env.DB.prepare(
    `SELECT b.*, l.title AS link_title, l.slug AS link_slug, l.time_zone AS link_time_zone,
      l.days_ahead, l.minimum_notice_hours, l.duration_minutes, l.slot_interval_minutes, l.buffer_minutes,
      l.valid_from,l.valid_until
     FROM booking_manage_tokens t
     JOIN bookings b ON b.id=t.booking_id
     JOIN booking_links l ON l.id=b.booking_link_id
     WHERE t.token_hash=? AND t.revoked_at IS NULL AND t.expires_at > ?`,
  )
    .bind(hash, new Date().toISOString())
    .first<BookingRow & LinkRow>();
  if (!managed)
    return json({ error: "This management link is invalid or expired." }, 404);
  if (request.method === "GET") {
    const [rules, occupied, feedback] = await Promise.all([
      getRules(env, managed.booking_link_id),
      env.DB.prepare(
        "SELECT starts_at FROM bookings WHERE booking_link_id=? AND workflow_status!='cancelled' AND id!=?",
      )
        .bind(managed.booking_link_id, managed.id)
        .all<{ starts_at: string }>(),
      env.DB.prepare(
        "SELECT rating,message,created_at FROM meeting_feedback WHERE booking_id=?",
      )
        .bind(managed.id)
        .first(),
    ]);
    const unavailable = new Set(occupied.results.map((row) => row.starts_at));
    return json({
      booking: {
        id: managed.id,
        name: managed.name,
        email: managed.email,
        phone: managed.phone,
        startsAt: managed.starts_at,
        status: managed.workflow_status,
        linkTitle: managed.link_title,
        timeZone: managed.time_zone,
      },
      slots: slotsForSchedule(managed, rules).map((slot) => ({
        ...slot,
        booked: unavailable.has(slot.startsAt),
      })),
      feedback,
    });
  }
  if (request.method !== "PATCH")
    return json({ error: "Method not allowed." }, 405);
  const body = await request
    .json<Record<string, unknown>>()
    .catch(() => ({}) as Record<string, unknown>);
  const action = safeText(body.action, 20);
  const now = new Date().toISOString();
  if (action === "cancel") {
    await env.DB.prepare(
      "UPDATE bookings SET workflow_status='cancelled',updated_at=? WHERE id=?",
    )
      .bind(now, managed.id)
      .run();
    await recordActivity(env, {
      bookingId: managed.id,
      linkId: managed.booking_link_id,
      type: "visitor.cancelled",
      summary: `${managed.name} cancelled the request`,
    });
    return json({ success: true, status: "cancelled" });
  }
  if (action === "reschedule") {
    const startsAt = safeText(body.startsAt, 40);
    const rules = await getRules(env, managed.booking_link_id);
    if (
      !slotsForSchedule(managed, rules).some(
        (slot) => slot.startsAt === startsAt,
      )
    )
      return json({ error: "That time is not available." }, 409);
    try {
      await env.DB.prepare(
        "UPDATE bookings SET starts_at=?,final_starts_at=NULL,workflow_status='rescheduling',updated_at=? WHERE id=?",
      )
        .bind(startsAt, now, managed.id)
        .run();
    } catch (error) {
      if (String(error).includes("UNIQUE"))
        return json(
          { error: "That time was just selected. Choose another." },
          409,
        );
      throw error;
    }
    await recordActivity(env, {
      bookingId: managed.id,
      linkId: managed.booking_link_id,
      type: "visitor.rescheduled",
      summary: `${managed.name} selected a new time`,
    });
    let status = "rescheduling";
    if (managed.meeting_url && env.EMAIL) {
      const updated = await getBooking(env, managed.id);
      if (updated) {
        try {
          await sendAndLog(env, updated, "rescheduled_confirmation");
          await env.DB.prepare(
            "UPDATE bookings SET workflow_status='confirmed',meeting_sent_at=?,updated_at=? WHERE id=?",
          )
            .bind(now, now, managed.id)
            .run();
          status = "confirmed";
        } catch {
          // The selected time remains saved for the organizer to confirm manually.
        }
      }
    }
    await createNotification(
      env,
      null,
      "booking.rescheduled",
      status === "confirmed" ? "Meeting rescheduled" : "New slot selected",
      status === "confirmed"
        ? `${managed.name} selected a new slot and received the updated confirmation.`
        : `${managed.name} selected a new slot. Add a meeting link to confirm it.`,
      `/admin/requests?open=${managed.id}`,
    );
    return json({ success: true, status });
  }
  return json({ error: "Unknown action." }, 400);
}

export async function submitFeedback(
  request: Request,
  env: Env,
  token: string,
) {
  if (request.method !== "POST")
    return json({ error: "Method not allowed." }, 405);
  const hash = await sha256(token);
  const managed = await env.DB.prepare(
    `SELECT b.id,b.booking_link_id,b.name FROM booking_manage_tokens t
     JOIN bookings b ON b.id=t.booking_id
     WHERE t.token_hash=? AND t.revoked_at IS NULL AND t.expires_at > ?`,
  )
    .bind(hash, new Date().toISOString())
    .first<{ id: string; booking_link_id: string; name: string }>();
  if (!managed)
    return json({ error: "This management link is invalid or expired." }, 404);
  const body = await request
    .json<Record<string, unknown>>()
    .catch(() => ({}) as Record<string, unknown>);
  const rating = safeNumber(body.rating, 0, 0, 5);
  const message = safeText(body.message, 2000);
  if (rating < 1) return json({ error: "Choose a rating from 1 to 5." }, 400);
  const now = new Date().toISOString();
  await env.DB.prepare(
    `INSERT INTO meeting_feedback (id,booking_id,rating,message,created_at,updated_at)
     VALUES (?,?,?,?,?,?) ON CONFLICT(booking_id) DO UPDATE SET rating=excluded.rating,message=excluded.message,updated_at=excluded.updated_at`,
  )
    .bind(crypto.randomUUID(), managed.id, rating, message || null, now, now)
    .run();
  await recordActivity(env, {
    bookingId: managed.id,
    linkId: managed.booking_link_id,
    type: "visitor.feedback_submitted",
    summary: `${managed.name} submitted meeting feedback`,
  });
  await createNotification(
    env,
    null,
    "feedback.received",
    "New meeting feedback",
    `${managed.name} left a ${rating}-star rating.`,
    `/admin/requests?open=${managed.id}`,
  );
  return json({ success: true }, 201);
}
export async function cleanupRetainedData(env: Env) {
  const setting = await env.DB.prepare(
    "SELECT setting_value FROM workspace_settings WHERE setting_key='data_retention_days'",
  ).first<{ setting_value: string }>();
  const days = safeNumber(setting?.setting_value, 365, 30, 3650);
  const cutoff = new Date(Date.now() - days * 86_400_000).toISOString();
  await env.DB.batch([
    env.DB.prepare(
      "DELETE FROM bookings WHERE workflow_status IN ('completed','cancelled','missed') AND updated_at < ?",
    ).bind(cutoff),
    env.DB.prepare(
      "DELETE FROM request_rate_limits WHERE window_start < ?",
    ).bind(new Date(Date.now() - 86_400_000).toISOString()),
    env.DB.prepare(
      "DELETE FROM booking_manage_tokens WHERE expires_at < ? OR revoked_at IS NOT NULL",
    ).bind(new Date().toISOString()),
  ]);
}

export function normalizeUser(user: WorkspaceUser) {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    status: user.status,
    invitedBy: user.invited_by,
    lastSeenAt: user.last_seen_at,
    createdAt: user.created_at,
    updatedAt: user.updated_at,
  };
}

export function can(
  role: UserRole,
  action: "manage_team" | "manage_links" | "manage_requests" | "view",
) {
  if (role === "owner") return true;
  if (role === "admin") return action !== "manage_team";
  if (role === "member")
    return action === "manage_requests" || action === "view";
  return action === "view";
}

export async function resolveWorkspaceUser(env: Env, identity: JWTPayload) {
  const email =
    typeof identity.email === "string" ? identity.email.toLowerCase() : "";
  if (!email) return null;
  let user = await env.DB.prepare(
    "SELECT * FROM workspace_users WHERE email = ? COLLATE NOCASE",
  )
    .bind(email)
    .first<WorkspaceUser>();
  const bootstrap = env.BOOTSTRAP_OWNER_EMAIL?.toLowerCase();
  if (
    !user &&
    (email === "local-development" || (bootstrap && email === bootstrap))
  ) {
    const now = new Date().toISOString();
    await env.DB.prepare(
      "INSERT INTO workspace_users (id,email,name,role,status,last_seen_at,created_at,updated_at) VALUES (?,?,?,'owner','active',?,?,?)",
    )
      .bind(
        crypto.randomUUID(),
        email,
        typeof identity.name === "string" ? identity.name : "Workspace owner",
        now,
        now,
        now,
      )
      .run();
    user = await env.DB.prepare(
      "SELECT * FROM workspace_users WHERE email = ? COLLATE NOCASE",
    )
      .bind(email)
      .first<WorkspaceUser>();
  }
  if (!user || user.status !== "active") return null;
  const now = new Date().toISOString();
  await env.DB.prepare(
    "UPDATE workspace_users SET last_seen_at=?, updated_at=updated_at WHERE id=?",
  )
    .bind(now, user.id)
    .run();
  return { ...user, last_seen_at: now };
}
