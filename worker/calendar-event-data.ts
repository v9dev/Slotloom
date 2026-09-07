import type { BookingRow, WorkspaceBrand } from "./domain";
import {
  calendarEventDescriptionHtml,
  calendarEventParts,
} from "./calendar-event-presentation";

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const stringValue = (value: unknown) =>
  typeof value === "string" ? value : "";

export function extractGoogleMeetingLink(value: unknown) {
  if (!isRecord(value)) return null;
  const direct = stringValue(value.hangoutLink);
  if (direct) return direct;
  const conference = isRecord(value.conferenceData) ? value.conferenceData : {};
  const entries = Array.isArray(conference.entryPoints)
    ? conference.entryPoints
    : [];
  for (const entry of entries) {
    if (!isRecord(entry)) continue;
    const uri = stringValue(entry.uri);
    if (uri && stringValue(entry.entryPointType) === "video") return uri;
  }
  return null;
}

export function extractMicrosoftMeetingLink(value: unknown) {
  if (!isRecord(value)) return null;
  const onlineMeeting = isRecord(value.onlineMeeting)
    ? value.onlineMeeting
    : {};
  return stringValue(onlineMeeting.joinUrl) || null;
}

function meetingTimes(booking: BookingRow) {
  const start = new Date(booking.final_starts_at || booking.starts_at);
  const end = new Date(
    start.getTime() + (booking.duration_minutes || 30) * 60_000,
  );
  if (Number.isNaN(start.getTime())) throw new Error("Invalid meeting time.");
  return { start, end };
}

export function googleEventBody(
  booking: BookingRow,
  create: boolean,
  attendees = [{ name: booking.name, email: booking.email }],
  workspaceBrand?: WorkspaceBrand,
) {
  const { start, end } = meetingTimes(booking);
  return {
    summary: calendarEventParts(booking).title,
    description: calendarEventDescriptionHtml(
      booking,
      attendees,
      workspaceBrand,
    ),
    start: { dateTime: start.toISOString(), timeZone: "UTC" },
    end: { dateTime: end.toISOString(), timeZone: "UTC" },
    ...(create
      ? {
          attendees: attendees.map((attendee) => ({ email: attendee.email })),
          guestsCanInviteOthers: false,
          guestsCanModify: false,
          conferenceData: {
            createRequest: {
              requestId: booking.id,
              conferenceSolutionKey: { type: "hangoutsMeet" },
            },
          },
        }
      : {}),
  };
}

export function microsoftEventBody(
  booking: BookingRow,
  create: boolean,
  attendees = [{ name: booking.name, email: booking.email }],
  workspaceBrand?: WorkspaceBrand,
) {
  const { start, end } = meetingTimes(booking);
  const dateTime = (date: Date) => date.toISOString().replace(/Z$/, "");
  return {
    subject: calendarEventParts(booking).title,
    body: {
      contentType: "HTML",
      content: calendarEventDescriptionHtml(booking, attendees, workspaceBrand),
    },
    start: { dateTime: dateTime(start), timeZone: "UTC" },
    end: { dateTime: dateTime(end), timeZone: "UTC" },
    ...(create
      ? {
          attendees: attendees.map((attendee) => ({
            emailAddress: {
              address: attendee.email,
              name: attendee.name,
            },
            type: "required",
          })),
          isOnlineMeeting: true,
          onlineMeetingProvider: "teamsForBusiness",
          transactionId: booking.id,
        }
      : {}),
  };
}
