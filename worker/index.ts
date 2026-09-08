import {
  WORKFLOW_STATUSES,
  authorizeAdmin,
  configuredEmailContent,
  escapeHtml,
  formatMeetingTime,
  getWorkspaceBrand,
  getLink,
  getRules,
  json,
  normalizeBooking,
  normalizeLink,
  recordActivity,
  recordUserActivity,
  replaceVariables,
  renderEmailHtml,
  safeNumber,
  safeText,
  type BookingRow,
  type Env,
  type LinkRow,
  type UserRole,
  type WorkspaceUser,
  type WorkflowStatus,
} from "./domain";
import {
  can,
  cleanupRetainedData,
  manageBooking,
  normalizeUser,
  parseLinkInput,
  publicLink,
  resolveWorkspaceUser,
  saveRules,
  submitFeedback,
} from "./public-routes";
import { serveBrandAsset, uploadBrandAsset } from "./brand-assets";
import { oauthCallbackRoute } from "./calendar-integrations";
import { integrationAdminRoute } from "./integration-admin";
import { bookingAdminRoute } from "./booking-admin";
import { meetingAdminRoute } from "./meeting-admin";
import { personalIntegrationRoute } from "./personal-integrations";
import { deliverEmail, emailDeliveryAdminRoute } from "./email-delivery";
import { dataAdminRoute, linkDeletionStatements } from "./data-admin";
export async function adminRoutes(
  request: Request,
  env: Env,
  path: string,
  url: URL,
) {
  const identity = await authorizeAdmin(request, env);
  if (!identity) return json({ error: "Unauthorized." }, 401);
  const user = await resolveWorkspaceUser(env, identity);
  if (!user)
    return json(
      { error: "Your identity is not an active member of this workspace." },
      403,
    );
  const actor = user.email;
  const personalIntegrationResponse = await personalIntegrationRoute(
    request,
    env,
    path,
    user,
  );
  if (personalIntegrationResponse) return personalIntegrationResponse;
  const emailDeliveryResponse = await emailDeliveryAdminRoute(
    request,
    env,
    path,
    user,
  );
  if (emailDeliveryResponse) return emailDeliveryResponse;
  const integrationResponse = await integrationAdminRoute(
    request,
    env,
    path,
    user,
  );
  if (integrationResponse) return integrationResponse;
  if (path === "/api/admin/notifications/live") {
    if (request.headers.get("Upgrade")?.toLowerCase() !== "websocket")
      return json({ error: "A WebSocket upgrade is required." }, 426);
    if (!env.NOTIFICATION_HUB)
      return json({ error: "Live notifications are not configured." }, 503);
    const headers = new Headers(request.headers);
    headers.set("x-slotloom-user", actor);
    return env.NOTIFICATION_HUB.getByName("workspace").fetch(
      new Request("https://notification-hub.internal/connect", {
        method: "GET",
        headers,
      }),
    );
  }
  if (path === "/api/admin/me" && request.method === "GET")
    return json({ user: normalizeUser(user) });
  if (path === "/api/admin/assignees" && request.method === "GET") {
    const result = await env.DB.prepare(
      "SELECT * FROM workspace_users WHERE status='active' AND role IN ('owner','admin','member') ORDER BY name",
    ).all<WorkspaceUser>();
    return json({ users: result.results.map(normalizeUser) });
  }
  if (path === "/api/admin/notifications" && request.method === "GET") {
    const result = await env.DB.prepare(
      "SELECT * FROM notifications WHERE user_email IS NULL OR user_email=? ORDER BY created_at DESC LIMIT 50",
    )
      .bind(actor)
      .all();
    return json({ notifications: result.results });
  }
  if (path === "/api/admin/notifications/read" && request.method === "PATCH") {
    await env.DB.prepare(
      "UPDATE notifications SET read_at=? WHERE (user_email IS NULL OR user_email=?) AND read_at IS NULL",
    )
      .bind(new Date().toISOString(), actor)
      .run();
    return json({ success: true });
  }
  if (path === "/api/admin/templates" && request.method === "GET") {
    const result = await env.DB.prepare(
      "SELECT * FROM email_templates ORDER BY name",
    ).all();
    return json({ templates: result.results });
  }
  if (path === "/api/admin/templates/preview" && request.method === "POST") {
    const body = await request
      .json<Record<string, unknown>>()
      .catch(() => ({}) as Record<string, unknown>);
    const subject = safeText(body.subject, 300);
    const text = safeText(body.text, 10000);
    const contact = safeText(body.contact, 254) || actor;
    const actionUrl = safeText(body.actionUrl, 2000);
    const html = await renderEmailHtml(
      env,
      subject,
      text,
      contact,
      actionUrl,
      undefined,
    );
    return json({ html });
  }
  const templateMatch = path.match(
    /^\/api\/admin\/templates\/([^/]+)(\/test)?$/,
  );
  if (templateMatch && !templateMatch[2] && request.method === "PATCH") {
    if (!can(user.role, "manage_links"))
      return json({ error: "Your role cannot manage email templates." }, 403);
    const key = decodeURIComponent(templateMatch[1]);
    const body = await request
      .json<Record<string, unknown>>()
      .catch(() => ({}) as Record<string, unknown>);
    await env.DB.prepare(
      "UPDATE email_templates SET subject=?,text_body=?,enabled=?,updated_by=?,updated_at=? WHERE template_key=?",
    )
      .bind(
        safeText(body.subject, 300),
        safeText(body.textBody, 10000),
        body.enabled ? 1 : 0,
        actor,
        new Date().toISOString(),
        key,
      )
      .run();
    await recordUserActivity(
      env,
      actor,
      "template.updated",
      `Updated ${key.replaceAll("_", " ")} email template`,
    );
    return json({ success: true });
  }
  if (templateMatch?.[2] === "/test" && request.method === "POST") {
    const template = await env.DB.prepare(
      "SELECT * FROM email_templates WHERE template_key=?",
    )
      .bind(decodeURIComponent(templateMatch[1]))
      .first<{ subject: string; text_body: string }>();
    if (!template) return json({ error: "Template not found." }, 404);
    const variables = {
      name: "Preview visitor",
      time: formatMeetingTime(
        new Date(Date.now() + 86_400_000).toISOString(),
        "UTC",
      ),
      contact: actor,
      meeting_url: "https://meet.example.com/example",
      manage_url: `${env.APP_URL}/manage/example`,
      app_name: (await getWorkspaceBrand(env)).name,
    };
    const subject = replaceVariables(template.subject, variables);
    const text = replaceVariables(template.text_body, variables).replaceAll(
      "\\n",
      "\n",
    );
    const rendered = await configuredEmailContent(
      env,
      decodeURIComponent(templateMatch[1]),
      {
        id: "preview",
        name: variables.name,
        email: actor,
        starts_at: new Date(Date.now() + 86_400_000).toISOString(),
        final_starts_at: null,
        time_zone: "UTC",
        phone: null,
        company: null,
        message: null,
        status: "pending",
        workflow_status: "new",
        admin_note: null,
        meeting_url: variables.meeting_url,
        meeting_notes: null,
        meeting_sent_at: null,
        assigned_to: actor,
        booking_link_id: "preview",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      variables.manage_url,
    );
    const delivery = await deliverEmail(env, actor, {
      to: actor,
      replyTo: actor,
      subject: `[Test] ${subject}`,
      text,
      html: rendered.html,
    });
    return json({ success: true, deliveryMethod: delivery.deliveryMethod });
  }
  if (path === "/api/admin/settings" && request.method === "GET") {
    const rows = await env.DB.prepare(
      "SELECT setting_key,setting_value FROM workspace_settings",
    ).all<{ setting_key: string; setting_value: string }>();
    return json({
      settings: Object.fromEntries(
        rows.results.map((row) => [row.setting_key, row.setting_value]),
      ),
    });
  }
  if (path === "/api/admin/settings" && request.method === "PATCH") {
    if (!can(user.role, "manage_team"))
      return json({ error: "Only owners can change workspace settings." }, 403);
    const body = await request
      .json<Record<string, unknown>>()
      .catch(() => ({}) as Record<string, unknown>);
    const retention = safeNumber(body.dataRetentionDays, 365, 30, 3650);
    const safeAssetUrl = (value: unknown, fallback: string) => {
      const url = safeText(value, 500);
      return url.startsWith("/") || /^https:\/\//i.test(url) ? url : fallback;
    };
    const safeColor = (value: unknown, fallback: string) => {
      const color = safeText(value, 7);
      return /^#[0-9a-f]{6}$/i.test(color) ? color.toLowerCase() : fallback;
    };
    const settings = [
      ["data_retention_days", String(retention)],
      ["app_name", safeText(body.appName, 80) || "Slotloom"],
      ["brand_tagline", safeText(body.brandTagline, 160)],
      [
        "brand_logo_url",
        safeAssetUrl(body.brandLogoUrl, "/brand/logo-light.svg"),
      ],
      [
        "brand_logo_dark_url",
        safeAssetUrl(body.brandLogoDarkUrl, "/brand/logo-dark.svg"),
      ],
      [
        "brand_favicon_url",
        safeAssetUrl(body.brandFaviconUrl, "/brand/mark.svg"),
      ],
      ["brand_primary_color", safeColor(body.brandPrimaryColor, "#2563eb")],
      ["brand_accent_color", safeColor(body.brandAccentColor, "#7c3aed")],
    ];
    const updatedAt = new Date().toISOString();
    await env.DB.batch(
      settings.map(([key, value]) =>
        env.DB.prepare(
          "INSERT INTO workspace_settings (setting_key,setting_value,updated_by,updated_at) VALUES (?,?,?,?) ON CONFLICT(setting_key) DO UPDATE SET setting_value=excluded.setting_value,updated_by=excluded.updated_by,updated_at=excluded.updated_at",
        ).bind(key, value, actor, updatedAt),
      ),
    );
    return json({ success: true });
  }
  const brandUpload = path.match(
    /^\/api\/admin\/brand-assets\/(logo|logo-dark|favicon)$/,
  );
  if (brandUpload && request.method === "POST") {
    if (!can(user.role, "manage_team"))
      return json({ error: "Only owners can change workspace branding." }, 403);
    return uploadBrandAsset(request, env, brandUpload[1], actor);
  }
  if (path === "/api/admin/users" && request.method === "GET") {
    if (!can(user.role, "manage_team"))
      return json({ error: "Only workspace owners can manage the team." }, 403);
    const [users, activity] = await Promise.all([
      env.DB.prepare(
        "SELECT * FROM workspace_users ORDER BY CASE role WHEN 'owner' THEN 0 WHEN 'admin' THEN 1 WHEN 'member' THEN 2 ELSE 3 END, name",
      ).all<WorkspaceUser>(),
      env.DB.prepare(
        "SELECT * FROM user_activity_events ORDER BY created_at DESC LIMIT 50",
      ).all(),
    ]);
    return json({
      users: users.results.map(normalizeUser),
      activity: activity.results,
    });
  }
  if (path === "/api/admin/users" && request.method === "POST") {
    if (!can(user.role, "manage_team"))
      return json({ error: "Only workspace owners can add people." }, 403);
    const body: Record<string, unknown> = await request
      .json<Record<string, unknown>>()
      .catch(() => ({}) as Record<string, unknown>);
    const email = safeText(body.email, 254).toLowerCase();
    const name = safeText(body.name, 100);
    const role = safeText(body.role, 20) as UserRole;
    if (
      !name ||
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ||
      !["owner", "admin", "member", "viewer"].includes(role)
    )
      return json({ error: "Enter a name, valid email, and role." }, 400);
    const now = new Date().toISOString();
    try {
      await env.DB.prepare(
        "INSERT INTO workspace_users (id,email,name,role,status,invited_by,created_at,updated_at) VALUES (?,?,?,?,'active',?,?,?)",
      )
        .bind(crypto.randomUUID(), email, name, role, actor, now, now)
        .run();
    } catch (error) {
      if (String(error).includes("UNIQUE"))
        return json(
          { error: "That email is already a workspace member." },
          409,
        );
      throw error;
    }
    await recordUserActivity(
      env,
      actor,
      "user.added",
      `Added ${name} as ${role}`,
      email,
    );
    return json({ success: true }, 201);
  }
  const userMatch = path.match(/^\/api\/admin\/users\/([^/]+)$/);
  if (userMatch && request.method === "PATCH") {
    if (!can(user.role, "manage_team"))
      return json(
        { error: "Only workspace owners can change team access." },
        403,
      );
    const targetEmail = decodeURIComponent(userMatch[1]).toLowerCase();
    const target = await env.DB.prepare(
      "SELECT * FROM workspace_users WHERE email=? COLLATE NOCASE",
    )
      .bind(targetEmail)
      .first<WorkspaceUser>();
    if (!target) return json({ error: "Team member not found." }, 404);
    const body: Record<string, unknown> = await request
      .json<Record<string, unknown>>()
      .catch(() => ({}) as Record<string, unknown>);
    const role = safeText(body.role, 20) as UserRole;
    const status = safeText(body.status, 20) as "active" | "suspended";
    if (
      !["owner", "admin", "member", "viewer"].includes(role) ||
      !["active", "suspended"].includes(status)
    )
      return json({ error: "Invalid role or status." }, 400);
    if (
      target.email === user.email &&
      (role !== "owner" || status !== "active")
    )
      return json({ error: "You cannot remove your own owner access." }, 400);
    if (target.role === "owner" && (role !== "owner" || status !== "active")) {
      const count = await env.DB.prepare(
        "SELECT COUNT(*) AS count FROM workspace_users WHERE role='owner' AND status='active'",
      ).first<{ count: number }>();
      if (Number(count?.count || 0) <= 1)
        return json(
          { error: "The workspace must keep at least one active owner." },
          400,
        );
    }
    await env.DB.prepare(
      "UPDATE workspace_users SET role=?,status=?,updated_at=? WHERE id=?",
    )
      .bind(role, status, new Date().toISOString(), target.id)
      .run();
    await recordUserActivity(
      env,
      actor,
      "user.updated",
      `Changed ${target.email} to ${role} (${status})`,
      target.email,
    );
    return json({ success: true });
  }
  if (request.method !== "GET") {
    const action = path.startsWith("/api/admin/links")
      ? "manage_links"
      : "manage_requests";
    if (!can(user.role, action))
      return json({ error: "Your role does not allow this action." }, 403);
  }
  const dataResponse = await dataAdminRoute(request, env, path, url, user);
  if (dataResponse) return dataResponse;
  if (path === "/api/admin/dashboard" && request.method === "GET") {
    const stats = await env.DB.prepare(
      `SELECT
      (SELECT COUNT(*) FROM booking_links WHERE status != 'archived') AS total_links,
      (SELECT COUNT(*) FROM booking_links WHERE status = 'active') AS active_links,
      (SELECT COUNT(*) FROM bookings) AS total_responses,
      (SELECT COUNT(*) FROM bookings WHERE workflow_status IN ('new','under_review','awaiting_visitor','rescheduling')) AS pending,
      (SELECT COUNT(*) FROM bookings WHERE workflow_status = 'confirmed') AS confirmed,
      (SELECT COUNT(*) FROM bookings WHERE workflow_status = 'completed') AS completed,
      (SELECT COUNT(*) FROM bookings WHERE workflow_status = 'missed') AS missed,
      (SELECT COUNT(*) FROM bookings WHERE workflow_status = 'cancelled') AS cancelled,
      (SELECT COUNT(*) FROM email_events WHERE status = 'sent') AS emails_sent`,
    ).first<Record<string, number>>();
    const recent = await env.DB.prepare(
      "SELECT b.*, l.title AS link_title, l.slug AS link_slug FROM bookings b LEFT JOIN booking_links l ON l.id=b.booking_link_id ORDER BY b.created_at DESC LIMIT 6",
    ).all<BookingRow>();
    return json({
      stats,
      recent: recent.results.map(normalizeBooking),
      admin: actor,
      currentUser: normalizeUser(user),
    });
  }
  if (path === "/api/admin/activity" && request.method === "GET") {
    const search = safeText(url.searchParams.get("q"), 120);
    const category = safeText(url.searchParams.get("category"), 40);
    const actorFilter = safeText(url.searchParams.get("actor"), 254);
    const page = safeNumber(url.searchParams.get("page"), 1, 1, 100000);
    const pageSize = safeNumber(url.searchParams.get("pageSize"), 20, 5, 100);
    const clauses: string[] = [];
    const values: Array<string | number> = [];
    if (search) {
      clauses.push(
        "(summary LIKE ? OR event_type LIKE ? OR actor_email LIKE ?)",
      );
      const pattern = `%${search}%`;
      values.push(pattern, pattern, pattern);
    }
    if (category) {
      clauses.push("event_type LIKE ?");
      values.push(`${category}.%`);
    }
    if (actorFilter) {
      clauses.push("actor_email = ?");
      values.push(actorFilter);
    }
    const where = clauses.length ? `WHERE ${clauses.join(" AND ")}` : "";
    const union = `
      SELECT id,COALESCE(actor_email,'Visitor') AS actor_email,event_type,summary,created_at,
        booking_id,booking_link_id,'workspace' AS source
      FROM activity_events
      UNION ALL
      SELECT id,actor_email,event_type,summary,created_at,
        NULL AS booking_id,NULL AS booking_link_id,'team' AS source
      FROM user_activity_events`;
    const [count, result, actors] = await Promise.all([
      env.DB.prepare(`SELECT COUNT(*) AS count FROM (${union}) ${where}`)
        .bind(...values)
        .first<{ count: number }>(),
      env.DB.prepare(
        `SELECT * FROM (${union}) ${where} ORDER BY created_at DESC LIMIT ? OFFSET ?`,
      )
        .bind(...values, pageSize, (page - 1) * pageSize)
        .all(),
      env.DB.prepare(
        `SELECT DISTINCT actor_email FROM (${union}) WHERE actor_email IS NOT NULL ORDER BY actor_email`,
      ).all<{ actor_email: string }>(),
    ]);
    const total = Number(count?.count || 0);
    return json({
      activity: result.results,
      actors: actors.results.map((row) => row.actor_email),
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.max(1, Math.ceil(total / pageSize)),
      },
    });
  }
  if (path === "/api/admin/links" && request.method === "GET") {
    const result = await env.DB.prepare(
      `SELECT l.*,
      (SELECT COUNT(*) FROM bookings b WHERE b.booking_link_id=l.id) AS response_count,
      (SELECT COUNT(*) FROM bookings b WHERE b.booking_link_id=l.id AND b.workflow_status IN ('new','under_review','awaiting_visitor','rescheduling')) AS pending_count,
      (SELECT COUNT(*) FROM bookings b WHERE b.booking_link_id=l.id AND b.workflow_status='confirmed') AS confirmed_count
      FROM booking_links l ORDER BY l.created_at DESC`,
    ).all<LinkRow>();
    return json({ links: result.results.map((link) => normalizeLink(link)) });
  }
  if (path === "/api/admin/links" && request.method === "POST") {
    const input = await parseLinkInput(request);
    if (!input)
      return json(
        {
          error:
            "Complete the link details and add at least one valid availability window.",
        },
        400,
      );
    const id = crypto.randomUUID();
    const now = new Date().toISOString();
    try {
      await env.DB.prepare(
        `INSERT INTO booking_links (id,slug,internal_name,title,description,duration_minutes,slot_interval_minutes,buffer_minutes,time_zone,days_ahead,minimum_notice_hours,valid_from,valid_until,status,allow_slot_holds,allow_custom_meeting_title,allow_additional_attendees,created_by,created_at,updated_at)
        VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
      )
        .bind(
          id,
          input.slug,
          input.internalName,
          input.title,
          input.description || null,
          input.durationMinutes,
          input.slotIntervalMinutes,
          input.bufferMinutes,
          input.timeZone,
          input.daysAhead,
          input.minimumNoticeHours,
          input.validFrom,
          input.validUntil,
          input.status,
          input.allowSlotHolds ? 1 : 0,
          input.allowCustomMeetingTitle ? 1 : 0,
          input.allowAdditionalAttendees ? 1 : 0,
          actor,
          now,
          now,
        )
        .run();
    } catch (error) {
      if (String(error).includes("UNIQUE"))
        return json({ error: "That URL slug is already in use." }, 409);
      throw error;
    }
    await saveRules(env, id, input.availability);
    await recordActivity(env, {
      linkId: id,
      actor,
      type: "link.created",
      summary: `Created booking link “${input.internalName}”`,
    });
    return json({ id }, 201);
  }
  const linkMatch = path.match(/^\/api\/admin\/links\/([^/]+)$/);
  if (linkMatch) {
    const id = decodeURIComponent(linkMatch[1]);
    const link = await getLink(env, id);
    if (!link) return json({ error: "Booking link not found." }, 404);
    if (request.method === "GET")
      return json({ link: normalizeLink(link, await getRules(env, id)) });
    if (request.method === "DELETE") {
      const mode = url.searchParams.get("mode");
      if (mode === "archive") {
        await env.DB.prepare(
          "UPDATE booking_links SET status='archived',updated_at=? WHERE id=?",
        )
          .bind(new Date().toISOString(), id)
          .run();
        await recordActivity(env, {
          linkId: id,
          actor,
          type: "link.archived",
          summary: `Archived booking link “${link.internal_name}”`,
        });
        return json({ deleted: false, archived: true });
      }
      if (mode !== "delete")
        return json({ error: "Choose archive or permanent deletion." }, 400);
      await env.DB.batch(linkDeletionStatements(env, id));
      await recordUserActivity(
        env,
        actor,
        "link.deleted",
        `Permanently deleted booking link “${link.internal_name}” and its connected data`,
      );
      return json({ deleted: true, archived: false });
    }
    if (request.method === "PATCH") {
      const input = await parseLinkInput(request);
      if (!input)
        return json(
          { error: "Complete the link details and availability." },
          400,
        );
      try {
        await env.DB.prepare(
          `UPDATE booking_links SET slug=?,internal_name=?,title=?,description=?,duration_minutes=?,slot_interval_minutes=?,buffer_minutes=?,time_zone=?,days_ahead=?,minimum_notice_hours=?,valid_from=?,valid_until=?,status=?,allow_slot_holds=?,allow_custom_meeting_title=?,allow_additional_attendees=?,updated_at=? WHERE id=?`,
        )
          .bind(
            input.slug,
            input.internalName,
            input.title,
            input.description || null,
            input.durationMinutes,
            input.slotIntervalMinutes,
            input.bufferMinutes,
            input.timeZone,
            input.daysAhead,
            input.minimumNoticeHours,
            input.validFrom,
            input.validUntil,
            input.status,
            input.allowSlotHolds ? 1 : 0,
            input.allowCustomMeetingTitle ? 1 : 0,
            input.allowAdditionalAttendees ? 1 : 0,
            new Date().toISOString(),
            id,
          )
          .run();
      } catch (error) {
        if (String(error).includes("UNIQUE"))
          return json({ error: "That URL slug is already in use." }, 409);
        throw error;
      }
      await saveRules(env, id, input.availability);
      await recordActivity(env, {
        linkId: id,
        actor,
        type: "link.updated",
        summary: `Updated booking link “${input.internalName}”`,
      });
      return json({
        link: normalizeLink((await getLink(env, id))!, await getRules(env, id)),
      });
    }
  }
  const analyticsMatch = path.match(
    /^\/api\/admin\/links\/([^/]+)\/analytics$/,
  );
  if (analyticsMatch && request.method === "GET") {
    const id = decodeURIComponent(analyticsMatch[1]);
    const [summary, statuses, daily] = await Promise.all([
      env.DB.prepare(
        `SELECT
        (SELECT COUNT(*) FROM link_page_views WHERE booking_link_id=?) AS views,
        (SELECT COUNT(*) FROM bookings WHERE booking_link_id=?) AS responses,
        (SELECT COUNT(*) FROM bookings WHERE booking_link_id=? AND workflow_status='confirmed') AS confirmed`,
      )
        .bind(id, id, id)
        .first<Record<string, number>>(),
      env.DB.prepare(
        "SELECT workflow_status AS status,COUNT(*) AS count FROM bookings WHERE booking_link_id=? GROUP BY workflow_status",
      )
        .bind(id)
        .all(),
      env.DB.prepare(
        "SELECT substr(created_at,1,10) AS date,COUNT(*) AS count FROM bookings WHERE booking_link_id=? AND created_at>=datetime('now','-30 days') GROUP BY substr(created_at,1,10) ORDER BY date",
      )
        .bind(id)
        .all(),
    ]);
    const views = Number(summary?.views || 0);
    const responses = Number(summary?.responses || 0);
    return json({
      summary: {
        ...summary,
        conversionRate: views ? Math.round((responses / views) * 1000) / 10 : 0,
      },
      statuses: statuses.results,
      daily: daily.results,
    });
  }
  if (path === "/api/admin/bookings/bulk" && request.method === "PATCH") {
    if (user.role === "viewer")
      return json({ error: "View-only members cannot change requests." }, 403);
    const body = await request
      .json<Record<string, unknown>>()
      .catch(() => ({}) as Record<string, unknown>);
    const ids = Array.isArray(body.ids)
      ? body.ids
          .map((id) => safeText(id, 50))
          .filter(Boolean)
          .slice(0, 100)
      : [];
    const status = safeText(body.status, 30) as WorkflowStatus;
    const assignedTo =
      user.role === "member" ? user.email : safeText(body.assignedTo, 254);
    if (!ids.length || (!WORKFLOW_STATUSES.has(status) && !assignedTo))
      return json({ error: "Choose requests and a valid action." }, 400);
    const statements = ids.map((id) => {
      const memberScope =
        user.role === "member"
          ? " AND (assigned_to IS NULL OR assigned_to=? COLLATE NOCASE)"
          : "";
      const parameters =
        status && WORKFLOW_STATUSES.has(status)
          ? [status, assignedTo, new Date().toISOString(), id]
          : [assignedTo, new Date().toISOString(), id];
      if (user.role === "member") parameters.push(user.email);
      return env.DB.prepare(
        status && WORKFLOW_STATUSES.has(status)
          ? `UPDATE bookings SET workflow_status=?,assigned_to=COALESCE(NULLIF(?,''),assigned_to),updated_at=? WHERE id=?${memberScope}`
          : `UPDATE bookings SET assigned_to=?,updated_at=? WHERE id=?${memberScope}`,
      ).bind(...parameters);
    });
    const updates = await env.DB.batch(statements);
    const updated = updates.reduce(
      (total, result) => total + Number(result.meta.changes || 0),
      0,
    );
    await recordUserActivity(
      env,
      actor,
      "bookings.bulk_updated",
      `Updated ${updated} meeting requests`,
    );
    return json({ success: true, updated });
  }
  if (path === "/api/admin/bookings" && request.method === "GET") {
    const status = safeText(url.searchParams.get("status"), 30);
    const linkId = safeText(url.searchParams.get("link"), 50);
    const search = safeText(url.searchParams.get("q"), 120);
    const page = safeNumber(url.searchParams.get("page"), 1, 1, 100000);
    const pageSize = safeNumber(url.searchParams.get("pageSize"), 20, 5, 100);
    const clauses: string[] = [];
    const values: Array<string | number> = [];
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
    const where = clauses.length ? `WHERE ${clauses.join(" AND ")}` : "";
    const count = await env.DB.prepare(
      `SELECT COUNT(*) AS count FROM bookings b LEFT JOIN booking_links l ON l.id=b.booking_link_id ${where}`,
    )
      .bind(...values)
      .first<{ count: number }>();
    const result = await env.DB.prepare(
      `SELECT b.*, l.title AS link_title, l.slug AS link_slug,
      (SELECT COUNT(*) FROM email_events e WHERE e.booking_id=b.id AND e.status='sent') AS email_count,
      (SELECT MAX(created_at) FROM email_events e WHERE e.booking_id=b.id AND e.status='sent') AS latest_email_at
      FROM bookings b LEFT JOIN booking_links l ON l.id=b.booking_link_id ${where} ORDER BY b.created_at DESC LIMIT ? OFFSET ?`,
    )
      .bind(...values, pageSize, (page - 1) * pageSize)
      .all<BookingRow>();
    const total = Number(count?.count || 0);
    return json({
      bookings: result.results.map(normalizeBooking),
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.max(1, Math.ceil(total / pageSize)),
      },
    });
  }
  const meetingResponse = await meetingAdminRoute(request, env, path, user);
  if (meetingResponse) return meetingResponse;
  const bookingResponse = await bookingAdminRoute(request, env, path, user);
  if (bookingResponse) return bookingResponse;
  return json({ error: "Not found." }, 404);
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    const path = url.pathname;
    try {
      const oauthResponse = await oauthCallbackRoute(request, env, path);
      if (oauthResponse) return oauthResponse;
      const publicMatch = path.match(/^\/api\/public\/links\/([^/]+)$/);
      if (publicMatch)
        return publicLink(request, env, decodeURIComponent(publicMatch[1]));
      const feedbackMatch = path.match(
        /^\/api\/public\/manage\/([^/]+)\/feedback$/,
      );
      if (feedbackMatch)
        return submitFeedback(
          request,
          env,
          decodeURIComponent(feedbackMatch[1]),
        );
      const manageMatch = path.match(/^\/api\/public\/manage\/([^/]+)$/);
      if (manageMatch)
        return manageBooking(request, env, decodeURIComponent(manageMatch[1]));
      if (path.startsWith("/api/admin/"))
        return adminRoutes(request, env, path, url);
      if (path === "/api/config" && request.method === "GET") {
        const legacy = new Request(
          request.url.replace("/api/config", "/api/public/links/consultation"),
          request,
        );
        return publicLink(legacy, env, "consultation");
      }
      if (path === "/api/public/brand" && request.method === "GET") {
        const workspaceBrand = await getWorkspaceBrand(env);
        return json(workspaceBrand);
      }
      const brandAsset = path.match(/^\/api\/public\/brand-assets\/(.+)$/);
      if (brandAsset && request.method === "GET") {
        return serveBrandAsset(env, brandAsset[1]);
      }
      if (path === "/api/bookings" && request.method === "POST")
        return publicLink(request, env, "consultation");
      return json({ error: "Not found." }, 404);
    } catch (error) {
      console.error(error);
      return json({ error: "Unexpected server error." }, 500);
    }
  },
  async scheduled(_controller: ScheduledController, env: Env): Promise<void> {
    await cleanupRetainedData(env);
  },
} satisfies ExportedHandler<Env>;

export { NotificationHub } from "./notification-hub";

export {
  authorizeAdmin,
  deviceType,
  emailContent,
  meetingOwner,
  slotsForSchedule,
} from "./domain";
export { can } from "./public-routes";
