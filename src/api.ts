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
  BookingAutoReplySettings,
  Notification,
  LinkAnalytics,
  MeetingFeedback,
  ActivityRecord,
  CalendarProvider,
  EmailDeliveryMethod,
  EmailFallbackMethod,
  EmailDeliveryOverview,
  IntegrationOverview,
  PersonalIntegrationOverview,
  MeetingAttendee,
  MeetingOptions,
  CreateMeetingInput,
  CreateMeetingResult,
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
async function upload(path: string, file: File) {
  const token = localToken();
  const data = new FormData();
  data.append("file", file);
  const response = await fetch(path, {
    method: "POST",
    headers: token ? { authorization: `Bearer ${token}` } : {},
    body: data,
  });
  const body = (await response.json().catch(() => ({}))) as {
    url?: string;
    error?: string;
  };
  if (!response.ok || !body.url)
    throw new Error(body.error || "Upload failed.");
  return body.url;
}
export const api = {
  publicLink: (slug: string) =>
    request<{
      link: BookingLink;
      slots: Slot[];
      turnstileSiteKey: string | null;
    }>(`/api/public/links/${encodeURIComponent(slug)}`),
  createBooking: (
    slug: string,
    payload: {
      name: string;
      email: string;
      phone: string;
      startsAt: string;
      timeZone: string;
      turnstileToken: string;
      meetingTitle?: string;
      attendees?: Array<Pick<MeetingAttendee, "name" | "email">>;
    },
  ) =>
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
  meetingOptions: (id: string) =>
    request<MeetingOptions>(`/api/admin/bookings/${id}/meeting`),
  createMeeting: (id: string, payload: CreateMeetingInput) =>
    request<CreateMeetingResult>(`/api/admin/bookings/${id}/meeting`, {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  updateBooking: (
    id: string,
    payload: {
      status: WorkflowStatus;
      adminNote?: string;
      finalStartsAt?: string;
      meetingUrl?: string;
      meetingProviderPreference?: "workspace" | "manual" | CalendarProvider;
      meetingNotes?: string;
      assignedTo?: string;
    },
  ) =>
    request<{ booking: Booking }>(`/api/admin/bookings/${id}`, {
      method: "PATCH",
      body: JSON.stringify(payload),
    }),
  sendEmail: (id: string, template: string) =>
    request<{
      messageId: string | null;
      deliveryMethod: EmailDeliveryMethod | "calendar";
      usedWorkerFallback: boolean;
    }>(`/api/admin/bookings/${id}/email`, {
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
  bookingAutoReply: () =>
    request<BookingAutoReplySettings>("/api/admin/booking-auto-reply"),
  updateBookingAutoReply: (payload: BookingAutoReplySettings) =>
    request<BookingAutoReplySettings & { success: boolean }>(
      "/api/admin/booking-auto-reply",
      {
        method: "PATCH",
        body: JSON.stringify(payload),
      },
    ),
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
    brandLogoUrl: string;
    brandLogoDarkUrl: string;
    brandFaviconUrl: string;
    brandPrimaryColor: string;
    brandAccentColor: string;
  }) =>
    request<{ success: boolean }>("/api/admin/settings", {
      method: "PATCH",
      body: JSON.stringify(payload),
    }),
  integrations: () => request<IntegrationOverview>("/api/admin/integrations"),
  emailDelivery: () =>
    request<EmailDeliveryOverview>("/api/admin/email-delivery"),
  updateEmailDelivery: (payload: {
    method: EmailFallbackMethod;
    workerFallback: boolean;
  }) =>
    request<{ success: boolean }>("/api/admin/email-delivery", {
      method: "PATCH",
      body: JSON.stringify(payload),
    }),
  testEmailDelivery: () =>
    request<{
      deliveryMethod: EmailDeliveryMethod;
      usedWorkerFallback: boolean;
    }>("/api/admin/email-delivery/test", {
      method: "POST",
      body: "{}",
    }),
  saveIntegrationConfig: (
    provider: CalendarProvider,
    payload: { clientId: string; clientSecret: string; tenantId?: string },
  ) =>
    request<{ success: boolean }>(
      `/api/admin/integrations/${provider}/config`,
      { method: "PUT", body: JSON.stringify(payload) },
    ),
  removeIntegrationConfig: (provider: CalendarProvider) =>
    request<{ success: boolean }>(
      `/api/admin/integrations/${provider}/config`,
      { method: "DELETE" },
    ),
  setDefaultMeetingProvider: (provider: "manual" | CalendarProvider) =>
    request<{ success: boolean }>("/api/admin/integrations/default", {
      method: "PATCH",
      body: JSON.stringify({ provider }),
    }),
  setCalendarOwnerFallback: (enabled: boolean) =>
    request<{ success: boolean }>("/api/admin/integrations/calendar-fallback", {
      method: "PATCH",
      body: JSON.stringify({ enabled }),
    }),
  personalConnections: () =>
    request<PersonalIntegrationOverview>("/api/admin/connections"),
  setPersonalEmailProvider: (provider: "auto" | CalendarProvider) =>
    request<{ success: boolean }>("/api/admin/connections/preference", {
      method: "PATCH",
      body: JSON.stringify({ provider }),
    }),
  connectPersonalProvider: (provider: CalendarProvider, includeMail = false) =>
    request<{ authorizationUrl: string }>(
      `/api/admin/connections/${provider}/connect`,
      { method: "POST", body: JSON.stringify({ includeMail }) },
    ),
  disconnectPersonalProvider: (provider: CalendarProvider) =>
    request<{ success: boolean }>(
      `/api/admin/connections/${provider}/disconnect`,
      { method: "POST", body: "{}" },
    ),
  connectIntegration: (provider: CalendarProvider, includeMail = false) =>
    request<{ authorizationUrl: string }>(
      `/api/admin/integrations/${provider}/connect`,
      { method: "POST", body: JSON.stringify({ includeMail }) },
    ),
  disconnectIntegration: (provider: CalendarProvider) =>
    request<{ success: boolean }>(
      `/api/admin/integrations/${provider}/disconnect`,
      { method: "POST", body: "{}" },
    ),
  uploadBrandAsset: (kind: "logo" | "logo-dark" | "favicon", file: File) =>
    upload(`/api/admin/brand-assets/${kind}`, file),
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
