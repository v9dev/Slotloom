// @vitest-environment jsdom

import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  CookieNotice,
  cookieNoticeStorageKey,
  cookieNoticeVersion,
} from "./CookieNotice";

beforeEach(() => localStorage.clear());

afterEach(() => {
  cleanup();
  localStorage.clear();
});

describe("CookieNotice", () => {
  it("explains functional storage and remembers dismissal", async () => {
    render(<CookieNotice />);

    await screen.findByText("Functional storage only");
    expect(
      screen.getByRole("link", { name: "Read cookie notice" }),
    ).toHaveProperty("href", `${window.location.origin}/cookies`);

    fireEvent.click(screen.getByRole("button", { name: "Got it" }));

    await waitFor(() =>
      expect(screen.queryByText("Functional storage only")).toBeNull(),
    );
    expect(localStorage.getItem(cookieNoticeStorageKey)).toBe(
      cookieNoticeVersion,
    );
  });

  it("stays hidden after the current notice is acknowledged", async () => {
    localStorage.setItem(cookieNoticeStorageKey, cookieNoticeVersion);

    render(<CookieNotice />);
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(screen.queryByText("Functional storage only")).toBeNull();
  });
});
