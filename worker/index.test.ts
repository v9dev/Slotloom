import { afterEach, describe, expect, it, vi } from "vitest";
import {
  authorizeAdmin,
  emailContent,
  meetingOwner,
  slotsForSchedule,
} from "./index";
import {
  calendarInvite,
  renderEmailHtml,
  slotloomSender,
  turnstileConfiguration,
  verifyTurnstile,
} from "./domain";
import { pageTitle } from "../src/brand";
import { decryptSecret, encryptSecret } from "./secret-crypto";
import {
  extractGoogleMeetingLink,
  extractMicrosoftMeetingLink,
} from "./calendar-integrations";
import { googleEventBody, microsoftEventBody } from "./calendar-event-data";
import {
  connectionForMeeting,
  meetingProviderForBooking,
} from "./calendar-connection-selection";
import {
  calendarOAuthRedirect,
  calendarOAuthStartResponse,
  readCalendarOAuthState,
} from "./calendar-oauth-urls";
import { gmailRawMessage } from "./email-mime";
import { grantsMailSend, oauthScopes } from "./oauth-scopes";
import { deliverEmail } from "./email-delivery";
import { providerOwnsLifecycleMessage } from "./booking-admin";
import { parseLinkInput } from "./public-routes";
import {
  AttendeeInputError,
  parseAdditionalAttendees,
} from "./meeting-attendees";

const env = {
  APP_URL: "https://meet.example.com",
  BOOTSTRAP_OWNER_EMAIL: "owner@example.com",
};

afterEach(() => vi.restoreAllMocks());

describe("pageTitle", () => {
  it("combines the current page, brand, and tagline", () => {
    expect(pageTitle("Booking links")).toBe(
      "Booking links · Slotloom | Scheduling, without the overhead.",
    );
    expect(pageTitle()).toBe("Slotloom | Scheduling, without the overhead.");
  });
});

describe("slotsForSchedule", () => {
  it("respects a link's duration, interval, and weekday window", () => {
    const slots = slotsForSchedule(
      {
        time_zone: "UTC",
        days_ahead: 1,
        minimum_notice_hours: 0,
        duration_minutes: 30,
        slot_interval_minutes: 30,
        buffer_minutes: 0,
      },
      [
        {
          id: "rule",
          booking_link_id: "link",
          weekday: 2,
          start_time: "09:00",
          end_time: "10:30",
        },
      ],
      new Date("2026-08-03T00:00:00.000Z"),
    );
    expect(slots.map((slot) => slot.startsAt)).toEqual([
      "2026-08-04T09:00:00.000Z",
      "2026-08-04T09:30:00.000Z",
      "2026-08-04T10:00:00.000Z",
    ]);
  });

  it("keeps the configured buffer between generated meeting starts", () => {
    const slots = slotsForSchedule(
      {
        time_zone: "UTC",
        days_ahead: 1,
        minimum_notice_hours: 0,
        duration_minutes: 30,
        slot_interval_minutes: 15,
        buffer_minutes: 15,
      },
      [
        {
          id: "rule",
          booking_link_id: "link",
          weekday: 2,
          start_time: "09:00",
          end_time: "11:00",
        },
      ],
      new Date("2026-08-03T00:00:00.000Z"),
    );
    expect(slots.map((slot) => slot.startsAt)).toEqual([
      "2026-08-04T09:00:00.000Z",
      "2026-08-04T09:45:00.000Z",
      "2026-08-04T10:30:00.000Z",
    ]);
  });

  it("includes same-day slots when a complete meeting still fits", () => {
    const slots = slotsForSchedule(
      {
        time_zone: "UTC",
        days_ahead: 1,
        minimum_notice_hours: 0,
        duration_minutes: 30,
        slot_interval_minutes: 30,
        buffer_minutes: 0,
      },
      [
        {
          id: "rule",
          booking_link_id: "link",
          weekday: 2,
          start_time: "10:00",
          end_time: "17:00",
        },
      ],
      new Date("2026-08-04T15:10:00.000Z"),
    );

    expect(slots.map((slot) => slot.startsAt)).toEqual([
      "2026-08-04T15:30:00.000Z",
      "2026-08-04T16:00:00.000Z",
      "2026-08-04T16:30:00.000Z",
    ]);
  });

  it("uses the exact date range instead of truncating it by days ahead", () => {
    const slots = slotsForSchedule(
      {
        time_zone: "UTC",
        days_ahead: 1,
        minimum_notice_hours: 0,
        duration_minutes: 30,
        slot_interval_minutes: 30,
        buffer_minutes: 0,
        valid_from: "2026-08-10",
        valid_until: "2026-08-12",
      },
      [1, 2, 3].map((weekday) => ({
        id: `rule-${weekday}`,
        booking_link_id: "link",
        weekday,
        start_time: "09:00",
        end_time: "09:30",
      })),
      new Date("2026-08-04T00:00:00.000Z"),
    );

    expect(slots.map((slot) => slot.startsAt)).toEqual([
      "2026-08-10T09:00:00.000Z",
      "2026-08-11T09:00:00.000Z",
      "2026-08-12T09:00:00.000Z",
    ]);
  });
});

describe("parseLinkInput", () => {
  const requestForRange = (validFrom: string, validUntil: string) =>
    new Request("https://meet.example.com/api/admin/links", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        title: "Product introduction",
        slug: "product-introduction",
        durationMinutes: 30,
        slotIntervalMinutes: 30,
        bufferMinutes: 0,
        timeZone: "UTC",
        validFrom,
        validUntil,
        status: "active",
        availability: [{ weekday: 1, startTime: "09:00", endTime: "17:00" }],
      }),
    });

  it("defaults new links to no advance notice and derives compatibility days", async () => {
    const input = await parseLinkInput(
      requestForRange("2026-08-10", "2026-08-12"),
    );

    expect(input?.minimumNoticeHours).toBe(0);
    expect(input?.daysAhead).toBe(2);
  });

  it("rejects date ranges longer than 365 days", async () => {
    expect(
      await parseLinkInput(requestForRange("2026-01-01", "2027-01-02")),
    ).toBeNull();
  });
});

describe("emailContent", () => {
  it("escapes attendee content in HTML and includes a reschedule URL", () => {
    const content = emailContent(
      "missed",
      {
        id: "booking-1",
        name: "<Taylor & Co>",
        email: "taylor@example.com",
        starts_at: "2026-08-10T04:30:00.000Z",
        time_zone: "Asia/Kolkata",
        message: null,
        status: "missed",
        admin_note: null,
        created_at: "2026-08-04T00:00:00.000Z",
        updated_at: "2026-08-04T00:00:00.000Z",
      },
      env as never,
    );

    expect(content.subject).toBe("Sorry we missed our meeting");
    expect(content.html).toContain("&lt;Taylor &amp; Co&gt;");
    expect(content.html).toContain("https://meet.example.com/");
    expect(content.html).toContain("mailto:owner@example.com");
    expect(content.html).not.toContain("<Taylor & Co>");
  });

  it("renders the React email template to complete HTML", async () => {
    const html = await renderEmailHtml(
      env as never,
      "Meeting confirmed",
      "Hello Taylor.\n\nYour meeting is ready.",
      "owner@example.com",
      undefined,
      "https://meet.example.com/manage/example",
      "Monday, August 10 at 10:00 AM UTC",
    );

    expect(html).toContain("<!DOCTYPE html");
    expect(html).toContain("Your meeting is ready");
    expect(html).toContain("Scheduling, without the overhead.");
    expect(html.replaceAll("<!-- -->", "")).toContain(
      "© 2026 Slotloom. Scheduling, without the overhead.",
    );
    expect(html).not.toContain("for the meeting organizer");
    expect(html).toContain("Hello Taylor.");
    expect(html).toContain("https://meet.example.com/manage/example");
  });

  it("identifies Slotloom as the sender and calendar organizer", () => {
    expect(slotloomSender("Meetings <meetings@example.com>")).toEqual({
      email: "meetings@example.com",
      name: "Slotloom",
    });

    const invite = calendarInvite(
      {
        id: "booking-1",
        name: "Taylor",
        email: "taylor@example.com",
        starts_at: "2026-08-10T04:30:00.000Z",
        final_starts_at: null,
        time_zone: "UTC",
        phone: null,
        company: null,
        message: null,
        status: "confirmed",
        workflow_status: "confirmed",
        admin_note: null,
        meeting_url: "https://meet.example.com/room",
        meeting_notes: null,
        meeting_sent_at: null,
        assigned_to: "owner@example.com",
        booking_link_id: "link-1",
        link_title: "Product review",
        created_at: "2026-08-04T00:00:00.000Z",
        updated_at: "2026-08-04T00:00:00.000Z",
      },
      env as never,
      "Slotloom",
      [{ email: "taylor@example.com" }, { email: "guest@example.com" }],
    );
    expect(invite).toContain("ORGANIZER;CN=Slotloom:mailto:owner@example.com");
    expect(invite).toContain("BEGIN:VCALENDAR");
    expect(invite).toContain("SUMMARY:Product review — Taylor");
    expect(invite).toContain("ATTENDEE;RSVP=TRUE:mailto:guest@example.com");
  });

  it("builds Gmail MIME and keeps Worker attachments as raw content", async () => {
    const message = {
      to: "visitor@example.com",
      replyTo: "owner@example.com",
      subject: "Meeting confirmed",
      text: "Join the meeting.",
      html: "<p>Join the meeting.</p>",
      attachments: [
        {
          content: "BEGIN:VCALENDAR\r\nEND:VCALENDAR",
          filename: "meeting.ics",
          type: "text/calendar",
        },
      ],
    };
    const raw = gmailRawMessage("owner@example.com", message);
    const decoded = Buffer.from(
      raw.replaceAll("-", "+").replaceAll("_", "/"),
      "base64",
    ).toString("utf8");
    expect(decoded).toContain("To: visitor@example.com");
    expect(decoded).toContain('filename="meeting.ics"');

    const send = vi.fn(async () => ({ messageId: "worker-message" }));
    const result = await deliverEmail(
      {
        EMAIL: { send },
        FROM_EMAIL: "Slotloom <notifications@example.com>",
      } as never,
      "owner@example.com",
      message,
      { method: "worker", workerFallback: false },
    );
    expect(result.deliveryMethod).toBe("worker");
    expect(send.mock.calls[0][0].attachments?.[0].content).toContain(
      "BEGIN:VCALENDAR",
    );
  });

  it("uses Worker Email only when the owner enabled OAuth fallback", async () => {
    const send = vi.fn(async () => ({ messageId: "fallback-message" }));
    const database = {
      prepare: () => ({
        bind: () => ({
          first: async () => null,
          all: async () => ({ results: [] }),
        }),
      }),
    };
    const result = await deliverEmail(
      {
        DB: database,
        EMAIL: { send },
        FROM_EMAIL: "notifications@example.com",
        BOOTSTRAP_OWNER_EMAIL: "owner@example.com",
      } as never,
      "member@example.com",
      {
        to: "visitor@example.com",
        subject: "Test",
        text: "Test",
        html: "<p>Test</p>",
      },
      { method: "google", workerFallback: true },
    );
    expect(result.deliveryMethod).toBe("worker");
    expect(result.usedWorkerFallback).toBe(true);
    expect(send).toHaveBeenCalledOnce();

    send.mockClear();
    await expect(
      deliverEmail(
        {
          DB: database,
          EMAIL: { send },
          FROM_EMAIL: "notifications@example.com",
          BOOTSTRAP_OWNER_EMAIL: "owner@example.com",
        } as never,
        "member@example.com",
        {
          to: "visitor@example.com",
          subject: "Test",
          text: "Test",
          html: "<p>Test</p>",
        },
        { method: "google", workerFallback: false },
      ),
    ).rejects.toThrow("No active Google Gmail connection");
    expect(send).not.toHaveBeenCalled();
  });

  it("keeps meeting email on its selected provider before workspace fallback", async () => {
    const connectionLookups: string[] = [];
    const database = {
      prepare: (query: string) => {
        let values: unknown[] = [];
        const first = async () => {
          if (query.includes("workspace_users WHERE email"))
            return { email_provider_preference: "microsoft" };
          if (query.includes("SELECT * FROM calendar_connections")) {
            connectionLookups.push(String(values[0]));
            return values[0] === "microsoft"
              ? {
                  id: "member-microsoft",
                  provider: "microsoft",
                  provider_email: "member@example.com",
                  scopes: "Mail.Send",
                  status: "active",
                }
              : null;
          }
          return null;
        };
        const all = async () => {
          if (query.includes("workspace_settings"))
            return {
              results: [
                {
                  setting_key: "email_fallback_method",
                  setting_value: "none",
                },
              ],
            };
          return { results: [] };
        };
        return {
          first,
          all,
          bind: (...bound: unknown[]) => {
            values = bound;
            return { first, all };
          },
        };
      },
    };

    await expect(
      deliverEmail(
        { DB: database } as never,
        "member@example.com",
        {
          to: "visitor@example.com",
          subject: "Meeting reminder",
          text: "Join the meeting.",
          html: "<p>Join the meeting.</p>",
        },
        undefined,
        "google",
      ),
    ).rejects.toThrow(
      "No personal mailbox or workspace email fallback is available.",
    );
    expect(connectionLookups).toEqual(["google"]);
  });
});

describe("authorizeAdmin", () => {
  it("allows the explicit local token fallback", async () => {
    const request = new Request("http://localhost/api/admin/bookings", {
      headers: { authorization: "Bearer local-secret" },
    });
    const identity = await authorizeAdmin(request, {
      ADMIN_TOKEN: "local-secret",
      TEAM_DOMAIN: "",
      POLICY_AUD: "",
    } as never);
    expect(identity?.email).toBe("local-development");
  });

  it("disables bearer tokens in production mode", async () => {
    const request = new Request("https://meet.example.com/api/admin/bookings", {
      headers: { authorization: "Bearer local-secret" },
    });
    const identity = await authorizeAdmin(request, {
      ADMIN_TOKEN: "local-secret",
      TEAM_DOMAIN: "",
      POLICY_AUD: "",
    } as never);
    expect(identity).toBeNull();
  });
});

describe("Turnstile", () => {
  it("requires the site key and secret to be configured together", () => {
    expect(turnstileConfiguration({} as never)).toEqual({
      enabled: false,
      siteKey: null,
      valid: true,
    });
    expect(
      turnstileConfiguration({ TURNSTILE_SITE_KEY: "public-key" } as never),
    ).toEqual({ enabled: false, siteKey: "public-key", valid: false });
    expect(
      turnstileConfiguration({
        TURNSTILE_SITE_KEY: "public-key",
        TURNSTILE_SECRET: "private-key",
      } as never),
    ).toEqual({ enabled: true, siteKey: "public-key", valid: true });
  });

  it("validates the Siteverify hostname and booking action", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      Response.json({
        success: true,
        hostname: "meet.example.com",
        action: "booking-submit",
      }),
    );
    const valid = await verifyTurnstile(
      "visitor-token",
      new Request("https://api.example.com/api/public/links/consultation"),
      {
        APP_URL: "https://meet.example.com",
        TURNSTILE_SITE_KEY: "public-key",
        TURNSTILE_SECRET: "private-key",
      } as never,
    );
    expect(valid).toBe(true);
  });

  it("rejects a token issued for another hostname or action", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      Response.json({
        success: true,
        hostname: "attacker.example.com",
        action: "different-form",
      }),
    );
    const valid = await verifyTurnstile(
      "visitor-token",
      new Request("https://api.example.com/api/public/links/consultation"),
      {
        APP_URL: "https://meet.example.com",
        TURNSTILE_SITE_KEY: "public-key",
        TURNSTILE_SECRET: "private-key",
      } as never,
    );
    expect(valid).toBe(false);
  });
});

describe("calendar integration security", () => {
  it("uses one provider invitation for managed meeting lifecycle messages", () => {
    expect(
      providerOwnsLifecycleMessage(
        "meeting_details",
        { meeting_provider_event_id: null },
        { meeting_provider_event_id: "google-event" },
      ),
    ).toBe(true);
    expect(
      providerOwnsLifecycleMessage(
        "cancelled",
        { meeting_provider_event_id: "teams-event" },
        { meeting_provider_event_id: null },
      ),
    ).toBe(true);
    expect(
      providerOwnsLifecycleMessage(
        "reminder",
        { meeting_provider_event_id: "google-event" },
        { meeting_provider_event_id: "google-event" },
      ),
    ).toBe(false);
  });

  it("requests calendar access first and mail access only when enabled", () => {
    expect(oauthScopes("google")).not.toContain(
      "https://www.googleapis.com/auth/gmail.send",
    );
    expect(oauthScopes("microsoft")).not.toContain("Mail.Send");
    expect(oauthScopes("google", true)).toContain(
      "https://www.googleapis.com/auth/gmail.send",
    );
    expect(oauthScopes("microsoft", true)).toContain("Mail.Send");
    expect(
      grantsMailSend(
        "google",
        "openid https://www.googleapis.com/auth/gmail.send",
      ),
    ).toBe(true);
    expect(grantsMailSend("microsoft", "User.Read Mail.Send")).toBe(true);
    expect(grantsMailSend("microsoft", "User.Read Calendars.ReadWrite")).toBe(
      false,
    );
  });

  it("stores provider secrets as authenticated JWE ciphertext", async () => {
    const key = Buffer.alloc(32, 7).toString("base64");
    const plaintext = "provider-client-secret";
    const ciphertext = await encryptSecret(plaintext, key);

    expect(ciphertext.split(".")).toHaveLength(5);
    expect(ciphertext).not.toContain(plaintext);
    expect(await decryptSecret(ciphertext, key)).toBe(plaintext);
    await expect(
      decryptSecret(ciphertext, Buffer.alloc(32, 8).toString("base64")),
    ).rejects.toThrow();
  });

  it("extracts joining links from Google and Microsoft event responses", () => {
    expect(
      extractGoogleMeetingLink({
        conferenceData: {
          entryPoints: [
            { entryPointType: "phone", uri: "tel:+10000000000" },
            {
              entryPointType: "video",
              uri: "https://meet.google.com/abc-defg-hij",
            },
          ],
        },
      }),
    ).toBe("https://meet.google.com/abc-defg-hij");
    expect(
      extractMicrosoftMeetingLink({
        onlineMeeting: {
          joinUrl: "https://teams.microsoft.com/l/meetup-join/example",
        },
      }),
    ).toBe("https://teams.microsoft.com/l/meetup-join/example");
  });

  it("builds native online meeting event payloads", () => {
    const booking = {
      id: "booking-1",
      name: "Taylor",
      email: "taylor@example.com",
      starts_at: "2026-08-10T04:30:00.000Z",
      final_starts_at: null,
      duration_minutes: 45,
      link_title: "Product review",
      meeting_title: "Roadmap planning",
      meeting_notes:
        "Bring the <project> brief.\nNo scripts: <script>alert(1)</script>",
    } as never;
    const attendees = [
      { name: "Taylor", email: "taylor@example.com" },
      { name: "Jordan", email: "jordan@example.com" },
    ];
    const brand = {
      name: "Northstar",
      tagline: "Make every conversation count.",
      logo: "/logo.svg",
      logoDark: "/logo-dark.svg",
      favicon: "/mark.svg",
      primaryColor: "#123456",
      accentColor: "#654321",
    };
    const google = googleEventBody(booking, true, attendees, brand);
    const microsoft = microsoftEventBody(booking, true, attendees, brand);

    expect(google.conferenceData.createRequest.conferenceSolutionKey.type).toBe(
      "hangoutsMeet",
    );
    expect(google.summary).toBe("Product review: Roadmap planning — Taylor");
    expect(google.attendees).toEqual([
      { email: "taylor@example.com" },
      { email: "jordan@example.com" },
    ]);
    expect(google.description).toContain("Northstar · Confirmed meeting");
    expect(google.description).toContain("Roadmap planning");
    expect(google.description).toContain("Jordan");
    expect(google.description).toContain("&lt;project&gt;");
    expect(google.description).not.toContain("<script>");
    expect(google.description).toContain("background-color:#123456");
    expect(microsoft.isOnlineMeeting).toBe(true);
    expect(microsoft.onlineMeetingProvider).toBe("teamsForBusiness");
    expect(microsoft.transactionId).toBe("booking-1");
    expect(microsoft.subject).toBe("Product review: Roadmap planning — Taylor");
    expect(microsoft.body.contentType).toBe("HTML");
    expect(microsoft.body.content).toBe(google.description);

    const withoutTopic = googleEventBody(
      { ...booking, meeting_title: "Product review" } as never,
      true,
      attendees,
      brand,
    );
    expect(withoutTopic.summary).toBe("Product review — Taylor");
    expect(withoutTopic.summary).not.toContain("Jordan");
  });

  it("uses a response override and falls back to an owner connection", async () => {
    const ownerConnection = {
      id: "owner-google",
      provider: "google",
      workspace_user_email: "owner@example.com",
      status: "active",
    };
    const database = {
      prepare: (query: string) => {
        const first = async () =>
          query.includes("JOIN workspace_users") ? ownerConnection : null;
        return { first, bind: () => ({ first }) };
      },
    };
    const provider = await meetingProviderForBooking(
      { DB: database } as never,
      { meeting_provider_preference: "google" } as never,
    );
    const selected = await connectionForMeeting(
      {
        DB: database,
        BOOTSTRAP_OWNER_EMAIL: "owner@example.com",
      } as never,
      "google",
      "member@example.com",
    );

    expect(provider).toBe("google");
    expect(selected.usedOwnerFallback).toBe(true);
    expect(selected.connection?.id).toBe("owner-google");
  });

  it("validates and deduplicates additional attendees", () => {
    expect(
      parseAdditionalAttendees(
        [
          { name: "Jordan", email: "JORDAN@example.com" },
          { name: "Morgan", email: "morgan@example.com" },
        ],
        "taylor@example.com",
      ),
    ).toEqual([
      { name: "Jordan", email: "jordan@example.com" },
      { name: "Morgan", email: "morgan@example.com" },
    ]);
    expect(() =>
      parseAdditionalAttendees(
        [{ name: "Taylor", email: "taylor@example.com" }],
        "taylor@example.com",
      ),
    ).toThrow(AttendeeInputError);
  });

  it("binds OAuth state to a short-lived HttpOnly browser cookie", async () => {
    const started = calendarOAuthStartResponse(
      { APP_URL: "https://meet.example.com" } as never,
      "google",
      "browser-state",
      "https://accounts.google.com/o/oauth2/v2/auth?state=browser-state",
    );
    const cookie = started.headers.get("set-cookie") || "";
    const body = await started.json<{ authorizationUrl: string }>();
    const request = new Request(
      "https://meet.example.com/api/oauth/google/callback",
      { headers: { cookie: cookie.split(";")[0] } },
    );

    expect(cookie).toContain("HttpOnly");
    expect(cookie).toContain("SameSite=Lax");
    expect(cookie).toContain("Secure");
    expect(Object.keys(body)).toEqual(["authorizationUrl"]);
    expect(readCalendarOAuthState(request, "google")).toBe("browser-state");
    expect(
      calendarOAuthRedirect(
        { APP_URL: "https://meet.example.com" } as never,
        "google",
        "connected",
      ).headers.get("location"),
    ).toBe(
      "https://meet.example.com/admin?connections=open&oauth=connected&provider=google",
    );
    expect(
      calendarOAuthRedirect(
        { APP_URL: "https://meet.example.com" } as never,
        "google",
        "connected",
      ).headers.get("set-cookie"),
    ).toContain("Max-Age=0");
    expect(
      calendarOAuthRedirect(
        { APP_URL: "https://meet.example.com" } as never,
        "microsoft",
        "connected",
        undefined,
        "integrations",
      ).headers.get("location"),
    ).toBe(
      "https://meet.example.com/admin/integrations?oauth=connected&provider=microsoft",
    );
  });
});

describe("meetingOwner", () => {
  it("prefers the assignee, then link creator, then owner fallback", () => {
    expect(
      meetingOwner(
        {
          assigned_to: "assignee@example.com",
          link_created_by: "creator@example.com",
        },
        "owner@example.com",
      ),
    ).toBe("assignee@example.com");
    expect(
      meetingOwner(
        { assigned_to: null, link_created_by: "creator@example.com" },
        "owner@example.com",
      ),
    ).toBe("creator@example.com");
    expect(
      meetingOwner(
        { assigned_to: null, link_created_by: null },
        "owner@example.com",
      ),
    ).toBe("owner@example.com");
  });
});
