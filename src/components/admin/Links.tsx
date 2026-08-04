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
import { CreateLinkDialog, LinkSettingsDialog } from "./LinkDialogs";
export function Links({ canManage }: { canManage: boolean }) {
  const [links, setLinks] = useState<BookingLink[]>([]);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<BookingLink | null>(null);
  const [analyticsLink, setAnalyticsLink] = useState<BookingLink | null>(null);
  const [copiedLinkId, setCopiedLinkId] = useState<string | null>(null);
  const [view, setView] = useState("current");
  const [loading, setLoading] = useState(true);
  const load = () => {
    setLoading(true);
    return api
      .links()
      .then((r) => setLinks(r.links))
      .finally(() => setLoading(false));
  };
  useEffect(() => {
    load();
  }, []);
  const visibleLinks = links.filter((link) =>
    view === "all"
      ? true
      : view === "archived"
        ? link.status === "archived"
        : link.status !== "archived",
  );
  async function copyBookingLink(link: BookingLink) {
    const url = new URL(`/book/${link.slug}`, window.location.origin).toString();
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(url);
      } else {
        const input = document.createElement("textarea");
        input.value = url;
        input.style.position = "fixed";
        input.style.opacity = "0";
        document.body.appendChild(input);
        input.select();
        const copied = document.execCommand("copy");
        input.remove();
        if (!copied) throw new Error("Copy command failed");
      }
      setCopiedLinkId(link.id);
      toast.success("Booking link copied", { description: url });
      window.setTimeout(
        () =>
          setCopiedLinkId((current) =>
            current === link.id ? null : current,
          ),
        2_000,
      );
    } catch {
      toast.error("Could not copy the booking link", {
        description: "Please copy the URL manually and try again.",
      });
    }
  }
  return (
    <Shell
      title="Booking links"
      description="Create focused links with their own availability."
      action={
        canManage ? (
          <CreateLinkDialog open={open} setOpen={setOpen} created={load} />
        ) : undefined
      }
    >
      <div className="mb-4 flex items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">
          {visibleLinks.length} {view === "archived" ? "archived" : "booking"}{" "}
          {visibleLinks.length === 1 ? "link" : "links"}
        </p>
        <Select value={view} onValueChange={setView}>
          <SelectTrigger className="w-44">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="current">Current links</SelectItem>
            <SelectItem value="archived">Archived links</SelectItem>
            <SelectItem value="all">All links</SelectItem>
          </SelectContent>
        </Select>
      </div>
      {loading ? (
        <Card>
          <div className="flex min-h-56 items-center justify-center">
            <Loader2 className="size-5 animate-spin text-muted-foreground" />
          </div>
        </Card>
      ) : visibleLinks.length ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {visibleLinks.map((link) => (
            <Card key={link.id}>
              <CardHeader>
                <div className="flex justify-between">
                  <span className="flex size-9 items-center justify-center rounded-lg bg-muted">
                    <Link2 className="size-4" />
                  </span>
                  <Badge
                    variant="outline"
                    className={
                      link.status === "active"
                        ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
                        : link.status === "paused"
                          ? "border-amber-500/20 bg-amber-500/10 text-amber-700 dark:text-amber-300"
                          : "bg-muted"
                    }
                  >
                    {link.status}
                  </Badge>
                </div>
                <CardTitle className="pt-3">{link.internalName}</CardTitle>
                <CardDescription>
                  {link.description || "No description"}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <button
                  type="button"
                  className="group flex w-full items-center justify-between gap-3 rounded-md border bg-muted/30 px-3 py-2 text-xs text-muted-foreground transition-colors hover:border-foreground/20 hover:bg-muted/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  onClick={() => void copyBookingLink(link)}
                  aria-label={`Copy booking link for ${link.internalName}`}
                >
                  <span className="truncate">/book/{link.slug}</span>
                  <span
                    className={`flex shrink-0 items-center gap-1.5 font-medium ${copiedLinkId === link.id ? "text-emerald-600 dark:text-emerald-400" : "text-foreground"}`}
                    aria-live="polite"
                  >
                    {copiedLinkId === link.id ? (
                      <>
                        <CheckCircle2 className="size-3.5" />
                        Copied
                      </>
                    ) : (
                      <>
                        <Copy className="size-3.5" />
                        Copy
                      </>
                    )}
                  </span>
                </button>
                <div className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
                  <CalendarDays className="size-3.5" />
                  {link.validFrom || link.validUntil
                    ? `${link.validFrom ? formatDateOnly(link.validFrom) : "Any date"} – ${link.validUntil ? formatDateOnly(link.validUntil) : "No end date"}`
                    : "No fixed date range"}
                </div>
                <div className="mt-5 grid grid-cols-3 border-t pt-4 text-center">
                  <Stat value={link.responseCount} label="Responses" />
                  <Stat value={link.pendingCount} label="Pending" />
                  <Stat value={link.confirmedCount} label="Confirmed" />
                </div>
                {canManage && (
                  <div className="mt-5 flex gap-2">
                    <Button
                      variant="outline"
                      className="flex-1"
                      onClick={() => setEditing(link)}
                    >
                      Edit link
                    </Button>
                    <LinkRemovalActions link={link} changed={load} />
                  </div>
                )}
                <Button
                  variant="ghost"
                  className="mt-2 w-full"
                  onClick={() => go(`/admin/requests?link=${link.id}`)}
                >
                  View {link.responseCount} responses
                  <ChevronRight />
                </Button>
                <Button
                  variant="ghost"
                  className="w-full"
                  onClick={() => setAnalyticsLink(link)}
                >
                  <BarChart3 />
                  View analytics
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <Empty
            title={view === "archived" ? "No archived links" : "No booking links yet"}
            description={
              view === "archived"
                ? "Links you archive will appear here."
                : "Create a booking link to start collecting availability."
            }
          />
        </Card>
      )}
      <LinkSettingsDialog
        link={editing}
        close={() => setEditing(null)}
        saved={() => {
          setEditing(null);
          load();
        }}
      />
      <LinkAnalyticsDialog
        link={analyticsLink}
        close={() => setAnalyticsLink(null)}
      />
    </Shell>
  );
}

export function LinkAnalyticsDialog({
  link,
  close,
}: {
  link: BookingLink | null;
  close: () => void;
}) {
  const [data, setData] = useState<LinkAnalytics>();
  useEffect(() => {
    if (link) api.linkAnalytics(link.id).then(setData);
  }, [link]);
  if (!link) return null;
  const max = Math.max(1, ...(data?.daily.map((day) => day.count) || [1]));
  return (
    <Dialog open onOpenChange={(open) => !open && close()}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{link.internalName} analytics</DialogTitle>
          <DialogDescription>
            Traffic and conversion for this booking link.
          </DialogDescription>
        </DialogHeader>
        {data ? (
          <div className="space-y-6">
            <div className="grid grid-cols-3 gap-3">
              <MetricMini
                label="Views"
                value={data.summary.views}
                tone="blue"
              />
              <MetricMini
                label="Responses"
                value={data.summary.responses}
                tone="violet"
              />
              <MetricMini
                label="Conversion"
                value={`${data.summary.conversionRate}%`}
                tone="green"
              />
            </div>
            <Card>
              <CardHeader>
                <CardTitle className="text-base">
                  Responses over 30 days
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex h-36 items-end gap-1">
                  {data.daily.length ? (
                    data.daily.map((day) => (
                      <div
                        key={day.date}
                        className="group relative flex-1 rounded-t bg-blue-500/25 hover:bg-blue-500/40"
                        style={{
                          height: `${Math.max(6, (day.count / max) * 100)}%`,
                        }}
                        title={`${day.date}: ${day.count}`}
                      />
                    ))
                  ) : (
                    <div className="m-auto text-sm text-muted-foreground">
                      No responses in this period.
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
            <div className="space-y-3">
              {data.statuses.map((item) => (
                <div key={item.status}>
                  <div className="mb-1 flex justify-between text-sm">
                    <span>{labels[item.status]}</span>
                    <span>{item.count}</span>
                  </div>
                  <Progress
                    value={
                      data.summary.responses
                        ? (item.count / data.summary.responses) * 100
                        : 0
                    }
                  />
                </div>
              ))}
            </div>
            <Button
              className="w-full"
              onClick={() => go(`/admin/requests?link=${link.id}`)}
            >
              Open filtered response table
              <ChevronRight />
            </Button>
          </div>
        ) : (
          <Loading />
        )}
      </DialogContent>
    </Dialog>
  );
}
export function MetricMini({
  label,
  value,
  tone,
}: {
  label: string;
  value: number | string;
  tone: "blue" | "violet" | "green";
}) {
  const colors = {
    blue: "bg-blue-500/10 text-blue-700 dark:text-blue-300",
    violet: "bg-violet-500/10 text-violet-700 dark:text-violet-300",
    green: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
  };
  return (
    <div className={`rounded-xl p-4 ${colors[tone]}`}>
      <p className="text-2xl font-semibold tabular-nums">{value}</p>
      <p className="text-xs opacity-75">{label}</p>
    </div>
  );
}

export function LinkRemovalActions({
  link,
  changed,
}: {
  link: BookingLink;
  changed: () => void;
}) {
  const [busy, setBusy] = useState(false);
  async function remove(mode: "archive" | "delete") {
    setBusy(true);
    try {
      await api.removeLink(link.id, mode);
      toast.success(
        mode === "archive"
          ? "Link archived and its public URL disabled"
          : "Link and all connected data permanently deleted",
      );
      changed();
    } catch (c) {
      toast.error(c instanceof Error ? c.message : "Could not remove link");
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="flex gap-2">
      {link.status !== "archived" && (
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button
              variant="outline"
              size="icon"
              aria-label={`Archive ${link.internalName}`}
            >
              <Archive />
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Archive this booking link?</AlertDialogTitle>
              <AlertDialogDescription>
                Its public URL will stop accepting responses. Existing responses,
                emails, feedback, analytics, and activity will remain available.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Keep active</AlertDialogCancel>
              <AlertDialogAction
                disabled={busy}
                onClick={() => remove("archive")}
              >
                Archive link
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
      <AlertDialog>
        <AlertDialogTrigger asChild>
          <Button
            variant="destructive"
            size="icon"
            aria-label={`Permanently delete ${link.internalName}`}
          >
            <Trash2 />
          </Button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Permanently delete this link?</AlertDialogTitle>
            <AlertDialogDescription>
              This permanently deletes the link and all {link.responseCount}{" "}
              connected responses, email history, feedback, analytics, and
              activity. This action cannot be undone. Archive the link instead
              if you need to retain its history.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep link</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              disabled={busy}
              onClick={() => remove("delete")}
            >
              {busy ? "Deleting…" : "Delete everything"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
