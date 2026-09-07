import {
  connectionForMeeting,
  meetingProviderForBooking,
} from "./calendar-connection-selection";
import {
  ensureProviderMeeting,
  type CalendarProvider,
} from "./calendar-integrations";
import { IntegrationError } from "./calendar-errors";
import {
  getBooking,
  json,
  normalizeBooking,
  recordActivity,
  safeText,
  type Env,
  type WorkspaceUser,
} from "./domain";
import { sendAdditionalMeetingInvites, sendAndLog } from "./email-delivery";
import {
  AttendeeInputError,
  attendeeInsertStatements,
  listMeetingAttendees,
  parseAdditionalAttendees,
} from "./meeting-attendees";

const providers = ["google", "microsoft"] as const;
const isRecord = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === "object" && !Array.isArray(value);
const isCalendarProvider = (value: string): value is CalendarProvider =>
  value === "google" || value === "microsoft";

async function providerOptions(env: Env, organizerEmail: string) {
  return Promise.all(
    providers.map(async (provider) => {
      const selected = await connectionForMeeting(
        env,
        provider,
        organizerEmail,
      );
      return {
        provider,
        label: provider === "google" ? "Google Meet" : "Microsoft Teams",
        available: Boolean(selected.connection),
        account: selected.connection?.provider_email || null,
        usedOwnerFallback: selected.usedOwnerFallback,
      };
    }),
  );
}

async function meetingOptions(
  env: Env,
  bookingId: string,
  user: WorkspaceUser,
) {
  if (user.role === "viewer")
    throw new IntegrationError(
      "View-only members cannot create meetings.",
      403,
    );
  const booking = await getBooking(env, bookingId);
  if (!booking) throw new IntegrationError("Meeting request not found.", 404);
  if (
    user.role === "member" &&
    booking.assigned_to &&
    booking.assigned_to.toLowerCase() !== user.email.toLowerCase()
  )
    throw new IntegrationError(
      "This request is assigned to another organizer.",
      403,
    );
  const users =
    user.role === "member"
      ? [user]
      : (
          await env.DB.prepare(
            "SELECT * FROM workspace_users WHERE status='active' AND role IN ('owner','admin','member') ORDER BY name,email",
          ).all<WorkspaceUser>()
        ).results;
  const organizers = await Promise.all(
    users.map(async (candidate) => ({
      email: candidate.email,
      name: candidate.name,
      role: candidate.role,
      providers: await providerOptions(env, candidate.email),
    })),
  );
  const selectedProvider = await meetingProviderForBooking(env, booking);
  const suggestedOrganizer =
    user.role === "member"
      ? user.email
      : booking.assigned_to || booking.link_created_by || user.email;
  return {
    booking: normalizeBooking(booking),
    attendees: await listMeetingAttendees(env, booking),
    currentUserEmail: user.email,
    currentUserRole: user.role,
    suggestedOrganizer: organizers.some(
      (candidate) => candidate.email === suggestedOrganizer,
    )
      ? suggestedOrganizer
      : user.email,
    suggestedProvider: selectedProvider || "manual",
    organizers,
  };
}

async function createMeeting(
  request: Request,
  env: Env,
  bookingId: string,
  user: WorkspaceUser,
) {
  if (user.role === "viewer")
    throw new IntegrationError(
      "View-only members cannot create meetings.",
      403,
    );
  const booking = await getBooking(env, bookingId);
  if (!booking) throw new IntegrationError("Meeting request not found.", 404);
  if (["cancelled", "completed", "missed"].includes(booking.workflow_status))
    throw new IntegrationError(
      "This request is no longer available for meeting creation.",
      409,
    );
  if (booking.meeting_sent_at)
    throw new IntegrationError("This meeting has already been created.", 409);

  const body: unknown = await request.json().catch(() => null);
  const input = isRecord(body) ? body : {};
  const requestedOrganizer = safeText(input.organizerEmail, 254).toLowerCase();
  const organizerEmail =
    user.role === "member" ? user.email.toLowerCase() : requestedOrganizer;
  if (!organizerEmail)
    throw new IntegrationError("Choose a meeting organizer.");
  if (
    user.role === "member" &&
    requestedOrganizer &&
    requestedOrganizer !== user.email.toLowerCase()
  )
    throw new IntegrationError(
      "Members can create meetings only from their own account.",
      403,
    );
  if (
    user.role === "member" &&
    booking.assigned_to &&
    booking.assigned_to.toLowerCase() !== user.email.toLowerCase()
  )
    throw new IntegrationError(
      "This request is assigned to another organizer.",
      403,
    );
  const organizer = await env.DB.prepare(
    "SELECT * FROM workspace_users WHERE email=? COLLATE NOCASE AND status='active' AND role IN ('owner','admin','member')",
  )
    .bind(organizerEmail)
    .first<WorkspaceUser>();
  if (!organizer)
    throw new IntegrationError("Choose an active meeting organizer.");

  const provider = safeText(input.provider, 20);
  if (provider !== "manual" && !isCalendarProvider(provider))
    throw new IntegrationError("Choose a valid meeting provider.");
  if (
    booking.meeting_provider_event_id &&
    booking.meeting_provider !== provider
  )
    throw new IntegrationError(
      "A different provider event already exists for this request.",
      409,
    );
  const title = safeText(input.title, 140) || booking.link_title || "Meeting";
  const finalStartsAt = safeText(input.finalStartsAt, 40);
  const meetingDate = new Date(finalStartsAt);
  if (!finalStartsAt || Number.isNaN(meetingDate.getTime()))
    throw new IntegrationError("Choose a valid meeting date and time.");
  const meetingUrl = safeText(input.meetingUrl, 500);
  if (provider === "manual" && !/^https:\/\//i.test(meetingUrl))
    throw new IntegrationError("Manual meeting links must start with https://");
  const attendees = parseAdditionalAttendees(input.attendees, booking.email);
  let selectedConnection:
    Awaited<ReturnType<typeof connectionForMeeting>> | undefined;
  if (isCalendarProvider(provider)) {
    selectedConnection = await connectionForMeeting(
      env,
      provider,
      organizerEmail,
    );
    if (!selectedConnection.connection)
      throw new IntegrationError(
        `${provider === "google" ? "Google Meet" : "Microsoft Teams"} is not connected for this organizer and no owner fallback is available.`,
        409,
      );
  }

  const now = new Date().toISOString();
  await env.DB.batch([
    env.DB.prepare(
      `UPDATE bookings SET assigned_to=?,meeting_title=?,final_starts_at=?,meeting_url=?,
       meeting_provider_preference=?,meeting_notes=?,
       meeting_provider=CASE WHEN meeting_provider_event_id IS NULL THEN NULL ELSE meeting_provider END,
       meeting_provider_connection_id=CASE WHEN meeting_provider_event_id IS NULL THEN NULL ELSE meeting_provider_connection_id END,
       meeting_provider_synced_at=CASE WHEN meeting_provider_event_id IS NULL THEN NULL ELSE meeting_provider_synced_at END,
       updated_at=? WHERE id=?`,
    ).bind(
      organizerEmail,
      title,
      meetingDate.toISOString(),
      provider === "manual" ? meetingUrl : null,
      provider,
      safeText(input.meetingNotes, 2000) || null,
      now,
      bookingId,
    ),
    env.DB.prepare("DELETE FROM booking_attendees WHERE booking_id=?").bind(
      bookingId,
    ),
    ...attendeeInsertStatements(env, bookingId, attendees, "organizer", now),
  ]);

  let prepared = (await getBooking(env, bookingId))!;
  let deliveryMethod: "calendar" | "worker" | CalendarProvider;
  let additionalInviteFailures: Array<{ email: string; error: string }> = [];
  if (isCalendarProvider(provider)) {
    prepared = await ensureProviderMeeting(env, prepared);
    deliveryMethod = "calendar";
  } else {
    const delivery = await sendAndLog(env, prepared, "meeting_details");
    const additional = await sendAdditionalMeetingInvites(env, prepared);
    deliveryMethod = delivery.deliveryMethod;
    additionalInviteFailures = additional.failures;
  }
  const completedAt = new Date().toISOString();
  await env.DB.prepare(
    "UPDATE bookings SET workflow_status='confirmed',meeting_sent_at=?,updated_at=? WHERE id=?",
  )
    .bind(completedAt, completedAt, bookingId)
    .run();
  prepared = (await getBooking(env, bookingId))!;
  await recordActivity(env, {
    bookingId,
    linkId: prepared.booking_link_id,
    actor: user.email,
    type: "meeting.created",
    summary: `Created ${provider === "manual" ? "a manual meeting" : provider === "google" ? "a Google Meet event" : "a Microsoft Teams event"} for ${organizerEmail}`,
    metadata: {
      provider,
      organizerEmail,
      providerAccount: selectedConnection?.connection?.provider_email || null,
      usedOwnerFallback: selectedConnection?.usedOwnerFallback || false,
      attendeeCount: attendees.length + 1,
    },
  });
  return {
    booking: normalizeBooking(prepared),
    deliveryMethod,
    usedOwnerFallback: selectedConnection?.usedOwnerFallback || false,
    additionalInviteFailures,
  };
}

export async function meetingAdminRoute(
  request: Request,
  env: Env,
  path: string,
  user: WorkspaceUser,
): Promise<Response | null> {
  const match = path.match(/^\/api\/admin\/bookings\/([^/]+)\/meeting$/);
  if (!match) return null;
  const bookingId = decodeURIComponent(match[1]);
  try {
    if (request.method === "GET")
      return json(await meetingOptions(env, bookingId, user));
    if (request.method === "POST")
      return json(await createMeeting(request, env, bookingId, user), 201);
    return json({ error: "Method not allowed." }, 405);
  } catch (error) {
    if (error instanceof AttendeeInputError)
      return json({ error: error.message }, 400);
    if (error instanceof IntegrationError)
      return json({ error: error.message }, error.status);
    console.error(
      JSON.stringify({
        message: "Meeting creation failed",
        bookingId,
        reason: error instanceof Error ? error.message : "unknown",
      }),
    );
    return json({ error: "Meeting creation failed." }, 500);
  }
}
