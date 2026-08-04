import { describe, expect, it } from "vitest";
import {
  authorizeAdmin,
  availableSlots,
  emailContent,
  meetingOwner,
  slotsForSchedule,
} from "./index";

const env = {
  APP_NAME: "Slotloom",
  APP_URL: "https://meet.example.com",
  TIME_ZONE: "Asia/Kolkata",
  DAYS_AHEAD: "14",
  SLOT_TIMES: "10:00,14:00",
  ORGANIZER_EMAIL: "owner@example.com",
};

describe("availableSlots", () => {
  it("creates valid, future weekday slots in the configured timezone", () => {
    const slots = availableSlots(env as never);
    expect(slots.length).toBeGreaterThan(0);
    for (const slot of slots) {
      expect(new Date(slot.startsAt).getTime()).toBeGreaterThan(Date.now());
      expect(slot.label).toMatch(/10:00 AM|2:00 PM/);
      expect(slot.label).not.toMatch(/Saturday|Sunday/);
    }
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
});

describe("authorizeAdmin", () => {
  it("allows the explicit local token fallback", async () => {
    const request = new Request("http://localhost/api/admin/bookings", {
      headers: { authorization: "Bearer local-secret" },
    });
    const identity = await authorizeAdmin(request, {
      ALLOW_ADMIN_TOKEN: "true",
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
      ALLOW_ADMIN_TOKEN: "false",
      ADMIN_TOKEN: "local-secret",
      TEAM_DOMAIN: "",
      POLICY_AUD: "",
    } as never);
    expect(identity).toBeNull();
  });
});

describe("meetingOwner", () => {
  it("prefers the assignee, then link creator, then organizer fallback", () => {
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
