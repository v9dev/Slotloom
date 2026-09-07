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
  ImageUp,
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
  followAppLink,
  formatDateOnly,
  labels,
  localDateTime,
  slugFrom,
  weekDays,
} from "./shared";
import { ProviderApplications } from "./ProviderApplications";
export function WorkspaceSettings() {
  const [days, setDays] = useState(365);
  const [appName, setAppName] = useState("Slotloom");
  const [brandTagline, setBrandTagline] = useState(
    "Scheduling, without the overhead.",
  );
  const [brandLogoUrl, setBrandLogoUrl] = useState("/brand/logo-light.svg");
  const [brandLogoDarkUrl, setBrandLogoDarkUrl] = useState(
    "/brand/logo-dark.svg",
  );
  const [brandFaviconUrl, setBrandFaviconUrl] = useState("/brand/mark.svg");
  const [brandPrimaryColor, setBrandPrimaryColor] = useState("#2563eb");
  const [brandAccentColor, setBrandAccentColor] = useState("#7c3aed");
  const [uploading, setUploading] = useState<
    "logo" | "logo-dark" | "favicon" | null
  >(null);
  useEffect(() => {
    api.settings().then((result) => {
      setDays(Number(result.settings.data_retention_days || 365));
      setAppName(result.settings.app_name || "Slotloom");
      setBrandTagline(
        result.settings.brand_tagline || "Scheduling, without the overhead.",
      );
      setBrandLogoUrl(
        result.settings.brand_logo_url ||
          result.settings.brand_mark_url ||
          "/brand/logo-light.svg",
      );
      setBrandLogoDarkUrl(
        result.settings.brand_logo_dark_url ||
          result.settings.brand_logo_url ||
          "/brand/logo-dark.svg",
      );
      setBrandFaviconUrl(
        result.settings.brand_favicon_url ||
          result.settings.brand_mark_url ||
          "/brand/mark.svg",
      );
      setBrandPrimaryColor(result.settings.brand_primary_color || "#2563eb");
      setBrandAccentColor(result.settings.brand_accent_color || "#7c3aed");
    });
  }, []);
  async function save() {
    await api.updateSettings({
      dataRetentionDays: days,
      appName,
      brandTagline,
      brandLogoUrl,
      brandLogoDarkUrl,
      brandFaviconUrl,
      brandPrimaryColor,
      brandAccentColor,
    });
    toast.success("Workspace settings updated");
    window.setTimeout(() => location.reload(), 500);
  }
  async function uploadAsset(
    kind: "logo" | "logo-dark" | "favicon",
    file?: File,
  ) {
    if (!file) return;
    setUploading(kind);
    try {
      const url = await api.uploadBrandAsset(kind, file);
      if (kind === "logo") setBrandLogoUrl(url);
      else if (kind === "logo-dark") setBrandLogoDarkUrl(url);
      else setBrandFaviconUrl(url);
      toast.success(
        `${kind === "favicon" ? "Favicon" : "Logo"} uploaded. Save to publish it.`,
      );
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Upload failed.");
    } finally {
      setUploading(null);
    }
  }
  return (
    <Shell
      title="Workspace settings"
      description="Security, privacy, and data lifecycle controls."
    >
      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="lg:col-span-2">
          <CardHeader>
            <span className="flex size-9 items-center justify-center rounded-lg bg-blue-500/10 text-blue-700 dark:text-blue-300">
              <Settings className="size-4" />
            </span>
            <CardTitle className="pt-3">Workspace branding</CardTitle>
            <CardDescription>
              White-label the dashboard, public booking pages, browser title,
              favicon, and outgoing emails.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid gap-5 md:grid-cols-2">
              <Field label="Application name">
                <Input
                  value={appName}
                  maxLength={80}
                  onChange={(event) => setAppName(event.target.value)}
                />
              </Field>
              <Field label="Tagline">
                <Input
                  value={brandTagline}
                  maxLength={160}
                  onChange={(event) => setBrandTagline(event.target.value)}
                />
              </Field>
            </div>
            <div className="grid gap-4 md:grid-cols-3">
              {(["logo", "logo-dark", "favicon"] as const).map((kind) => {
                const value =
                  kind === "logo"
                    ? brandLogoUrl
                    : kind === "logo-dark"
                      ? brandLogoDarkUrl
                      : brandFaviconUrl;
                const setValue =
                  kind === "logo"
                    ? setBrandLogoUrl
                    : kind === "logo-dark"
                      ? setBrandLogoDarkUrl
                      : setBrandFaviconUrl;
                const label =
                  kind === "logo"
                    ? "Logo for light theme"
                    : kind === "logo-dark"
                      ? "Logo for dark theme"
                      : "Browser favicon";
                return (
                  <div key={kind} className="rounded-xl border bg-muted/20 p-4">
                    <div
                      className={`mb-4 flex h-20 items-center justify-center rounded-lg border p-3 ${kind === "logo-dark" ? "bg-neutral-950" : "bg-white"}`}
                    >
                      <img
                        src={value}
                        alt={`${kind} preview`}
                        className={
                          kind === "favicon"
                            ? "size-12 rounded-xl object-contain"
                            : "max-h-12 max-w-full object-contain"
                        }
                      />
                    </div>
                    <Field label={label}>
                      <Input
                        value={value}
                        maxLength={500}
                        onChange={(event) => setValue(event.target.value)}
                      />
                    </Field>
                    <label className="mt-3 inline-flex cursor-pointer items-center gap-2 rounded-md border bg-background px-3 py-2 text-sm font-medium shadow-xs hover:bg-accent">
                      {uploading === kind ? (
                        <Loader2 className="size-4 animate-spin" />
                      ) : (
                        <ImageUp className="size-4" />
                      )}
                      Upload {kind}
                      <input
                        className="sr-only"
                        type="file"
                        accept="image/png,image/jpeg,image/webp,image/svg+xml,image/x-icon,.ico"
                        disabled={uploading !== null}
                        onChange={(event) =>
                          void uploadAsset(kind, event.target.files?.[0])
                        }
                      />
                    </label>
                  </div>
                );
              })}
            </div>
            <div className="grid gap-5 md:grid-cols-2">
              <Field label="Primary brand color">
                <div className="flex gap-2">
                  <Input
                    type="color"
                    className="w-14 p-1"
                    value={brandPrimaryColor}
                    onChange={(event) =>
                      setBrandPrimaryColor(event.target.value)
                    }
                  />
                  <Input
                    value={brandPrimaryColor}
                    maxLength={7}
                    onChange={(event) =>
                      setBrandPrimaryColor(event.target.value)
                    }
                  />
                </div>
              </Field>
              <Field label="Accent color">
                <div className="flex gap-2">
                  <Input
                    type="color"
                    className="w-14 p-1"
                    value={brandAccentColor}
                    onChange={(event) =>
                      setBrandAccentColor(event.target.value)
                    }
                  />
                  <Input
                    value={brandAccentColor}
                    maxLength={7}
                    onChange={(event) =>
                      setBrandAccentColor(event.target.value)
                    }
                  />
                </div>
              </Field>
            </div>
            <div
              className="rounded-xl border bg-card p-4 text-card-foreground"
              style={{ borderColor: `${brandPrimaryColor}66` }}
            >
              <p className="text-sm font-medium">Live brand preview</p>
              <div className="mt-3 flex min-h-20 items-center justify-between gap-4 rounded-lg border bg-background p-4 text-foreground">
                <img
                  src={brandLogoUrl}
                  alt="Workspace logo preview"
                  className="h-9 max-w-48 object-contain dark:hidden"
                />
                <img
                  src={brandLogoDarkUrl}
                  alt="Workspace logo preview"
                  className="hidden h-9 max-w-48 object-contain dark:block"
                />
                <span
                  className="shrink-0 rounded-full px-3 py-1 text-xs font-medium text-white"
                  style={{
                    background: `linear-gradient(135deg, ${brandPrimaryColor}, ${brandAccentColor})`,
                  }}
                >
                  Brand accent
                </span>
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              PNG, JPEG, WebP, SVG, and ICO are supported up to 2 MB. URLs
              remain available for externally hosted assets.
            </p>
            <Button onClick={save}>Save and publish branding</Button>
          </CardContent>
        </Card>
        <ProviderApplications />
        <Card>
          <CardHeader>
            <span className="flex size-9 items-center justify-center rounded-lg bg-violet-500/10 text-violet-700 dark:text-violet-300">
              <ShieldCheck className="size-4" />
            </span>
            <CardTitle className="pt-3">Data retention</CardTitle>
            <CardDescription>
              Choose how long completed, cancelled, and missed response data
              should be retained.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Field label="Retention period">
              <Select
                value={String(days)}
                onValueChange={(value) => setDays(Number(value))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="90">90 days</SelectItem>
                  <SelectItem value="180">180 days</SelectItem>
                  <SelectItem value="365">1 year</SelectItem>
                  <SelectItem value="730">2 years</SelectItem>
                  <SelectItem value="3650">10 years</SelectItem>
                </SelectContent>
              </Select>
            </Field>
            <Button onClick={save}>Save retention policy</Button>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <span className="flex size-9 items-center justify-center rounded-lg bg-amber-500/10 text-amber-700 dark:text-amber-300">
              <FileText className="size-4" />
            </span>
            <CardTitle className="pt-3">Security controls</CardTitle>
            <CardDescription>
              Public submissions are rate-limited using privacy-safe hashes.
              Turnstile activates when its Worker secret is configured.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex items-center justify-between rounded-lg border p-3">
              <span>Rate limiting</span>
              <Badge
                className="bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
                variant="outline"
              >
                Active
              </Badge>
            </div>
            <div className="flex items-center justify-between rounded-lg border p-3">
              <span>Cloudflare Access</span>
              <Badge
                className="bg-blue-500/10 text-blue-700 dark:text-blue-300"
                variant="outline"
              >
                Required
              </Badge>
            </div>
            <div className="flex items-center justify-between rounded-lg border p-3">
              <span>Turnstile</span>
              <Badge
                className="bg-amber-500/10 text-amber-700 dark:text-amber-300"
                variant="outline"
              >
                Configure secret
              </Badge>
            </div>
          </CardContent>
        </Card>
      </div>
    </Shell>
  );
}
export function Team() {
  const [users, setUsers] = useState<WorkspaceUser[]>([]);
  const [activity, setActivity] = useState<UserActivity[]>([]);
  const [error, setError] = useState("");
  const [adding, setAdding] = useState(false);
  const load = () =>
    api.users().then((r) => {
      setUsers(r.users);
      setActivity(r.activity);
    });
  useEffect(() => {
    load();
  }, []);
  async function add(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const f = new FormData(form);
    const name = String(f.get("name"));
    const email = String(f.get("email"));
    const role = String(f.get("role")) as UserRole;
    setError("");
    setAdding(true);
    try {
      await api.addUser({ name, email, role });
      form.reset();
      await load();
      toast.success(`${name} added as ${role}`);
    } catch (c) {
      setError(c instanceof Error ? c.message : "Could not add member");
    } finally {
      setAdding(false);
    }
  }
  async function changeRole(user: WorkspaceUser, role: UserRole) {
    try {
      await api.updateUser(user.email, { role, status: user.status });
      await load();
      toast.success("Role updated");
    } catch (c) {
      setError(c instanceof Error ? c.message : "Could not update member");
    }
  }
  async function changeStatus(user: WorkspaceUser, active: boolean) {
    try {
      await api.updateUser(user.email, {
        role: user.role,
        status: active ? "active" : "suspended",
      });
      await load();
      toast.success(active ? "Member activated" : "Member suspended");
    } catch (c) {
      setError(c instanceof Error ? c.message : "Could not update member");
    }
  }
  return (
    <Shell
      title="Team & roles"
      description="Manage workspace permissions and response ownership."
    >
      <div className="grid gap-4 lg:grid-cols-[1.4fr_1fr]">
        <Card>
          <CardHeader>
            <CardTitle>People</CardTitle>
            <CardDescription>
              Access email must match the identity used to sign in.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={add} className="mb-6 grid gap-3 sm:grid-cols-3">
              <Input name="name" required placeholder="Name" />
              <Input name="email" required type="email" placeholder="Email" />
              <div className="flex gap-2">
                <Select name="role" defaultValue="member">
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="admin">Admin</SelectItem>
                    <SelectItem value="member">Member</SelectItem>
                    <SelectItem value="viewer">Viewer</SelectItem>
                    <SelectItem value="owner">Owner</SelectItem>
                  </SelectContent>
                </Select>
                <Button
                  type="submit"
                  size="icon"
                  disabled={adding}
                  aria-label="Add team member"
                >
                  {adding ? <Loader2 className="animate-spin" /> : <Plus />}
                </Button>
              </div>
            </form>
            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            <div className="divide-y">
              {users.map((u) => (
                <div className="flex items-center gap-3 py-3" key={u.id}>
                  <Avatar>
                    <AvatarFallback>{u.name[0]}</AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{u.name}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      {u.email}
                    </p>
                  </div>
                  <Select
                    value={u.role}
                    onValueChange={(role) => changeRole(u, role as UserRole)}
                  >
                    <SelectTrigger className="w-28">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="owner">Owner</SelectItem>
                      <SelectItem value="admin">Admin</SelectItem>
                      <SelectItem value="member">Member</SelectItem>
                      <SelectItem value="viewer">Viewer</SelectItem>
                    </SelectContent>
                  </Select>
                  <div className="flex items-center gap-2">
                    <Switch
                      aria-label={`Access for ${u.name}`}
                      checked={u.status === "active"}
                      onCheckedChange={(active) => changeStatus(u, active)}
                    />
                    <span className="hidden text-xs text-muted-foreground sm:inline">
                      {u.status === "active" ? "Active" : "Suspended"}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Activity className="size-4" />
              Recent activity
            </CardTitle>
            <Button asChild variant="ghost" size="sm">
              <a
                href="/admin/activity"
                onClick={(event) => followAppLink(event, "/admin/activity")}
              >
                View all
                <ChevronRight aria-hidden="true" />
              </a>
            </Button>
          </CardHeader>
          <CardContent className="space-y-4">
            {activity.slice(0, 10).map((a) => (
              <div key={a.id}>
                <p className="text-sm">{a.summary}</p>
                <p className="text-xs text-muted-foreground">
                  {fmt(a.created_at)}
                </p>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </Shell>
  );
}
