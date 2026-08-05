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
      "Availability received",
      "Hello Taylor.\n\nWe will follow up shortly.",
      "owner@example.com",
      undefined,
      "https://meet.example.com/manage/example",
      "Monday, August 10 at 10:00 AM UTC",
    );

    expect(html).toContain("<!DOCTYPE html");
    expect(html).toContain("Thanks, we have your preferred time");
    expect(html).toContain("Scheduling, without the overhead.");
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
        created_at: "2026-08-04T00:00:00.000Z",
        updated_at: "2026-08-04T00:00:00.000Z",
      },
      env as never,
    );
    const decodedInvite = Buffer.from(invite, "base64").toString("utf8");

    expect(decodedInvite).toContain(
      "ORGANIZER;CN=Slotloom:mailto:owner@example.com",
    );
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
