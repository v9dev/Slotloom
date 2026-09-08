import {
  getBooking,
  json,
  recordActivity,
  recordUserActivity,
  safeText,
  type Env,
  type WorkspaceUser,
} from "./domain";

const CSV_COLUMNS = [
  ["id", "Meeting ID"],
  ["name", "Visitor name"],
  ["email", "Visitor email"],
  ["phone", "Phone"],
  ["meeting_title", "Meeting title"],
  ["starts_at", "Selected time"],
  ["final_starts_at", "Final time"],
  ["time_zone", "Visitor time zone"],
  ["workflow_status", "Status"],
  ["assigned_to", "Organizer"],
  ["meeting_provider", "Meeting provider"],
  ["meeting_url", "Meeting link"],
  ["link_title", "Booking link"],
  ["link_slug", "Booking link slug"],
  ["message", "Visitor message"],
  ["admin_note", "Internal note"],
  ["country", "Country"],
  ["region", "Region"],
  ["city", "City"],
  ["created_at", "Created at"],
  ["updated_at", "Updated at"],
] as const;

export function csvCell(value: unknown) {
  let text = String(value ?? "");
  if (/^[=+\-@\t\r]/.test(text)) text = `'${text}`;
  return `"${text.replaceAll('"', '""')}"`;
}

function exportFilters(url: URL) {
  const status = safeText(url.searchParams.get("status"), 30);
  const linkId = safeText(url.searchParams.get("link"), 50);
  const search = safeText(url.searchParams.get("q"), 120);
  const clauses: string[] = [];
  const values: string[] = [];
  if (status) {
    clauses.push("b.workflow_status = ?");
    values.push(status);
  }
  if (linkId) {
    clauses.push("b.booking_link_id = ?");
    values.push(linkId);
  }
  if (search) {
    clauses.push(
      "(b.email LIKE ? OR b.name LIKE ? OR b.phone LIKE ? OR l.title LIKE ?)",
    );
    const pattern = `%${search}%`;
    values.push(pattern, pattern, pattern, pattern);
  }
  return {
    where: clauses.length ? `WHERE ${clauses.join(" AND ")}` : "",
    values,
  };
}

async function bookingCsv(env: Env, url: URL) {
  const { where, values } = exportFilters(url);
  const result = await env.DB.prepare(
    `SELECT b.id,b.name,b.email,b.phone,b.meeting_title,b.starts_at,b.final_starts_at,
     b.time_zone,b.workflow_status,b.assigned_to,b.meeting_provider,b.meeting_url,
     l.title AS link_title,l.slug AS link_slug,b.message,b.admin_note,b.country,b.region,
     b.city,b.created_at,b.updated_at
     FROM bookings b LEFT JOIN booking_links l ON l.id=b.booking_link_id ${where}
     ORDER BY b.created_at DESC`,
  )
    .bind(...values)
    .all<Record<string, unknown>>();
  const csv = [
    CSV_COLUMNS.map(([, label]) => csvCell(label)).join(","),
    ...result.results.map((row) =>
      CSV_COLUMNS.map(([key]) => csvCell(row[key])).join(","),
    ),
  ].join("\r\n");
  return new Response(`\uFEFF${csv}`, {
    headers: {
      "cache-control": "no-store",
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": `attachment; filename="meeting-requests-${new Date().toISOString().slice(0, 10)}.csv"`,
    },
  });
}

async function workspaceExport(env: Env) {
  const [
    meetings,
    attendees,
    links,
    availability,
    feedback,
    emails,
    activity,
    pageViews,
    team,
  ] = await Promise.all([
    env.DB.prepare(
      `SELECT b.id,b.booking_link_id,l.internal_name AS booking_link_name,
       l.title AS booking_link_title,l.slug AS booking_link_slug,b.name,b.email,b.phone,
       b.company,b.starts_at,b.final_starts_at,b.time_zone,b.workflow_status,b.message,
       b.admin_note,b.meeting_title,b.meeting_url,b.meeting_notes,b.meeting_sent_at,
       b.meeting_provider,b.meeting_provider_preference,b.meeting_provider_event_id,
       (SELECT provider_email FROM calendar_connections c
        WHERE c.id=b.meeting_provider_connection_id) AS meeting_provider_account,
       b.meeting_provider_synced_at,b.assigned_to,b.device_type,b.user_agent,
       b.browser_language,b.referrer,b.country,b.region,b.city,b.created_at,b.updated_at
       FROM bookings b LEFT JOIN booking_links l ON l.id=b.booking_link_id
       ORDER BY b.created_at DESC`,
    ).all<Record<string, unknown>>(),
    env.DB.prepare(
      `SELECT id,booking_id,name,email,source,created_at,updated_at
       FROM booking_attendees ORDER BY created_at DESC`,
    ).all<Record<string, unknown>>(),
    env.DB.prepare(
      `SELECT l.id,l.slug,l.internal_name,l.title,l.description,l.duration_minutes,
       l.slot_interval_minutes,l.buffer_minutes,l.time_zone,l.days_ahead,
       l.minimum_notice_hours,l.valid_from,l.valid_until,l.status,l.allow_slot_holds,
       l.allow_custom_meeting_title,l.allow_additional_attendees,l.created_by,l.created_at,
       l.updated_at,(SELECT COUNT(*) FROM bookings b WHERE b.booking_link_id=l.id) AS response_count,
       (SELECT COUNT(*) FROM link_page_views v WHERE v.booking_link_id=l.id) AS page_view_count
       FROM booking_links l ORDER BY l.created_at DESC`,
    ).all<Record<string, unknown>>(),
    env.DB.prepare(
      `SELECT id,booking_link_id,weekday,start_time,end_time
       FROM availability_rules ORDER BY booking_link_id,weekday,start_time`,
    ).all<Record<string, unknown>>(),
    env.DB.prepare(
      `SELECT id,booking_id,rating,message,created_at,updated_at
       FROM meeting_feedback ORDER BY created_at DESC`,
    ).all<Record<string, unknown>>(),
    env.DB.prepare(
      `SELECT id,booking_id,template,recipient,status,error,delivery_method,sender_email,
       used_fallback,provider_message_id,created_at
       FROM email_events ORDER BY created_at DESC`,
    ).all<Record<string, unknown>>(),
    env.DB.prepare(
      `SELECT id,actor_email,event_type,summary,metadata,created_at,booking_id,
       booking_link_id,NULL AS target_user_email,'meeting' AS source
       FROM activity_events
       UNION ALL
       SELECT id,actor_email,event_type,summary,metadata,created_at,NULL AS booking_id,
       NULL AS booking_link_id,target_user_email,'team' AS source
       FROM user_activity_events ORDER BY created_at DESC`,
    ).all<Record<string, unknown>>(),
    env.DB.prepare(
      `SELECT id,booking_link_id,device_type,country,created_at
       FROM link_page_views ORDER BY created_at DESC`,
    ).all<Record<string, unknown>>(),
    env.DB.prepare(
      `SELECT id,email,name,role,status,invited_by,last_seen_at,created_at,updated_at
       FROM workspace_users ORDER BY created_at`,
    ).all<Record<string, unknown>>(),
  ]);
  return json({
    generatedAt: new Date().toISOString(),
    meetings: meetings.results,
    attendees: attendees.results,
    links: links.results,
    availability: availability.results,
    feedback: feedback.results,
    emails: emails.results,
    activity: activity.results,
    pageViews: pageViews.results,
    team: team.results,
  });
}

export function bookingDeletionStatements(env: Env, id: string) {
  return [
    env.DB.prepare("DELETE FROM notifications WHERE action_url=?").bind(
      `/admin/requests?open=${id}`,
    ),
    env.DB.prepare("DELETE FROM booking_manage_tokens WHERE booking_id=?").bind(
      id,
    ),
    env.DB.prepare("DELETE FROM meeting_feedback WHERE booking_id=?").bind(id),
    env.DB.prepare("DELETE FROM email_events WHERE booking_id=?").bind(id),
    env.DB.prepare("DELETE FROM activity_events WHERE booking_id=?").bind(id),
    env.DB.prepare("DELETE FROM booking_attendees WHERE booking_id=?").bind(id),
    env.DB.prepare("DELETE FROM bookings WHERE id=?").bind(id),
  ];
}

export function linkDeletionStatements(env: Env, id: string) {
  return [
    env.DB.prepare(
      "DELETE FROM notifications WHERE action_url IN (SELECT '/admin/requests?open=' || id FROM bookings WHERE booking_link_id=?)",
    ).bind(id),
    env.DB.prepare(
      "DELETE FROM booking_manage_tokens WHERE booking_id IN (SELECT id FROM bookings WHERE booking_link_id=?)",
    ).bind(id),
    env.DB.prepare(
      "DELETE FROM meeting_feedback WHERE booking_id IN (SELECT id FROM bookings WHERE booking_link_id=?)",
    ).bind(id),
    env.DB.prepare(
      "DELETE FROM email_events WHERE booking_id IN (SELECT id FROM bookings WHERE booking_link_id=?)",
    ).bind(id),
    env.DB.prepare(
      "DELETE FROM activity_events WHERE booking_id IN (SELECT id FROM bookings WHERE booking_link_id=?) OR booking_link_id=?",
    ).bind(id, id),
    env.DB.prepare(
      "DELETE FROM booking_attendees WHERE booking_id IN (SELECT id FROM bookings WHERE booking_link_id=?)",
    ).bind(id),
    env.DB.prepare("DELETE FROM bookings WHERE booking_link_id=?").bind(id),
    env.DB.prepare("DELETE FROM link_page_views WHERE booking_link_id=?").bind(
      id,
    ),
    env.DB.prepare(
      "DELETE FROM availability_rules WHERE booking_link_id=?",
    ).bind(id),
    env.DB.prepare("DELETE FROM booking_links WHERE id=?").bind(id),
  ];
}

function cannotManageAssignedBooking(
  user: WorkspaceUser,
  assignedTo: string | null,
) {
  return (
    user.role === "member" &&
    assignedTo !== null &&
    assignedTo.toLowerCase() !== user.email.toLowerCase()
  );
}

async function deleteBooking(env: Env, id: string, user: WorkspaceUser) {
  const booking = await getBooking(env, id);
  if (!booking) return json({ error: "Meeting request not found." }, 404);
  if (cannotManageAssignedBooking(user, booking.assigned_to))
    return json(
      { error: "This request is assigned to another organizer." },
      403,
    );
  await env.DB.batch(bookingDeletionStatements(env, id));
  await recordUserActivity(
    env,
    user.email,
    "booking.deleted",
    `Permanently deleted meeting response ${id}`,
  );
  return json({ deleted: true });
}

async function erasePersonalData(env: Env, id: string, user: WorkspaceUser) {
  const booking = await getBooking(env, id);
  if (!booking) return json({ error: "Meeting request not found." }, 404);
  if (cannotManageAssignedBooking(user, booking.assigned_to))
    return json(
      { error: "This request is assigned to another organizer." },
      403,
    );
  const now = new Date().toISOString();
  await env.DB.batch([
    env.DB.prepare("DELETE FROM booking_attendees WHERE booking_id=?").bind(id),
    env.DB.prepare(
      `UPDATE bookings SET name='Deleted visitor',email=?,phone=NULL,company=NULL,message=NULL,
       device_type=NULL,user_agent=NULL,browser_language=NULL,referrer=NULL,country=NULL,region=NULL,city=NULL,
       admin_note=NULL,meeting_notes=NULL,meeting_title=NULL,updated_at=? WHERE id=?`,
    ).bind(`deleted+${id}@invalid.local`, now, id),
    env.DB.prepare(
      "UPDATE email_events SET recipient='redacted@example.invalid',error=NULL WHERE booking_id=?",
    ).bind(id),
    env.DB.prepare("DELETE FROM booking_manage_tokens WHERE booking_id=?").bind(
      id,
    ),
    env.DB.prepare(
      "UPDATE meeting_feedback SET message=NULL,updated_at=? WHERE booking_id=?",
    ).bind(now, id),
    env.DB.prepare(
      "UPDATE activity_events SET summary='Visitor activity retained after personal data erasure',metadata=NULL WHERE booking_id=?",
    ).bind(id),
    env.DB.prepare("DELETE FROM notifications WHERE action_url=?").bind(
      `/admin/requests?open=${id}`,
    ),
  ]);
  await recordActivity(env, {
    bookingId: id,
    linkId: booking.booking_link_id,
    actor: user.email,
    type: "visitor.personal_data_erased",
    summary: "Erased visitor personal data",
  });
  await recordUserActivity(
    env,
    user.email,
    "visitor.personal_data_erased",
    `Erased personal data for request ${id}`,
  );
  return json({ success: true });
}

export async function dataAdminRoute(
  request: Request,
  env: Env,
  path: string,
  url: URL,
  user: WorkspaceUser,
): Promise<Response | null> {
  if (path === "/api/admin/bookings/export" && request.method === "GET")
    return bookingCsv(env, url);
  if (path === "/api/admin/export/workspace" && request.method === "GET") {
    if (!["owner", "admin"].includes(user.role))
      return json(
        { error: "Only workspace administrators can export all data." },
        403,
      );
    return workspaceExport(env);
  }
  const personalDataMatch = path.match(
    /^\/api\/admin\/bookings\/([^/]+)\/personal-data$/,
  );
  if (personalDataMatch && request.method === "DELETE")
    return erasePersonalData(
      env,
      decodeURIComponent(personalDataMatch[1]),
      user,
    );
  const bookingMatch = path.match(/^\/api\/admin\/bookings\/([^/]+)$/);
  if (
    bookingMatch &&
    request.method === "DELETE" &&
    url.searchParams.get("mode") === "delete"
  )
    return deleteBooking(env, decodeURIComponent(bookingMatch[1]), user);
  return null;
}
