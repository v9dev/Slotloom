import {
  Activity,
  Archive,
  Bell,
  BarChart3,
  CalendarDays,
  CheckCircle2,
  ChevronRight,
  CircleDashed,
  Clock3,
  Copy,
  Download,
  FileText,
  LayoutDashboard,
  Link2,
  Loader2,
  LogOut,
  Mail,
  Menu,
  Plus,
  Search,
  Settings,
  ShieldCheck,
  Trash2,
  Users,
  XCircle,
} from "lucide-react";
import { FormEvent, ReactNode, useEffect, useMemo, useState } from "react";
import { api } from "@/api";
import type {
  Booking,
  BookingDetail,
  BookingLink,
  DashboardData,
  UserActivity,
  UserRole,
  WorkspaceUser,
  WorkflowStatus,
  EmailTemplate,
  Notification,
  LinkAnalytics,
  ActivityRecord,
} from "@/types";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import { BrandLogo } from "@/components/BrandLogo";
import { brand } from "@/brand";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { browserTimeZone, TimeZoneSelect } from "@/components/TimeZoneSelect";

import {
  DateSelect,
  DateTimeSelect,
  Empty,
  Field,
  Loading,
  Shell,
  Stat,
  StatusBadge,
  TimeSelect,
  dateAfter,
  dateValue,
  fmt,
  formatDateOnly,
  go,
  labels,
  localDateTime,
  slugFrom,
  weekDays,
} from "./shared";
export function Requests({ canEdit }: { canEdit: boolean }) {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("all");
  const [linkFilter, setLinkFilter] = useState(
    new URLSearchParams(location.search).get("link") || "all",
  );
  const [links, setLinks] = useState<BookingLink[]>([]);
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({
    page: 1,
    pageSize: 20,
    total: 0,
    totalPages: 1,
  });
  const [loading, setLoading] = useState(true);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [bulkStatus, setBulkStatus] = useState<WorkflowStatus>("under_review");
  const [bulkAssignee, setBulkAssignee] = useState("unchanged");
  const [assignees, setAssignees] = useState<WorkspaceUser[]>([]);
  const [selected, setSelected] = useState<string | null>(
    new URLSearchParams(location.search).get("open"),
  );
  useEffect(() => {
    api.links().then((r) => setLinks(r.links));
    api.assignees().then((r) => setAssignees(r.users));
  }, []);
  useEffect(() => {
    const timer = setTimeout(() => {
      setLoading(true);
      api
        .bookings({
          page,
          pageSize: 20,
          q: query,
          status: status === "all" ? "" : status,
          link: linkFilter === "all" ? "" : linkFilter,
        })
        .then((result) => {
          setBookings(result.bookings);
          setPagination(result.pagination);
        })
        .finally(() => setLoading(false));
    }, 300);
    return () => clearTimeout(timer);
  }, [page, query, status, linkFilter]);
  useEffect(() => setSelectedIds([]), [page, query, status, linkFilter]);
  async function applyBulk() {
    await api.bulkBookings({
      ids: selectedIds,
      status: bulkStatus,
      assignedTo: bulkAssignee === "unchanged" ? undefined : bulkAssignee,
    });
    toast.success(`${selectedIds.length} responses updated`);
    setSelectedIds([]);
    const result = await api.bookings({
      page,
      pageSize: 20,
      q: query,
      status: status === "all" ? "" : status,
      link: linkFilter === "all" ? "" : linkFilter,
    });
    setBookings(result.bookings);
    setPagination(result.pagination);
  }
  async function exportCsv() {
    const blob = await api.exportBookings({
      q: query,
      status: status === "all" ? "" : status,
      link: linkFilter === "all" ? "" : linkFilter,
    });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `responses-${new Date().toISOString().slice(0, 10)}.csv`;
    anchor.click();
    URL.revokeObjectURL(url);
    toast.success("CSV export downloaded");
  }
  const rows = bookings;
  const selectedLink = links.find((link) => link.id === linkFilter);
  return (
    <Shell
      title={
        selectedLink ? `${selectedLink.internalName} responses` : "Responses"
      }
      description={
        selectedLink
          ? "Responses submitted through this booking link."
          : "Review availability, confirm meetings, and track outcomes."
      }
      action={
        <Button variant="outline" onClick={exportCsv}>
          <Download />
          Export CSV
        </Button>
      }
    >
      <Card>
        {selectedIds.length > 0 && (
          <div className="flex flex-col gap-3 border-b bg-blue-500/5 p-4 sm:flex-row sm:items-center">
            <p className="flex-1 text-sm font-medium">
              {selectedIds.length} selected
            </p>
            <Select
              value={bulkStatus}
              onValueChange={(value) => setBulkStatus(value as WorkflowStatus)}
            >
              <SelectTrigger className="w-full bg-background sm:w-48">
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
            <Select value={bulkAssignee} onValueChange={setBulkAssignee}>
              <SelectTrigger className="w-full bg-background sm:w-56">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="unchanged">Keep assignment</SelectItem>
                {assignees.map((user) => (
                  <SelectItem key={user.id} value={user.email}>
                    Assign to {user.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button size="sm" onClick={applyBulk}>
              Apply changes
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setSelectedIds([])}
            >
              Clear
            </Button>
          </div>
        )}
        <CardHeader className="flex flex-col gap-3 sm:flex-row">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-2.5 size-4 text-muted-foreground" />
            <Input
              className="pl-9"
              placeholder="Search by email"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setPage(1);
              }}
            />
          </div>
          <Select
            value={status}
            onValueChange={(value) => {
              setStatus(value);
              setPage(1);
            }}
          >
            <SelectTrigger className="w-full sm:w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              {Object.entries(labels).map(([value, label]) => (
                <SelectItem key={value} value={value}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select
            value={linkFilter}
            onValueChange={(value) => {
              setLinkFilter(value);
              setPage(1);
            }}
          >
            <SelectTrigger className="w-full sm:w-52">
              <SelectValue placeholder="All booking links" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All booking links</SelectItem>
              {links.map((link) => (
                <SelectItem key={link.id} value={link.id}>
                  {link.internalName}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardHeader>
        <CardContent className="hidden p-0 md:block">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-10">
                  <Checkbox
                    aria-label="Select all visible"
                    checked={
                      rows.length > 0 && selectedIds.length === rows.length
                    }
                    onCheckedChange={(checked) =>
                      setSelectedIds(checked ? rows.map((row) => row.id) : [])
                    }
                  />
                </TableHead>
                <TableHead>Person</TableHead>
                <TableHead>Selected time</TableHead>
                <TableHead>Link</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {!loading &&
                rows.map((b) => (
                  <TableRow
                    className="cursor-pointer"
                    key={b.id}
                    onClick={() => setSelected(b.id)}
                  >
                    <TableCell onClick={(event) => event.stopPropagation()}>
                      <Checkbox
                        aria-label={`Select ${b.name}`}
                        checked={selectedIds.includes(b.id)}
                        onCheckedChange={(checked) =>
                          setSelectedIds((current) =>
                            checked
                              ? [...current, b.id]
                              : current.filter((id) => id !== b.id),
                          )
                        }
                      />
                    </TableCell>
                    <TableCell>
                      <p className="font-medium">{b.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {b.email} · {b.phone || "No phone"}
                      </p>
                    </TableCell>
                    <TableCell>{fmt(b.startsAt)}</TableCell>
                    <TableCell>{b.linkTitle}</TableCell>
                    <TableCell>
                      <StatusBadge status={b.status} />
                    </TableCell>
                  </TableRow>
                ))}
            </TableBody>
          </Table>
        </CardContent>
        <CardContent className="space-y-2 md:hidden">
          {!loading &&
            rows.map((b) => (
              <button
                key={b.id}
                className="w-full rounded-lg border p-4 text-left"
                onClick={() => setSelected(b.id)}
              >
                <div className="flex items-start justify-between gap-3">
                  <span onClick={(event) => event.stopPropagation()}>
                    <Checkbox
                      aria-label={`Select ${b.name}`}
                      checked={selectedIds.includes(b.id)}
                      onCheckedChange={(checked) =>
                        setSelectedIds((current) =>
                          checked
                            ? [...current, b.id]
                            : current.filter((id) => id !== b.id),
                        )
                      }
                    />
                  </span>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{b.name}</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {b.email} · {b.linkTitle}
                    </p>
                  </div>
                  <StatusBadge status={b.status} />
                </div>
                <div className="mt-4 flex items-center justify-between border-t pt-3 text-xs text-muted-foreground">
                  <span>{fmt(b.startsAt)}</span>
                  <ChevronRight className="size-4" />
                </div>
              </button>
            ))}
        </CardContent>
      </Card>
      {loading ? (
        <Loading />
      ) : !rows.length ? (
        <Empty />
      ) : (
        <div className="mt-4 flex flex-col items-center justify-between gap-3 sm:flex-row">
          <p className="text-xs text-muted-foreground">
            Showing {(pagination.page - 1) * pagination.pageSize + 1}–
            {Math.min(pagination.page * pagination.pageSize, pagination.total)}{" "}
            of {pagination.total} responses
          </p>
          <Pagination className="mx-0 w-auto">
            <PaginationContent>
              <PaginationItem>
                <PaginationPrevious
                  href="#"
                  aria-disabled={page <= 1}
                  onClick={(event) => {
                    event.preventDefault();
                    if (page > 1) setPage(page - 1);
                  }}
                />
              </PaginationItem>
              <PaginationItem>
                <span className="px-3 text-sm tabular-nums">
                  Page {pagination.page} of {pagination.totalPages}
                </span>
              </PaginationItem>
              <PaginationItem>
                <PaginationNext
                  href="#"
                  aria-disabled={page >= pagination.totalPages}
                  onClick={(event) => {
                    event.preventDefault();
                    if (page < pagination.totalPages) setPage(page + 1);
                  }}
                />
              </PaginationItem>
            </PaginationContent>
          </Pagination>
        </div>
      )}
      <RequestDialog
        id={selected}
        canEdit={canEdit}
        close={() => setSelected(null)}
      />
    </Shell>
  );
}

export function RequestDialog({
  id,
  canEdit,
  close,
}: {
  id: string | null;
  canEdit: boolean;
  close: () => void;
}) {
  const [detail, setDetail] = useState<BookingDetail>();
  const [assignees, setAssignees] = useState<WorkspaceUser[]>([]);
  const [error, setError] = useState("");
  useEffect(() => {
    if (id) {
      api.booking(id).then(setDetail);
      api.assignees().then((r) => setAssignees(r.users));
    }
  }, [id]);
  if (!id) return null;
  const bookingId = id;
  async function save(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const assignedTo = String(f.get("assignedTo"));
    try {
      await api.updateBooking(bookingId, {
        status: String(f.get("status")) as WorkflowStatus,
        meetingUrl: String(f.get("meetingUrl")),
        meetingProviderPreference: String(
          f.get("meetingProviderPreference") ||
            detail?.booking.meetingProviderPreference ||
            "workspace",
        ) as Booking["meetingProviderPreference"],
        assignedTo: assignedTo === "unassigned" ? "" : assignedTo,
        adminNote: String(f.get("note")),
        finalStartsAt: String(f.get("finalStartsAt")),
        meetingNotes: String(f.get("meetingNotes")),
      });
      setDetail(await api.booking(bookingId));
      toast.success("Response updated");
    } catch (c) {
      setError(c instanceof Error ? c.message : "Could not save");
    }
  }
  async function send(template: string) {
    try {
      const result = await api.sendEmail(bookingId, template);
      setDetail(await api.booking(bookingId));
      toast.success(
        result.deliveryMethod === "calendar"
          ? template === "cancelled"
            ? "Calendar cancellation sent"
            : "Calendar invitation sent"
          : `Email sent through ${result.deliveryMethod}${result.usedWorkerFallback ? " using Worker fallback" : ""}`,
      );
    } catch (c) {
      setError(c instanceof Error ? c.message : "Could not send");
    }
  }
  async function erasePersonalData() {
    try {
      await api.eraseBookingPersonalData(bookingId);
      setDetail(await api.booking(bookingId));
      toast.success("Visitor personal data erased");
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "Could not erase visitor data",
      );
    }
  }
  return (
    <Dialog open onOpenChange={(open) => !open && close()}>
      <DialogContent className="max-h-[90svh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>
            {detail?.booking.email || "Loading response"}
          </DialogTitle>
          <DialogDescription>
            {detail
              ? `${detail.booking.linkTitle} · ${fmt(detail.booking.startsAt)}`
              : "Loading details…"}
          </DialogDescription>
        </DialogHeader>
        {detail && (
          <form onSubmit={save} className="space-y-6">
            <Tabs defaultValue="meeting">
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="meeting">Meeting</TabsTrigger>
                <TabsTrigger value="visitor">Visitor</TabsTrigger>
                <TabsTrigger value="emails">Emails</TabsTrigger>
                <TabsTrigger value="activity">Activity</TabsTrigger>
              </TabsList>
              <TabsContent
                forceMount
                value="meeting"
                className="space-y-4 pt-4 data-[state=inactive]:hidden"
              >
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="Status">
                    <Select name="status" defaultValue={detail.booking.status}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.entries(labels).map(([v, l]) => (
                          <SelectItem key={v} value={v}>
                            {l}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </Field>
                  <Field label="Assigned to">
                    <Select
                      name="assignedTo"
                      defaultValue={detail.booking.assignedTo || "unassigned"}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Choose owner" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="unassigned">Unassigned</SelectItem>
                        {assignees.map((user) => (
                          <SelectItem key={user.id} value={user.email}>
                            {user.name} · {user.email}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </Field>
                  <Field label="Meeting method">
                    <Select
                      name="meetingProviderPreference"
                      defaultValue={detail.booking.meetingProviderPreference}
                      disabled={Boolean(detail.booking.meetingProviderEventId)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="workspace">
                          Workspace default
                        </SelectItem>
                        <SelectItem value="google">Google Meet</SelectItem>
                        <SelectItem value="microsoft">
                          Microsoft Teams
                        </SelectItem>
                        <SelectItem value="manual">Manual link</SelectItem>
                      </SelectContent>
                    </Select>
                  </Field>
                  <Field label="Final meeting time">
                    <DateTimeSelect
                      name="finalStartsAt"
                      initialValue={localDateTime(
                        detail.booking.finalStartsAt || detail.booking.startsAt,
                      )}
                    />
                  </Field>
                  <Field
                    label={
                      detail.booking.meetingProvider
                        ? `${detail.booking.meetingProvider === "google" ? "Google Meet" : "Microsoft Teams"} URL`
                        : "Meeting URL"
                    }
                  >
                    <Input
                      key={detail.booking.meetingUrl || "manual-meeting-url"}
                      name="meetingUrl"
                      type="url"
                      readOnly={Boolean(detail.booking.meetingProviderEventId)}
                      defaultValue={detail.booking.meetingUrl || ""}
                      placeholder="Created automatically on Confirm and invite"
                    />
                    <p className="mt-1.5 text-xs text-muted-foreground">
                      {detail.booking.meetingProviderEventId
                        ? `Managed through ${detail.booking.meetingProviderAccount || "the connected organizer calendar"}. Time changes and cancellation sync automatically.`
                        : "Enter a manual HTTPS link, or leave blank to use the default provider in Calendar and email integrations."}
                    </p>
                  </Field>
                  <Field label="Internal note">
                    <Textarea
                      name="note"
                      defaultValue={detail.booking.adminNote || ""}
                    />
                  </Field>
                  <div className="sm:col-span-2">
                    <Field label="Meeting instructions">
                      <Textarea
                        name="meetingNotes"
                        defaultValue={detail.booking.meetingNotes || ""}
                        placeholder="Agenda or joining instructions"
                      />
                    </Field>
                  </div>
                </div>
              </TabsContent>
              <TabsContent value="visitor" className="pt-4">
                {detail.feedback && (
                  <div className="mb-4 rounded-xl border border-amber-500/20 bg-amber-500/5 p-4">
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-sm font-medium">Meeting feedback</p>
                      <Badge
                        variant="outline"
                        className="border-amber-500/20 bg-amber-500/10 text-amber-700 dark:text-amber-300"
                      >
                        {detail.feedback.rating}/5
                      </Badge>
                    </div>
                    <p className="mt-2 whitespace-pre-wrap text-sm text-muted-foreground">
                      {detail.feedback.message || "No written feedback."}
                    </p>
                  </div>
                )}
                <div className="grid gap-3 sm:grid-cols-2">
                  {[
                    ["Email", detail.booking.email],
                    ["Phone", detail.booking.phone || "Not provided"],
                    ["Selected time", fmt(detail.booking.startsAt)],
                    ["Visitor time zone", detail.booking.timeZone],
                    ["Device", detail.booking.deviceType || "Unknown"],
                    [
                      "Approximate location",
                      detail.booking.location || "Unavailable",
                    ],
                    ["Language", detail.booking.browserLanguage || "Unknown"],
                    ["Referrer", detail.booking.referrer || "Direct"],
                  ].map(([label, value]) => (
                    <div className="rounded-lg border p-3" key={label}>
                      <p className="text-xs text-muted-foreground">{label}</p>
                      <p className="mt-1 break-words text-sm font-medium">
                        {value}
                      </p>
                    </div>
                  ))}
                </div>
                {canEdit &&
                  detail.booking.email !==
                    `deleted+${bookingId}@invalid.local` && (
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button
                          type="button"
                          variant="destructive"
                          className="mt-4"
                        >
                          <Trash2 />
                          Erase visitor data
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>
                            Erase personal data?
                          </AlertDialogTitle>
                          <AlertDialogDescription>
                            This permanently removes the visitor’s identity,
                            contact details, device information, notes, and
                            self-service access. Anonymous meeting statistics
                            are retained. This cannot be undone.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Keep data</AlertDialogCancel>
                          <AlertDialogAction
                            variant="destructive"
                            onClick={erasePersonalData}
                          >
                            Erase permanently
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  )}
              </TabsContent>
              <TabsContent value="emails" className="pt-4">
                <div className="space-y-3">
                  {detail.emails.length ? (
                    detail.emails.map((email) => (
                      <div
                        className="flex items-start gap-3 rounded-lg border p-3"
                        key={email.id}
                      >
                        <span className="flex size-8 items-center justify-center rounded-lg bg-muted">
                          <Mail className="size-4" />
                        </span>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between gap-3">
                            <p className="text-sm font-medium capitalize">
                              {email.template.replaceAll("_", " ")}
                            </p>
                            <Badge
                              variant={
                                email.status === "sent"
                                  ? "secondary"
                                  : "destructive"
                              }
                            >
                              {email.status}
                            </Badge>
                          </div>
                          <p className="mt-1 text-xs text-muted-foreground">
                            {fmt(email.created_at)}
                            {email.delivery_method
                              ? ` · ${email.delivery_method}`
                              : ""}
                            {email.sender_email
                              ? ` · ${email.sender_email}`
                              : ""}
                            {email.used_fallback ? " · fallback" : ""}
                          </p>
                          {email.error && (
                            <p className="mt-2 text-xs text-destructive">
                              {email.error}
                            </p>
                          )}
                        </div>
                      </div>
                    ))
                  ) : (
                    <Empty />
                  )}
                </div>
              </TabsContent>
              <TabsContent value="activity" className="pt-5">
                <div className="space-y-4">
                  {detail.activities.map((a) => (
                    <div className="flex gap-3" key={a.id}>
                      <span className="mt-1.5 size-2 rounded-full bg-foreground/50" />
                      <div>
                        <p className="text-sm">{a.summary}</p>
                        <p className="text-xs text-muted-foreground">
                          {fmt(a.created_at)}
                          {a.actor_email ? ` · ${a.actor_email}` : ""}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </TabsContent>
            </Tabs>
            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            <Separator />
            {canEdit && (
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => send("meeting_details")}
                  disabled={Boolean(
                    detail.booking.meetingProviderEventId &&
                      detail.booking.meetingUrl,
                  )}
                >
                  <CalendarDays />
                  {detail.booking.meetingProviderEventId &&
                  detail.booking.meetingUrl
                    ? "Calendar invite sent"
                    : detail.booking.meetingProviderEventId
                      ? "Finish calendar invite"
                      : "Confirm and invite"}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => send("reminder")}
                >
                  <Clock3 />
                  Send reminder
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => send("reschedule")}
                >
                  Reschedule
                </Button>
                <Button
                  type="button"
                  variant="destructive"
                  onClick={() => send("cancelled")}
                  disabled={detail.booking.status === "cancelled"}
                >
                  {detail.booking.status === "cancelled"
                    ? "Meeting cancelled"
                    : "Cancel meeting"}
                </Button>
                <Button className="ml-auto">Save changes</Button>
              </div>
            )}
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
