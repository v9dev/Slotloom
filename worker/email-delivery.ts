import {
  calendarInvite,
  configuredEmailContent,
  createManageUrl,
  createNotification,
  getWorkspaceBrand,
  json,
  meetingOwner,
  recordUserActivity,
  renderEmailHtml,
  slotloomSender,
  type BookingRow,
  type Env,
  type WorkspaceUser,
} from "./domain";
import { IntegrationError } from "./calendar-errors";
import {
  oauthMailAvailable,
  sendOAuthMail,
  sendWorkspaceOAuthMail,
  workspaceOAuthMailAvailable,
} from "./oauth-mail";
import type { EmailAttachmentContent, OAuthEmailMessage } from "./email-mime";
import {
  listMeetingAttendees,
  type MeetingAttendee,
} from "./meeting-attendees";

export type EmailDeliveryMethod = "worker" | "google" | "microsoft";
export type EmailFallbackMethod = "none" | EmailDeliveryMethod;

type DeliverySettings = {
  method: EmailFallbackMethod;
  workerFallback: boolean;
};

export type DeliveryResult = {
  providerMessageId: string;
  deliveryMethod: EmailDeliveryMethod;
  senderEmail: string;
  senderConnectionId: string | null;
  usedOwnerFallback: boolean;
  usedWorkerFallback: boolean;
};

const isDeliveryMethod = (value: string): value is EmailDeliveryMethod =>
  value === "worker" || value === "google" || value === "microsoft";
const isFallbackMethod = (value: string): value is EmailFallbackMethod =>
  value === "none" || isDeliveryMethod(value);

export function workerEmailAvailable(env: Env) {
  return Boolean(env.EMAIL && env.FROM_EMAIL?.trim());
}

export async function getEmailDeliverySettings(
  env: Env,
): Promise<DeliverySettings> {
  const rows = await env.DB.prepare(
    "SELECT setting_key,setting_value FROM workspace_settings WHERE setting_key IN ('email_fallback_method','email_delivery_method','email_worker_fallback')",
  ).all<{ setting_key: string; setting_value: string }>();
  const settings = Object.fromEntries(
    rows.results.map((row) => [row.setting_key, row.setting_value]),
  );
  const configuredMethod =
    settings.email_fallback_method || settings.email_delivery_method;
  return {
    method: isFallbackMethod(configuredMethod) ? configuredMethod : "worker",
    workerFallback: settings.email_worker_fallback === "true",
  };
}

async function sendWorkerEmail(
  env: Env,
  message: OAuthEmailMessage,
): Promise<DeliveryResult> {
  if (!workerEmailAvailable(env) || !env.EMAIL || !env.FROM_EMAIL)
    throw new IntegrationError(
      "Cloudflare Worker Email is not configured for this deployment.",
      503,
    );
  const sender = slotloomSender(env.FROM_EMAIL);
  let response: EmailSendResult;
  try {
    response = await env.EMAIL.send({
      to: message.to,
      from: sender,
      replyTo: message.replyTo,
      subject: message.subject,
      text: message.text,
      html: message.html,
      ...(message.attachments?.length
        ? {
            attachments: message.attachments.map((attachment) => ({
              ...attachment,
              disposition: "attachment" as const,
            })),
          }
        : {}),
    });
  } catch (error) {
    console.error(
      JSON.stringify({
        message: "Worker Email delivery failed",
        reason: error instanceof Error ? error.name : "unknown",
      }),
    );
    throw new IntegrationError(
      "Cloudflare Worker Email could not send the message. Check the sender domain and binding.",
      502,
    );
  }
  return {
    providerMessageId: response.messageId,
    deliveryMethod: "worker",
    senderEmail: sender.email,
    senderConnectionId: null,
    usedOwnerFallback: false,
    usedWorkerFallback: false,
  };
}

export async function deliverEmail(
  env: Env,
  organizerEmail: string,
  message: OAuthEmailMessage,
  selected?: DeliverySettings,
  preferredProvider?: "google" | "microsoft" | null,
): Promise<DeliveryResult> {
  const settings = selected || (await getEmailDeliverySettings(env));
  let personalFailure: unknown;
  if (!selected) {
    if (
      preferredProvider &&
      (await oauthMailAvailable(
        env,
        preferredProvider,
        organizerEmail,
        true,
      ))
    ) {
      try {
        return {
          ...(await sendOAuthMail(
            env,
            preferredProvider,
            organizerEmail,
            message,
            true,
          )),
          usedWorkerFallback: false,
        };
      } catch (error) {
        personalFailure = error;
      }
    }
    const user = await env.DB.prepare(
      "SELECT email_provider_preference FROM workspace_users WHERE email=? COLLATE NOCASE AND status='active'",
    )
      .bind(organizerEmail)
      .first<{ email_provider_preference: string }>();
    const preference = user?.email_provider_preference || "auto";
    const candidates = [
      !preferredProvider &&
      (preference === "google" || preference === "microsoft")
        ? preference
        : null,
    ].filter(
      (value, index, all): value is "google" | "microsoft" =>
        Boolean(value) && all.indexOf(value) === index,
    );
    if (!preferredProvider && !candidates.length) {
      const available = await Promise.all(
        (["google", "microsoft"] as const).map(async (provider) => ({
          provider,
          available: await oauthMailAvailable(
            env,
            provider,
            organizerEmail,
            false,
          ),
        })),
      );
      const connected = available.filter((item) => item.available);
      if (connected.length === 1) candidates.push(connected[0].provider);
    }
    for (const provider of candidates) {
      if (!(await oauthMailAvailable(env, provider, organizerEmail, false)))
        continue;
      try {
        return {
          ...(await sendOAuthMail(
            env,
            provider,
            organizerEmail,
            message,
            false,
          )),
          usedWorkerFallback: false,
        };
      } catch (error) {
        personalFailure = error;
      }
    }
  }
  if (settings.method === "none")
    throw (
      personalFailure ||
      new IntegrationError(
        "No personal mailbox or workspace email fallback is available.",
        409,
      )
    );
  if (settings.method === "worker") return sendWorkerEmail(env, message);
  try {
    const result = await sendWorkspaceOAuthMail(env, settings.method, message);
    return { ...result, usedWorkerFallback: false };
  } catch (error) {
    if (!settings.workerFallback || !workerEmailAvailable(env)) throw error;
    const fallback = await sendWorkerEmail(env, message);
    return { ...fallback, usedWorkerFallback: true };
  }
}

function meetingAttachment(
  booking: BookingRow,
  env: Env,
  appName: string,
  attendees: MeetingAttendee[],
): EmailAttachmentContent[] | undefined {
  const attachCalendar = Boolean(
    booking.meeting_url && !booking.meeting_provider_event_id,
  );
  return attachCalendar
    ? [
        {
          content: calendarInvite(booking, env, appName, attendees),
          filename: "meeting.ics",
          type: "text/calendar; charset=utf-8; method=REQUEST",
        },
      ]
    : undefined;
}

const meetingTemplates = new Set([
  "meeting_details",
  "rescheduled_confirmation",
  "reminder",
]);

async function sendRecipientAndLog(
  env: Env,
  booking: BookingRow,
  recipient: { name: string; email: string },
  template: string,
  manageUrl: string,
  attendees: MeetingAttendee[],
) {
  const eventId = crypto.randomUUID();
  const createdAt = new Date().toISOString();
  const settings = await getEmailDeliverySettings(env);
  const recipientBooking = {
    ...booking,
    name: recipient.name,
    email: recipient.email,
  };
  try {
    const content = await configuredEmailContent(
      env,
      template,
      recipientBooking,
      manageUrl,
    );
    const workspaceBrand = await getWorkspaceBrand(env);
    const result = await deliverEmail(
      env,
      meetingOwner(booking, env.BOOTSTRAP_OWNER_EMAIL),
      {
        to: recipient.email,
        replyTo: meetingOwner(booking, env.BOOTSTRAP_OWNER_EMAIL),
        ...content,
        attachments: meetingTemplates.has(template)
          ? meetingAttachment(
              booking,
              env,
              workspaceBrand.name,
              attendees,
            )
          : undefined,
      },
      undefined,
      booking.meeting_provider === "google" ||
        booking.meeting_provider === "microsoft"
        ? booking.meeting_provider
        : null,
    );
    await env.DB.prepare(
      `INSERT INTO email_events
        (id,booking_id,template,recipient,provider_message_id,status,delivery_method,sender_email,sender_connection_id,used_fallback,created_at)
       VALUES (?,?,?,?,?,'sent',?,?,?,?,?)`,
    )
      .bind(
        eventId,
        booking.id,
        template,
        recipient.email,
        result.providerMessageId,
        result.deliveryMethod,
        result.senderEmail,
        result.senderConnectionId,
        result.usedOwnerFallback || result.usedWorkerFallback ? 1 : 0,
        createdAt,
      )
      .run();
    return result;
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unknown email error";
    await env.DB.prepare(
      `INSERT INTO email_events
        (id,booking_id,template,recipient,status,error,delivery_method,created_at)
       VALUES (?,?,?,?,'failed',?,?,?)`,
    )
      .bind(
        eventId,
        booking.id,
        template,
        recipient.email,
        message.slice(0, 1000),
        settings.method === "none" ? null : settings.method,
        createdAt,
      )
      .run();
    await createNotification(
      env,
      meetingOwner(booking, env.BOOTSTRAP_OWNER_EMAIL),
      "email.failed",
      "Email delivery failed",
      `The ${template.replaceAll("_", " ")} email to ${recipient.email} could not be delivered.`,
      `/admin/requests?open=${booking.id}`,
    );
    throw error;
  }
}

export async function sendAndLog(
  env: Env,
  booking: BookingRow,
  template: string,
) {
  const [manageUrl, attendees] = await Promise.all([
    createManageUrl(env, booking.id),
    meetingTemplates.has(template)
      ? listMeetingAttendees(env, booking)
      : Promise.resolve([]),
  ]);
  return sendRecipientAndLog(
    env,
    booking,
    { name: booking.name, email: booking.email },
    template,
    manageUrl,
    attendees,
  );
}

export async function sendAdditionalMeetingInvites(
  env: Env,
  booking: BookingRow,
) {
  const attendees = await listMeetingAttendees(env, booking);
  const failures: Array<{ email: string; error: string }> = [];
  const safeActionUrl = booking.meeting_url || env.APP_URL;
  for (const attendee of attendees.filter((candidate) => !candidate.primary)) {
    try {
      await sendRecipientAndLog(
        env,
        booking,
        attendee,
        "meeting_details",
        safeActionUrl,
        attendees,
      );
    } catch (error) {
      failures.push({
        email: attendee.email,
        error: error instanceof Error ? error.message : "Delivery failed.",
      });
    }
  }
  return { sent: attendees.length - 1 - failures.length, failures };
}

async function testEmail(env: Env, recipient: string) {
  const workspaceBrand = await getWorkspaceBrand(env);
  const settings = await getEmailDeliverySettings(env);
  const subject = "Slotloom email delivery test";
  const text =
    "Your selected Slotloom email delivery method is configured and working.";
  return deliverEmail(
    env,
    recipient,
    {
      to: recipient,
      replyTo: recipient,
      subject,
      text,
      html: await renderEmailHtml(
        env,
        subject,
        text,
        recipient,
        undefined,
        undefined,
        undefined,
        false,
        "received",
        undefined,
        workspaceBrand,
      ),
    },
    settings,
  );
}

export async function emailDeliveryAdminRoute(
  request: Request,
  env: Env,
  path: string,
  user: WorkspaceUser,
): Promise<Response | null> {
  if (!path.startsWith("/api/admin/email-delivery")) return null;
  try {
    if (user.role !== "owner" && user.role !== "admin")
      throw new IntegrationError(
        "Only workspace owners and admins can view email fallback settings.",
        403,
      );
    if (path === "/api/admin/email-delivery" && request.method === "GET") {
      const [settings, googleAvailable, microsoftAvailable] = await Promise.all(
        [
          getEmailDeliverySettings(env),
          workspaceOAuthMailAvailable(env, "google"),
          workspaceOAuthMailAvailable(env, "microsoft"),
        ],
      );
      return json({
        ...settings,
        workerAvailable: workerEmailAvailable(env),
        workerFrom: env.FROM_EMAIL || "",
        oauthAvailable: {
          google: googleAvailable,
          microsoft: microsoftAvailable,
        },
        canManage: user.role === "owner",
      });
    }
    if (user.role !== "owner")
      throw new IntegrationError(
        "Only workspace owners can manage email delivery.",
        403,
      );
    if (path === "/api/admin/email-delivery" && request.method === "PATCH") {
      const body: unknown = await request.json().catch(() => null);
      const input =
        body && typeof body === "object"
          ? (body as Record<string, unknown>)
          : {};
      const method = String(input.method || "");
      const workerFallback = input.workerFallback === true;
      if (!isFallbackMethod(method))
        throw new IntegrationError("Choose a valid email fallback method.");
      if (method === "worker" && !workerEmailAvailable(env))
        throw new IntegrationError(
          "Configure the Worker Email binding and FROM_EMAIL before selecting it.",
          409,
        );
      if (
        method !== "worker" &&
        method !== "none" &&
        !(await workspaceOAuthMailAvailable(env, method))
      )
        throw new IntegrationError(
          `Connect or reauthorize an owner ${method === "google" ? "Google" : "Microsoft"} account with email permission first.`,
          409,
        );
      if (workerFallback && !workerEmailAvailable(env))
        throw new IntegrationError(
          "Worker fallback cannot be enabled until Worker Email is configured.",
          409,
        );
      const effectiveFallback =
        method === "worker" || method === "none" ? false : workerFallback;
      const updatedAt = new Date().toISOString();
      await env.DB.batch([
        env.DB.prepare(
          `INSERT INTO workspace_settings (setting_key,setting_value,updated_by,updated_at)
           VALUES ('email_fallback_method',?,?,?)
           ON CONFLICT(setting_key) DO UPDATE SET setting_value=excluded.setting_value,updated_by=excluded.updated_by,updated_at=excluded.updated_at`,
        ).bind(method, user.email, updatedAt),
        env.DB.prepare(
          `INSERT INTO workspace_settings (setting_key,setting_value,updated_by,updated_at)
           VALUES ('email_worker_fallback',?,?,?)
           ON CONFLICT(setting_key) DO UPDATE SET setting_value=excluded.setting_value,updated_by=excluded.updated_by,updated_at=excluded.updated_at`,
        ).bind(String(effectiveFallback), user.email, updatedAt),
      ]);
      await recordUserActivity(
        env,
        user.email,
        "email.delivery_updated",
        `Selected ${method} email delivery${effectiveFallback ? " with Worker fallback" : ""}`,
      );
      return json({ success: true });
    }
    if (
      path === "/api/admin/email-delivery/test" &&
      request.method === "POST"
    ) {
      const result = await testEmail(env, user.email);
      await recordUserActivity(
        env,
        user.email,
        "email.delivery_tested",
        `Sent an email delivery test through ${result.deliveryMethod}`,
      );
      return json(result);
    }
    return json({ error: "Method not allowed." }, 405);
  } catch (error) {
    if (error instanceof IntegrationError)
      return json({ error: error.message }, error.status);
    console.error(
      JSON.stringify({
        message: "email delivery operation failed",
        reason: error instanceof Error ? error.name : "unknown",
      }),
    );
    return json({ error: "Email delivery operation failed." }, 500);
  }
}
