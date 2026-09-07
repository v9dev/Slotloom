import { Loader2, Mail } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { api } from "@/api";
import type { EmailTemplate } from "@/types";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Field } from "./shared";

export function BookingAutoReply({
  canManage,
  templates,
  templatesLoading,
  templatesError,
}: {
  canManage: boolean;
  templates: EmailTemplate[];
  templatesLoading: boolean;
  templatesError: string;
}) {
  const [enabled, setEnabled] = useState(true);
  const [templateKey, setTemplateKey] = useState("received");
  const [savedSettings, setSavedSettings] = useState<{
    enabled: boolean;
    templateKey: string;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [loadError, setLoadError] = useState("");
  const [saveError, setSaveError] = useState("");

  useEffect(() => {
    void api
      .bookingAutoReply()
      .then((settings) => {
        setEnabled(settings.enabled);
        setTemplateKey(settings.templateKey);
        setSavedSettings(settings);
      })
      .catch(() =>
        setLoadError(
          "Auto-reply settings could not be loaded. Refresh this page to try again.",
        ),
      )
      .finally(() => setLoading(false));
  }, []);

  const selectedTemplate = templates.find(
    (template) => template.template_key === templateKey,
  );
  const templateReady = Boolean(selectedTemplate?.enabled);
  const ready = !enabled || templateReady;
  const dirty = Boolean(
    savedSettings &&
    (savedSettings.enabled !== enabled ||
      savedSettings.templateKey !== templateKey),
  );
  const unavailable = Boolean(loadError || templatesError);

  const status =
    loading || templatesLoading
      ? "Loading…"
      : unavailable
        ? "Unavailable"
        : dirty
          ? "Unsaved"
          : enabled && ready
            ? "Active"
            : enabled
              ? "Needs attention"
              : "Off";

  async function save() {
    setSaving(true);
    setSaveError("");
    try {
      const result = await api.updateBookingAutoReply({ enabled, templateKey });
      setSavedSettings({
        enabled: result.enabled,
        templateKey: result.templateKey,
      });
      toast.success("Auto-reply settings saved");
    } catch (cause) {
      setSaveError(
        cause instanceof Error
          ? `${cause.message} Check the settings and try again.`
          : "Changes were not saved. Check the settings and try again.",
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card className="mb-6 overflow-hidden">
      <CardHeader className="gap-4">
        <div className="flex gap-3">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-blue-500/10 text-blue-700 dark:text-blue-300">
            <Mail className="size-4" aria-hidden="true" />
          </span>
          <div>
            <CardTitle>Automatic booking reply</CardTitle>
            <CardDescription className="mt-1 max-w-2xl">
              Email the visitor with the selected template as soon as they
              submit a booking, so the team does not need to acknowledge every
              response manually.
            </CardDescription>
          </div>
        </div>
        <CardAction>
          <Badge
            variant="outline"
            className={
              unavailable
                ? "border-destructive/25 bg-destructive/10 text-destructive"
                : dirty
                  ? "border-amber-500/25 bg-amber-500/10 text-amber-700 dark:text-amber-300"
                  : enabled && ready
                    ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
                    : ""
            }
            aria-live="polite"
          >
            {status}
          </Badge>
        </CardAction>
      </CardHeader>
      <CardContent className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(280px,1fr)]">
        <label className="flex items-center justify-between gap-4 rounded-xl border p-4">
          <div>
            <p className="text-sm font-medium">Reply after every booking</p>
            <p className="mt-1 text-xs leading-5 text-muted-foreground">
              Applies to future submissions from every active booking link.
            </p>
          </div>
          <Switch
            id="booking-auto-reply-enabled"
            checked={enabled}
            disabled={!canManage || loading || unavailable}
            onCheckedChange={(checked) => {
              setEnabled(checked);
              setSaveError("");
            }}
            aria-label="Automatically reply to new bookings"
          />
        </label>
        <Field label="Reply template">
          <Select
            value={templateKey}
            disabled={
              !canManage ||
              !enabled ||
              loading ||
              templatesLoading ||
              unavailable
            }
            onValueChange={(value) => {
              setTemplateKey(value);
              setSaveError("");
            }}
          >
            <SelectTrigger className="w-full" aria-label="Reply template">
              <SelectValue placeholder="Choose an email template" />
            </SelectTrigger>
            <SelectContent>
              {templates.map((template) => (
                <SelectItem
                  key={template.template_key}
                  value={template.template_key}
                  disabled={!template.enabled}
                >
                  {template.name}
                  {template.template_key === "received" ? " · Recommended" : ""}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-xs font-normal leading-5 text-muted-foreground">
            “Availability received” is written for new submissions. Only choose
            another template if its message fits this moment.
          </p>
        </Field>
        {enabled && selectedTemplate && !selectedTemplate.enabled && (
          <Alert variant="destructive" className="lg:col-span-2">
            <AlertDescription>
              The selected template is disabled. Enable it or choose another
              template before automatic replies can be sent.
            </AlertDescription>
          </Alert>
        )}
        {enabled &&
          !templatesLoading &&
          !templatesError &&
          !selectedTemplate && (
            <Alert variant="destructive" className="lg:col-span-2">
              <AlertDescription>
                The selected template is unavailable. Enable an email template
                below, then choose it here.
              </AlertDescription>
            </Alert>
          )}
        {loadError && (
          <Alert variant="destructive" className="lg:col-span-2">
            <AlertDescription>{loadError}</AlertDescription>
          </Alert>
        )}
        {saveError && (
          <Alert variant="destructive" className="lg:col-span-2">
            <AlertDescription>{saveError}</AlertDescription>
          </Alert>
        )}
      </CardContent>
      <CardFooter className="flex-col items-stretch gap-3 bg-muted/20 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-xs leading-5 text-muted-foreground">
          {canManage
            ? "Delivery uses the organizer’s connected mailbox, then the configured workspace fallback."
            : "Only workspace owners and admins can change these settings."}
        </p>
        <Button
          type="button"
          disabled={
            !canManage ||
            loading ||
            templatesLoading ||
            saving ||
            unavailable ||
            !ready ||
            !dirty
          }
          onClick={() => void save()}
          className="h-9"
        >
          {saving && <Loader2 className="animate-spin" aria-hidden="true" />}
          {saving ? "Saving…" : "Save auto-reply"}
        </Button>
      </CardFooter>
    </Card>
  );
}
