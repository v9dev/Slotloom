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
export function ActivityLog() {
  const [items, setItems] = useState<ActivityRecord[]>([]);
  const [actors, setActors] = useState<string[]>([]);
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("all");
  const [actor, setActor] = useState("all");
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({
    page: 1,
    pageSize: 20,
    total: 0,
    totalPages: 1,
  });
  useEffect(() => {
    const timer = setTimeout(() => {
      setLoading(true);
      api
        .activity({
          page,
          pageSize: 20,
          q: query,
          category: category === "all" ? "" : category,
          actor: actor === "all" ? "" : actor,
        })
        .then((result) => {
          setItems(result.activity);
          setActors(result.actors);
          setPagination(result.pagination);
        })
        .finally(() => setLoading(false));
    }, 300);
    return () => clearTimeout(timer);
  }, [page, query, category, actor]);
  const resetPage = () => setPage(1);
  return (
    <Shell
      title="Activity"
      description="A complete audit trail of meeting, link, email, visitor, and team actions."
    >
      <Card>
        <CardHeader className="grid gap-3 border-b pb-4 sm:grid-cols-2 lg:grid-cols-[minmax(0,1fr)_180px_220px]">
          <div className="relative sm:col-span-2 lg:col-span-1">
            <Search className="absolute left-3 top-2.5 size-4 text-muted-foreground" />
            <Input
              className="pl-9"
              placeholder="Search activity"
              value={query}
              onChange={(event) => {
                setQuery(event.target.value);
                resetPage();
              }}
            />
          </div>
          <Select
            value={category}
            onValueChange={(value) => {
              setCategory(value);
              resetPage();
            }}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All categories</SelectItem>
              <SelectItem value="booking">Meetings</SelectItem>
              <SelectItem value="bookings">Bulk operations</SelectItem>
              <SelectItem value="link">Booking links</SelectItem>
              <SelectItem value="email">Email</SelectItem>
              <SelectItem value="visitor">Visitor actions</SelectItem>
              <SelectItem value="feedback">Feedback</SelectItem>
              <SelectItem value="template">Templates</SelectItem>
              <SelectItem value="user">Team access</SelectItem>
            </SelectContent>
          </Select>
          <Select
            value={actor}
            onValueChange={(value) => {
              setActor(value);
              resetPage();
            }}
          >
            <SelectTrigger>
              <SelectValue placeholder="All actors" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All actors</SelectItem>
              {actors.map((email) => (
                <SelectItem key={email} value={email}>
                  {email}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardHeader>
        <CardContent className="hidden p-0 lg:block">
          <Table className="min-w-[900px] table-fixed">
            <TableHeader>
              <TableRow>
                <TableHead>Activity</TableHead>
                <TableHead className="w-36">Category</TableHead>
                <TableHead className="w-56">Actor</TableHead>
                <TableHead className="w-52 text-right">Date</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {!loading &&
                items.map((item) => (
                  <TableRow
                    key={`${item.source}-${item.id}`}
                    className={item.booking_id ? "cursor-pointer" : ""}
                    onClick={() =>
                      item.booking_id &&
                      go(`/admin/requests?open=${item.booking_id}`)
                    }
                  >
                    <TableCell className="whitespace-normal py-4">
                      <p className="font-medium leading-5">{item.summary}</p>
                      <p className="mt-1 font-mono text-[11px] text-muted-foreground">
                        {item.event_type}
                      </p>
                    </TableCell>
                    <TableCell>
                      <ActivityCategory eventType={item.event_type} />
                    </TableCell>
                    <TableCell className="truncate" title={item.actor_email}>
                      {item.actor_email}
                    </TableCell>
                    <TableCell className="text-right text-muted-foreground tabular-nums">
                      {fmt(item.created_at)}
                    </TableCell>
                  </TableRow>
                ))}
            </TableBody>
          </Table>
        </CardContent>
        <CardContent className="space-y-3 pt-4 lg:hidden">
          {!loading &&
            items.map((item) => (
              <button
                key={`${item.source}-${item.id}`}
                className="w-full rounded-lg border bg-muted/20 p-4 text-left transition-colors hover:bg-muted/40 disabled:cursor-default"
                disabled={!item.booking_id}
                onClick={() =>
                  item.booking_id &&
                  go(`/admin/requests?open=${item.booking_id}`)
                }
              >
                <div className="flex items-start justify-between gap-3">
                  <p className="text-sm font-medium">{item.summary}</p>
                  <ActivityCategory eventType={item.event_type} />
                </div>
                <div className="mt-3 flex flex-col gap-1 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
                  <span className="truncate">{item.actor_email}</span>
                  <span className="shrink-0 tabular-nums">
                    {fmt(item.created_at)}
                  </span>
                </div>
              </button>
            ))}
        </CardContent>
      </Card>
      {loading ? (
        <Loading />
      ) : !items.length ? (
        <Empty />
      ) : (
        <div className="mt-4 flex flex-col items-center justify-between gap-3 sm:flex-row">
          <p className="text-xs text-muted-foreground">
            Showing {(pagination.page - 1) * pagination.pageSize + 1}–
            {Math.min(pagination.page * pagination.pageSize, pagination.total)}{" "}
            of {pagination.total} events
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
    </Shell>
  );
}

export function ActivityCategory({ eventType }: { eventType: string }) {
  const category = eventType.split(".")[0];
  const tones: Record<string, string> = {
    booking:
      "border-blue-500/20 bg-blue-500/10 text-blue-700 dark:text-blue-300",
    bookings:
      "border-blue-500/20 bg-blue-500/10 text-blue-700 dark:text-blue-300",
    link: "border-violet-500/20 bg-violet-500/10 text-violet-700 dark:text-violet-300",
    email:
      "border-emerald-500/20 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
    visitor:
      "border-amber-500/20 bg-amber-500/10 text-amber-700 dark:text-amber-300",
    feedback:
      "border-orange-500/20 bg-orange-500/10 text-orange-700 dark:text-orange-300",
    template:
      "border-cyan-500/20 bg-cyan-500/10 text-cyan-700 dark:text-cyan-300",
    user: "border-slate-500/20 bg-slate-500/10 text-slate-700 dark:text-slate-300",
  };
  return (
    <Badge variant="outline" className={tones[category] || "bg-muted"}>
      {category === "bookings" ? "bulk" : category}
    </Badge>
  );
}
