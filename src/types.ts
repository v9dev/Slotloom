export type Slot = { startsAt: string; label: string; booked?: boolean };
export type LinkStatus = "draft" | "active" | "paused" | "archived";
export type WorkflowStatus =
  | "new"
  | "under_review"
  | "awaiting_visitor"
  | "confirmed"
  | "completed"
  | "missed"
  | "cancelled"
  | "rescheduling";
export type UserRole = "owner" | "admin" | "member" | "viewer";
export type WorkspaceUser = {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  status: "active" | "suspended";
  invitedBy: string | null;
  lastSeenAt: string | null;
  createdAt: string;
  updatedAt: string;
  emailProviderPreference: "auto" | "google" | "microsoft";
};
export type UserActivity = {
  id: string;
  actor_email: string;
  target_user_email: string | null;
  event_type: string;
  summary: string;
  created_at: string;
};
export type ActivityRecord = {
  id: string;
  actor_email: string;
  event_type: string;
  summary: string;
  created_at: string;
  booking_id: string | null;
  booking_link_id: string | null;
  source: "workspace" | "team";
};
export type AvailabilityRule = {
  id?: string;
  weekday: number;
  startTime: string;
  endTime: string;
};
export type BookingLink = {
  id: string;
  slug: string;
  internalName: string;
  title: string;
  description: string | null;
  durationMinutes: number;
  slotIntervalMinutes: number;
  bufferMinutes: number;
  timeZone: string;
  daysAhead: number;
  minimumNoticeHours: number;
  validFrom: string | null;
  validUntil: string | null;
  status: LinkStatus;
  allowSlotHolds: boolean;
  allowCustomMeetingTitle: boolean;
  allowAdditionalAttendees: boolean;
  createdBy: string | null;
  createdAt: string;
  updatedAt: string;
  responseCount: number;
  pendingCount: number;
  confirmedCount: number;
  availability: AvailabilityRule[];
};
export type Booking = {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  company: string | null;
  startsAt: string;
  finalStartsAt: string | null;
  timeZone: string;
  message: string | null;
  status: WorkflowStatus;
  adminNote: string | null;
  meetingUrl: string | null;
  meetingNotes: string | null;
  meetingTitle: string;
  meetingSentAt: string | null;
  meetingProvider: "google" | "microsoft" | null;
  meetingProviderPreference: "workspace" | "manual" | "google" | "microsoft";
  meetingProviderEventId: string | null;
  meetingProviderSyncedAt: string | null;
  meetingProviderAccount: string | null;
  assignedTo: string | null;
  bookingLinkId: string;
  linkTitle?: string;
  linkSlug?: string;
  createdAt: string;
  updatedAt: string;
  emailCount: number;
  deviceType: string | null;
  userAgent: string | null;
  browserLanguage: string | null;
  referrer: string | null;
  location: string | null;
};
export type DashboardData = {
  stats: {
    total_links: number;
    active_links: number;
    total_responses: number;
    pending: number;
    confirmed: number;
    completed: number;
    missed: number;
    cancelled: number;
    emails_sent: number;
  };
  recent: Booking[];
  admin: string;
  currentUser: WorkspaceUser;
};
export type BookingDetail = {
  booking: Booking;
  attendees: MeetingAttendee[];
  activities: Array<{
    id: string;
    summary: string;
    event_type: string;
    actor_email: string | null;
    created_at: string;
  }>;
  emails: Array<{
    id: string;
    template: string;
    recipient: string;
    status: string;
    delivery_method: string | null;
    sender_email: string | null;
    used_fallback: number;
    created_at: string;
    error: string | null;
  }>;
  feedback: MeetingFeedback | null;
};

export type MeetingAttendee = {
  name: string;
  email: string;
  primary: boolean;
  source: "primary" | "visitor" | "organizer";
};
export type MeetingProviderOption = {
  provider: CalendarProvider;
  label: string;
  available: boolean;
  account: string | null;
  usedOwnerFallback: boolean;
};
export type MeetingOrganizerOption = {
  email: string;
  name: string;
  role: Exclude<UserRole, "viewer">;
  providers: MeetingProviderOption[];
};
export type MeetingOptions = {
  booking: Booking;
  attendees: MeetingAttendee[];
  currentUserEmail: string;
  currentUserRole: UserRole;
  suggestedOrganizer: string;
  suggestedProvider: "manual" | CalendarProvider;
  organizers: MeetingOrganizerOption[];
};
export type CreateMeetingInput = {
  organizerEmail: string;
  provider: "manual" | CalendarProvider;
  title: string;
  finalStartsAt: string;
  meetingUrl: string;
  meetingNotes: string;
  attendees: Array<Pick<MeetingAttendee, "name" | "email">>;
};
export type CreateMeetingResult = {
  booking: Booking;
  deliveryMethod: "calendar" | EmailDeliveryMethod;
  usedOwnerFallback: boolean;
  additionalInviteFailures: Array<{ email: string; error: string }>;
};
export type MeetingFeedback = {
  rating: number;
  message: string | null;
  created_at: string;
  updated_at?: string;
};
export type EmailTemplate = {
  template_key: string;
  name: string;
  subject: string;
  text_body: string;
  enabled: number;
  updated_by: string | null;
  updated_at: string;
};
export type Notification = {
  id: string;
  type: string;
  title: string;
  body: string;
  action_url: string | null;
  read_at: string | null;
  created_at: string;
};
export type LinkAnalytics = {
  summary: {
    views: number;
    responses: number;
    confirmed: number;
    conversionRate: number;
  };
  statuses: Array<{ status: WorkflowStatus; count: number }>;
  daily: Array<{ date: string; count: number }>;
};

export type CalendarProvider = "google" | "microsoft";
export type IntegrationConnection = {
  id: string;
  workspaceUserEmail: string;
  providerEmail: string;
  status: "active" | "error";
  expiresAt: string;
  updatedAt: string;
  isCurrentUser: boolean;
  mailCapable: boolean;
};
export type IntegrationProvider = {
  provider: CalendarProvider;
  label: string;
  configured: boolean;
  clientId: string;
  tenantId: string;
  hasClientSecret: boolean;
  callbackUrl: string;
  connections: IntegrationConnection[];
};
export type IntegrationOverview = {
  encryptionReady: boolean;
  defaultProvider: "manual" | CalendarProvider;
  canManageConfig: boolean;
  currentUserEmail: string;
  ownerFallbackEnabled: boolean;
  providers: IntegrationProvider[];
};

export type EmailDeliveryMethod = "worker" | CalendarProvider;
export type EmailFallbackMethod = "none" | EmailDeliveryMethod;
export type EmailDeliveryOverview = {
  method: EmailFallbackMethod;
  workerFallback: boolean;
  workerAvailable: boolean;
  workerFrom: string;
  oauthAvailable: Record<CalendarProvider, boolean>;
  canManage: boolean;
};

export type PersonalIntegrationOverview = {
  encryptionReady: boolean;
  preference: "auto" | CalendarProvider;
  providers: Array<{
    provider: CalendarProvider;
    label: string;
    configured: boolean;
    connection: {
      providerEmail: string;
      status: "active" | "error";
      mailCapable: boolean;
      updatedAt: string;
    } | null;
  }>;
};
