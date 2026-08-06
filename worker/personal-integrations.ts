import {
  beginOAuth,
  disconnectProvider,
  type CalendarProvider,
  type ConnectionRow,
} from "./calendar-integrations";
import { calendarOAuthStartResponse } from "./calendar-oauth-urls";
import {
  json,
  recordUserActivity,
  type Env,
  type WorkspaceUser,
} from "./domain";
import { IntegrationError } from "./calendar-errors";
import { grantsMailSend } from "./oauth-scopes";
import { oauthEncryptionReady } from "./secret-crypto";

const providers = ["google", "microsoft"] as const;
const labels: Record<CalendarProvider, string> = {
  google: "Google",
  microsoft: "Microsoft",
};

async function personalOverview(env: Env, user: WorkspaceUser) {
  const [configs, connections] = await Promise.all([
    env.DB.prepare(
      "SELECT provider FROM calendar_provider_configs ORDER BY provider",
    ).all<{ provider: CalendarProvider }>(),
    env.DB.prepare(
      "SELECT * FROM calendar_connections WHERE workspace_user_email=? COLLATE NOCASE ORDER BY provider",
    )
      .bind(user.email)
      .all<ConnectionRow>(),
  ]);
  const configured = new Set(configs.results.map((row) => row.provider));
  return {
    encryptionReady: oauthEncryptionReady(env.OAUTH_ENCRYPTION_KEY),
    preference: user.email_provider_preference || "auto",
    providers: providers.map((provider) => {
      const connection = connections.results.find(
        (candidate) => candidate.provider === provider,
      );
      return {
        provider,
        label: labels[provider],
        configured: configured.has(provider),
        connection: connection
          ? {
              providerEmail: connection.provider_email,
              status: connection.status,
              mailCapable: grantsMailSend(provider, connection.scopes),
              updatedAt: connection.updated_at,
            }
          : null,
      };
    }),
  };
}

export async function personalIntegrationRoute(
  request: Request,
  env: Env,
  path: string,
  user: WorkspaceUser,
): Promise<Response | null> {
  if (!path.startsWith("/api/admin/connections")) return null;
  try {
    if (user.role === "viewer")
      throw new IntegrationError(
        "View-only members cannot connect provider accounts.",
        403,
      );
    if (path === "/api/admin/connections" && request.method === "GET")
      return json(await personalOverview(env, user));
    if (
      path === "/api/admin/connections/preference" &&
      request.method === "PATCH"
    ) {
      const body: unknown = await request.json().catch(() => null);
      const value =
        body && typeof body === "object" && "provider" in body
          ? String(body.provider || "")
          : "";
      if (!["auto", "google", "microsoft"].includes(value))
        throw new IntegrationError("Choose a valid personal email sender.");
      if (value !== "auto") {
        const connection = await env.DB.prepare(
          "SELECT scopes FROM calendar_connections WHERE provider=? AND workspace_user_email=? COLLATE NOCASE AND status='active'",
        )
          .bind(value, user.email)
          .first<{ scopes: string }>();
        if (
          !connection ||
          !grantsMailSend(value as CalendarProvider, connection.scopes)
        )
          throw new IntegrationError(
            `Connect ${labels[value as CalendarProvider]} with email permission first.`,
            409,
          );
      }
      await env.DB.prepare(
        "UPDATE workspace_users SET email_provider_preference=?,updated_at=? WHERE email=? COLLATE NOCASE",
      )
        .bind(value, new Date().toISOString(), user.email)
        .run();
      await recordUserActivity(
        env,
        user.email,
        "email.preference_updated",
        `Selected ${value === "auto" ? "automatic" : labels[value as CalendarProvider]} personal email delivery`,
      );
      return json({ success: true });
    }
    const match = path.match(
      /^\/api\/admin\/connections\/(google|microsoft)\/(connect|disconnect)$/,
    );
    if (!match) return json({ error: "Not found." }, 404);
    const provider = match[1] as CalendarProvider;
    if (match[2] === "connect" && request.method === "POST") {
      const body: unknown = await request.json().catch(() => null);
      const started = await beginOAuth(env, provider, user, {
        includeMail:
          typeof body === "object" &&
          body !== null &&
          !Array.isArray(body) &&
          (body as Record<string, unknown>).includeMail === true,
        returnTarget: "connections",
      });
      return calendarOAuthStartResponse(
        env,
        provider,
        started.state,
        started.authorizationUrl,
      );
    }
    if (match[2] === "disconnect" && request.method === "POST") {
      await disconnectProvider(env, provider, user);
      if (user.email_provider_preference === provider)
        await env.DB.prepare(
          "UPDATE workspace_users SET email_provider_preference='auto',updated_at=? WHERE email=? COLLATE NOCASE",
        )
          .bind(new Date().toISOString(), user.email)
          .run();
      return json({ success: true });
    }
    return json({ error: "Method not allowed." }, 405);
  } catch (error) {
    if (error instanceof IntegrationError)
      return json({ error: error.message }, error.status);
    console.error("Personal integration operation failed", {
      reason: error instanceof Error ? error.name : "unknown",
    });
    return json({ error: "Personal integration operation failed." }, 500);
  }
}
