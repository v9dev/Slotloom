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
import {
  FormEvent,
  MouseEvent,
  ReactNode,
  useEffect,
  useMemo,
  useState,
} from "react";
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

export const labels: Record<WorkflowStatus, string> = {
  new: "New",
  under_review: "Under review",
  awaiting_visitor: "Awaiting visitor",
  confirmed: "Confirmed",
  completed: "Completed",
  missed: "Missed",
  cancelled: "Cancelled",
  rescheduling: "Rescheduling",
};
export const fmt = (value: string) =>
  new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
export const localDateTime = (value: string) => {
  const date = new Date(value);
  return new Date(date.getTime() - date.getTimezoneOffset() * 60000)
    .toISOString()
    .slice(0, 16);
};
export const dateValue = (date: Date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
export const dateAfter = (days: number) => {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return dateValue(date);
};
export const formatDateOnly = (value: string) =>
  new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(`${value}T12:00:00`));
export const go = (path: string) => {
  history.pushState({}, "", path);
  dispatchEvent(new PopStateEvent("popstate"));
};

export function followAppLink(
  event: MouseEvent<HTMLAnchorElement>,
  path: string,
) {
  if (
    event.defaultPrevented ||
    event.button !== 0 ||
    event.metaKey ||
    event.ctrlKey ||
    event.shiftKey ||
    event.altKey
  )
    return false;
  event.preventDefault();
  go(path);
  return true;
}

export function Shell({
  title,
  description,
  action,
  children,
}: {
  title: string;
  description: string;
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="mx-auto w-full max-w-7xl p-4 sm:p-6 lg:p-10">
      <div className="mb-8 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">{title}</h1>
          <p className="mt-2 text-sm text-muted-foreground">{description}</p>
        </div>
        {action}
      </div>
      {children}
    </div>
  );
}

export const weekDays = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];
export const slugFrom = (value: string) =>
  value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 80);

export const TIME_OPTIONS = Array.from({ length: 96 }, (_, index) => {
  const hours = Math.floor(index / 4);
  const minutes = (index % 4) * 15;
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
});

export function displayTime(value: string) {
  const [hours, minutes] = value.split(":").map(Number);
  return new Intl.DateTimeFormat("en", {
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(2000, 0, 1, hours, minutes));
}

export function TimeSelect({
  value,
  onChange,
  label,
}: {
  value: string;
  onChange: (value: string) => void;
  label: string;
}) {
  const options = TIME_OPTIONS.includes(value)
    ? TIME_OPTIONS
    : [...TIME_OPTIONS, value].sort();
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger aria-label={label} className="w-full bg-background">
        <Clock3 className="text-muted-foreground" />
        <SelectValue />
      </SelectTrigger>
      <SelectContent className="max-h-72">
        {options.map((time) => (
          <SelectItem key={time} value={time}>
            {displayTime(time)}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

export function DateSelect({
  value,
  onChange,
  label,
  min,
  optional = false,
}: {
  value: string;
  onChange: (value: string) => void;
  label: string;
  min?: string;
  optional?: boolean;
}) {
  const selectedDate = value ? new Date(`${value}T12:00:00`) : undefined;
  const minimumDate = min ? new Date(`${min}T00:00:00`) : undefined;
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          className="w-full justify-start bg-background font-normal"
          aria-label={label}
        >
          <CalendarDays />
          {selectedDate ? formatDateOnly(value) : "No date limit"}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-auto p-0">
        <Calendar
          mode="single"
          selected={selectedDate}
          defaultMonth={selectedDate || minimumDate}
          disabled={minimumDate ? { before: minimumDate } : undefined}
          onSelect={(date) => date && onChange(dateValue(date))}
        />
        {optional && value && (
          <div className="border-t p-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="w-full"
              onClick={() => onChange("")}
            >
              Remove date limit
            </Button>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}

export function DateTimeSelect({
  name,
  initialValue,
}: {
  name: string;
  initialValue: string;
}) {
  const [value, setValue] = useState(initialValue);
  useEffect(() => setValue(initialValue), [initialValue]);
  const [datePart, timePart = "09:00"] = value.split("T");
  const selectedDate = datePart ? new Date(`${datePart}T12:00:00`) : undefined;
  function chooseDate(date?: Date) {
    if (!date) return;
    const nextDate = [
      date.getFullYear(),
      String(date.getMonth() + 1).padStart(2, "0"),
      String(date.getDate()).padStart(2, "0"),
    ].join("-");
    setValue(`${nextDate}T${timePart}`);
  }
  return (
    <div className="grid grid-cols-[minmax(0,1fr)_140px] gap-2">
      <input type="hidden" name={name} value={value} />
      <Popover>
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="outline"
            className="justify-start bg-background font-normal"
            aria-label="Choose meeting date"
          >
            <CalendarDays />
            <span className="truncate">
              {selectedDate
                ? new Intl.DateTimeFormat("en", {
                    weekday: "short",
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  }).format(selectedDate)
                : "Choose date"}
            </span>
          </Button>
        </PopoverTrigger>
        <PopoverContent align="start" className="w-auto p-0">
          <Calendar
            mode="single"
            selected={selectedDate}
            onSelect={chooseDate}
            defaultMonth={selectedDate}
          />
        </PopoverContent>
      </Popover>
      <TimeSelect
        value={timePart}
        onChange={(time) => setValue(`${datePart}T${time}`)}
        label="Choose meeting time"
      />
    </div>
  );
}

export function Field({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      {children}
    </div>
  );
}
export function StatusBadge({ status }: { status: WorkflowStatus }) {
  const tones: Record<WorkflowStatus, string> = {
    new: "border-blue-500/20 bg-blue-500/10 text-blue-700 dark:text-blue-300",
    under_review:
      "border-violet-500/20 bg-violet-500/10 text-violet-700 dark:text-violet-300",
    awaiting_visitor:
      "border-cyan-500/20 bg-cyan-500/10 text-cyan-700 dark:text-cyan-300",
    confirmed:
      "border-emerald-500/20 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
    completed:
      "border-slate-500/20 bg-slate-500/10 text-slate-700 dark:text-slate-300",
    missed:
      "border-orange-500/20 bg-orange-500/10 text-orange-700 dark:text-orange-300",
    cancelled: "border-red-500/20 bg-red-500/10 text-red-700 dark:text-red-300",
    rescheduling:
      "border-amber-500/20 bg-amber-500/10 text-amber-700 dark:text-amber-300",
  };
  return (
    <Badge variant="outline" className={tones[status]}>
      {labels[status]}
    </Badge>
  );
}
export function Stat({ value, label }: { value: number; label: string }) {
  return (
    <div>
      <p className="font-semibold tabular-nums">{value}</p>
      <p className="text-[11px] text-muted-foreground">{label}</p>
    </div>
  );
}
export function Loading() {
  return (
    <div
      role="status"
      className="flex min-h-[70svh] items-center justify-center gap-2 text-sm text-muted-foreground"
    >
      <Loader2 className="animate-spin" aria-hidden="true" />
      Loading…
    </div>
  );
}
export function Empty({
  title = "Nothing here yet",
  description = "New activity will appear here.",
}: {
  title?: string;
  description?: string;
} = {}) {
  return (
    <div className="flex flex-col items-center justify-center py-14 text-center">
      <CircleDashed className="mb-3 size-6 text-muted-foreground" />
      <p className="text-sm font-medium">{title}</p>
      <p className="mt-1 text-xs text-muted-foreground">{description}</p>
    </div>
  );
}
