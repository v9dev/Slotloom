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
export function Notifications() {
  const [items, setItems] = useState<Notification[]>([]);
  const [showAll, setShowAll] = useState(false);
  const unread = items.filter((item) => !item.read_at).length;
  const load = () =>
    api
      .notifications()
      .then((result) => setItems(result.notifications))
      .catch(() => undefined);
  useEffect(() => {
    void load();
    let socket: WebSocket | undefined;
    let reconnectTimer: number | undefined;
    let reconnectAttempts = 0;
    let stopped = false;
    const connect = () => {
      if (stopped) return;
      const protocol = location.protocol === "https:" ? "wss:" : "ws:";
      const token = sessionStorage.getItem("adminToken");
      const protocols = ["slotloom"];
      if (token) protocols.push(`slotloom-auth.${base64Url(token)}`);
      socket = new WebSocket(
        `${protocol}//${location.host}/api/admin/notifications/live`,
        protocols,
      );
      socket.onopen = () => {
        if (reconnectAttempts) void load();
        reconnectAttempts = 0;
      };
      socket.onmessage = (event) => {
        if (event.data === "pong") return;
        try {
          const message = JSON.parse(String(event.data)) as {
            type?: string;
            notification?: Notification;
          };
          if (message.type !== "notification.created" || !message.notification)
            return;
          setItems((current) => [
            message.notification!,
            ...current.filter((item) => item.id !== message.notification!.id),
          ].slice(0, 50));
        } catch {
          // Ignore malformed real-time messages and keep the connection alive.
        }
      };
      socket.onclose = () => {
        if (stopped) return;
        const delay = Math.min(30_000, 1_000 * 2 ** reconnectAttempts);
        reconnectAttempts += 1;
        reconnectTimer = window.setTimeout(connect, delay);
      };
      socket.onerror = () => socket?.close();
    };
    connect();
    return () => {
      stopped = true;
      if (reconnectTimer) window.clearTimeout(reconnectTimer);
      socket?.close(1000, "Dashboard closed");
    };
  }, []);
  async function read() {
    if (unread) {
      const readAt = new Date().toISOString();
      setItems((current) =>
        current.map((item) => ({ ...item, read_at: item.read_at || readAt })),
      );
      await api.readNotifications();
      load();
    }
  }
  const visibleItems = showAll ? items : items.slice(0, 6);
  return (
    <DropdownMenu
      onOpenChange={(open) => {
        if (open) void read();
        else setShowAll(false);
      }}
    >
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative rounded-full border bg-background shadow-xs"
          aria-label={unread ? `${unread} unread notifications` : "Notifications"}
        >
          <Bell />
          {unread > 0 && (
            <span className="absolute -right-1 -top-1 flex min-w-4 items-center justify-center rounded-full bg-blue-600 px-1 text-[9px] font-semibold leading-4 text-white ring-2 ring-background">
              {unread > 9 ? "9+" : unread}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" sideOffset={8} className="w-[calc(100vw-2rem)] overflow-hidden p-0 sm:w-96">
        <DropdownMenuLabel className="flex items-center justify-between px-4 py-3">
          <span className="text-sm font-semibold text-foreground">Notifications</span>
          <Badge variant="secondary" className="font-normal">
            {items.length} total
          </Badge>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <div className="max-h-[min(28rem,65svh)] overflow-y-auto">
          {items.length ? (
            visibleItems.map((item) => (
              <button
                key={item.id}
                className="w-full border-b px-4 py-3 text-left transition-colors last:border-0 hover:bg-muted/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
                onClick={() => item.action_url && go(item.action_url)}
              >
                <div className="flex items-start gap-2">
                  <span
                    className={`mt-1.5 size-2 shrink-0 rounded-full ${item.read_at ? "bg-muted-foreground/30" : "bg-blue-500"}`}
                  />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium leading-5">{item.title}</p>
                    <p className="mt-1 text-xs leading-5 text-muted-foreground">
                      {item.body}
                    </p>
                    <p className="mt-1 text-[10px] text-muted-foreground">
                      {fmt(item.created_at)}
                    </p>
                  </div>
                </div>
              </button>
            ))
          ) : (
            <div className="flex flex-col items-center px-6 py-10 text-center">
              <span className="mb-3 flex size-10 items-center justify-center rounded-full bg-muted">
                <CheckCircle2 className="size-5 text-muted-foreground" />
              </span>
              <p className="text-sm font-medium">You are all caught up</p>
              <p className="mt-1 text-xs text-muted-foreground">New updates will appear here.</p>
            </div>
          )}
        </div>
        {items.length > 6 && (
          <div className="border-t bg-muted/20 p-2">
            <Button
              type="button"
              variant="ghost"
              className="w-full justify-center"
              onClick={(event) => {
                event.preventDefault();
                setShowAll((value) => !value);
              }}
            >
              {showAll ? "Show recent" : "View all notifications"}
              <ChevronRight className={showAll ? "rotate-90" : undefined} />
            </Button>
          </div>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function base64Url(value: string) {
  const bytes = new TextEncoder().encode(value);
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary)
    .replaceAll("+", "-")
    .replaceAll("/", "_")
    .replace(/=+$/, "");
}
