// @vitest-environment jsdom

import { cleanup, render, screen } from "@testing-library/react";
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
