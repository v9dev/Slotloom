import {
  CalendarDays,
  Clock3,
  ExternalLink,
  Loader2,
  Mail,
  Video,
} from "lucide-react";
import { FormEvent, useEffect, useState } from "react";
import { toast } from "sonner";
import { api } from "@/api";
import type {
  Booking,
  BookingDetail,
  WorkspaceUser,
  WorkflowStatus,
} from "@/types";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { CreateMeetingDialog } from "./CreateMeetingDialog";
import {
  RequestActivityPanel,
  RequestEmailsPanel,
  RequestVisitorPanel,
} from "./RequestDialogPanels";
import { Field, StatusBadge, fmt, labels } from "./shared";

type RequestTab = "meeting" | "visitor" | "emails" | "activity";
type RequestAction =
  "save" | "reminder" | "reschedule" | "cancel" | "erase" | "delete";
type RequestDraft = {
  status: WorkflowStatus;
  assignedTo: string;
  note: string;
};

function draftFromDetail(detail: BookingDetail): RequestDraft {
  return {
    status: detail.booking.status,
    assignedTo: detail.booking.assignedTo || "unassigned",
    note: detail.booking.adminNote || "",
  };
}

function draftMatchesDetail(draft: RequestDraft, detail: BookingDetail) {
  return (
    draft.status === detail.booking.status &&
    draft.assignedTo === (detail.booking.assignedTo || "unassigned") &&
    draft.note === (detail.booking.adminNote || "")
  );
}

function visitorInitials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  return parts.length
    ? parts
        .slice(0, 2)
        .map((part) => part[0])
        .join("")
        .toUpperCase()
    : "?";
}

function meetingProviderLabel(booking: Booking) {
  if (booking.meetingProvider === "google") return "Google Meet";
  if (booking.meetingProvider === "microsoft") return "Microsoft Teams";
  return "Online meeting";
}

function meetingLinkHost(value: string) {
  try {
    return new URL(value).hostname.replace(/^www\./, "");
  } catch {
    return "Secure meeting link";
  }
}

export function RequestDialog({
  id,
  canAssign,
  canEdit,
  close,
  onUpdated,
  onDeleted,
}: {
  id: string | null;
  canAssign: boolean;
  canEdit: boolean;
  close: () => void;
  onUpdated: (booking: Booking) => void;
  onDeleted: (bookingId: string) => void;
}) {
  const [detail, setDetail] = useState<BookingDetail>();
  const [draft, setDraft] = useState<RequestDraft>();
  const [assignees, setAssignees] = useState<WorkspaceUser[]>([]);
  const [activeTab, setActiveTab] = useState<RequestTab>("meeting");
  const [loading, setLoading] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);
  const [error, setError] = useState("");
  const [pendingAction, setPendingAction] = useState<RequestAction | null>(
    null,
  );
  const [meetingOpen, setMeetingOpen] = useState(false);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [discardOpen, setDiscardOpen] = useState(false);

  useEffect(() => {
    let ignore = false;
    if (!id) {
      setDetail(undefined);
      setDraft(undefined);
      setError("");
      setPendingAction(null);
      return () => {
        ignore = true;
      };
    }
    setLoading(true);
    setDetail(undefined);
    setDraft(undefined);
    setError("");
    setPendingAction(null);
    setMeetingOpen(false);
    setCancelOpen(false);
    setDiscardOpen(false);
    setActiveTab("meeting");
    const assigneesRequest = canAssign
      ? api.assignees()
      : Promise.resolve({ users: [] as WorkspaceUser[] });
    Promise.all([api.booking(id), assigneesRequest])
      .then(([nextDetail, response]) => {
        if (ignore) return;
        setDetail(nextDetail);
        setDraft(draftFromDetail(nextDetail));
        setAssignees(response.users);
      })
      .catch((cause) => {
        if (!ignore)
          setError(
            cause instanceof Error
              ? cause.message
              : "Could not load this meeting. Try again.",
          );
      })
      .finally(() => {
        if (!ignore) setLoading(false);
      });
    return () => {
      ignore = true;
    };
  }, [canAssign, id, reloadKey]);

  const currentDetail = id && detail?.booking.id === id ? detail : undefined;
  const isDirty = Boolean(
    currentDetail && draft && !draftMatchesDetail(draft, currentDetail),
  );

  useEffect(() => {
    if (!isDirty) return;
    const warnAboutUnsavedChanges = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", warnAboutUnsavedChanges);
    return () =>
      window.removeEventListener("beforeunload", warnAboutUnsavedChanges);
  }, [isDirty]);

  if (!id) return null;
  const bookingId = id;
  const booking = currentDetail?.booking;
  const isBusy = pendingAction !== null;
  const actionBlocked = isBusy || isDirty;
  const selectedAssignee = assignees.find(
    (candidate) => candidate.email === draft?.assignedTo,
  );

  function adoptDetail(nextDetail: BookingDetail) {
    setDetail(nextDetail);
    setDraft(draftFromDetail(nextDetail));
    onUpdated(nextDetail.booking);
  }

  function requestClose() {
    if (isBusy) return;
    if (isDirty) setDiscardOpen(true);
    else close();
  }

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!currentDetail || !draft || !isDirty || isBusy) return;
    setPendingAction("save");
    setError("");
    try {
      const result = await api.updateBooking(bookingId, {
        status: draft.status,
        adminNote: draft.note,
        ...(canAssign
          ? {
              assignedTo:
                draft.assignedTo === "unassigned" ? "" : draft.assignedTo,
            }
          : {}),
      });
      adoptDetail({ ...currentDetail, booking: result.booking });
      toast.success("Meeting changes saved");
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Could not save the meeting. Try again.",
      );
      try {
        const latest = await api.booking(bookingId);
        setDetail(latest);
        onUpdated(latest.booking);
        if (draftMatchesDetail(draft, latest))
          setDraft(draftFromDetail(latest));
      } catch {
        // Keep the draft visible when the latest server state cannot be loaded.
      }
    } finally {
      setPendingAction(null);
    }
  }

  async function send(
    template: "reminder" | "reschedule" | "cancelled",
    action: Exclude<RequestAction, "save" | "erase" | "delete">,
  ) {
    if (!currentDetail || actionBlocked) return;
    setPendingAction(action);
    setError("");
    try {
      const result = await api.sendEmail(bookingId, template);
      try {
        adoptDetail(await api.booking(bookingId));
      } catch {
        setError(
          "The action completed, but the latest details could not be refreshed. Close and reopen this meeting.",
        );
      }
      toast.success(
        result.deliveryMethod === "calendar"
          ? template === "cancelled"
            ? "Calendar meeting cancelled"
            : "Calendar invitation sent"
          : `${template === "reminder" ? "Reminder" : template === "reschedule" ? "New-time request" : "Cancellation"} sent through ${result.deliveryMethod}${result.usedWorkerFallback ? " using Worker fallback" : ""}`,
      );
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Could not complete the action. Try again.",
      );
    } finally {
      setPendingAction(null);
    }
  }

  async function erasePersonalData() {
    if (!currentDetail || isBusy) return;
    setPendingAction("erase");
    setError("");
    try {
      await api.eraseBookingPersonalData(bookingId);
      adoptDetail(await api.booking(bookingId));
      toast.success("Visitor personal data erased");
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Could not erase visitor data. Try again.",
      );
    } finally {
      setPendingAction(null);
    }
  }

  async function deleteResponse() {
    if (!currentDetail || isBusy) return;
    setPendingAction("delete");
    setError("");
    try {
      await api.deleteBooking(bookingId);
      onDeleted(bookingId);
      close();
      toast.success("Meeting response permanently deleted");
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Could not delete this response. Try again.",
      );
    } finally {
      setPendingAction(null);
    }
  }

  return (
    <>
      <Dialog open onOpenChange={(open) => !open && requestClose()}>
        <DialogContent className="grid max-h-[calc(100svh-1rem)] w-[calc(100%-1rem)] max-w-none grid-rows-[auto_minmax(0,1fr)] gap-0 overflow-hidden overscroll-contain rounded-2xl p-0 shadow-2xl sm:max-h-[min(90svh,760px)] sm:max-w-3xl">
          <DialogHeader className="border-b bg-muted/15 px-4 py-4 sm:px-6">
            <div className="flex min-w-0 items-start gap-3 pr-12">
              <Avatar className="mt-0.5 size-10 shrink-0 rounded-xl">
                <AvatarFallback className="rounded-xl bg-primary text-xs font-semibold text-primary-foreground">
                  {visitorInitials(booking?.name || "")}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0 flex-1">
                <div className="flex min-w-0 items-center gap-2">
                  <DialogTitle className="truncate text-lg leading-tight">
                    {booking?.name ||
                      (loading ? "Loading meeting…" : "Meeting unavailable")}
                  </DialogTitle>
                  {booking && (
                    <div className="hidden shrink-0 sm:block">
                      <StatusBadge status={booking.status} />
                    </div>
                  )}
                </div>
                <DialogDescription className="mt-1 flex min-w-0 flex-wrap items-center gap-x-1.5 gap-y-0.5">
                  {booking ? (
                    <>
                      <span className="max-w-full truncate">
                        {booking.email}
                      </span>
                      <span aria-hidden="true">·</span>
                      <span>{booking.linkTitle || "Meeting"}</span>
                      <span aria-hidden="true">·</span>
                      <span>{fmt(booking.startsAt)}</span>
                    </>
                  ) : loading ? (
                    "Loading visitor and meeting details…"
                  ) : (
                    "The meeting details could not be loaded."
                  )}
                </DialogDescription>
                {booking && (
                  <div className="mt-2 sm:hidden">
                    <StatusBadge status={booking.status} />
                  </div>
                )}
              </div>
            </div>
          </DialogHeader>

          {loading ? (
            <div
              className="flex min-h-64 items-center justify-center gap-2 text-sm text-muted-foreground"
              role="status"
            >
              <Loader2 className="size-4 animate-spin" aria-hidden="true" />
              Loading meeting…
            </div>
          ) : !currentDetail || !draft ? (
            <div className="space-y-4 overflow-y-auto p-4 sm:p-6">
              <Alert variant="destructive" role="alert">
                <AlertDescription>
                  {error || "Could not load this meeting. Try again."}
                </AlertDescription>
              </Alert>
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  onClick={() => setReloadKey((v) => v + 1)}
                >
                  Try again
                </Button>
                <Button type="button" variant="outline" onClick={close}>
                  Close
                </Button>
              </div>
            </div>
          ) : (
            <form
              className="flex min-h-0 flex-col overflow-hidden"
              onSubmit={save}
            >
              <Tabs
                className="min-h-0 flex-1 gap-0 overflow-hidden"
                value={activeTab}
                onValueChange={(value) => setActiveTab(value as RequestTab)}
              >
                <div className="border-b px-4 py-3 sm:px-6">
                  <TabsList className="grid h-11 w-full grid-cols-4 sm:h-10">
                    <TabsTrigger value="meeting">Meeting</TabsTrigger>
                    <TabsTrigger value="visitor">Visitor</TabsTrigger>
                    <TabsTrigger value="emails">Emails</TabsTrigger>
                    <TabsTrigger value="activity">Activity</TabsTrigger>
                  </TabsList>
                </div>
                <div className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden overscroll-contain px-4 py-5 sm:px-6">
                  <TabsContent value="meeting" className="space-y-5">
                    <section
                      className="space-y-4"
                      aria-labelledby="request-details-heading"
                    >
                      <div className="flex flex-wrap items-baseline justify-between gap-2">
                        <h3
                          className="text-sm font-semibold"
                          id="request-details-heading"
                        >
                          Meeting details
                        </h3>
                        <p className="text-xs text-muted-foreground">
                          Updated {fmt(currentDetail.booking.updatedAt)}
                        </p>
                      </div>
                      <div className="grid min-w-0 gap-4 sm:grid-cols-2">
                        <Field label="Status" htmlFor="request-status">
                          <Select
                            name="status"
                            value={draft.status}
                            onValueChange={(value) =>
                              setDraft((current) =>
                                current
                                  ? {
                                      ...current,
                                      status: value as WorkflowStatus,
                                    }
                                  : current,
                              )
                            }
                            disabled={!canEdit || isBusy}
                          >
                            <SelectTrigger
                              className="h-11 w-full min-w-0 sm:h-10"
                              id="request-status"
                            >
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {Object.entries(labels).map(([value, label]) => (
                                <SelectItem key={value} value={value}>
                                  {label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </Field>
                        <Field
                          label="Assigned to"
                          htmlFor={canAssign ? "request-assignee" : undefined}
                        >
                          {canAssign ? (
                            <Select
                              name="assignedTo"
                              value={draft.assignedTo}
                              onValueChange={(value) =>
                                setDraft((current) =>
                                  current
                                    ? { ...current, assignedTo: value }
                                    : current,
                                )
                              }
                              disabled={isBusy}
                            >
                              <SelectTrigger
                                className="h-11 w-full min-w-0 sm:h-10"
                                id="request-assignee"
                              >
                                <SelectValue placeholder="Choose organizer">
                                  {draft.assignedTo === "unassigned"
                                    ? "Unassigned"
                                    : selectedAssignee?.name ||
                                      draft.assignedTo}
                                </SelectValue>
                              </SelectTrigger>
                              <SelectContent
                                align="start"
                                position="popper"
                                className="max-w-[calc(100vw-2rem)]"
                              >
                                <SelectItem value="unassigned">
                                  Unassigned
                                </SelectItem>
                                {assignees.map((user) => (
                                  <SelectItem
                                    className="max-w-full py-2"
                                    key={user.id}
                                    value={user.email}
                                  >
                                    <span className="min-w-0">
                                      <span className="block truncate font-medium">
                                        {user.name}
                                      </span>
                                      <span className="block truncate text-xs text-muted-foreground">
                                        {user.email}
                                      </span>
                                    </span>
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          ) : (
                            <div
                              className="min-h-10 break-words rounded-lg border bg-muted/30 px-3 py-2 text-sm"
                              id="request-assignee"
                            >
                              {currentDetail.booking.assignedTo ||
                                "Unassigned. Saving or creating the meeting claims it for you."}
                            </div>
                          )}
                        </Field>
                        <div className="sm:col-span-2">
                          <Field
                            label="Internal note"
                            htmlFor="request-internal-note"
                          >
                            <Textarea
                              autoComplete="off"
                              className="min-h-24 resize-y"
                              id="request-internal-note"
                              maxLength={2000}
                              name="note"
                              value={draft.note}
                              onChange={(event) =>
                                setDraft((current) =>
                                  current
                                    ? { ...current, note: event.target.value }
                                    : current,
                                )
                              }
                              disabled={!canEdit || isBusy}
                            />
                          </Field>
                        </div>
                      </div>
                    </section>

                    <section
                      className="overflow-hidden rounded-2xl border bg-muted/20"
                      aria-labelledby="meeting-summary-heading"
                    >
                      <div className="p-4 sm:p-5">
                        <div className="flex min-w-0 items-start gap-3">
                          <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-background ring-1 ring-foreground/10">
                            <CalendarDays
                              className="size-4"
                              aria-hidden="true"
                            />
                          </span>
                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-start justify-between gap-2">
                              <div className="min-w-0">
                                <h3
                                  className="truncate text-sm font-semibold"
                                  id="meeting-summary-heading"
                                >
                                  {currentDetail.booking.meetingTitle ||
                                    "Untitled meeting"}
                                </h3>
                                <p className="mt-1 text-xs text-muted-foreground">
                                  {currentDetail.booking.meetingSentAt
                                    ? `Created for ${fmt(currentDetail.booking.finalStartsAt || currentDetail.booking.startsAt)}`
                                    : `Requested for ${fmt(currentDetail.booking.startsAt)}`}
                                </p>
                              </div>
                              <Badge variant="secondary" className="shrink-0">
                                {currentDetail.booking.meetingSentAt
                                  ? currentDetail.booking.meetingProvider ===
                                    "google"
                                    ? "Google Meet"
                                    : currentDetail.booking.meetingProvider ===
                                        "microsoft"
                                      ? "Microsoft Teams"
                                      : "Manual meeting"
                                  : "Not created"}
                              </Badge>
                            </div>
                            {currentDetail.booking.meetingUrl && (
                              <a
                                className="mt-3 flex min-h-11 max-w-full items-center gap-3 rounded-xl border bg-background px-3 py-2 text-left transition-colors hover:border-foreground/20 hover:bg-muted/30 focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
                                href={currentDetail.booking.meetingUrl}
                                rel="noreferrer"
                                target="_blank"
                                title={currentDetail.booking.meetingUrl}
                              >
                                <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                                  <Video
                                    className="size-4"
                                    aria-hidden="true"
                                  />
                                </span>
                                <span className="min-w-0 flex-1">
                                  <span className="block truncate text-sm font-medium">
                                    Open{" "}
                                    {meetingProviderLabel(
                                      currentDetail.booking,
                                    )}
                                  </span>
                                  <span className="block truncate text-xs text-muted-foreground">
                                    {currentDetail.booking
                                      .meetingProviderAccount
                                      ? `${currentDetail.booking.meetingProviderAccount} · `
                                      : ""}
                                    {meetingLinkHost(
                                      currentDetail.booking.meetingUrl,
                                    )}
                                  </span>
                                </span>
                                <ExternalLink
                                  className="size-4 shrink-0 text-muted-foreground"
                                  aria-hidden="true"
                                />
                              </a>
                            )}
                            {currentDetail.booking.meetingSentAt &&
                              currentDetail.booking.meetingProviderEventId &&
                              !currentDetail.booking.meetingUrl && (
                                <p className="mt-3 rounded-lg border bg-background px-3 py-2 text-xs leading-5 text-muted-foreground">
                                  {meetingProviderLabel(currentDetail.booking)}{" "}
                                  is still syncing the join link. The calendar
                                  invitation has already been created.
                                </p>
                              )}
                            {currentDetail.booking.meetingNotes && (
                              <p className="mt-3 whitespace-pre-wrap break-words text-sm text-muted-foreground">
                                {currentDetail.booking.meetingNotes}
                              </p>
                            )}
                          </div>
                        </div>
                      </div>

                      {canEdit && (
                        <div className="border-t bg-background/70 p-3 sm:p-4">
                          {currentDetail.booking.status === "cancelled" ? (
                            <p className="text-sm text-muted-foreground">
                              This meeting is closed. Change its status and save
                              to reopen it.
                            </p>
                          ) : (
                            <>
                              <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
                                {!currentDetail.booking.meetingSentAt && (
                                  <Button
                                    className="h-11 sm:h-9"
                                    disabled={actionBlocked}
                                    onClick={() => setMeetingOpen(true)}
                                    type="button"
                                  >
                                    <CalendarDays aria-hidden="true" />
                                    {currentDetail.booking
                                      .meetingProviderEventId
                                      ? "Finish meeting setup"
                                      : "Create meeting"}
                                  </Button>
                                )}
                                {currentDetail.booking.meetingSentAt && (
                                  <Button
                                    className="h-11 sm:h-9"
                                    disabled={actionBlocked}
                                    onClick={() => send("reminder", "reminder")}
                                    type="button"
                                    variant="outline"
                                  >
                                    {pendingAction === "reminder" ? (
                                      <Loader2
                                        className="animate-spin"
                                        aria-hidden="true"
                                      />
                                    ) : (
                                      <Clock3 aria-hidden="true" />
                                    )}
                                    {pendingAction === "reminder"
                                      ? "Sending…"
                                      : "Send reminder"}
                                  </Button>
                                )}
                                <Button
                                  className="h-11 sm:h-9"
                                  disabled={actionBlocked}
                                  onClick={() =>
                                    send("reschedule", "reschedule")
                                  }
                                  type="button"
                                  variant="outline"
                                >
                                  {pendingAction === "reschedule" ? (
                                    <Loader2
                                      className="animate-spin"
                                      aria-hidden="true"
                                    />
                                  ) : (
                                    <Mail aria-hidden="true" />
                                  )}
                                  {pendingAction === "reschedule"
                                    ? "Sending…"
                                    : "Ask for another time"}
                                </Button>
                                <Button
                                  className="h-11 border-destructive/30 text-destructive hover:bg-destructive/10 hover:text-destructive sm:ml-auto sm:h-9"
                                  disabled={actionBlocked}
                                  onClick={() => setCancelOpen(true)}
                                  type="button"
                                  variant="outline"
                                >
                                  {pendingAction === "cancel" ? (
                                    <Loader2
                                      className="animate-spin"
                                      aria-hidden="true"
                                    />
                                  ) : null}
                                  {pendingAction === "cancel"
                                    ? "Cancelling…"
                                    : currentDetail.booking.meetingSentAt
                                      ? "Cancel meeting"
                                      : "Cancel request"}
                                </Button>
                              </div>
                              {isDirty && (
                                <p
                                  className="mt-3 text-xs text-muted-foreground"
                                  role="status"
                                >
                                  Save your changes before using meeting
                                  actions.
                                </p>
                              )}
                            </>
                          )}
                        </div>
                      )}
                    </section>
                  </TabsContent>

                  <RequestVisitorPanel
                    bookingId={bookingId}
                    canEdit={canEdit}
                    detail={currentDetail}
                    isBusy={isBusy}
                    isErasing={pendingAction === "erase"}
                    isDeleting={pendingAction === "delete"}
                    onErase={erasePersonalData}
                    onDelete={deleteResponse}
                  />
                  <RequestEmailsPanel detail={currentDetail} />
                  <RequestActivityPanel detail={currentDetail} />
                </div>
              </Tabs>

              {error && (
                <div className="border-t px-4 py-3 sm:px-6">
                  <Alert variant="destructive" role="alert">
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                </div>
              )}

              {activeTab === "meeting" && canEdit && (
                <div className="flex flex-col gap-3 border-t bg-muted/20 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-6">
                  <p
                    className="text-xs text-muted-foreground"
                    role="status"
                    aria-live="polite"
                  >
                    {pendingAction === "save"
                      ? "Saving meeting…"
                      : isDirty
                        ? "You have unsaved changes."
                        : "All meeting changes are saved."}
                  </p>
                  <div className="grid grid-cols-2 gap-2 sm:flex">
                    <Button
                      className="h-11 sm:h-9"
                      disabled={isBusy}
                      onClick={requestClose}
                      type="button"
                      variant="outline"
                    >
                      Close
                    </Button>
                    <Button
                      className="h-11 sm:h-9"
                      disabled={!isDirty || isBusy}
                      type="submit"
                    >
                      {pendingAction === "save" && (
                        <Loader2 className="animate-spin" aria-hidden="true" />
                      )}
                      {pendingAction === "save" ? "Saving…" : "Save changes"}
                    </Button>
                  </div>
                </div>
              )}
            </form>
          )}

          {canEdit && (
            <CreateMeetingDialog
              bookingId={bookingId}
              onCreated={async () => {
                try {
                  adoptDetail(await api.booking(bookingId));
                } catch {
                  setError(
                    "The meeting was created, but its details could not be refreshed. Close and reopen it to see the latest information.",
                  );
                }
              }}
              onOpenChange={setMeetingOpen}
              open={meetingOpen}
            />
          )}
        </DialogContent>
      </Dialog>

      <AlertDialog open={cancelOpen} onOpenChange={setCancelOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {booking?.meetingSentAt
                ? "Cancel this meeting?"
                : "Cancel this request?"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {booking?.meetingSentAt
                ? "This cancels the calendar event when a provider owns it and notifies the visitor. This action cannot be undone from Slotloom."
                : "This closes the request and sends a cancellation message to the visitor. You can reopen it later by changing its status."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>
              {booking?.meetingSentAt ? "Keep meeting" : "Keep request"}
            </AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={() => send("cancelled", "cancel")}
            >
              {booking?.meetingSentAt ? "Cancel meeting" : "Cancel request"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={discardOpen} onOpenChange={setDiscardOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Discard unsaved changes?</AlertDialogTitle>
            <AlertDialogDescription>
              Your status, assignment, or note changes have not been saved.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep editing</AlertDialogCancel>
            <AlertDialogAction variant="destructive" onClick={close}>
              Discard changes
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
