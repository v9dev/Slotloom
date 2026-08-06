import { safeText, type BookingRow, type Env } from "./domain";

export type MeetingAttendee = {
  name: string;
  email: string;
  primary: boolean;
  source: "visitor" | "organizer" | "primary";
};

export class AttendeeInputError extends Error {}

const validEmail = (value: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);

export function parseAdditionalAttendees(
  value: unknown,
  primaryEmail: string,
  maximum = 9,
) {
  if (value === undefined || value === null) return [];
  if (!Array.isArray(value))
    throw new AttendeeInputError("Additional attendees must be a list.");
  if (value.length > maximum)
    throw new AttendeeInputError(
      `Add no more than ${maximum} additional attendees.`,
    );

  const seen = new Set([primaryEmail.trim().toLowerCase()]);
  return value.map((candidate) => {
    const input =
      candidate && typeof candidate === "object"
        ? (candidate as Record<string, unknown>)
        : {};
    const name = safeText(input.name, 80);
    const email = safeText(input.email, 254).toLowerCase();
    if (name.length < 2)
      throw new AttendeeInputError("Enter a name for every attendee.");
    if (!validEmail(email))
      throw new AttendeeInputError("Enter a valid email for every attendee.");
    if (seen.has(email))
      throw new AttendeeInputError("Each attendee email must be unique.");
    seen.add(email);
    return { name, email };
  });
}

export function attendeeInsertStatements(
  env: Env,
  bookingId: string,
  attendees: Array<{ name: string; email: string }>,
  source: "visitor" | "organizer",
  now = new Date().toISOString(),
) {
  return attendees.map((attendee) =>
    env.DB.prepare(
      `INSERT INTO booking_attendees
       (id,booking_id,name,email,source,created_at,updated_at)
       VALUES (?,?,?,?,?,?,?)`,
    ).bind(
      crypto.randomUUID(),
      bookingId,
      attendee.name,
      attendee.email,
      source,
      now,
      now,
    ),
  );
}

export async function replaceAdditionalAttendees(
  env: Env,
  bookingId: string,
  attendees: Array<{ name: string; email: string }>,
  source: "visitor" | "organizer",
) {
  await env.DB.batch([
    env.DB.prepare("DELETE FROM booking_attendees WHERE booking_id=?").bind(
      bookingId,
    ),
    ...attendeeInsertStatements(env, bookingId, attendees, source),
  ]);
}

export async function listMeetingAttendees(
  env: Env,
  booking: Pick<BookingRow, "id" | "name" | "email">,
): Promise<MeetingAttendee[]> {
  const additional = await env.DB.prepare(
    "SELECT name,email,source FROM booking_attendees WHERE booking_id=? ORDER BY created_at,id",
  )
    .bind(booking.id)
    .all<{
      name: string;
      email: string;
      source: "visitor" | "organizer";
    }>();
  return [
    {
      name: booking.name,
      email: booking.email,
      primary: true,
      source: "primary",
    },
    ...additional.results.map((attendee) => ({
      ...attendee,
      primary: false,
    })),
  ];
}
