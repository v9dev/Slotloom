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
  lazy,
  ReactNode,
  Suspense,
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

import { Notifications } from "./admin/Notifications";
import { go } from "./admin/shared";

const Overview = lazy(() =>
  import("./admin/Overview").then((module) => ({ default: module.Overview })),
);
const Links = lazy(() =>
  import("./admin/Links").then((module) => ({ default: module.Links })),
);
const Requests = lazy(() =>
  import("./admin/Requests").then((module) => ({ default: module.Requests })),
);
const ActivityLog = lazy(() =>
  import("./admin/Activity").then((module) => ({
    default: module.ActivityLog,
  })),
);
const EmailTemplates = lazy(() =>
  import("./admin/EmailTemplates").then((module) => ({
    default: module.EmailTemplates,
  })),
);
const WorkspaceSettings = lazy(() =>
  import("./admin/Workspace").then((module) => ({
    default: module.WorkspaceSettings,
  })),
);
const Team = lazy(() =>
  import("./admin/Workspace").then((module) => ({ default: module.Team })),
);
export default function Admin() {
  const [path, setPath] = useState(location.pathname);
  const [user, setUser] = useState<WorkspaceUser>();
  const [checking, setChecking] = useState(true);
  const [token, setToken] = useState("");
  const authenticate = () =>
    api
      .me()
      .then((r) => setUser(r.user))
      .catch(() => setUser(undefined))
      .finally(() => setChecking(false));
  useEffect(() => {
    const update = () => setPath(location.pathname);
    addEventListener("popstate", update);
    authenticate();
    return () => removeEventListener("popstate", update);
  }, []);
  if (checking)
    return (
      <div className="flex min-h-svh items-center justify-center">
        <Loader2 className="animate-spin" />
      </div>
    );
  if (!user)
    return (
      <main className="flex min-h-svh items-center justify-center bg-muted/40 p-4">
        <Card className="w-full max-w-sm">
          <CardHeader>
            <CardTitle>Local development</CardTitle>
            <CardDescription>
              Production authentication is handled by Cloudflare Access.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form
              className="space-y-4"
              onSubmit={(e) => {
                e.preventDefault();
                sessionStorage.setItem("adminToken", token);
                setChecking(true);
                authenticate();
              }}
            >
              <div className="space-y-2">
                <Label>Development token</Label>
                <Input
                  type="password"
                  value={token}
                  onChange={(e) => setToken(e.target.value)}
                  autoFocus
                />
              </div>
              <Button className="w-full">Open workspace</Button>
            </form>
          </CardContent>
        </Card>
      </main>
    );
  const section = path.includes("/links")
    ? "links"
    : path.includes("/requests")
      ? "requests"
      : path.includes("/activity")
        ? "activity"
        : path.includes("/emails")
          ? "emails"
          : path.includes("/settings")
            ? "settings"
            : path.includes("/team")
              ? "team"
              : "overview";
  const canManageLinks = user.role === "owner" || user.role === "admin";
  const canEditRequests = user.role !== "viewer";
  const nav = <Nav section={section} user={user} />;
  return (
    <div className="h-svh overflow-hidden bg-muted/30 lg:grid lg:grid-cols-[240px_minmax(0,1fr)]">
      <aside className="hidden h-svh overflow-hidden border-r bg-background lg:block">{nav}</aside>
      <div className="flex h-svh min-w-0 flex-col overflow-hidden">
        <header className="z-20 flex h-14 shrink-0 items-center gap-3 border-b bg-background/95 px-4 backdrop-blur lg:justify-end lg:px-6">
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="lg:hidden">
                <Menu />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-64 p-0">
              {nav}
            </SheetContent>
          </Sheet>
          <BrandLogo className="flex-1 lg:hidden" />
          <Notifications />
        </header>
        <main className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
        <Suspense fallback={<Loader2 className="mx-auto mt-20 animate-spin" />}>
          {section === "overview" ? (
            <Overview canManageLinks={canManageLinks} />
          ) : section === "links" ? (
            <Links canManage={canManageLinks} />
          ) : section === "requests" ? (
            <Requests canEdit={canEditRequests} />
          ) : section === "activity" ? (
            <ActivityLog />
          ) : section === "emails" ? (
            <EmailTemplates canManage={canManageLinks} />
          ) : section === "settings" ? (
            <WorkspaceSettings />
          ) : (
            <Team />
          )}
        </Suspense>
        </main>
      </div>
    </div>
  );
}
function Nav({ section, user }: { section: string; user: WorkspaceUser }) {
  const items = [
    {
      id: "overview",
      label: "Overview",
      icon: LayoutDashboard,
      path: "/admin",
    },
    { id: "links", label: "Booking links", icon: Link2, path: "/admin/links" },
    { id: "requests", label: "Responses", icon: Users, path: "/admin/requests" },
    {
      id: "activity",
      label: "Activity",
      icon: Activity,
      path: "/admin/activity",
    },
    {
      id: "emails",
      label: "Email templates",
      icon: Mail,
      path: "/admin/emails",
    },
    ...(user.role === "owner"
      ? [
          {
            id: "team",
            label: "Team & roles",
            icon: ShieldCheck,
            path: "/admin/team",
          },
          {
            id: "settings",
            label: "Settings",
            icon: Settings,
            path: "/admin/settings",
          },
        ]
      : []),
  ];
  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden p-3">
      <div className="flex h-12 items-center px-3">
        <BrandLogo />
      </div>
      <nav className="mt-3 space-y-1">
        {items.map((item) => (
          <Button
            key={item.id}
            variant={section === item.id ? "secondary" : "ghost"}
            className="w-full justify-start"
            onClick={() => go(item.path)}
          >
            <item.icon />
            {item.label}
          </Button>
        ))}
      </nav>
      <div className="mt-auto flex items-center gap-3 border-t px-2 pt-4">
        <Avatar>
          <AvatarFallback>{user.name[0]?.toUpperCase()}</AvatarFallback>
        </Avatar>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium">{user.name}</p>
          <p className="truncate text-xs capitalize text-muted-foreground">
            {user.role}
          </p>
        </div>
        <Button
          variant="ghost"
          size="icon"
          aria-label="Sign out"
          onClick={() => {
            const local = Boolean(sessionStorage.getItem("adminToken"));
            sessionStorage.removeItem("adminToken");
            location.assign(local ? "/" : "/cdn-cgi/access/logout");
          }}
        >
          <LogOut />
        </Button>
      </div>
    </div>
  );
}
