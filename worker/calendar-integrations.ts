import {
  decryptSecret,
  encryptSecret,
  oauthEncryptionReady,
  randomUrlSafe,
  sha256UrlSafe,
} from "./secret-crypto";
import {
  getBooking,
  getWorkspaceBrand,
  json,
  meetingOwner,
  recordUserActivity,
  safeText,
  sha256,
  type BookingRow,
  type Env,
  type WorkspaceUser,
} from "./domain";
import {
  extractGoogleMeetingLink,
  extractMicrosoftMeetingLink,
  googleEventBody,
  microsoftEventBody,
} from "./calendar-event-data";
import {
  connectionForMeeting,
  meetingProviderForBooking,
  type SelectedCalendarConnection,
} from "./calendar-connection-selection";
import {
  calendarOAuthCallbackUrl,
  calendarOAuthRedirect,
  readCalendarOAuthState,
  type OAuthReturnTarget,
} from "./calendar-oauth-urls";
import { IntegrationError, providerCalendarFailure } from "./calendar-errors";
import { grantsMailSend, oauthScopes } from "./oauth-scopes";
import { listMeetingAttendees } from "./meeting-attendees";

export { extractGoogleMeetingLink, extractMicrosoftMeetingLink };
export type CalendarProvider = "google" | "microsoft";
type ProviderConfigRow = {
  provider: CalendarProvider;
  client_id: string;
  client_secret_jwe: string;
  tenant_id: string | null;
  created_at: string;
  updated_at: string;
  updated_by: string;
};
export type ConnectionRow = SelectedCalendarConnection;
type OAuthStateRow = {
  state_hash: string;
  provider: CalendarProvider;
  workspace_user_email: string;
  code_verifier_jwe: string;
  requested_scopes: string;
  return_target: OAuthReturnTarget;
  expires_at: string;
};
type ProviderProfile = { id: string; email: string };
type ExternalMeeting = { id: string; url: string | null };
const providerLabels: Record<CalendarProvider, string> = {
  google: "Google Meet",
  microsoft: "Microsoft Teams",
};
const providerFailure = (provider: CalendarProvider, response: Response) =>
  providerCalendarFailure(providerLabels[provider], response);
const isProvider = (value: string): value is CalendarProvider =>
  value === "google" || value === "microsoft";

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const stringValue = (value: unknown) =>
  typeof value === "string" ? value : "";

const numberValue = (value: unknown, fallback: number) =>
  typeof value === "number" && Number.isFinite(value) ? value : fallback;
async function responseObject(response: Response) {
  const value: unknown = await response.json().catch(() => null);
  return isRecord(value) ? value : {};
}

export async function providerConfig(env: Env, provider: CalendarProvider) {
  return env.DB.prepare(
    "SELECT * FROM calendar_provider_configs WHERE provider=?",
  )
    .bind(provider)
    .first<ProviderConfigRow>();
}

async function connectionById(env: Env, id: string) {
  return env.DB.prepare("SELECT * FROM calendar_connections WHERE id=?")
    .bind(id)
    .first<ConnectionRow>();
}

async function organizerConnection(
  env: Env,
  provider: CalendarProvider,
  workspaceEmail: string,
) {
  return env.DB.prepare(
    "SELECT * FROM calendar_connections WHERE provider=? AND workspace_user_email=? COLLATE NOCASE",
  )
    .bind(provider, workspaceEmail)
    .first<ConnectionRow>();
}

export async function saveProviderConfig(
  request: Request,
  env: Env,
  provider: CalendarProvider,
  actor: string,
) {
  const body: unknown = await request.json().catch(() => null);
  const input = isRecord(body) ? body : {};
  const current = await providerConfig(env, provider);
  const clientId = safeText(input.clientId, 500);
  const clientSecret = safeText(input.clientSecret, 4000);
  const tenantId = safeText(input.tenantId, 200);
  if (!clientId) throw new IntegrationError("Enter the provider client ID.");
  if (provider === "microsoft" && !tenantId)
    throw new IntegrationError("Enter the Microsoft directory tenant ID.");
  if (!clientSecret && !current)
    throw new IntegrationError("Enter the provider client secret.");
  if (!oauthEncryptionReady(env.OAUTH_ENCRYPTION_KEY))
    throw new IntegrationError(
      "Add the OAUTH_ENCRYPTION_KEY Worker secret before saving provider credentials.",
      503,
    );

  const encryptedSecret = clientSecret
    ? await encryptSecret(clientSecret, env.OAUTH_ENCRYPTION_KEY)
    : current!.client_secret_jwe;
  const now = new Date().toISOString();
  await env.DB.prepare(
    `INSERT INTO calendar_provider_configs
      (provider,client_id,client_secret_jwe,tenant_id,created_at,updated_at,updated_by)
     VALUES (?,?,?,?,?,?,?)
     ON CONFLICT(provider) DO UPDATE SET
      client_id=excluded.client_id,
      client_secret_jwe=excluded.client_secret_jwe,
      tenant_id=excluded.tenant_id,
      updated_at=excluded.updated_at,
      updated_by=excluded.updated_by`,
  )
    .bind(
      provider,
      clientId,
      encryptedSecret,
      provider === "microsoft" ? tenantId : null,
      current?.created_at || now,
      now,
      actor,
    )
    .run();
  await recordUserActivity(
    env,
    actor,
    "calendar.configured",
    `Configured ${providerLabels[provider]}`,
  );
}

export async function deleteProviderConfig(
  env: Env,
  provider: CalendarProvider,
  actor: string,
) {
  const emailMethod = await env.DB.prepare(
    "SELECT setting_value FROM workspace_settings WHERE setting_key IN ('email_fallback_method','email_delivery_method') ORDER BY CASE setting_key WHEN 'email_fallback_method' THEN 0 ELSE 1 END LIMIT 1",
  ).first<{ setting_value: string }>();
  if (emailMethod?.setting_value === provider)
    throw new IntegrationError(
      `Choose another email delivery method before removing ${providerLabels[provider]}.`,
      409,
    );
  await env.DB.batch([
    env.DB.prepare("DELETE FROM calendar_oauth_states WHERE provider=?").bind(
      provider,
    ),
    env.DB.prepare("DELETE FROM calendar_connections WHERE provider=?").bind(
      provider,
    ),
    env.DB.prepare(
      "DELETE FROM calendar_provider_configs WHERE provider=?",
    ).bind(provider),
    env.DB.prepare(
      "UPDATE workspace_settings SET setting_value='manual',updated_by=?,updated_at=? WHERE setting_key='calendar_provider' AND setting_value=?",
    ).bind(actor, new Date().toISOString(), provider),
  ]);
  await recordUserActivity(
    env,
    actor,
    "calendar.removed",
    `Removed ${providerLabels[provider]} configuration and local connections`,
  );
}

export async function integrationOverview(env: Env, user: WorkspaceUser) {
  const [configs, connections, setting] = await Promise.all([
    env.DB.prepare(
      "SELECT * FROM calendar_provider_configs ORDER BY provider",
    ).all<ProviderConfigRow>(),
    env.DB.prepare(
      user.role === "owner"
        ? "SELECT * FROM calendar_connections ORDER BY provider,workspace_user_email"
        : "SELECT * FROM calendar_connections WHERE workspace_user_email=? COLLATE NOCASE ORDER BY provider",
    )
      .bind(...(user.role === "owner" ? [] : [user.email]))
      .all<ConnectionRow>(),
    env.DB.prepare(
      "SELECT setting_value FROM workspace_settings WHERE setting_key='calendar_provider'",
    ).first<{ setting_value: string }>(),
  ]);
  const byProvider = new Map(configs.results.map((row) => [row.provider, row]));
  return {
    encryptionReady: oauthEncryptionReady(env.OAUTH_ENCRYPTION_KEY),
    defaultProvider: setting?.setting_value || "manual",
    canManageConfig: user.role === "owner",
    currentUserEmail: user.email,
    providers: (["google", "microsoft"] as const).map((provider) => {
      const config = byProvider.get(provider);
      return {
        provider,
        label: providerLabels[provider],
        configured: Boolean(config),
        clientId: user.role === "owner" ? config?.client_id || "" : "",
        tenantId: user.role === "owner" ? config?.tenant_id || "" : "",
        hasClientSecret: Boolean(config?.client_secret_jwe),
        callbackUrl: calendarOAuthCallbackUrl(env, provider),
        connections: connections.results
          .filter((connection) => connection.provider === provider)
          .map((connection) => ({
            id: connection.id,
            workspaceUserEmail: connection.workspace_user_email,
            providerEmail: connection.provider_email,
            status: connection.status,
            expiresAt: connection.token_expires_at,
            updatedAt: connection.updated_at,
            isCurrentUser:
              connection.workspace_user_email.toLowerCase() ===
              user.email.toLowerCase(),
            mailCapable: grantsMailSend(provider, connection.scopes),
          })),
      };
    }),
  };
}

export async function beginOAuth(
  env: Env,
  provider: CalendarProvider,
  user: WorkspaceUser,
  options: {
    includeMail?: boolean;
    returnTarget?: OAuthReturnTarget;
  } = {},
) {
  if (user.role === "viewer")
    throw new IntegrationError(
      "View-only members cannot connect a calendar account.",
      403,
    );
  const config = await providerConfig(env, provider);
  if (!config)
    throw new IntegrationError(
      `${providerLabels[provider]} credentials have not been configured.`,
      409,
    );
  if (!oauthEncryptionReady(env.OAUTH_ENCRYPTION_KEY))
    throw new IntegrationError(
      "OAuth encryption is not configured on the Worker.",
      503,
    );
  const state = randomUrlSafe(32);
  const verifier = randomUrlSafe(48);
  const challenge = await sha256UrlSafe(verifier);
  const stateHash = await sha256UrlSafe(state);
  const encryptedVerifier = await encryptSecret(
    verifier,
    env.OAUTH_ENCRYPTION_KEY,
  );
  const requestedScopes = oauthScopes(provider, options.includeMail);
  const returnTarget = options.returnTarget || "connections";
  const now = new Date();
  await env.DB.batch([
    env.DB.prepare(
      "DELETE FROM calendar_oauth_states WHERE expires_at<=?",
    ).bind(now.toISOString()),
    env.DB.prepare(
      "DELETE FROM calendar_oauth_states WHERE provider=? AND workspace_user_email=? COLLATE NOCASE",
    ).bind(provider, user.email),
    env.DB.prepare(
      "INSERT INTO calendar_oauth_states (state_hash,provider,workspace_user_email,code_verifier_jwe,requested_scopes,return_target,expires_at,created_at) VALUES (?,?,?,?,?,?,?,?)",
    ).bind(
      stateHash,
      provider,
      user.email,
      encryptedVerifier,
      requestedScopes.join(" "),
      returnTarget,
      new Date(now.getTime() + 10 * 60_000).toISOString(),
      now.toISOString(),
    ),
  ]);

  const tenant = config.tenant_id || "organizations";
  const authorizeUrl = new URL(
    provider === "google"
      ? "https://accounts.google.com/o/oauth2/v2/auth"
      : `https://login.microsoftonline.com/${encodeURIComponent(tenant)}/oauth2/v2.0/authorize`,
  );
  const parameters: Record<string, string> = {
    client_id: config.client_id,
    redirect_uri: calendarOAuthCallbackUrl(env, provider),
    response_type: "code",
    scope: requestedScopes.join(" "),
    state,
    code_challenge: challenge,
    code_challenge_method: "S256",
  };
  if (provider === "google") {
    parameters.access_type = "offline";
    parameters.prompt = "consent";
    parameters.include_granted_scopes = "true";
  } else {
    parameters.response_mode = "query";
    parameters.prompt = "select_account";
  }
  Object.entries(parameters).forEach(([key, value]) =>
    authorizeUrl.searchParams.set(key, value),
  );
  return { authorizationUrl: authorizeUrl.toString(), state };
}

async function exchangeAuthorizationCode(
  env: Env,
  provider: CalendarProvider,
  config: ProviderConfigRow,
  code: string,
  verifier: string,
  requestedScopes: string,
) {
  const secret = await decryptSecret(
    config.client_secret_jwe,
    env.OAUTH_ENCRYPTION_KEY,
  );
  const tenant = config.tenant_id || "organizations";
  const tokenUrl =
    provider === "google"
      ? "https://oauth2.googleapis.com/token"
      : `https://login.microsoftonline.com/${encodeURIComponent(tenant)}/oauth2/v2.0/token`;
  const form = new URLSearchParams({
    client_id: config.client_id,
    client_secret: secret,
    code,
    code_verifier: verifier,
    redirect_uri: calendarOAuthCallbackUrl(env, provider),
    grant_type: "authorization_code",
  });
  if (provider === "microsoft") form.set("scope", requestedScopes);
  const response = await fetch(tokenUrl, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: form,
    signal: AbortSignal.timeout(12_000),
  });
  const body = await responseObject(response);
  if (!response.ok || !stringValue(body.access_token))
    throw new IntegrationError(
      `${providerLabels[provider]} did not accept the authorization code. Start the connection again.`,
      502,
    );
  return body;
}

async function providerProfile(
  provider: CalendarProvider,
  accessToken: string,
): Promise<ProviderProfile> {
  const response = await fetch(
    provider === "google"
      ? "https://openidconnect.googleapis.com/v1/userinfo"
      : "https://graph.microsoft.com/v1.0/me?$select=id,mail,userPrincipalName",
    {
      headers: { authorization: `Bearer ${accessToken}` },
      signal: AbortSignal.timeout(12_000),
    },
  );
  const body = await responseObject(response);
  const id = stringValue(body.id) || stringValue(body.sub);
  const email =
    stringValue(body.email) ||
    stringValue(body.mail) ||
    stringValue(body.userPrincipalName);
  if (!response.ok || !id || !email)
    throw new IntegrationError(
      `Slotloom could not read the ${providerLabels[provider]} account identity.`,
      502,
    );
  return { id, email: email.toLowerCase() };
}

export async function oauthCallbackRoute(
  request: Request,
  env: Env,
  path: string,
): Promise<Response | null> {
  const match = path.match(/^\/api\/oauth\/(google|microsoft)\/callback$/);
  if (!match) return null;
  const provider = match[1] as CalendarProvider;
  if (request.method !== "GET")
    return json({ error: "Method not allowed." }, 405);
  const url = new URL(request.url);
  const state = safeText(url.searchParams.get("state"), 500);
  if (!state)
    return calendarOAuthRedirect(env, provider, "error", "missing_state");
  const stateHash = await sha256UrlSafe(state);
  const browserState = readCalendarOAuthState(request, provider);
  if (!browserState || (await sha256UrlSafe(browserState)) !== stateHash)
    return calendarOAuthRedirect(env, provider, "error", "browser_state");
  const stored = await env.DB.prepare(
    "SELECT * FROM calendar_oauth_states WHERE state_hash=?",
  )
    .bind(stateHash)
    .first<OAuthStateRow>();
  if (!stored || stored.provider !== provider)
    return calendarOAuthRedirect(env, provider, "error", "invalid_state");
  await env.DB.prepare("DELETE FROM calendar_oauth_states WHERE state_hash=?")
    .bind(stateHash)
    .run();
  if (new Date(stored.expires_at).getTime() <= Date.now())
    return calendarOAuthRedirect(
      env,
      provider,
      "error",
      "expired_state",
      stored.return_target,
    );
  if (url.searchParams.has("error"))
    return calendarOAuthRedirect(
      env,
      provider,
      "error",
      "access_denied",
      stored.return_target,
    );
  const code = safeText(url.searchParams.get("code"), 4000);
  if (!code)
    return calendarOAuthRedirect(
      env,
      provider,
      "error",
      "missing_code",
      stored.return_target,
    );

  try {
    const config = await providerConfig(env, provider);
    if (!config)
      throw new IntegrationError("Provider configuration was removed.");
    const verifier = await decryptSecret(
      stored.code_verifier_jwe,
      env.OAUTH_ENCRYPTION_KEY,
    );
    const tokens = await exchangeAuthorizationCode(
      env,
      provider,
      config,
      code,
      verifier,
      stored.requested_scopes || oauthScopes(provider).join(" "),
    );
    const accessToken = stringValue(tokens.access_token);
    const profile = await providerProfile(provider, accessToken);
    const existing = await organizerConnection(
      env,
      provider,
      stored.workspace_user_email,
    );
    const returnedRefresh = stringValue(tokens.refresh_token);
    const preservedRefresh =
      existing?.provider_user_id === profile.id && existing.refresh_token_jwe
        ? await decryptSecret(
            existing.refresh_token_jwe,
            env.OAUTH_ENCRYPTION_KEY,
          )
        : "";
    const refreshToken = returnedRefresh || preservedRefresh;
    if (!refreshToken)
      throw new IntegrationError(
        `${providerLabels[provider]} did not return offline access. Start the connection again and approve calendar access.`,
      );
    const now = new Date();
    const accessTokenJwe = await encryptSecret(
      accessToken,
      env.OAUTH_ENCRYPTION_KEY,
    );
    const refreshTokenJwe = await encryptSecret(
      refreshToken,
      env.OAUTH_ENCRYPTION_KEY,
    );
    await env.DB.prepare(
      `INSERT INTO calendar_connections
        (id,provider,workspace_user_email,provider_user_id,provider_email,access_token_jwe,refresh_token_jwe,token_expires_at,scopes,status,last_error,created_at,updated_at)
       VALUES (?,?,?,?,?,?,?,?,?,'active',NULL,?,?)
       ON CONFLICT(provider,workspace_user_email) DO UPDATE SET
        provider_user_id=excluded.provider_user_id,
        provider_email=excluded.provider_email,
        access_token_jwe=excluded.access_token_jwe,
        refresh_token_jwe=excluded.refresh_token_jwe,
        token_expires_at=excluded.token_expires_at,
        scopes=excluded.scopes,
        status='active',
        last_error=NULL,
        updated_at=excluded.updated_at`,
    )
      .bind(
        existing?.id || crypto.randomUUID(),
        provider,
        stored.workspace_user_email.toLowerCase(),
        profile.id,
        profile.email,
        accessTokenJwe,
        refreshTokenJwe,
        new Date(
          now.getTime() + numberValue(tokens.expires_in, 3600) * 1000,
        ).toISOString(),
        stringValue(tokens.scope) ||
          stored.requested_scopes ||
          oauthScopes(provider).join(" "),
        existing?.created_at || now.toISOString(),
        now.toISOString(),
      )
      .run();
    await recordUserActivity(
      env,
      stored.workspace_user_email,
      "calendar.connected",
      `Connected ${profile.email} to ${providerLabels[provider]}`,
    );
    return calendarOAuthRedirect(
      env,
      provider,
      "connected",
      undefined,
      stored.return_target,
    );
  } catch (error) {
    console.warn("OAuth callback failed", {
      provider,
      reason: error instanceof Error ? error.name : "unknown",
    });
    return calendarOAuthRedirect(
      env,
      provider,
      "error",
      "connection_failed",
      stored.return_target,
    );
  }
}

export async function disconnectProvider(
  env: Env,
  provider: CalendarProvider,
  user: WorkspaceUser,
) {
  const connection = await organizerConnection(env, provider, user.email);
  if (!connection) return;
  if (provider === "google") {
    try {
      const tokenJwe =
        connection.refresh_token_jwe || connection.access_token_jwe;
      const token = await decryptSecret(tokenJwe, env.OAUTH_ENCRYPTION_KEY);
      await fetch("https://oauth2.googleapis.com/revoke", {
        method: "POST",
        headers: { "content-type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({ token }),
        signal: AbortSignal.timeout(8_000),
      });
    } catch {
      // Local disconnection still removes every stored token.
    }
  }
  await env.DB.prepare("DELETE FROM calendar_connections WHERE id=?")
    .bind(connection.id)
    .run();
  await recordUserActivity(
    env,
    user.email,
    "calendar.disconnected",
    `Disconnected ${providerLabels[provider]}`,
  );
}

async function refreshAccessToken(
  env: Env,
  connection: ConnectionRow,
  force = false,
) {
  if (
    !force &&
    new Date(connection.token_expires_at).getTime() > Date.now() + 60_000
  )
    return decryptSecret(connection.access_token_jwe, env.OAUTH_ENCRYPTION_KEY);
  if (!connection.refresh_token_jwe)
    throw new IntegrationError(
      `Reconnect ${providerLabels[connection.provider]} to continue.`,
      409,
    );
  const config = await providerConfig(env, connection.provider);
  if (!config)
    throw new IntegrationError(
      `${providerLabels[connection.provider]} is no longer configured.`,
      409,
    );
  const [clientSecret, refreshToken] = await Promise.all([
    decryptSecret(config.client_secret_jwe, env.OAUTH_ENCRYPTION_KEY),
    decryptSecret(connection.refresh_token_jwe, env.OAUTH_ENCRYPTION_KEY),
  ]);
  const tenant = config.tenant_id || "organizations";
  const tokenUrl =
    connection.provider === "google"
      ? "https://oauth2.googleapis.com/token"
      : `https://login.microsoftonline.com/${encodeURIComponent(tenant)}/oauth2/v2.0/token`;
  const form = new URLSearchParams({
    client_id: config.client_id,
    client_secret: clientSecret,
    refresh_token: refreshToken,
    grant_type: "refresh_token",
  });
  if (connection.provider === "microsoft")
    form.set(
      "scope",
      connection.scopes || oauthScopes(connection.provider).join(" "),
    );
  const response = await fetch(tokenUrl, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: form,
    signal: AbortSignal.timeout(12_000),
  });
  const tokens = await responseObject(response);
  const accessToken = stringValue(tokens.access_token);
  if (!response.ok || !accessToken) {
    await env.DB.prepare(
      "UPDATE calendar_connections SET status='error',last_error='token_refresh_failed',updated_at=? WHERE id=?",
    )
      .bind(new Date().toISOString(), connection.id)
      .run();
    throw new IntegrationError(
      `Reconnect ${providerLabels[connection.provider]} to continue.`,
      409,
    );
  }
  const rotatedRefresh = stringValue(tokens.refresh_token) || refreshToken;
  const now = new Date();
  await env.DB.prepare(
    `UPDATE calendar_connections SET access_token_jwe=?,refresh_token_jwe=?,token_expires_at=?,scopes=?,status='active',last_error=NULL,updated_at=? WHERE id=?`,
  )
    .bind(
      await encryptSecret(accessToken, env.OAUTH_ENCRYPTION_KEY),
      await encryptSecret(rotatedRefresh, env.OAUTH_ENCRYPTION_KEY),
      new Date(
        now.getTime() + numberValue(tokens.expires_in, 3600) * 1000,
      ).toISOString(),
      stringValue(tokens.scope) || connection.scopes,
      now.toISOString(),
      connection.id,
    )
    .run();
  return accessToken;
}

export async function providerRequest(
  env: Env,
  connection: ConnectionRow,
  url: string,
  init: RequestInit = {},
) {
  const perform = async (forceRefresh: boolean) => {
    const token = await refreshAccessToken(env, connection, forceRefresh);
    const headers = new Headers(init.headers);
    headers.set("authorization", `Bearer ${token}`);
    return fetch(url, {
      ...init,
      headers,
      signal: AbortSignal.timeout(12_000),
    });
  };
  let response = await perform(false);
  if (response.status === 401) response = await perform(true);
  return response;
}

async function loadExternalEvent(
  env: Env,
  connection: ConnectionRow,
  eventId: string,
) {
  const url =
    connection.provider === "google"
      ? `https://www.googleapis.com/calendar/v3/calendars/primary/events/${encodeURIComponent(eventId)}?conferenceDataVersion=1`
      : `https://graph.microsoft.com/v1.0/me/events/${encodeURIComponent(eventId)}`;
  const response = await providerRequest(env, connection, url);
  if (!response.ok) throw providerFailure(connection.provider, response);
  return responseObject(response);
}

async function waitForMeetingLink(
  env: Env,
  connection: ConnectionRow,
  eventId: string,
  initial: unknown,
) {
  const extract =
    connection.provider === "google"
      ? extractGoogleMeetingLink
      : extractMicrosoftMeetingLink;
  let url = extract(initial);
  for (let attempt = 0; !url && attempt < 3; attempt += 1) {
    await new Promise((resolve) => setTimeout(resolve, 250 * (attempt + 1)));
    url = extract(await loadExternalEvent(env, connection, eventId));
  }
  return url;
}

async function createExternalMeeting(
  env: Env,
  connection: ConnectionRow,
  booking: BookingRow,
): Promise<ExternalMeeting> {
  const [attendees, workspaceBrand] = await Promise.all([
    listMeetingAttendees(env, booking),
    getWorkspaceBrand(env),
  ]);
  if (connection.provider === "google") {
    const eventId = `slotloom${(await sha256(booking.id)).slice(0, 32)}`;
    const response = await providerRequest(
      env,
      connection,
      "https://www.googleapis.com/calendar/v3/calendars/primary/events?conferenceDataVersion=1&sendUpdates=all",
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          id: eventId,
          ...googleEventBody(booking, true, attendees, workspaceBrand),
        }),
      },
    );
    const body =
      response.status === 409
        ? await loadExternalEvent(env, connection, eventId)
        : await responseObject(response);
    if (!response.ok && response.status !== 409)
      throw providerFailure(connection.provider, response);
    const id = stringValue(body.id) || eventId;
    return {
      id,
      url: await waitForMeetingLink(env, connection, id, body),
    };
  }

  const response = await providerRequest(
    env,
    connection,
    "https://graph.microsoft.com/v1.0/me/events",
    {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(
        microsoftEventBody(booking, true, attendees, workspaceBrand),
      ),
    },
  );
  const body = await responseObject(response);
  if (!response.ok) throw providerFailure(connection.provider, response);
  const id = stringValue(body.id);
  if (!id)
    throw new IntegrationError(
      "Microsoft Teams created no usable calendar event. Try again.",
      502,
    );
  return { id, url: await waitForMeetingLink(env, connection, id, body) };
}

async function updateExternalMeeting(
  env: Env,
  connection: ConnectionRow,
  booking: BookingRow,
) {
  const [attendees, workspaceBrand] = await Promise.all([
    listMeetingAttendees(env, booking),
    getWorkspaceBrand(env),
  ]);
  const eventId = booking.meeting_provider_event_id!;
  const url =
    connection.provider === "google"
      ? `https://www.googleapis.com/calendar/v3/calendars/primary/events/${encodeURIComponent(eventId)}?conferenceDataVersion=1&sendUpdates=all`
      : `https://graph.microsoft.com/v1.0/me/events/${encodeURIComponent(eventId)}`;
  const response = await providerRequest(env, connection, url, {
    method: "PATCH",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(
      connection.provider === "google"
        ? googleEventBody(booking, false, attendees, workspaceBrand)
        : microsoftEventBody(booking, false, attendees, workspaceBrand),
    ),
  });
  const body = await responseObject(response);
  if (!response.ok) throw providerFailure(connection.provider, response);
  const meetingUrl =
    connection.provider === "google"
      ? extractGoogleMeetingLink(body)
      : extractMicrosoftMeetingLink(body);
  return meetingUrl || booking.meeting_url;
}

export async function ensureProviderMeeting(env: Env, booking: BookingRow) {
  if (booking.meeting_provider_event_id) {
    if (booking.meeting_url) return booking;
    if (!booking.meeting_provider_connection_id)
      throw new IntegrationError(
        "This calendar event has no organizer connection. Reconnect the provider before continuing.",
        409,
      );
    const connection = await connectionById(
      env,
      booking.meeting_provider_connection_id,
    );
    if (!connection)
      throw new IntegrationError(
        "The organizer calendar is disconnected. Reconnect it before loading this meeting.",
        409,
      );
    const event = await loadExternalEvent(
      env,
      connection,
      booking.meeting_provider_event_id,
    );
    const meetingUrl =
      connection.provider === "google"
        ? extractGoogleMeetingLink(event)
        : extractMicrosoftMeetingLink(event);
    if (!meetingUrl)
      throw new IntegrationError(
        `${providerLabels[connection.provider]} is still preparing the joining link. Try again in a moment.`,
        409,
      );
    const now = new Date().toISOString();
    await env.DB.prepare(
      "UPDATE bookings SET meeting_url=?,meeting_provider_synced_at=?,updated_at=? WHERE id=?",
    )
      .bind(meetingUrl, now, now, booking.id)
      .run();
    return (await getBooking(env, booking.id))!;
  }
  if (booking.meeting_url) return booking;
  const provider = await meetingProviderForBooking(env, booking);
  if (!provider)
    throw new IntegrationError(
      "Add a meeting link or choose an automatic provider in Calendar and email integrations.",
      409,
    );
  const organizer = meetingOwner(booking, env.BOOTSTRAP_OWNER_EMAIL);
  const { connection } = await connectionForMeeting(env, provider, organizer);
  if (!connection)
    throw new IntegrationError(
      `${organizer} has no ${providerLabels[provider]} connection, and no active owner connection is available as a fallback.`,
      409,
    );
  const external = await createExternalMeeting(env, connection, booking);
  const now = new Date().toISOString();
  await env.DB.prepare(
    `UPDATE bookings SET meeting_url=?,meeting_provider=?,meeting_provider_event_id=?,meeting_provider_connection_id=?,meeting_provider_synced_at=?,updated_at=? WHERE id=?`,
  )
    .bind(
      external.url,
      provider,
      external.id,
      connection.id,
      now,
      now,
      booking.id,
    )
    .run();
  const updated = (await getBooking(env, booking.id))!;
  if (!updated.meeting_url)
    throw new IntegrationError(
      `${providerLabels[provider]} created the event but the joining link is still pending. Try creating the meeting again in a moment.`,
      409,
    );
  return updated;
}

export async function syncProviderMeeting(env: Env, booking: BookingRow) {
  if (
    !booking.meeting_provider_event_id ||
    !booking.meeting_provider_connection_id
  )
    return booking;
  const connection = await connectionById(
    env,
    booking.meeting_provider_connection_id,
  );
  if (!connection)
    throw new IntegrationError(
      "The organizer calendar is disconnected. Reconnect it before updating this meeting.",
      409,
    );
  const meetingUrl = await updateExternalMeeting(env, connection, booking);
  const now = new Date().toISOString();
  await env.DB.prepare(
    "UPDATE bookings SET meeting_url=?,meeting_provider_synced_at=?,updated_at=? WHERE id=?",
  )
    .bind(meetingUrl, now, now, booking.id)
    .run();
  return (await getBooking(env, booking.id))!;
}

export async function cancelProviderMeeting(env: Env, booking: BookingRow) {
  if (
    !booking.meeting_provider_event_id ||
    !booking.meeting_provider_connection_id
  )
    return booking;
  const connection = await connectionById(
    env,
    booking.meeting_provider_connection_id,
  );
  if (!connection)
    throw new IntegrationError(
      "The organizer calendar is disconnected. Reconnect it before cancelling the provider event.",
      409,
    );
  const eventId = booking.meeting_provider_event_id;
  const url =
    connection.provider === "google"
      ? `https://www.googleapis.com/calendar/v3/calendars/primary/events/${encodeURIComponent(eventId)}?sendUpdates=all`
      : `https://graph.microsoft.com/v1.0/me/events/${encodeURIComponent(eventId)}`;
  const response = await providerRequest(env, connection, url, {
    method: "DELETE",
  });
  if (!response.ok && ![404, 410].includes(response.status))
    throw providerFailure(connection.provider, response);
  const now = new Date().toISOString();
  await env.DB.prepare(
    "UPDATE bookings SET meeting_url=NULL,meeting_provider_event_id=NULL,meeting_provider_connection_id=NULL,meeting_provider_synced_at=?,updated_at=? WHERE id=?",
  )
    .bind(now, now, booking.id)
    .run();
  return (await getBooking(env, booking.id))!;
}
