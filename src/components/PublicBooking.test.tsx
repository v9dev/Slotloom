// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { api } from "@/api";
import PublicBooking from "./PublicBooking";

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe("PublicBooking unavailable state", () => {
  it("renders an expired booking link as a full-width recovery card", async () => {
    vi.spyOn(api, "publicLink").mockRejectedValue(
      new Error("This booking link has expired."),
    );

    render(<PublicBooking slug="expired-link" />);

    const heading = await screen.findByRole("heading", {
      name: "This booking window has closed",
    });
    const card = heading.closest('[data-slot="card"]');

    expect(card?.classList.contains("w-full")).toBe(true);
    expect(screen.getByText("Link expired")).toBeTruthy();
    expect(screen.getByRole("link", { name: "Return home" })).toHaveProperty(
      "href",
      `${window.location.origin}/`,
    );
    expect(screen.queryByRole("button", { name: "Try again" })).toBeNull();
  });

  it("offers a retry when availability fails unexpectedly", async () => {
    vi.spyOn(api, "publicLink").mockRejectedValue(new Error("Network error"));

    render(<PublicBooking slug="temporarily-unavailable" />);

    await screen.findByRole("heading", {
      name: "We couldn’t load this booking page",
    });
    expect(screen.getByRole("button", { name: "Try again" })).toBeTruthy();
  });
});

describe("PublicBooking confirmation", () => {
  it("books immediately and shows the provider meeting link", async () => {
    const startsAt = "2026-09-08T09:00:00.000Z";
    vi.spyOn(api, "publicLink").mockResolvedValue({
      link: {
        id: "link-1",
        slug: "interview",
        internalName: "Interview",
        title: "Product interview",
        description: "Choose a time that works for you.",
        durationMinutes: 30,
        slotIntervalMinutes: 30,
        bufferMinutes: 0,
        timeZone: "UTC",
        daysAhead: 14,
        minimumNoticeHours: 0,
        validFrom: null,
        validUntil: null,
        status: "active",
        allowSlotHolds: false,
        allowCustomMeetingTitle: true,
        allowAdditionalAttendees: false,
        createdBy: "owner@example.com",
        createdAt: "2026-09-01T00:00:00.000Z",
        updatedAt: "2026-09-01T00:00:00.000Z",
        responseCount: 0,
        pendingCount: 0,
        confirmedCount: 0,
        availability: [],
      },
      slots: [{ startsAt, label: "9:00 AM" }],
      meetingProvider: "google",
      turnstileSiteKey: null,
    });
    const createBooking = vi.spyOn(api, "createBooking").mockResolvedValue({
      id: "booking-1",
      status: "confirmed",
      startsAt,
      meetingUrl: "https://meet.google.com/abc-defg-hij",
      meetingProvider: "google",
      meetingLinkPending: false,
    });

    render(<PublicBooking slug="interview" />);

    await screen.findByRole("heading", { name: "Tell us about you" });
    fireEvent.change(screen.getByLabelText("Full name"), {
      target: { value: "Taylor Visitor" },
    });
    fireEvent.change(screen.getByLabelText("Email address"), {
      target: { value: "taylor@example.com" },
    });
    expect(screen.getByText(/Calendar title:/).textContent).toContain(
      "Product interview — Taylor Visitor",
    );
    fireEvent.change(screen.getByLabelText(/Meeting topic/), {
      target: { value: "Frontend role" },
    });
    expect(screen.getByText(/Calendar title:/).textContent).toContain(
      "Product interview: Frontend role — Taylor Visitor",
    );
    fireEvent.click(screen.getByRole("button", { name: /Choose a time/ }));

    await screen.findByRole("heading", { name: "Choose a time" });
    const visitorTimeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    const timeLabel = new Intl.DateTimeFormat("en", {
      hour: "numeric",
      minute: "2-digit",
      timeZone: visitorTimeZone,
    }).format(new Date(startsAt));
    fireEvent.click(screen.getByRole("button", { name: timeLabel }));
    fireEvent.click(screen.getByRole("button", { name: /Review booking/ }));

    await screen.findByRole("heading", { name: "Almost done" });
    fireEvent.click(screen.getByRole("button", { name: "Book meeting" }));

    await screen.findByRole("heading", { name: "Meeting booked" });
    expect(screen.getByText(/Google Meet meeting is confirmed/)).toBeTruthy();
    expect(screen.getByText(/Invitation sent/)).toBeTruthy();
    expect(
      screen.getByRole("link", { name: /Open Google Meet/ }),
    ).toHaveProperty("href", "https://meet.google.com/abc-defg-hij");
    expect(screen.queryByText("Slot submitted")).toBeNull();
    expect(createBooking).toHaveBeenCalledWith(
      "interview",
      expect.objectContaining({
        name: "Taylor Visitor",
        email: "taylor@example.com",
        meetingTitle: "Frontend role",
        startsAt,
      }),
    );
  });
});
