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
  Eye,
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
import { render } from "react-email";
import { SlotloomEmail } from "@/emails/SlotloomEmail";
import { presentationFor } from "@/emails/presentation";
import { useTheme } from "next-themes";

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
export function EmailTemplates({ canManage }: { canManage: boolean }) {
  const { resolvedTheme } = useTheme();
  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [editing, setEditing] = useState<EmailTemplate | null>(null);
  const [draftSubject, setDraftSubject] = useState("");
  const [draftBody, setDraftBody] = useState("");
  const [draftEnabled, setDraftEnabled] = useState(true);
  const [previewHtml, setPreviewHtml] = useState("");
  const [dialogTab, setDialogTab] = useState("editor");
  const load = () =>
    api.templates().then((result) => setTemplates(result.templates));
  useEffect(() => {
    load();
  }, []);
  useEffect(() => {
    if (!editing) return;
    setDraftSubject(editing.subject);
    setDraftBody(editing.text_body);
    setDraftEnabled(Boolean(editing.enabled));
  }, [editing]);
  useEffect(() => {
    if (!editing) return;
    const subject = previewTemplate(draftSubject);
    const message = previewTemplate(draftBody).replaceAll("\\n", "\n");
    const hasAction = ["meeting_details", "rescheduled_confirmation", "reminder", "received", "reschedule"].includes(
      editing.template_key,
    );
    const presentation = presentationFor(editing.template_key);
    const timeout = window.setTimeout(() => {
      void render(
        <SlotloomEmail
          preview={subject}
          heading={presentation.heading}
          label={presentation.label}
          message={message}
          appName={brand.name}
          logoUrl={`${window.location.origin}${brand.mark}`}
          contact="{{contact}}"
          actionUrl={hasAction ? "#" : undefined}
          actionLabel={presentation.actionLabel}
          meetingTime="{{time}}"
          meetingTitle={editing.template_key !== "received" ? "{{meeting_title}}" : undefined}
          calendarAttached={["meeting_details", "rescheduled_confirmation", "reminder"].includes(editing.template_key)}
          darkMode={resolvedTheme === "dark"}
        />,
      )
        .then(setPreviewHtml)
        .catch(() => setPreviewHtml(""));
    }, 150);
    return () => window.clearTimeout(timeout);
  }, [draftBody, draftSubject, editing, resolvedTheme]);
  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!editing) return;
    await api.updateTemplate(editing.template_key, {
      subject: draftSubject,
      textBody: draftBody,
      enabled: draftEnabled,
    });
    toast.success("Email template saved");
    setEditing(null);
    load();
  }
  async function test(template: EmailTemplate) {
    try {
      await api.testTemplate(template.template_key);
      toast.success(`Test sent to your account email`);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Could not send test",
      );
    }
  }
  function openTemplate(template: EmailTemplate, tab: "editor" | "preview") {
    setDialogTab(tab);
    setEditing(template);
  }
  return (
    <Shell
      title="Email templates"
      description="Control the messages visitors receive throughout the meeting workflow."
    >
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {templates.map((template) => (
          <Card key={template.template_key} className="h-full">
            <CardHeader className="flex-1">
              <div className="flex items-center justify-between">
                <span
                  className={`flex size-9 items-center justify-center rounded-lg ${template.enabled ? "bg-blue-500/10 text-blue-700 dark:text-blue-300" : "bg-muted text-muted-foreground"}`}
                >
                  <Mail className="size-4" />
                </span>
                <Badge
                  variant="outline"
                  className={
                    template.enabled
                      ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
                      : ""
                  }
                >
                  {template.enabled ? "Enabled" : "Disabled"}
                </Badge>
              </div>
              <CardTitle className="pt-3">{template.name}</CardTitle>
              <CardDescription className="line-clamp-2">
                {template.subject}
              </CardDescription>
            </CardHeader>
            <CardFooter className="grid grid-cols-2 gap-2 bg-muted/20">
              <Button
                variant="outline"
                onClick={() => openTemplate(template, "preview")}
              >
                <Eye />
                Preview
              </Button>
              <Button
                disabled={!canManage}
                onClick={() => openTemplate(template, "editor")}
              >
                Edit
              </Button>
              <Button
                className="col-span-2"
                variant="secondary"
                disabled={!template.enabled}
                onClick={() => test(template)}
              >
                <Mail />
                Send test
              </Button>
            </CardFooter>
          </Card>
        ))}
      </div>
      <Dialog
        open={Boolean(editing)}
        onOpenChange={(open) => !open && setEditing(null)}
      >
        <DialogContent className="max-h-[90svh] overflow-y-auto sm:max-w-2xl">
          <form onSubmit={save}>
            <DialogHeader>
              <DialogTitle>Edit {editing?.name}</DialogTitle>
              <DialogDescription>
                Available variables:{" "}
                {
                  `{{name}} ${editing?.template_key !== "received" ? "{{meeting_title}} " : ""}{{time}} {{contact}} {{meeting_url}} {{manage_url}} {{app_name}}`
                }
              </DialogDescription>
            </DialogHeader>
            {editing && (
              <div className="space-y-4 py-5">
                <Tabs value={dialogTab} onValueChange={setDialogTab}>
                  <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="editor">Editor</TabsTrigger>
                    <TabsTrigger value="preview">Preview</TabsTrigger>
                  </TabsList>
                  <TabsContent value="editor" className="space-y-4 pt-4">
                    <Field label="Subject">
                      <Input
                        value={draftSubject}
                        onChange={(event) =>
                          setDraftSubject(event.target.value)
                        }
                        required
                      />
                    </Field>
                    <Field label="Message">
                      <Textarea
                        rows={12}
                        value={draftBody}
                        onChange={(event) => setDraftBody(event.target.value)}
                        required
                      />
                    </Field>
                  </TabsContent>
                  <TabsContent value="preview" className="pt-4">
                    <div className="overflow-hidden rounded-xl border bg-white">
                      <div className="border-b bg-muted/30 px-4 py-3">
                        <p className="text-xs font-medium text-muted-foreground">Subject</p>
                        <p className="mt-1 text-sm font-semibold text-foreground">{previewTemplate(draftSubject)}</p>
                      </div>
                      <iframe
                        title="Email preview"
                        srcDoc={previewHtml}
                        className="h-[420px] w-full bg-white sm:h-[520px]"
                        sandbox=""
                      />
                    </div>
                  </TabsContent>
                </Tabs>
                <label className="flex items-center justify-between rounded-lg border p-4">
                  <div>
                    <p className="text-sm font-medium">Template enabled</p>
                    <p className="text-xs text-muted-foreground">
                      Allow this message to be sent.
                    </p>
                  </div>
                  <Switch
                    checked={draftEnabled}
                    onCheckedChange={setDraftEnabled}
                  />
                </label>
              </div>
            )}
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setEditing(null)}
              >
                Cancel
              </Button>
              <Button disabled={!canManage}>Save template</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </Shell>
  );
}
export function previewTemplate(value: string) {
  return value.replaceAll("{{app_name}}", brand.name);
}
