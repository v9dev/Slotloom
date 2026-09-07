import { beforeEach, describe, expect, it, vi } from "vitest";

const emailDelivery = vi.hoisted(() => ({ sendAndLog: vi.fn() }));
vi.mock("./email-delivery", () => emailDelivery);

import {
  bookingAutoReplyAdminRoute,
  getBookingAutoReplySettings,
  resolveBookingAutoReplySettings,
  sendBookingAutoReply,
} from "./booking-auto-reply";

describe("booking auto-replies", () => {
  beforeEach(() => emailDelivery.sendAndLog.mockReset());

  it("keeps the existing receipt behavior when settings have not been saved", () => {
    expect(resolveBookingAutoReplySettings([])).toEqual({
      enabled: true,
      templateKey: "received",
    });
  });

  it("uses saved settings and safely falls back from an unknown template", () => {
    expect(
      resolveBookingAutoReplySettings([
        {
          setting_key: "booking_auto_reply_enabled",
          setting_value: "false",
        },
        {
          setting_key: "booking_auto_reply_template",
          setting_value: "not-a-template",
        },
      ]),
    ).toEqual({ enabled: false, templateKey: "received" });
    expect(
      resolveBookingAutoReplySettings([
        {
          setting_key: "booking_auto_reply_enabled",
          setting_value: "true",
        },
        {
          setting_key: "booking_auto_reply_template",
          setting_value: "reminder",
        },
      ]),
    ).toEqual({ enabled: true, templateKey: "reminder" });
  });

  it("does no delivery work when an admin has disabled auto-replies", async () => {
    const prepare = vi.fn(() => ({
      all: async () => ({
        results: [
          {
            setting_key: "booking_auto_reply_enabled",
            setting_value: "false",
          },
        ],
      }),
    }));
    const settings = await getBookingAutoReplySettings({
      DB: { prepare },
    } as never);
    expect(settings.enabled).toBe(false);

    await expect(
      sendBookingAutoReply(
        { DB: { prepare } } as never,
        { id: "booking-1" } as never,
      ),
    ).resolves.toBeNull();
    expect(prepare).toHaveBeenCalledTimes(2);
    expect(emailDelivery.sendAndLog).not.toHaveBeenCalled();
  });

  it("skips a selected template that was later disabled", async () => {
    const prepare = vi.fn((query: string) => {
      if (query.includes("workspace_settings"))
        return {
          all: async () => ({
            results: [
              {
                setting_key: "booking_auto_reply_enabled",
                setting_value: "true",
              },
              {
                setting_key: "booking_auto_reply_template",
                setting_value: "received",
              },
            ],
          }),
        };
      const statement = {
        bind: () => statement,
        first: async () => ({ enabled: 0 }),
      };
      return statement;
    });

    await expect(
      sendBookingAutoReply(
        { DB: { prepare } } as never,
        { id: "booking-1" } as never,
      ),
    ).resolves.toBeNull();
    expect(prepare).toHaveBeenCalledTimes(2);
    expect(emailDelivery.sendAndLog).not.toHaveBeenCalled();
  });

  it("sends the selected template after a booking when enabled", async () => {
    const prepare = vi.fn((query: string) => {
      if (query.includes("workspace_settings"))
        return {
          all: async () => ({
            results: [
              {
                setting_key: "booking_auto_reply_enabled",
                setting_value: "true",
              },
              {
                setting_key: "booking_auto_reply_template",
                setting_value: "reminder",
              },
            ],
          }),
        };
      const statement = {
        bind: () => statement,
        first: async () => ({ enabled: 1 }),
      };
      return statement;
    });
    const testEnv = { DB: { prepare } } as never;
    const booking = { id: "booking-1" } as never;
    emailDelivery.sendAndLog.mockResolvedValue({ providerMessageId: "sent" });

    await sendBookingAutoReply(testEnv, booking);

    expect(emailDelivery.sendAndLog).toHaveBeenCalledWith(
      testEnv,
      booking,
      "reminder",
    );
  });

  it("does not enable auto-replies with a disabled template", async () => {
    const statement = {
      bind: () => statement,
      first: async () => ({ name: "Availability received", enabled: 0 }),
    };
    const response = await bookingAutoReplyAdminRoute(
      new Request("https://meet.example.com/api/admin/booking-auto-reply", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ enabled: true, templateKey: "received" }),
      }),
      { DB: { prepare: () => statement } } as never,
      "/api/admin/booking-auto-reply",
      { role: "admin", email: "admin@example.com" } as never,
    );

    expect(response?.status).toBe(409);
    await expect(response?.json()).resolves.toEqual({
      error: "Enable the selected email template before using it.",
    });
  });
});
