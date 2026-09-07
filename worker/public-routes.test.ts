import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const calendar = vi.hoisted(() => ({
  ensureProviderMeeting: vi.fn(),
  cancelProviderMeeting: vi.fn(),
  syncProviderMeeting: vi.fn(),
}));

vi.mock("./calendar-integrations", () => calendar);

import { publicLink } from "./public-routes";

const startsAt = "2026-09-08T09:00:00.000Z";

function bookingEnvironment() {
  let booking: Record<string, unknown> | null = null;
  const executed: Array<{ query: string; values: unknown[] }> = [];
  const link = {
    id: "link-1",
    slug: "interview",
    internal_name: "Interview",
    title: "Product interview",
    description: "Choose a time.",
    duration_minutes: 30,
    slot_interval_minutes: 30,
    buffer_minutes: 0,
    time_zone: "UTC",
    days_ahead: 2,
    minimum_notice_hours: 0,
    valid_from: null,
    valid_until: null,
    status: "active",
    allow_slot_holds: 0,
    allow_custom_meeting_title: 0,
    allow_additional_attendees: 0,
    created_by: "owner@example.com",
    created_at: "2026-09-01T00:00:00.000Z",
    updated_at: "2026-09-01T00:00:00.000Z",
  };
  const connection = {
    id: "connection-1",
    provider: "google",
    workspace_user_email: "owner@example.com",
    provider_user_id: "provider-user-1",
    provider_email: "owner@example.com",
    access_token_jwe: "encrypted-access-token",
    refresh_token_jwe: "encrypted-refresh-token",
    token_expires_at: "2026-09-08T12:00:00.000Z",
    scopes: "calendar",
    status: "active",
    last_error: null,
    created_at: "2026-09-01T00:00:00.000Z",
    updated_at: "2026-09-01T00:00:00.000Z",
  };

  function prepare(query: string) {
    let values: unknown[] = [];
    const statement = {
      query,
      get values() {
        return values;
      },
      bind(...next: unknown[]) {
        values = next;
        return statement;
      },
      async first() {
        if (query.includes("FROM booking_links")) return link;
        if (query.includes("setting_key='calendar_provider'"))
          return { setting_value: "google" };
        if (
          query.includes("FROM calendar_connections") &&
          query.includes("workspace_user_email")
        )
          return connection;
        if (query.includes("SELECT request_count")) return { request_count: 1 };
        if (query.includes("SELECT b.*"))
          return booking
            ? {
                ...booking,
                link_title: link.title,
                link_slug: link.slug,
                link_created_by: link.created_by,
                duration_minutes: link.duration_minutes,
                meeting_provider_account: booking.meeting_provider_connection_id
                  ? connection.provider_email
                  : null,
                email_count: 0,
              }
            : null;
        return null;
      },
      async all() {
        if (query.includes("FROM availability_rules"))
          return {
            results: [
              {
                id: "rule-1",
                booking_link_id: link.id,
                weekday: 2,
                start_time: "09:00",
                end_time: "09:30",
              },
            ],
          };
        if (query.includes("SELECT starts_at FROM bookings"))
          return { results: booking ? [{ starts_at: booking.starts_at }] : [] };
        return { results: [] };
      },
      async run() {
        executed.push({ query, values });
        if (query.startsWith("DELETE FROM bookings")) booking = null;
        if (query.includes("workflow_status='confirmed'") && booking)
          booking = {
            ...booking,
            workflow_status: "confirmed",
            meeting_sent_at: values[0],
            updated_at: values[1],
          };
        return { success: true, results: [], meta: {} };
      },
    };
    return statement;
  }

  const DB = {
    prepare,
    withSession() {
      return DB;
    },
    async batch(statements: Array<ReturnType<typeof prepare>>) {
      for (const statement of statements) {
        executed.push({ query: statement.query, values: statement.values });
        if (statement.query.startsWith("INSERT INTO bookings")) {
          const values = statement.values;
          booking = {
            id: values[0],
            booking_link_id: values[1],
            name: values[2],
            email: values[3],
            phone: values[4],
            company: values[5],
            starts_at: values[6],
            final_starts_at: values[7],
            time_zone: values[8],
            message: values[9],
            status: "new",
            workflow_status: "new",
            meeting_title: values[10],
            meeting_provider_preference: values[11],
            assigned_to: values[12],
            admin_note: null,
            meeting_url: null,
            meeting_notes: null,
            meeting_sent_at: null,
            meeting_provider: null,
            meeting_provider_event_id: null,
            meeting_provider_connection_id: null,
            meeting_provider_synced_at: null,
            created_at: values[21],
            updated_at: values[22],
          };
        }
      }
      return statements.map(() => ({ success: true, results: [], meta: {} }));
    },
  };

  return {
    env: {
      APP_URL: "https://meet.example.com",
      BOOTSTRAP_OWNER_EMAIL: "owner@example.com",
      DB,
    },
    executed,
    get booking() {
      return booking;
    },
    updateBooking(values: Record<string, unknown>) {
      booking = booking ? { ...booking, ...values } : null;
    },
  };
}

function bookingRequest() {
  return new Request("https://meet.example.com/api/public/links/interview", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      name: "Taylor Visitor",
      email: "taylor@example.com",
      phone: "",
      startsAt,
      timeZone: "UTC",
      turnstileToken: "",
    }),
  });
}

describe("instant public booking", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime("2026-09-07T08:00:00.000Z");
    calendar.ensureProviderMeeting.mockReset();
  });

  afterEach(() => vi.useRealTimers());

  it("creates the provider event and returns a confirmed meeting", async () => {
    const state = bookingEnvironment();
    calendar.ensureProviderMeeting.mockImplementation(async (_env, booking) => {
      const providerValues = {
        meeting_url: "https://meet.google.com/abc-defg-hij",
        meeting_provider: "google",
        meeting_provider_event_id: "provider-event-1",
        meeting_provider_connection_id: "connection-1",
        meeting_provider_synced_at: new Date().toISOString(),
      };
      state.updateBooking(providerValues);
      return { ...booking, ...providerValues };
    });

    const response = await publicLink(
      bookingRequest(),
      state.env as never,
      "interview",
    );

    expect(response.status).toBe(201);
    await expect(response.json()).resolves.toMatchObject({
      status: "confirmed",
      startsAt,
      meetingUrl: "https://meet.google.com/abc-defg-hij",
      meetingProvider: "google",
      meetingLinkPending: false,
    });
    expect(calendar.ensureProviderMeeting).toHaveBeenCalledOnce();
    expect(state.booking).toMatchObject({
      workflow_status: "confirmed",
      assigned_to: "owner@example.com",
      meeting_title: "Product interview",
      meeting_sent_at: expect.any(String),
    });
    expect(
      state.executed.some(({ query }) => query.includes("email_events")),
    ).toBe(false);
  });

  it("releases the slot when the provider creates no external event", async () => {
    const state = bookingEnvironment();
    calendar.ensureProviderMeeting.mockRejectedValue(
      new Error("Provider unavailable"),
    );

    const response = await publicLink(
      bookingRequest(),
      state.env as never,
      "interview",
    );

    expect(response.status).toBe(503);
    await expect(response.json()).resolves.toEqual({
      error:
        "The organizer's calendar is temporarily unavailable. No meeting was booked; please try again later.",
    });
    expect(calendar.ensureProviderMeeting).toHaveBeenCalledTimes(2);
    expect(state.booking).toBeNull();
  });

  it("keeps a created provider event when its join link is still syncing", async () => {
    const state = bookingEnvironment();
    calendar.ensureProviderMeeting.mockImplementation(async () => {
      state.updateBooking({
        meeting_provider: "google",
        meeting_provider_event_id: "provider-event-1",
        meeting_provider_connection_id: "connection-1",
      });
      throw new Error("Join link pending");
    });

    const response = await publicLink(
      bookingRequest(),
      state.env as never,
      "interview",
    );

    expect(response.status).toBe(201);
    await expect(response.json()).resolves.toMatchObject({
      status: "confirmed",
      meetingUrl: null,
      meetingProvider: "google",
      meetingLinkPending: true,
    });
    expect(state.booking).toMatchObject({
      workflow_status: "confirmed",
      meeting_provider_event_id: "provider-event-1",
    });
    expect(calendar.ensureProviderMeeting).toHaveBeenCalledTimes(2);
    expect(
      state.executed.some(({ query }) =>
        query.startsWith("DELETE FROM bookings"),
      ),
    ).toBe(false);
  });
});
