import writeXlsxFile from "write-excel-file/node";
import { describe, expect, it } from "vitest";
import type { WorkspaceExportData } from "@/types";
import { workspaceExportSheets } from "./workspace-export";

const data: WorkspaceExportData = {
  generatedAt: "2026-09-08T10:00:00.000Z",
  meetings: [
    {
      id: "booking-1",
      name: "Taylor Visitor",
      email: "taylor@example.com",
      phone: "+14155552671",
      meeting_title: "Interview — Taylor Visitor",
      admin_note: '=HYPERLINK("https://bad.example")',
    },
  ],
  attendees: [],
  links: [{ id: "link-1", slug: "interview", title: "Interview" }],
  availability: [],
  feedback: [],
  emails: [],
  activity: [],
  pageViews: [],
  team: [{ id: "user-1", name: "Owner", role: "owner" }],
};

describe("workspace workbook", () => {
  it("builds a genuine multi-sheet Excel file with a summary", async () => {
    const sheets = workspaceExportSheets(data);
    const workbook = await writeXlsxFile(sheets as never).toBuffer();

    expect(sheets.map((sheet) => sheet.sheet)).toEqual([
      "Export summary",
      "Meetings",
      "Attendees",
      "Booking links",
      "Availability",
      "Feedback",
      "Email history",
      "Activity",
      "Page views",
      "Team",
    ]);
    expect(workbook.subarray(0, 2).toString()).toBe("PK");
    expect(workbook.length).toBeGreaterThan(5_000);
    const adminNoteColumn = sheets[1].data[0].findIndex(
      (cell) => typeof cell === "object" && cell?.value === "Internal note",
    );
    expect(sheets[1].data[1][adminNoteColumn]).toMatchObject({
      value: '=HYPERLINK("https://bad.example")',
      type: String,
    });
  });
});
