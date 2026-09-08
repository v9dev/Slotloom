import type { Cell, Sheet } from "write-excel-file/browser";
import type {
  WorkspaceExportData,
  WorkspaceExportRow,
  WorkspaceExportValue,
} from "@/types";

type ExportColumn = {
  key: string;
  label: string;
  width: number;
};

const columns = (...definitions: Array<[string, string, number]>) =>
  definitions.map(([key, label, width]) => ({ key, label, width }));

const exportSheets: Array<{
  key: Exclude<keyof WorkspaceExportData, "generatedAt">;
  name: string;
  columns: ExportColumn[];
}> = [
  {
    key: "meetings",
    name: "Meetings",
    columns: columns(
      ["id", "Meeting ID", 38],
      ["booking_link_id", "Booking link ID", 38],
      ["booking_link_name", "Booking link name", 24],
      ["booking_link_title", "Booking link title", 30],
      ["booking_link_slug", "Booking link slug", 24],
      ["name", "Visitor name", 24],
      ["email", "Visitor email", 32],
      ["phone", "Phone", 20],
      ["company", "Company", 24],
      ["starts_at", "Selected time", 26],
      ["final_starts_at", "Final time", 26],
      ["time_zone", "Visitor time zone", 24],
      ["workflow_status", "Status", 18],
      ["meeting_title", "Meeting title", 32],
      ["meeting_provider", "Provider", 16],
      ["meeting_provider_preference", "Provider preference", 20],
      ["meeting_url", "Meeting link", 46],
      ["meeting_provider_account", "Provider account", 32],
      ["meeting_provider_event_id", "Provider event ID", 38],
      ["meeting_provider_synced_at", "Provider synced at", 26],
      ["meeting_sent_at", "Invitation sent at", 26],
      ["assigned_to", "Organizer", 32],
      ["message", "Visitor message", 40],
      ["admin_note", "Internal note", 40],
      ["meeting_notes", "Meeting notes", 40],
      ["device_type", "Device", 16],
      ["user_agent", "User agent", 48],
      ["browser_language", "Browser language", 20],
      ["referrer", "Referrer", 40],
      ["country", "Country", 16],
      ["region", "Region", 20],
      ["city", "City", 20],
      ["created_at", "Created at", 26],
      ["updated_at", "Updated at", 26],
    ),
  },
  {
    key: "attendees",
    name: "Attendees",
    columns: columns(
      ["id", "Attendee ID", 38],
      ["booking_id", "Meeting ID", 38],
      ["name", "Name", 24],
      ["email", "Email", 32],
      ["source", "Added by", 16],
      ["created_at", "Created at", 26],
      ["updated_at", "Updated at", 26],
    ),
  },
  {
    key: "links",
    name: "Booking links",
    columns: columns(
      ["id", "Link ID", 38],
      ["slug", "Public slug", 24],
      ["internal_name", "Internal name", 26],
      ["title", "Public title", 32],
      ["description", "Description", 42],
      ["duration_minutes", "Duration (minutes)", 18],
      ["slot_interval_minutes", "Slot interval (minutes)", 20],
      ["buffer_minutes", "Buffer (minutes)", 18],
      ["time_zone", "Time zone", 24],
      ["minimum_notice_hours", "Minimum notice (hours)", 22],
      ["days_ahead", "Days ahead", 14],
      ["valid_from", "Valid from", 16],
      ["valid_until", "Valid until", 16],
      ["status", "Status", 14],
      ["allow_slot_holds", "Slot holds", 14],
      ["allow_custom_meeting_title", "Custom meeting title", 22],
      ["allow_additional_attendees", "Additional attendees", 22],
      ["response_count", "Responses", 14],
      ["page_view_count", "Page views", 14],
      ["created_by", "Created by", 32],
      ["created_at", "Created at", 26],
      ["updated_at", "Updated at", 26],
    ),
  },
  {
    key: "availability",
    name: "Availability",
    columns: columns(
      ["id", "Rule ID", 38],
      ["booking_link_id", "Booking link ID", 38],
      ["weekday", "Weekday (0–6)", 16],
      ["start_time", "Start time", 14],
      ["end_time", "End time", 14],
    ),
  },
  {
    key: "feedback",
    name: "Feedback",
    columns: columns(
      ["id", "Feedback ID", 38],
      ["booking_id", "Meeting ID", 38],
      ["rating", "Rating", 12],
      ["message", "Feedback", 46],
      ["created_at", "Created at", 26],
      ["updated_at", "Updated at", 26],
    ),
  },
  {
    key: "emails",
    name: "Email history",
    columns: columns(
      ["id", "Email event ID", 38],
      ["booking_id", "Meeting ID", 38],
      ["template", "Template", 24],
      ["recipient", "Recipient", 32],
      ["sender_email", "Sender", 32],
      ["delivery_method", "Delivery method", 18],
      ["used_fallback", "Used fallback", 16],
      ["status", "Status", 14],
      ["error", "Error", 46],
      ["provider_message_id", "Provider message ID", 40],
      ["created_at", "Created at", 26],
    ),
  },
  {
    key: "activity",
    name: "Activity",
    columns: columns(
      ["id", "Activity ID", 38],
      ["source", "Area", 14],
      ["actor_email", "Actor", 32],
      ["event_type", "Event type", 28],
      ["summary", "Summary", 48],
      ["booking_id", "Meeting ID", 38],
      ["booking_link_id", "Booking link ID", 38],
      ["target_user_email", "Team member", 32],
      ["metadata", "Metadata", 48],
      ["created_at", "Created at", 26],
    ),
  },
  {
    key: "pageViews",
    name: "Page views",
    columns: columns(
      ["id", "Page view ID", 38],
      ["booking_link_id", "Booking link ID", 38],
      ["device_type", "Device", 16],
      ["country", "Country", 16],
      ["created_at", "Viewed at", 26],
    ),
  },
  {
    key: "team",
    name: "Team",
    columns: columns(
      ["id", "Team member ID", 38],
      ["name", "Name", 24],
      ["email", "Email", 32],
      ["role", "Role", 14],
      ["status", "Status", 14],
      ["invited_by", "Invited by", 32],
      ["last_seen_at", "Last seen at", 26],
      ["created_at", "Created at", 26],
      ["updated_at", "Updated at", 26],
    ),
  },
];

function exportCell(value: WorkspaceExportValue | undefined): Cell {
  const safeValue = value ?? "";
  const style = { alignVertical: "top" as const, wrap: true };
  if (typeof safeValue === "number")
    return { value: safeValue, type: Number, ...style };
  if (typeof safeValue === "boolean")
    return { value: safeValue, type: Boolean, ...style };
  return { value: safeValue, type: String, ...style };
}

function dataSheet(
  name: string,
  rows: WorkspaceExportRow[],
  definitions: ExportColumn[],
): Sheet<Blob> {
  return {
    sheet: name,
    stickyRowsCount: 1,
    showGridLines: false,
    zoomScale: 0.9,
    columns: definitions.map(({ width }) => ({ width })),
    data: [
      definitions.map(({ label }) => ({
        value: label,
        type: String,
        fontWeight: "bold",
        textColor: "#ffffff",
        backgroundColor: "#172033",
        alignVertical: "center",
        height: 28,
        wrap: true,
      })),
      ...rows.map((row) => definitions.map(({ key }) => exportCell(row[key]))),
    ],
  };
}

export function workspaceExportSheets(
  data: WorkspaceExportData,
): Sheet<Blob>[] {
  const summaryRows: Array<[string, string | number]> = [
    ["Generated at", data.generatedAt],
    [
      "Contents",
      "Operational workspace data. OAuth credentials, tokens, and security settings are excluded.",
    ],
    ["Meetings", data.meetings.length],
    ["Attendees", data.attendees.length],
    ["Booking links", data.links.length],
    ["Availability rules", data.availability.length],
    ["Feedback entries", data.feedback.length],
    ["Email events", data.emails.length],
    ["Activity events", data.activity.length],
    ["Page views", data.pageViews.length],
    ["Team members", data.team.length],
  ];
  const summary: Sheet<Blob> = {
    sheet: "Export summary",
    showGridLines: false,
    columns: [{ width: 24 }, { width: 76 }],
    data: [
      [
        {
          value: "Slotloom workspace export",
          type: String,
          fontSize: 18,
          fontWeight: "bold",
          textColor: "#172033",
          height: 34,
        },
      ],
      ...summaryRows.map(([label, value]) => [
        { value: label, type: String, fontWeight: "bold" as const },
        {
          value,
          type: typeof value === "number" ? Number : String,
          wrap: true,
        },
      ]),
    ],
  };
  return [
    summary,
    ...exportSheets.map((sheet) =>
      dataSheet(sheet.name, data[sheet.key], sheet.columns),
    ),
  ];
}

export async function downloadWorkspaceWorkbook(data: WorkspaceExportData) {
  const { default: writeXlsxFile } = await import("write-excel-file/browser");
  const date = new Date(data.generatedAt).toISOString().slice(0, 10);
  await writeXlsxFile(workspaceExportSheets(data), {
    fontFamily: "Arial",
    fontSize: 10,
  }).toFile(`slotloom-workspace-${date}.xlsx`);
}
