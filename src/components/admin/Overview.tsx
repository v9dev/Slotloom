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
  CardFooter,
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
export function Overview({ canManageLinks }: { canManageLinks: boolean }) {
  const [data, setData] = useState<DashboardData>();
  useEffect(() => {
    api.dashboard().then(setData);
  }, []);
  if (!data) return <Loading />;
  const stats = [
    {
      label: "Active links",
      value: data.stats.active_links,
      icon: Link2,
      tone: "bg-blue-500/10 text-blue-700 dark:text-blue-300",
    },
    {
      label: "Responses",
      value: data.stats.total_responses,
      icon: Users,
      tone: "bg-violet-500/10 text-violet-700 dark:text-violet-300",
    },
    {
      label: "Pending",
      value: data.stats.pending,
      icon: Clock3,
      tone: "bg-amber-500/10 text-amber-700 dark:text-amber-300",
    },
    {
      label: "Confirmed",
      value: data.stats.confirmed,
      icon: CheckCircle2,
      tone: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
    },
  ];
  return (
    <Shell
      title="Overview"
      description="A clear view of your scheduling workflow."
      action={
        canManageLinks ? (
          <Button onClick={() => go("/admin/links")}>
            <Plus />
            New booking link
          </Button>
        ) : undefined
      }
    >
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {stats.map((s) => (
          <Card key={s.label}>
            <CardContent className="flex items-center gap-4 p-5">
              <span
                className={`flex size-10 items-center justify-center rounded-lg ${s.tone}`}
              >
                <s.icon className="size-4" />
              </span>
              <div>
                <p className="text-2xl font-semibold tabular-nums">{s.value}</p>
                <p className="text-xs text-muted-foreground">{s.label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
      <div className="mt-4 grid gap-4 lg:grid-cols-[1.5fr_1fr]">
        <Card>
          <CardHeader>
            <div>
              <CardTitle>Recent responses</CardTitle>
              <CardDescription>
                Latest people who shared availability.
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent className="flex-1">
            {data.recent.length ? (
              <div className="divide-y">
                {data.recent.map((b) => (
                  <button
                    className="flex w-full items-center gap-3 py-3 text-left"
                    key={b.id}
                    onClick={() => go(`/admin/requests?open=${b.id}`)}
                  >
                    <Avatar>
                      <AvatarFallback>
                        {b.email[0].toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{b.name}</p>
                      <p className="truncate text-xs text-muted-foreground">
                        {b.email} · {b.linkTitle}
                      </p>
                    </div>
                    <StatusBadge status={b.status} />
                    <ChevronRight className="size-4 text-muted-foreground" />
                  </button>
                ))}
              </div>
            ) : (
              <Empty
                title="No responses yet"
                description="New responses will appear here."
              />
            )}
          </CardContent>
          <CardFooter className="justify-center bg-transparent">
            <Button
              variant="outline"
              size="sm"
              onClick={() => go("/admin/requests")}
            >
              View all responses
              <ChevronRight />
            </Button>
          </CardFooter>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Outcome</CardTitle>
            <CardDescription>Meeting completion status.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            {[
              ["Completed", data.stats.completed],
              ["Missed", data.stats.missed],
              ["Cancelled", data.stats.cancelled],
            ].map(([label, value]) => (
              <div key={String(label)}>
                <div className="mb-2 flex justify-between text-sm">
                  <span>{label}</span>
                  <span className="tabular-nums text-muted-foreground">
                    {value}
                  </span>
                </div>
                <div className="h-2 rounded-full bg-muted">
                  <div
                    className="h-2 rounded-full bg-foreground/60"
                    style={{
                      width: `${Math.min(100, (Number(value) / Math.max(1, data.stats.total_responses)) * 100)}%`,
                    }}
                  />
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </Shell>
  );
}
