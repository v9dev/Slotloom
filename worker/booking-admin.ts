import {
  EMAIL_TEMPLATES,
  WORKFLOW_STATUSES,
  getBooking,
  json,
  normalizeBooking,
  recordActivity,
  safeText,
  type BookingRow,
  type Env,
  type WorkspaceUser,
  type WorkflowStatus,
} from "./domain";
import { sendAndLog } from "./email-delivery";
import {
  cancelProviderMeeting,
  ensureProviderMeeting,
  syncProviderMeeting,
} from "./calendar-integrations";
import { IntegrationError } from "./calendar-errors";
import { listMeetingAttendees } from "./meeting-attendees";

export function providerOwnsLifecycleMessage(
  template: string,
  before: Pick<BookingRow, "meeting_provider_event_id">,
  after: Pick<BookingRow, "meeting_provider_event_id">,
) {
  if (template === "cancelled")
    return Boolean(before.meeting_provider_event_id);
  return (
    ["meeting_details", "rescheduled_confirmation"].includes(template) &&
    Boolean(after.meeting_provider_event_id)
  );
}

async function prepareMeetingForEmail(
  env: Env,
  booking: BookingRow,
  template: string,
) {
  if (template === "cancelled") return cancelProviderMeeting(env, booking);
  if (template === "reminder") return booking;
  if (template === "meeting_details")
    return booking.meeting_provider_event_id && booking.meeting_url
      ? booking
      : ensureProviderMeeting(env, booking);
  if (template === "rescheduled_confirmation")
    return booking.meeting_provider_event_id
      ? syncProviderMeeting(env, booking)
      : ensureProviderMeeting(env, booking);
  return booking;
}

export async function bookingAdminRoute(
  request: Request,
  env: Env,
  path: string,
  user: WorkspaceUser,
): Promise<Response | null> {
  const actor = user.email;
  const match = path.match(/^\/api\/admin\/bookings\/([^/]+)(\/email)?$/);
  if (!match) return null;
  const id = decodeURIComponent(match[1]);
  const booking = await getBooking(env, id);
  if (!booking) return json({ error: "Meeting request not found." }, 404);

  if (!match[2] && request.method === "GET") {
    const [activities, emails, feedback, attendees] = await Promise.all([
      env.DB.prepare(
        "SELECT * FROM activity_events WHERE booking_id=? ORDER BY created_at DESC",
      )
        .bind(id)
        .all(),
      env.DB.prepare(
        "SELECT * FROM email_events WHERE booking_id=? ORDER BY created_at DESC",
      )
        .bind(id)
        .all(),
      env.DB.prepare(
        "SELECT rating,message,created_at,updated_at FROM meeting_feedback WHERE booking_id=?",
      )
        .bind(id)
        .first(),
      listMeetingAttendees(env, booking),
    ]);
    return json({
      booking: normalizeBooking(booking),
      activities: activities.results,
      emails: emails.results,
      feedback,
      attendees,
    });
  }

  if (user.role === "viewer")
    return json({ error: "View-only members cannot change requests." }, 403);
  if (
    user.role === "member" &&
    booking.assigned_to &&
    booking.assigned_to.toLowerCase() !== user.email.toLowerCase()
  )
    return json({ error: "This request is assigned to another organizer." }, 403);

  if (match[2] === "/email" && request.method === "POST") {
    const body: unknown = await request.json().catch(() => null);
    const template = safeText(
      typeof body === "object" && body !== null && "template" in body
        ? body.template
        : "",
      30,
    );
    if (!EMAIL_TEMPLATES.has(template))
      return json({ error: "Unknown email template." }, 400);
    if (
      ["meeting_details", "rescheduled_confirmation"].includes(template) &&
      !booking.meeting_sent_at
    )
      return json(
        {
          error:
            "Use Create meeting to review the organizer, provider, title, time, and attendees first.",
        },
        409,
      );
    if (template === "reminder" && !booking.meeting_sent_at)
      return json({ error: "Create the meeting before sending a reminder." }, 409);
    try {
      const prepared = await prepareMeetingForEmail(env, booking, template);
      if (
        ["meeting_details", "rescheduled_confirmation", "reminder"].includes(
          template,
        ) &&
        !prepared.meeting_url
      )
        throw new IntegrationError(
          "Add a meeting link or connect an automatic meeting provider first.",
          409,
        );
      const now = new Date().toISOString();
      if (template === "cancelled")
        await env.DB.prepare(
          "UPDATE bookings SET workflow_status='cancelled',updated_at=? WHERE id=?",
        )
          .bind(now, id)
          .run();
      const providerManaged = providerOwnsLifecycleMessage(
        template,
        booking,
        prepared,
      );
      const delivery = providerManaged
        ? null
        : await sendAndLog(env, prepared, template);
      if (["meeting_details", "rescheduled_confirmation"].includes(template))
        await env.DB.prepare(
          "UPDATE bookings SET workflow_status='confirmed',meeting_sent_at=?,updated_at=? WHERE id=?",
        )
          .bind(now, now, id)
          .run();
      if (
        !booking.meeting_provider_event_id &&
        prepared.meeting_provider_event_id
      )
        await recordActivity(env, {
          bookingId: id,
          linkId: booking.booking_link_id,
          actor,
          type: "meeting.created",
          summary: `Created ${prepared.meeting_provider === "google" ? "Google Meet" : "Microsoft Teams"} event`,
        });
      await recordActivity(
        env,
        providerManaged
          ? {
              bookingId: id,
              linkId: booking.booking_link_id,
              actor,
              type:
                template === "cancelled"
                  ? "calendar.cancelled"
                  : "calendar.invite_sent",
              summary:
                template === "cancelled"
                  ? "Cancelled the provider calendar invitation"
                  : `Sent the ${prepared.meeting_provider === "google" ? "Google Meet" : "Microsoft Teams"} calendar invitation`,
            }
          : {
              bookingId: id,
              linkId: booking.booking_link_id,
              actor,
              type: "email.sent",
              summary: `Sent ${template.replaceAll("_", " ")} email through ${delivery!.deliveryMethod}`,
            },
      );
      return json({
        messageId: delivery?.providerMessageId || null,
        deliveryMethod: providerManaged ? "calendar" : delivery!.deliveryMethod,
        usedWorkerFallback: delivery?.usedWorkerFallback || false,
      });
    } catch (error) {
      if (error instanceof IntegrationError)
        return json({ error: error.message }, error.status);
      return json(
        { error: "Email delivery failed. The attempt was logged." },
        502,
      );
    }
  }

  if (!match[2] && request.method === "PATCH") {
    const body: unknown = await request.json().catch(() => null);
    const input =
      typeof body === "object" && body !== null
        ? (body as Record<string, unknown>)
        : {};
    const supplied = (key: string) =>
      Object.prototype.hasOwnProperty.call(input, key);
    const status = safeText(input.status, 30) as WorkflowStatus;
    if (!WORKFLOW_STATUSES.has(status))
      return json({ error: "Invalid status." }, 400);
    const finalStartsAt = supplied("finalStartsAt")
      ? safeText(input.finalStartsAt, 40)
      : booking.final_starts_at || "";
    const submittedMeetingUrl = supplied("meetingUrl")
      ? safeText(input.meetingUrl, 500)
      : booking.meeting_url || "";
    const meetingProviderPreference =
      safeText(input.meetingProviderPreference, 20) ||
      booking.meeting_provider_preference ||
      "workspace";
    if (
      !["workspace", "manual", "google", "microsoft"].includes(
        meetingProviderPreference,
      )
    )
      return json({ error: "Choose a valid meeting provider." }, 400);
    if (submittedMeetingUrl && !/^https:\/\//i.test(submittedMeetingUrl))
      return json({ error: "Meeting link must start with https://" }, 400);
    const meetingUrl = booking.meeting_provider_event_id
      ? booking.meeting_url
      : submittedMeetingUrl || null;
    await env.DB.prepare(
      "UPDATE bookings SET workflow_status=?,admin_note=?,final_starts_at=?,meeting_url=?,meeting_provider_preference=?,meeting_notes=?,assigned_to=?,updated_at=? WHERE id=?",
    )
      .bind(
        status,
        safeText(input.adminNote, 2000) || null,
        finalStartsAt || null,
        meetingUrl,
        meetingProviderPreference,
        supplied("meetingNotes")
          ? safeText(input.meetingNotes, 2000) || null
          : booking.meeting_notes,
        user.role === "member"
          ? user.email
          : supplied("assignedTo")
            ? safeText(input.assignedTo, 254) || null
            : booking.assigned_to,
        new Date().toISOString(),
        id,
      )
      .run();
    let updated = (await getBooking(env, id))!;
    try {
      if (updated.meeting_provider_event_id)
        updated =
          status === "cancelled"
            ? await cancelProviderMeeting(env, updated)
            : await syncProviderMeeting(env, updated);
    } catch (error) {
      if (error instanceof IntegrationError)
        return json(
          {
            error: `${error.message} Your Slotloom changes were saved.`,
          },
          error.status,
        );
      throw error;
    }
    await recordActivity(env, {
      bookingId: id,
      linkId: booking.booking_link_id,
      actor,
      type: "booking.updated",
      summary: `Updated request to ${status.replaceAll("_", " ")}`,
    });
    return json({ booking: normalizeBooking(updated) });
  }

  return json({ error: "Method not allowed." }, 405);
}
