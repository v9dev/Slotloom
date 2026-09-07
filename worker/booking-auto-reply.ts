import {
  EMAIL_TEMPLATES,
  json,
  recordUserActivity,
  safeText,
  type BookingRow,
  type Env,
  type WorkspaceUser,
} from "./domain";
import { sendAndLog } from "./email-delivery";

const ENABLED_SETTING = "booking_auto_reply_enabled";
const TEMPLATE_SETTING = "booking_auto_reply_template";
export const DEFAULT_BOOKING_AUTO_REPLY_TEMPLATE = "received";

export type BookingAutoReplySettings = {
  enabled: boolean;
  templateKey: string;
};

export function resolveBookingAutoReplySettings(
  rows: Array<{ setting_key: string; setting_value: string }>,
): BookingAutoReplySettings {
  const values = Object.fromEntries(
    rows.map((row) => [row.setting_key, row.setting_value]),
  );
  const configuredTemplate = values[TEMPLATE_SETTING];
  return {
    enabled:
      values[ENABLED_SETTING] === undefined ||
      values[ENABLED_SETTING] === "true",
    templateKey:
      configuredTemplate && EMAIL_TEMPLATES.has(configuredTemplate)
        ? configuredTemplate
        : DEFAULT_BOOKING_AUTO_REPLY_TEMPLATE,
  };
}

export async function getBookingAutoReplySettings(
  env: Env,
): Promise<BookingAutoReplySettings> {
  const rows = await env.DB.prepare(
    "SELECT setting_key,setting_value FROM workspace_settings WHERE setting_key IN ('booking_auto_reply_enabled','booking_auto_reply_template')",
  ).all<{ setting_key: string; setting_value: string }>();
  return resolveBookingAutoReplySettings(rows.results);
}

export async function sendBookingAutoReply(env: Env, booking: BookingRow) {
  const settings = await getBookingAutoReplySettings(env);
  if (!settings.enabled) return null;
  const template = await env.DB.prepare(
    "SELECT enabled FROM email_templates WHERE template_key=?",
  )
    .bind(settings.templateKey)
    .first<{ enabled: number }>();
  if (!template?.enabled) return null;
  return sendAndLog(env, booking, settings.templateKey);
}

export async function bookingAutoReplyAdminRoute(
  request: Request,
  env: Env,
  path: string,
  user: WorkspaceUser,
): Promise<Response | null> {
  if (path !== "/api/admin/booking-auto-reply") return null;
  if (request.method === "GET")
    return json(await getBookingAutoReplySettings(env));
  if (request.method !== "PATCH")
    return json({ error: "Method not allowed." }, 405);
  if (user.role !== "owner" && user.role !== "admin")
    return json(
      { error: "Only workspace owners and admins can manage auto-replies." },
      403,
    );

  const body = await request.json<Record<string, unknown>>().catch(() => null);
  if (!body || typeof body.enabled !== "boolean")
    return json(
      { error: "Choose whether automatic replies are enabled." },
      400,
    );
  const templateKey = safeText(body.templateKey, 80);
  if (!EMAIL_TEMPLATES.has(templateKey))
    return json({ error: "Choose a valid email template." }, 400);
  const template = await env.DB.prepare(
    "SELECT name,enabled FROM email_templates WHERE template_key=?",
  )
    .bind(templateKey)
    .first<{ name: string; enabled: number }>();
  if (!template) return json({ error: "Email template not found." }, 404);
  if (body.enabled && !template.enabled)
    return json(
      { error: "Enable the selected email template before using it." },
      409,
    );

  const updatedAt = new Date().toISOString();
  await env.DB.batch([
    env.DB.prepare(
      `INSERT INTO workspace_settings (setting_key,setting_value,updated_by,updated_at)
       VALUES ('booking_auto_reply_enabled',?,?,?)
       ON CONFLICT(setting_key) DO UPDATE SET setting_value=excluded.setting_value,updated_by=excluded.updated_by,updated_at=excluded.updated_at`,
    ).bind(String(body.enabled), user.email, updatedAt),
    env.DB.prepare(
      `INSERT INTO workspace_settings (setting_key,setting_value,updated_by,updated_at)
       VALUES ('booking_auto_reply_template',?,?,?)
       ON CONFLICT(setting_key) DO UPDATE SET setting_value=excluded.setting_value,updated_by=excluded.updated_by,updated_at=excluded.updated_at`,
    ).bind(templateKey, user.email, updatedAt),
  ]);
  await recordUserActivity(
    env,
    user.email,
    "email.auto_reply_updated",
    body.enabled
      ? `Enabled automatic booking replies using ${template.name}`
      : "Disabled automatic booking replies",
  );
  return json({
    success: true,
    enabled: body.enabled,
    templateKey,
  });
}
