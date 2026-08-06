import {
  providerRequest,
  type CalendarProvider,
  type ConnectionRow,
} from "./calendar-integrations";
import { IntegrationError } from "./calendar-errors";
import {
  gmailRawMessage,
  textToBase64,
  type OAuthEmailMessage,
} from "./email-mime";
import { grantsMailSend } from "./oauth-scopes";
import type { Env } from "./domain";

const providerNames: Record<CalendarProvider, string> = {
  google: "Google Gmail",
  microsoft: "Microsoft Outlook",
};

export async function emailConnection(
  env: Env,
  provider: CalendarProvider,
  organizerEmail: string,
  allowOwnerFallback = true,
  ownerOnly = false,
) {
  const own = ownerOnly
    ? null
    : await env.DB.prepare(
        "SELECT * FROM calendar_connections WHERE provider=? AND workspace_user_email=? COLLATE NOCASE AND status='active'",
      )
        .bind(provider, organizerEmail)
        .first<ConnectionRow>();
  if (own && grantsMailSend(provider, own.scopes))
    return { connection: own, usedOwnerFallback: false };
  if (!allowOwnerFallback)
    return { connection: null, usedOwnerFallback: false };

  const owners = await env.DB.prepare(
    `SELECT c.* FROM calendar_connections c
     JOIN workspace_users u ON u.email=c.workspace_user_email COLLATE NOCASE
     WHERE c.provider=? AND c.status='active' AND u.role='owner' AND u.status='active'
     ORDER BY CASE WHEN c.workspace_user_email=? COLLATE NOCASE THEN 0 ELSE 1 END,u.created_at`,
  )
    .bind(provider, env.BOOTSTRAP_OWNER_EMAIL || "")
    .all<ConnectionRow>();
  const owner = owners.results.find((connection) =>
    grantsMailSend(provider, connection.scopes),
  );
  return { connection: owner || null, usedOwnerFallback: Boolean(owner) };
}

export async function oauthMailAvailable(
  env: Env,
  provider: CalendarProvider,
  organizerEmail: string,
  allowOwnerFallback = true,
) {
  return Boolean(
    (
      await emailConnection(
        env,
        provider,
        organizerEmail,
        allowOwnerFallback,
      )
    ).connection,
  );
}

export async function workspaceOAuthMailAvailable(
  env: Env,
  provider: CalendarProvider,
) {
  return Boolean(
    (await emailConnection(env, provider, "", true, true)).connection,
  );
}

export async function sendOAuthMail(
  env: Env,
  provider: CalendarProvider,
  organizerEmail: string,
  message: OAuthEmailMessage,
  allowOwnerFallback = true,
  ownerOnly = false,
) {
  const selected = await emailConnection(
    env,
    provider,
    organizerEmail,
    allowOwnerFallback,
    ownerOnly,
  );
  const connection = selected.connection;
  if (!connection)
    throw new IntegrationError(
      `No active ${providerNames[provider]} connection has email permission. Reauthorize the organizer or a workspace owner.`,
      409,
    );

  const url =
    provider === "google"
      ? "https://gmail.googleapis.com/gmail/v1/users/me/messages/send"
      : "https://graph.microsoft.com/v1.0/me/sendMail";
  const body =
    provider === "google"
      ? { raw: gmailRawMessage(connection.provider_email, message) }
      : {
          message: {
            subject: message.subject,
            body: { contentType: "HTML", content: message.html },
            toRecipients: [{ emailAddress: { address: message.to } }],
            ...(message.replyTo
              ? {
                  replyTo: [{ emailAddress: { address: message.replyTo } }],
                }
              : {}),
            ...(message.attachments?.length
              ? {
                  attachments: message.attachments.map((attachment) => ({
                    "@odata.type": "#microsoft.graph.fileAttachment",
                    name: attachment.filename,
                    contentType: attachment.type,
                    contentBytes: textToBase64(attachment.content),
                  })),
                }
              : {}),
          },
          saveToSentItems: true,
        };
  const response = await providerRequest(env, connection, url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!response.ok) {
    if ([401, 403].includes(response.status))
      throw new IntegrationError(
        `${providerNames[provider]} denied email delivery. Reauthorize the account with email permission.`,
        409,
      );
    throw new IntegrationError(
      `${providerNames[provider]} could not send the email. Try again.`,
      502,
    );
  }

  let providerMessageId = response.headers.get("request-id") || "";
  if (provider === "google") {
    const value: unknown = await response.json().catch(() => null);
    if (value && typeof value === "object" && "id" in value)
      providerMessageId = String(value.id || "");
  }
  return {
    providerMessageId: providerMessageId || crypto.randomUUID(),
    deliveryMethod: provider,
    senderEmail: connection.provider_email,
    senderConnectionId: connection.id,
    usedOwnerFallback: selected.usedOwnerFallback,
  };
}

export function sendWorkspaceOAuthMail(
  env: Env,
  provider: CalendarProvider,
  message: OAuthEmailMessage,
) {
  return sendOAuthMail(env, provider, "", message, true, true);
}
