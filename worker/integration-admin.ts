import {
  beginOAuth,
  deleteProviderConfig,
  disconnectProvider,
  integrationOverview,
  providerConfig,
  saveProviderConfig,
  type CalendarProvider,
} from "./calendar-integrations";
import { calendarOAuthStartResponse } from "./calendar-oauth-urls";
import { json, safeText, type Env, type WorkspaceUser } from "./domain";
import { IntegrationError } from "./calendar-errors";

const providerLabels: Record<CalendarProvider, string> = {
  google: "Google Meet",
  microsoft: "Microsoft Teams",
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);
const isProvider = (value: string): value is CalendarProvider =>
  value === "google" || value === "microsoft";

async function workspaceOverview(env: Env, user: WorkspaceUser) {
  const [overview, fallback] = await Promise.all([
    integrationOverview(env, user),
    env.DB.prepare(
      "SELECT setting_value FROM workspace_settings WHERE setting_key='calendar_owner_fallback_enabled'",
    ).first<{ setting_value: string }>(),
  ]);
  return {
    ...overview,
    ownerFallbackEnabled: fallback?.setting_value !== "false",
  };
}

export async function integrationAdminRoute(
  request: Request,
  env: Env,
  path: string,
  user: WorkspaceUser,
): Promise<Response | null> {
  if (!path.startsWith("/api/admin/integrations")) return null;
  try {
    if (!["owner", "admin"].includes(user.role))
      throw new IntegrationError(
        "Only workspace owners and admins can view integration settings.",
        403,
      );
    if (path === "/api/admin/integrations" && request.method === "GET")
      return json(await workspaceOverview(env, user));
    if (
      path === "/api/admin/integrations/default" &&
      request.method === "PATCH"
    ) {
      if (user.role !== "owner")
        throw new IntegrationError(
          "Only workspace owners can choose the meeting provider.",
          403,
        );
      const body: unknown = await request.json().catch(() => null);
      const value = isRecord(body) ? safeText(body.provider, 20) : "";
      if (!["manual", "google", "microsoft"].includes(value))
        throw new IntegrationError("Choose a valid meeting provider.");
      if (isProvider(value) && !(await providerConfig(env, value)))
        throw new IntegrationError(
          `Configure ${providerLabels[value]} before making it the default.`,
        );
      await env.DB.prepare(
        `INSERT INTO workspace_settings (setting_key,setting_value,updated_by,updated_at)
         VALUES ('calendar_provider',?,?,?)
         ON CONFLICT(setting_key) DO UPDATE SET setting_value=excluded.setting_value,updated_by=excluded.updated_by,updated_at=excluded.updated_at`,
      )
        .bind(value, user.email, new Date().toISOString())
        .run();
      return json({ success: true });
    }
    if (
      path === "/api/admin/integrations/calendar-fallback" &&
      request.method === "PATCH"
    ) {
      if (user.role !== "owner")
        throw new IntegrationError(
          "Only workspace owners can change calendar fallback.",
          403,
        );
      const body: unknown = await request.json().catch(() => null);
      const enabled = isRecord(body) && body.enabled === true;
      await env.DB.prepare(
        `INSERT INTO workspace_settings (setting_key,setting_value,updated_by,updated_at)
         VALUES ('calendar_owner_fallback_enabled',?,?,?)
         ON CONFLICT(setting_key) DO UPDATE SET setting_value=excluded.setting_value,updated_by=excluded.updated_by,updated_at=excluded.updated_at`,
      )
        .bind(String(enabled), user.email, new Date().toISOString())
        .run();
      return json({ success: true });
    }
    const match = path.match(
      /^\/api\/admin\/integrations\/(google|microsoft)\/(config|connect|disconnect)$/,
    );
    if (!match) return json({ error: "Not found." }, 404);
    const provider = match[1] as CalendarProvider;
    const action = match[2];
    if (action === "config") {
      if (user.role !== "owner")
        throw new IntegrationError(
          "Only workspace owners can manage provider credentials.",
          403,
        );
      if (request.method === "PUT") {
        await saveProviderConfig(request, env, provider, user.email);
        return json({ success: true });
      }
      if (request.method === "DELETE") {
        await deleteProviderConfig(env, provider, user.email);
        return json({ success: true });
      }
    }
    if (action === "connect" && request.method === "POST") {
      const body: unknown = await request.json().catch(() => null);
      const started = await beginOAuth(env, provider, user, {
        includeMail: isRecord(body) && body.includeMail === true,
        returnTarget: "integrations",
      });
      return calendarOAuthStartResponse(
        env,
        provider,
        started.state,
        started.authorizationUrl,
      );
    }
    if (action === "disconnect" && request.method === "POST") {
      await disconnectProvider(env, provider, user);
      return json({ success: true });
    }
    return json({ error: "Method not allowed." }, 405);
  } catch (error) {
    if (error instanceof IntegrationError)
      return json({ error: error.message }, error.status);
    console.error("Calendar integration operation failed", {
      reason: error instanceof Error ? error.name : "unknown",
    });
    return json({ error: "Calendar integration operation failed." }, 500);
  }
}
