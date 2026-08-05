import type { BookingRow, Env } from "./domain";

export type SelectedCalendarProvider = "google" | "microsoft";

export type SelectedCalendarConnection = {
  id: string;
  provider: SelectedCalendarProvider;
  workspace_user_email: string;
  provider_user_id: string;
  provider_email: string;
  access_token_jwe: string;
  refresh_token_jwe: string | null;
  token_expires_at: string;
  scopes: string;
  status: "active" | "error";
  last_error: string | null;
  created_at: string;
  updated_at: string;
};

const isProvider = (value: string): value is SelectedCalendarProvider =>
  value === "google" || value === "microsoft";

export async function meetingProviderForBooking(env: Env, booking: BookingRow) {
  const preference = booking.meeting_provider_preference || "workspace";
  if (isProvider(preference)) return preference;
  if (preference === "manual") return null;
  const setting = await env.DB.prepare(
    "SELECT setting_value FROM workspace_settings WHERE setting_key='calendar_provider'",
  ).first<{ setting_value: string }>();
  const value = setting?.setting_value || "";
  return isProvider(value) ? value : null;
}

export async function connectionForMeeting(
  env: Env,
  provider: SelectedCalendarProvider,
  organizerEmail: string,
) {
  const own = await env.DB.prepare(
    "SELECT * FROM calendar_connections WHERE provider=? AND workspace_user_email=? COLLATE NOCASE AND status='active'",
  )
    .bind(provider, organizerEmail)
    .first<SelectedCalendarConnection>();
  if (own) return { connection: own, usedOwnerFallback: false };

  const owner = await env.DB.prepare(
    `SELECT c.* FROM calendar_connections c
     JOIN workspace_users u ON u.email=c.workspace_user_email COLLATE NOCASE
     WHERE c.provider=? AND c.status='active' AND u.role='owner' AND u.status='active'
     ORDER BY CASE WHEN c.workspace_user_email=? COLLATE NOCASE THEN 0 ELSE 1 END,u.created_at
     LIMIT 1`,
  )
    .bind(provider, env.BOOTSTRAP_OWNER_EMAIL || "")
    .first<SelectedCalendarConnection>();
  return { connection: owner, usedOwnerFallback: Boolean(owner) };
}
