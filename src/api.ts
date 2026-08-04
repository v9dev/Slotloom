import type {
  Booking,
  BookingDetail,
  BookingLink,
  DashboardData,
  Slot,
  UserActivity,
  UserRole,
  WorkspaceUser,
  WorkflowStatus,
  EmailTemplate,
  Notification,
  LinkAnalytics,
  MeetingFeedback,
  ActivityRecord,
} from "./types";

type ApiError = { error?: string };
const localToken = () => sessionStorage.getItem("adminToken") || "";
async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const token = localToken();
  const response = await fetch(path, {
    ...init,
    headers: {
      ...(init.body ? { "content-type": "application/json" } : {}),
      ...(token ? { authorization: `Bearer ${token}` } : {}),
      ...init.headers,
    },
  });
  const body = (await response.json().catch(() => ({}))) as T & ApiError;
  if (!response.ok)
    throw new Error(body.error || "Something went wrong. Please try again.");
  return body;
}
async function download(path: string) {
  const token = localToken();
  const response = await fetch(path, {
    headers: token ? { authorization: `Bearer ${token}` } : {},
  });
  if (!response.ok) throw new Error("Could not download the export.");
  return response.blob();
}
export const api = {
  publicLink: (slug: string) =>
    request<{
      link: BookingLink;
      slots: Slot[];
      turnstileSiteKey: string | null;
    }>(`/api/public/links/${encodeURIComponent(slug)}`),
  createBooking: (slug: string, payload: Record<string, string>) =>
    request<{ id: string }>(`/api/public/links/${encodeURIComponent(slug)}`, {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  dashboard: () => request<DashboardData>("/api/admin/dashboard"),
  activity: (
    params: {
      page?: number;
      pageSize?: number;
      q?: string;
      category?: string;
      actor?: string;
    } = {},
  ) => {
    const query = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== "") query.set(key, String(value));
    });
    return request<{
      activity: ActivityRecord[];
      actors: string[];
      pagination: {
        page: number;
        pageSize: number;
        total: number;
        totalPages: number;
      };
    }>(`/api/admin/activity?${query}`);
  },
  me: () => request<{ user: WorkspaceUser }>("/api/admin/me"),
  users: () =>
    request<{ users: WorkspaceUser[]; activity: UserActivity[] }>(
      "/api/admin/users",
    ),
  assignees: () => request<{ users: WorkspaceUser[] }>("/api/admin/assignees"),
  addUser: (payload: { name: string; email: string; role: UserRole }) =>
    request<{ success: boolean }>("/api/admin/users", {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  updateUser: (
    email: string,
    payload: { role: UserRole; status: "active" | "suspended" },
  ) =>
    request<{ success: boolean }>(
      `/api/admin/users/${encodeURIComponent(email)}`,
      { method: "PATCH", body: JSON.stringify(payload) },
    ),
  links: () => request<{ links: BookingLink[] }>("/api/admin/links"),
  link: (id: string) =>
    request<{ link: BookingLink }>(`/api/admin/links/${id}`),
  createLink: (payload: Partial<BookingLink>) =>
    request<{ id: string }>("/api/admin/links", {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  updateLink: (id: string, payload: Partial<BookingLink>) =>
    request<{ link: BookingLink }>(`/api/admin/links/${id}`, {
      method: "PATCH",
      body: JSON.stringify(payload),
    }),
  removeLink: (id: string, mode: "archive" | "delete") =>
    request<{ deleted: boolean; archived: boolean }>(
      `/api/admin/links/${id}?mode=${mode}`,
      { method: "DELETE" },
    ),
  linkAnalytics: (id: string) =>
    request<LinkAnalytics>(`/api/admin/links/${id}/analytics`),
  bookings: (
    params: {
      page?: number;
      pageSize?: number;
      status?: string;
      link?: string;
      q?: string;
    } = {},
  ) => {
    const query = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== "") query.set(key, String(value));
    });
    return request<{
      bookings: Booking[];
      pagination: {
        page: number;
        pageSize: number;
        total: number;
        totalPages: number;
      };
    }>(`/api/admin/bookings?${query}`);
  },
  booking: (id: string) => request<BookingDetail>(`/api/admin/bookings/${id}`),
  updateBooking: (
    id: string,
    payload: {
      status: WorkflowStatus;
      adminNote?: string;
      finalStartsAt?: string;
      meetingUrl?: string;
      meetingNotes?: string;
      assignedTo?: string;
    },
  ) =>
    request<{ booking: Booking }>(`/api/admin/bookings/${id}`, {
      method: "PATCH",
      body: JSON.stringify(payload),
    }),
  sendEmail: (id: string, template: string) =>
    request<{ messageId: string }>(`/api/admin/bookings/${id}/email`, {
      method: "POST",
      body: JSON.stringify({ template }),
    }),
  bulkBookings: (payload: {
    ids: string[];
    status?: WorkflowStatus;
    assignedTo?: string;
  }) =>
    request<{ success: boolean; updated: number }>("/api/admin/bookings/bulk", {
      method: "PATCH",
      body: JSON.stringify(payload),
    }),
  exportBookings: (
    params: { status?: string; link?: string; q?: string } = {},
  ) => {
    const query = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value) query.set(key, value);
    });
    return download(`/api/admin/bookings/export?${query}`);
  },
  eraseBookingPersonalData: (id: string) =>
    request<{ success: boolean }>(`/api/admin/bookings/${id}/personal-data`, {
      method: "DELETE",
    }),
  templates: () =>
    request<{ templates: EmailTemplate[] }>("/api/admin/templates"),
  previewTemplate: (payload: {
    subject: string;
    text: string;
    contact: string;
    actionUrl: string;
  }) =>
    request<{ html: string }>("/api/admin/templates/preview", {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  updateTemplate: (
    key: string,
    payload: { subject: string; textBody: string; enabled: boolean },
  ) =>
    request<{ success: boolean }>(`/api/admin/templates/${key}`, {
      method: "PATCH",
      body: JSON.stringify(payload),
    }),
  testTemplate: (key: string) =>
    request<{ success: boolean }>(`/api/admin/templates/${key}/test`, {
      method: "POST",
      body: "{}",
    }),
  notifications: () =>
    request<{ notifications: Notification[] }>("/api/admin/notifications"),
  readNotifications: () =>
    request<{ success: boolean }>("/api/admin/notifications/read", {
      method: "PATCH",
      body: "{}",
    }),
  settings: () =>
    request<{ settings: Record<string, string> }>("/api/admin/settings"),
  updateSettings: (payload: {
    dataRetentionDays: number;
    appName: string;
    brandTagline: string;
    brandMarkUrl: string;
  }) =>
    request<{ success: boolean }>("/api/admin/settings", {
      method: "PATCH",
      body: JSON.stringify(payload),
    }),
  manageBooking: (token: string) =>
    request<{
      booking: Booking;
      slots: Slot[];
      feedback: MeetingFeedback | null;
    }>(`/api/public/manage/${encodeURIComponent(token)}`),
  submitFeedback: (token: string, rating: number, message: string) =>
    request<{ success: boolean }>(
      `/api/public/manage/${encodeURIComponent(token)}/feedback`,
      { method: "POST", body: JSON.stringify({ rating, message }) },
    ),
  updateManagedBooking: (
    token: string,
    payload: { action: "cancel" | "reschedule"; startsAt?: string },
  ) =>
    request<{ success: boolean; status: string }>(
      `/api/public/manage/${encodeURIComponent(token)}`,
      { method: "PATCH", body: JSON.stringify(payload) },
    ),
};
