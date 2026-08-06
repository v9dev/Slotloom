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

const rawDateRangeDays = (from: string, until: string) => {
  if (!from || !until) return null;
  const fromTime = Date.parse(`${from}T00:00:00.000Z`);
  const untilTime = Date.parse(`${until}T00:00:00.000Z`);
  return Number.isFinite(fromTime) && Number.isFinite(untilTime)
    ? Math.round((untilTime - fromTime) / 86_400_000)
    : null;
};

const dateRangeDays = (from: string, until: string, fallback: number) => {
  if (!from || !until) return fallback;
  const range = rawDateRangeDays(from, until);
  return range === null ? fallback : Math.max(1, Math.min(365, range));
};

export function CreateLinkDialog({
  open,
  setOpen,
  created,
}: {
  open: boolean;
  setOpen: (open: boolean) => void;
  created: () => void;
}) {
  const [step, setStep] = useState(0);
  const [title, setTitle] = useState("");
  const [internalName, setInternalName] = useState("");
  const [slug, setSlug] = useState("");
  const [slugEdited, setSlugEdited] = useState(false);
  const [description, setDescription] = useState("");
  const [timeZone, setTimeZone] = useState(browserTimeZone());
  const [duration, setDuration] = useState(30);
  const [interval, setInterval] = useState(30);
  const [buffer, setBuffer] = useState(0);
  const [notice, setNotice] = useState(0);
  const [validFrom, setValidFrom] = useState(() => dateValue(new Date()));
  const [validUntil, setValidUntil] = useState(() => dateAfter(30));
  const [status, setStatus] = useState<"draft" | "active">("active");
  const [allowCustomMeetingTitle, setAllowCustomMeetingTitle] = useState(false);
  const [allowAdditionalAttendees, setAllowAdditionalAttendees] =
    useState(false);
  const [rules, setRules] = useState(
    [1, 2, 3, 4, 5].map((weekday) => ({
      weekday,
      startTime: "09:00",
      endTime: "17:00",
    })),
  );
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  function reset() {
    setStep(0);
    setTitle("");
    setInternalName("");
    setSlug("");
    setSlugEdited(false);
    setDescription("");
    setNotice(0);
    setValidFrom(dateValue(new Date()));
    setValidUntil(dateAfter(30));
    setAllowCustomMeetingTitle(false);
    setAllowAdditionalAttendees(false);
    setRules(
      [1, 2, 3, 4, 5].map((weekday) => ({
        weekday,
        startTime: "09:00",
        endTime: "17:00",
      })),
    );
    setError("");
  }
  function titleChange(value: string) {
    setTitle(value);
    if (!internalName) setInternalName(value);
    if (!slugEdited) setSlug(slugFrom(value));
  }
  function toggle(weekday: number, active: boolean) {
    setRules((current) =>
      active
        ? [...current, { weekday, startTime: "09:00", endTime: "17:00" }]
        : current.filter((rule) => rule.weekday !== weekday),
    );
  }
  function time(weekday: number, key: "startTime" | "endTime", value: string) {
    setRules((current) =>
      current.map((rule) =>
        rule.weekday === weekday ? { ...rule, [key]: value } : rule,
      ),
    );
  }
  function next() {
    if (step === 0 && (!title.trim() || !slug.trim()))
      return setError("Add a title and URL before continuing.");
    if (step === 1 && (!rules.length || !validFrom || !validUntil))
      return setError(
        "Choose a valid date range and at least one available day.",
      );
    if (step === 1 && validFrom > validUntil)
      return setError("The end date must be on or after the start date.");
    if (step === 1 && (rawDateRangeDays(validFrom, validUntil) || 0) > 365)
      return setError("The date range cannot be longer than 365 days.");
    setError("");
    setStep((current) => Math.min(3, current + 1));
  }
  async function create() {
    setSaving(true);
    setError("");
    try {
      await api.createLink({
        title,
        internalName: internalName || title,
        slug,
        description,
        durationMinutes: duration,
        slotIntervalMinutes: interval,
        bufferMinutes: buffer,
        timeZone,
        daysAhead: dateRangeDays(validFrom, validUntil, 30),
        minimumNoticeHours: notice,
        validFrom,
        validUntil,
        status,
        allowSlotHolds: false,
        allowCustomMeetingTitle,
        allowAdditionalAttendees,
        availability: rules,
      });
      toast.success("Booking link created and ready to share");
      created();
      setOpen(false);
      reset();
    } catch (c) {
      setError(c instanceof Error ? c.message : "Could not create link");
    } finally {
      setSaving(false);
    }
  }
  return (
    <Dialog
      open={open}
      onOpenChange={(value) => {
        setOpen(value);
        if (!value) reset();
      }}
    >
      <DialogTrigger asChild>
        <Button>
          <Plus />
          New booking link
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[94svh] overflow-y-auto sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>Create a booking link</DialogTitle>
          <DialogDescription>
            Set up the visitor page, available hours, and booking rules before
            publishing.
          </DialogDescription>
        </DialogHeader>
        <div className="grid grid-cols-4 gap-2 py-2">
          {["Details", "Availability", "Rules", "Review"].map(
            (label, index) => (
              <div key={label}>
                <div
                  className={`h-1.5 rounded-full ${index <= step ? "bg-primary" : "bg-muted"}`}
                />
                <p
                  className={`mt-2 text-xs ${index === step ? "font-medium" : "text-muted-foreground"}`}
                >
                  {label}
                </p>
              </div>
            ),
          )}
        </div>
        {step === 0 && (
          <div className="space-y-5 py-3">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Public meeting title">
                <Input
                  autoFocus
                  value={title}
                  onChange={(e) => titleChange(e.target.value)}
                  placeholder="30-minute introduction"
                />
              </Field>
              <Field label="Internal name">
                <Input
                  value={internalName}
                  onChange={(e) => setInternalName(e.target.value)}
                  placeholder="Sales introduction"
                />
              </Field>
            </div>
            <Field label="Public description">
              <Textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Tell visitors what this conversation is for and what happens after they submit."
              />
            </Field>
            <Field label="Public URL">
              <div className="flex items-center rounded-lg border bg-muted/30 pl-3 text-sm text-muted-foreground focus-within:ring-3 focus-within:ring-ring/50">
                <span className="hidden sm:inline">
                  {location.origin}/book/
                </span>
                <Input
                  className="border-0 bg-transparent shadow-none focus-visible:ring-0"
                  value={slug}
                  onChange={(e) => {
                    setSlugEdited(true);
                    setSlug(slugFrom(e.target.value));
                  }}
                  placeholder="introduction"
                />
              </div>
              <p className="text-xs font-normal text-muted-foreground">
                Generated automatically from the title. You can still edit it.
              </p>
            </Field>
          </div>
        )}
        {step === 1 && (
          <div className="space-y-4 py-3">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Scheduling time zone">
                <TimeZoneSelect
                  value={timeZone}
                  onValueChange={setTimeZone}
                  label="Scheduling time zone"
                />
              </Field>
              <div className="rounded-lg border bg-muted/30 p-3 text-xs leading-5 text-muted-foreground">
                Availability windows use this time zone. Visitors automatically
                see every slot converted to their own detected or selected time
                zone. A booked time disappears immediately for everyone else.
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Link valid from">
                <DateSelect
                  value={validFrom}
                  onChange={setValidFrom}
                  label="Choose link start date"
                />
              </Field>
              <Field label="Link valid until">
                <DateSelect
                  value={validUntil}
                  onChange={setValidUntil}
                  label="Choose link end date"
                  min={validFrom}
                />
              </Field>
            </div>
            <Separator />
            {weekDays.map((name, weekday) => {
              const rule = rules.find((item) => item.weekday === weekday);
              return (
                <div
                  key={name}
                  className="grid items-center gap-3 rounded-lg border p-3 sm:grid-cols-[130px_1fr]"
                >
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={Boolean(rule)}
                      onCheckedChange={(active) => toggle(weekday, active)}
                    />
                    <span className="text-sm font-medium">{name}</span>
                  </div>
                  {rule ? (
                    <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2">
                      <TimeSelect
                        value={rule.startTime}
                        onChange={(value) => time(weekday, "startTime", value)}
                        label={`${name} start time`}
                      />
                      <span className="text-xs text-muted-foreground">to</span>
                      <TimeSelect
                        value={rule.endTime}
                        onChange={(value) => time(weekday, "endTime", value)}
                        label={`${name} end time`}
                      />
                    </div>
                  ) : (
                    <span className="text-sm text-muted-foreground">
                      Not available
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        )}
        {step === 2 && (
          <div className="grid gap-4 py-3 sm:grid-cols-2">
            <Field label="Meeting duration">
              <Select
                value={String(duration)}
                onValueChange={(value) => setDuration(Number(value))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {[15, 30, 45, 60, 90].map((value) => (
                    <SelectItem key={value} value={String(value)}>
                      {value} minutes
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs font-normal text-muted-foreground">
                Length of the eventual meeting.
              </p>
            </Field>
            <Field label="Start-time interval">
              <Select
                value={String(interval)}
                onValueChange={(value) => setInterval(Number(value))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {[15, 30, 45, 60].map((value) => (
                    <SelectItem key={value} value={String(value)}>
                      Every {value} minutes
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs font-normal text-muted-foreground">
                How often a selectable slot begins.
              </p>
            </Field>
            <Field label="Buffer after each slot">
              <Select
                value={String(buffer)}
                onValueChange={(value) => setBuffer(Number(value))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {[0, 5, 10, 15, 30].map((value) => (
                    <SelectItem key={value} value={String(value)}>
                      {value ? `${value} minutes` : "No buffer"}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field label="Minimum notice">
              <Select
                value={String(notice)}
                onValueChange={(value) => setNotice(Number(value))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {[0, 2, 4, 12, 24, 48].map((value) => (
                    <SelectItem key={value} value={String(value)}>
                      {value ? `${value} hours` : "No minimum"}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field label="Publishing">
              <Select
                value={status}
                onValueChange={(value) =>
                  setStatus(value as "draft" | "active")
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Publish immediately</SelectItem>
                  <SelectItem value="draft">Save as draft</SelectItem>
                </SelectContent>
              </Select>
            </Field>
            <div className="flex items-center justify-between gap-4 rounded-xl border p-4 sm:col-span-2">
              <div>
                <p className="text-sm font-medium">Visitor meeting title</p>
                <p className="text-xs text-muted-foreground">
                  Let the visitor suggest a meeting title for organizer review.
                </p>
              </div>
              <Switch
                checked={allowCustomMeetingTitle}
                onCheckedChange={setAllowCustomMeetingTitle}
                aria-label="Allow visitor meeting title"
              />
            </div>
            <div className="flex items-center justify-between gap-4 rounded-xl border p-4 sm:col-span-2">
              <div>
                <p className="text-sm font-medium">Additional attendees</p>
                <p className="text-xs text-muted-foreground">
                  Let the visitor suggest up to nine additional attendees.
                  Invitations are sent only after organizer approval.
                </p>
              </div>
              <Switch
                checked={allowAdditionalAttendees}
                onCheckedChange={setAllowAdditionalAttendees}
                aria-label="Allow additional attendees"
              />
            </div>
          </div>
        )}
        {step === 3 && (
          <div className="space-y-4 py-3">
            <div className="rounded-xl border p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-lg font-semibold">{title}</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    /book/{slug}
                  </p>
                </div>
                <Badge variant="outline">{status}</Badge>
              </div>
              {description && (
                <p className="mt-4 text-sm leading-6 text-muted-foreground">
                  {description}
                </p>
              )}
              <Separator className="my-5" />
              <div className="grid gap-4 text-sm sm:grid-cols-3">
                <div>
                  <p className="text-xs text-muted-foreground">Duration</p>
                  <p className="mt-1 font-medium">{duration} minutes</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">
                    Available days
                  </p>
                  <p className="mt-1 font-medium">{rules.length} per week</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">
                    Minimum notice
                  </p>
                  <p className="mt-1 font-medium">
                    {notice ? `${notice} hours` : "No minimum"}
                  </p>
                </div>
              </div>
              <div className="mt-4 rounded-lg bg-muted/40 p-3 text-sm">
                <span className="text-muted-foreground">Active dates: </span>
                <span className="font-medium">
                  {formatDateOnly(validFrom)} – {formatDateOnly(validUntil)}
                </span>
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                {allowCustomMeetingTitle && (
                  <Badge variant="secondary">Visitor meeting title</Badge>
                )}
                {allowAdditionalAttendees && (
                  <Badge variant="secondary">Additional attendees</Badge>
                )}
                {!allowCustomMeetingTitle && !allowAdditionalAttendees && (
                  <Badge variant="outline">
                    Organizer controls meeting details
                  </Badge>
                )}
              </div>
            </div>
            <Alert>
              <ShieldCheck />
              <AlertDescription>
                Double-booking protection is automatic. Once one visitor submits
                a slot, it is removed from the public link and the database
                rejects any simultaneous duplicate request.
              </AlertDescription>
            </Alert>
          </div>
        )}
        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
        <DialogFooter className="mt-5 flex-row justify-between sm:justify-between">
          <Button
            type="button"
            variant="outline"
            disabled={step === 0 || saving}
            onClick={() => setStep((value) => value - 1)}
          >
            Back
          </Button>
          {step < 3 ? (
            <Button type="button" onClick={next}>
              Continue
              <ChevronRight />
            </Button>
          ) : (
            <Button type="button" disabled={saving} onClick={create}>
              {saving ? <Loader2 className="animate-spin" /> : <CheckCircle2 />}
              {status === "active" ? "Create and publish" : "Save draft"}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
export function LinkSettingsDialog({
  link,
  close,
  saved,
}: {
  link: BookingLink | null;
  close: () => void;
  saved: () => void;
}) {
  const [rules, setRules] = useState(link?.availability || []);
  const [status, setStatus] = useState(link?.status || "draft");
  const [validFrom, setValidFrom] = useState(link?.validFrom || "");
  const [validUntil, setValidUntil] = useState(link?.validUntil || "");
  const [allowCustomMeetingTitle, setAllowCustomMeetingTitle] = useState(
    link?.allowCustomMeetingTitle || false,
  );
  const [allowAdditionalAttendees, setAllowAdditionalAttendees] = useState(
    link?.allowAdditionalAttendees || false,
  );
  const [error, setError] = useState("");
  useEffect(() => {
    setRules(link?.availability || []);
    setStatus(link?.status || "draft");
    setValidFrom(link?.validFrom || "");
    setValidUntil(link?.validUntil || "");
    setAllowCustomMeetingTitle(link?.allowCustomMeetingTitle || false);
    setAllowAdditionalAttendees(link?.allowAdditionalAttendees || false);
  }, [link]);
  if (!link) return null;
  const currentLink = link;
  function toggle(weekday: number, active: boolean) {
    setRules((current) =>
      active
        ? [...current, { weekday, startTime: "09:00", endTime: "17:00" }]
        : current.filter((r) => r.weekday !== weekday),
    );
  }
  function time(weekday: number, key: "startTime" | "endTime", value: string) {
    setRules((current) =>
      current.map((r) => (r.weekday === weekday ? { ...r, [key]: value } : r)),
    );
  }
  async function save(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    if (validFrom && validUntil && validFrom > validUntil)
      return setError("The end date must be on or after the start date.");
    if ((rawDateRangeDays(validFrom, validUntil) || 0) > 365)
      return setError("The date range cannot be longer than 365 days.");
    try {
      await api.updateLink(currentLink.id, {
        title: String(f.get("title")),
        internalName: String(f.get("internalName")),
        slug: String(f.get("slug")),
        description: String(f.get("description")),
        durationMinutes: Number(f.get("duration")),
        slotIntervalMinutes: Number(f.get("interval")),
        bufferMinutes: Number(f.get("buffer")),
        timeZone: String(f.get("timezone")),
        daysAhead: dateRangeDays(validFrom, validUntil, currentLink.daysAhead),
        minimumNoticeHours: Number(f.get("notice")),
        validFrom,
        validUntil,
        status,
        allowSlotHolds: false,
        allowCustomMeetingTitle,
        allowAdditionalAttendees,
        availability: rules,
      });
      toast.success("Booking link updated");
      saved();
    } catch (c) {
      setError(c instanceof Error ? c.message : "Could not update link");
    }
  }
  return (
    <Dialog open onOpenChange={(open) => !open && close()}>
      <DialogContent className="max-h-[92svh] overflow-y-auto sm:max-w-3xl">
        <form onSubmit={save}>
          <DialogHeader>
            <DialogTitle>Edit booking link</DialogTitle>
            <DialogDescription>
              Control the public page, scheduling rules, and availability.
            </DialogDescription>
          </DialogHeader>
          <Tabs defaultValue="details" className="mt-5">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="details">Details</TabsTrigger>
              <TabsTrigger value="schedule">Schedule</TabsTrigger>
              <TabsTrigger value="limits">Limits</TabsTrigger>
            </TabsList>
            <TabsContent
              forceMount
              value="details"
              className="space-y-4 pt-4 data-[state=inactive]:hidden"
            >
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Internal name">
                  <Input
                    name="internalName"
                    defaultValue={link.internalName}
                    required
                  />
                </Field>
                <Field label="Public title">
                  <Input name="title" defaultValue={link.title} required />
                </Field>
              </div>
              <Field label="URL slug">
                <Input name="slug" defaultValue={link.slug} required />
              </Field>
              <Field label="Description">
                <Textarea
                  name="description"
                  defaultValue={link.description || ""}
                />
              </Field>
              <div className="flex items-center justify-between rounded-lg border p-4">
                <div>
                  <p className="text-sm font-medium">Public link active</p>
                  <p className="text-xs text-muted-foreground">
                    Visitors can view and submit availability.
                  </p>
                </div>
                <Switch
                  checked={status === "active"}
                  onCheckedChange={(checked) =>
                    setStatus(checked ? "active" : "paused")
                  }
                />
              </div>
            </TabsContent>
            <TabsContent
              forceMount
              value="schedule"
              className="space-y-2 pt-4 data-[state=inactive]:hidden"
            >
              <div className="grid gap-4 pb-3 sm:grid-cols-2">
                <Field label="Link valid from">
                  <DateSelect
                    value={validFrom}
                    onChange={setValidFrom}
                    label="Choose link start date"
                    optional
                  />
                </Field>
                <Field label="Link valid until">
                  <DateSelect
                    value={validUntil}
                    onChange={setValidUntil}
                    label="Choose link end date"
                    min={validFrom || undefined}
                    optional
                  />
                </Field>
              </div>
              {weekDays.map((name, weekday) => {
                const rule = rules.find((r) => r.weekday === weekday);
                return (
                  <div
                    key={name}
                    className="grid items-center gap-3 rounded-lg border p-3 sm:grid-cols-[120px_1fr]"
                  >
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={Boolean(rule)}
                        onCheckedChange={(active) => toggle(weekday, active)}
                      />
                      <span className="text-sm font-medium">{name}</span>
                    </div>
                    {rule ? (
                      <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2">
                        <TimeSelect
                          value={rule.startTime}
                          onChange={(value) =>
                            time(weekday, "startTime", value)
                          }
                          label={`${name} start time`}
                        />
                        <span className="text-xs text-muted-foreground">
                          to
                        </span>
                        <TimeSelect
                          value={rule.endTime}
                          onChange={(value) => time(weekday, "endTime", value)}
                          label={`${name} end time`}
                        />
                      </div>
                    ) : (
                      <span className="text-sm text-muted-foreground">
                        Unavailable
                      </span>
                    )}
                  </div>
                );
              })}
            </TabsContent>
            <TabsContent
              forceMount
              value="limits"
              className="grid gap-4 pt-4 data-[state=inactive]:hidden sm:grid-cols-2"
            >
              <Field label="Meeting duration">
                <Input
                  name="duration"
                  type="number"
                  min="10"
                  max="240"
                  defaultValue={link.durationMinutes}
                />
              </Field>
              <Field label="Slot interval">
                <Input
                  name="interval"
                  type="number"
                  min="5"
                  max="240"
                  defaultValue={link.slotIntervalMinutes}
                />
              </Field>
              <Field label="Buffer between meetings">
                <Input
                  name="buffer"
                  type="number"
                  min="0"
                  max="120"
                  defaultValue={link.bufferMinutes}
                />
              </Field>
              <Field label="Minimum notice (hours)">
                <Input
                  name="notice"
                  type="number"
                  min="0"
                  max="720"
                  defaultValue={link.minimumNoticeHours}
                />
              </Field>
              <Field label="Time zone">
                <TimeZoneSelect
                  name="timezone"
                  defaultValue={link.timeZone}
                  label="Scheduling time zone"
                />
              </Field>
              <div className="flex items-center justify-between gap-4 rounded-xl border p-4 sm:col-span-2">
                <div>
                  <p className="text-sm font-medium">Visitor meeting title</p>
                  <p className="text-xs text-muted-foreground">
                    Allow a suggested title that the organizer reviews before
                    creating the meeting.
                  </p>
                </div>
                <Switch
                  checked={allowCustomMeetingTitle}
                  onCheckedChange={setAllowCustomMeetingTitle}
                  aria-label="Allow visitor meeting title"
                />
              </div>
              <div className="flex items-center justify-between gap-4 rounded-xl border p-4 sm:col-span-2">
                <div>
                  <p className="text-sm font-medium">Additional attendees</p>
                  <p className="text-xs text-muted-foreground">
                    Allow up to nine additional attendee suggestions.
                  </p>
                </div>
                <Switch
                  checked={allowAdditionalAttendees}
                  onCheckedChange={setAllowAdditionalAttendees}
                  aria-label="Allow additional attendees"
                />
              </div>
            </TabsContent>
          </Tabs>
          {error && (
            <Alert variant="destructive" className="mt-4">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          <DialogFooter className="mt-6">
            <Button type="button" variant="outline" onClick={close}>
              Cancel
            </Button>
            <Button>Save changes</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
