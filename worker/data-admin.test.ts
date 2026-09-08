import { describe, expect, it } from "vitest";
import {
  bookingDeletionStatements,
  csvCell,
  linkDeletionStatements,
} from "./data-admin";

function statementEnvironment() {
  const prepared: Array<{ query: string; values: unknown[] }> = [];
  return {
    prepared,
    env: {
      DB: {
        prepare(query: string) {
          const record = { query, values: [] as unknown[] };
          prepared.push(record);
          return {
            bind(...values: unknown[]) {
              record.values = values;
              return this;
            },
          };
        },
      },
    },
  };
}

describe("data exports", () => {
  it("escapes quotes and prevents spreadsheet formula injection", () => {
    expect(csvCell('Taylor "TJ"')).toBe('"Taylor ""TJ"""');
    expect(csvCell('=HYPERLINK("https://bad.example")')).toBe(
      '"\'=HYPERLINK(""https://bad.example"")"',
    );
    expect(csvCell("+441234567890")).toBe('"\'+441234567890"');
  });
});

describe("permanent data deletion", () => {
  it("removes every booking-owned record before deleting the booking", () => {
    const state = statementEnvironment();

    bookingDeletionStatements(state.env as never, "booking-1");

    expect(state.prepared.map(({ query }) => query)).toEqual([
      "DELETE FROM notifications WHERE action_url=?",
      "DELETE FROM booking_manage_tokens WHERE booking_id=?",
      "DELETE FROM meeting_feedback WHERE booking_id=?",
      "DELETE FROM email_events WHERE booking_id=?",
      "DELETE FROM activity_events WHERE booking_id=?",
      "DELETE FROM booking_attendees WHERE booking_id=?",
      "DELETE FROM bookings WHERE id=?",
    ]);
    expect(state.prepared.at(-1)?.values).toEqual(["booking-1"]);
  });

  it("removes link analytics, rules, meetings, and their dependent data", () => {
    const state = statementEnvironment();

    linkDeletionStatements(state.env as never, "link-1");

    expect(state.prepared).toHaveLength(10);
    expect(state.prepared.map(({ query }) => query)).toEqual(
      expect.arrayContaining([
        expect.stringContaining("DELETE FROM booking_manage_tokens"),
        expect.stringContaining("DELETE FROM meeting_feedback"),
        expect.stringContaining("DELETE FROM email_events"),
        expect.stringContaining("DELETE FROM activity_events"),
        expect.stringContaining("DELETE FROM booking_attendees"),
        "DELETE FROM bookings WHERE booking_link_id=?",
        "DELETE FROM link_page_views WHERE booking_link_id=?",
        "DELETE FROM availability_rules WHERE booking_link_id=?",
        "DELETE FROM booking_links WHERE id=?",
      ]),
    );
    expect(state.prepared.at(-1)?.values).toEqual(["link-1"]);
  });
});
