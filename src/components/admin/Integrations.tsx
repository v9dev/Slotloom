import {
  CalendarCheck2,
  CheckCircle2,
  Loader2,
  Mail,
  PlugZap,
  Send,
  ShieldCheck,
  Unplug,
} from "lucide-react";
import { useEffect, useState } from "react";
import { api } from "@/api";
import type {
  CalendarProvider,
  EmailDeliveryOverview,
  EmailFallbackMethod,
  IntegrationOverview,
  IntegrationProvider,
  WorkspaceUser,
} from "@/types";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { Field, Loading, Shell } from "./shared";

export function Integrations({ user }: { user: WorkspaceUser }) {
  const [overview, setOverview] = useState<IntegrationOverview>();
  const [emailDelivery, setEmailDelivery] = useState<EmailDeliveryOverview>();
  const [emailMethod, setEmailMethod] = useState<EmailFallbackMethod>("worker");
  const [workerFallback, setWorkerFallback] = useState(false);
  const [emailBusy, setEmailBusy] = useState<"save" | "test" | null>(null);
  const [defaultProvider, setDefaultProvider] = useState<
    "manual" | CalendarProvider
  >("manual");
  const [savingDefault, setSavingDefault] = useState(false);
  const [savingCalendarFallback, setSavingCalendarFallback] = useState(false);

  const load = async () => {
    const [integrationResult, deliveryResult] = await Promise.all([
      api.integrations(),
      api.emailDelivery(),
    ]);
    setOverview(integrationResult);
    setDefaultProvider(integrationResult.defaultProvider);
    setEmailDelivery(deliveryResult);
    setEmailMethod(deliveryResult.method);
    setWorkerFallback(deliveryResult.workerFallback);
  };

  useEffect(() => {
    const query = new URLSearchParams(location.search);
    const result = query.get("oauth");
    const provider = query.get("provider");
    if (result === "connected")
      toast.success(
        `${provider === "microsoft" ? "Microsoft" : "Google"} connected`,
      );
    else if (result === "error")
      toast.error("The provider connection was not completed. Try again.");
    if (result) history.replaceState({}, "", "/admin/integrations");
    load().catch((error) =>
      toast.error(
        error instanceof Error ? error.message : "Could not load integrations.",
      ),
    );
  }, []);

  async function saveDefault() {
    setSavingDefault(true);
    try {
      await api.setDefaultMeetingProvider(defaultProvider);
      await load();
      toast.success("Meeting provider suggestion updated");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Could not save the provider.",
      );
    } finally {
      setSavingDefault(false);
    }
  }

  async function setCalendarFallback(enabled: boolean) {
    setSavingCalendarFallback(true);
    try {
      await api.setCalendarOwnerFallback(enabled);
      await load();
      toast.success("Calendar fallback updated");
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Could not update calendar fallback.",
      );
    } finally {
      setSavingCalendarFallback(false);
    }
  }

  async function saveEmailDelivery() {
    setEmailBusy("save");
    try {
      await api.updateEmailDelivery({
        method: emailMethod,
        workerFallback: emailMethod === "worker" ? false : workerFallback,
      });
      await load();
      toast.success("Email delivery updated");
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Could not update email delivery.",
      );
    } finally {
      setEmailBusy(null);
    }
  }

  async function testEmailDelivery() {
    setEmailBusy("test");
    try {
      const result = await api.testEmailDelivery();
      toast.success(
        `Test email sent through ${result.deliveryMethod}${result.usedWorkerFallback ? " using Worker fallback" : ""}`,
      );
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Could not send test email.",
      );
    } finally {
      setEmailBusy(null);
    }
  }

  if (!overview || !emailDelivery) return <Loading />;
  const emailDeliveryChanged =
    emailMethod !== emailDelivery.method ||
    (emailMethod !== "worker" &&
      emailMethod !== "none" &&
      workerFallback !== emailDelivery.workerFallback);

  return (
    <Shell
      title="Calendar and email"
      description="Choose meeting defaults, connect the owner account, and control transactional email fallbacks."
    >
      <div className="space-y-4">
        <Card>
          <CardHeader>
            <span className="flex size-9 items-center justify-center rounded-lg bg-blue-500/10 text-blue-700 dark:text-blue-300">
              <CalendarCheck2 className="size-4" />
            </span>
            <CardTitle className="pt-3">Meeting automation defaults</CardTitle>
            <CardDescription>
              The response handler chooses a provider for each meeting. This is
              the initial suggestion in the Create meeting dialog.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end">
            <div className="flex-1">
              <Field label="Suggested meeting provider">
                <Select
                  value={defaultProvider}
                  onValueChange={(value) =>
                    setDefaultProvider(value as "manual" | CalendarProvider)
                  }
                  disabled={!overview.canManageConfig}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="manual">Manual meeting link</SelectItem>
                    <SelectItem value="google">Google Meet</SelectItem>
                    <SelectItem value="microsoft">Microsoft Teams</SelectItem>
                  </SelectContent>
                </Select>
              </Field>
            </div>
            {overview.canManageConfig && (
              <Button onClick={saveDefault} disabled={savingDefault}>
                {savingDefault && <Loader2 className="animate-spin" />}
                Save provider
              </Button>
            )}
            <div className="flex items-center justify-between gap-4 rounded-xl border p-4 sm:basis-full">
              <div>
                <p className="text-sm font-medium">Owner calendar fallback</p>
                <p className="text-xs text-muted-foreground">
                  Use an owner connection when the selected organizer has not
                  connected the chosen provider.
                </p>
              </div>
              <Switch
                checked={overview.ownerFallbackEnabled}
                onCheckedChange={setCalendarFallback}
                disabled={!overview.canManageConfig || savingCalendarFallback}
                aria-label="Allow owner calendar fallback"
              />
            </div>
          </CardContent>
        </Card>

        {user.role === "owner" && (
          <Card>
            <CardHeader>
              <span className="flex size-9 items-center justify-center rounded-lg bg-violet-500/10 text-violet-700 dark:text-violet-300">
                <PlugZap className="size-4" />
              </span>
              <CardTitle className="pt-3">Owner provider accounts</CardTitle>
              <CardDescription>
                Connect the owner calendars used for fallback. Email permission
                is optional and can be enabled later.
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 xl:grid-cols-2">
              {overview.providers.map((provider) => (
                <OwnerConnection
                  key={provider.provider}
                  provider={provider}
                  ownerEmail={user.email}
                  encryptionReady={overview.encryptionReady}
                />
              ))}
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <span className="flex size-9 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-700 dark:text-emerald-300">
              <Mail className="size-4" />
            </span>
            <CardTitle className="pt-3">Workspace email fallback</CardTitle>
            <CardDescription>
              Slotloom first uses the assigned organizer’s preferred connected
              mailbox. This controls what happens when no personal mailbox is
              available. Calendar invitations are not duplicated.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <Field label="Fallback method">
              <Select
                value={emailMethod}
                onValueChange={(value) =>
                  setEmailMethod(value as EmailFallbackMethod)
                }
                disabled={!emailDelivery.canManage || Boolean(emailBusy)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No workspace fallback</SelectItem>
                  <SelectItem value="worker">
                    Cloudflare Worker Email
                  </SelectItem>
                  <SelectItem value="google">Owner Gmail</SelectItem>
                  <SelectItem value="microsoft">Owner Outlook</SelectItem>
                </SelectContent>
              </Select>
            </Field>

            <div className="grid gap-3 sm:grid-cols-3">
              <DeliveryStatus
                label="Worker Email"
                available={emailDelivery.workerAvailable}
                detail={emailDelivery.workerFrom || "Binding not configured"}
              />
              <DeliveryStatus
                label="Gmail"
                available={emailDelivery.oauthAvailable.google}
                detail={
                  emailDelivery.oauthAvailable.google
                    ? "Owner mailbox available"
                    : "Optional mail access not enabled"
                }
              />
              <DeliveryStatus
                label="Outlook"
                available={emailDelivery.oauthAvailable.microsoft}
                detail={
                  emailDelivery.oauthAvailable.microsoft
                    ? "Owner mailbox available"
                    : "Optional mail access not enabled"
                }
              />
            </div>

            {emailMethod !== "worker" && emailMethod !== "none" && (
              <div className="flex items-center justify-between gap-4 rounded-xl border p-4">
                <div>
                  <p className="text-sm font-medium">Worker Email fallback</p>
                  <p className="text-xs text-muted-foreground">
                    Use Worker Email only if the selected OAuth mailbox cannot
                    deliver the message.
                  </p>
                </div>
                <Switch
                  checked={workerFallback}
                  onCheckedChange={setWorkerFallback}
                  disabled={
                    !emailDelivery.canManage ||
                    !emailDelivery.workerAvailable ||
                    Boolean(emailBusy)
                  }
                  aria-label="Use Worker Email fallback"
                />
              </div>
            )}

            {emailDelivery.canManage && (
              <div className="flex flex-wrap gap-2">
                <Button
                  onClick={saveEmailDelivery}
                  disabled={Boolean(emailBusy)}
                >
                  {emailBusy === "save" && <Loader2 className="animate-spin" />}
                  Save fallback
                </Button>
                <Button
                  variant="outline"
                  onClick={testEmailDelivery}
                  disabled={Boolean(emailBusy) || emailDeliveryChanged}
                >
                  {emailBusy === "test" ? (
                    <Loader2 className="animate-spin" />
                  ) : (
                    <Send />
                  )}
                  {emailDeliveryChanged
                    ? "Save before testing"
                    : "Send test email"}
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        <Alert>
          <ShieldCheck />
          <AlertTitle>Personal connections</AlertTitle>
          <AlertDescription>
            Every owner, admin, or member connects their own account from My
            connected accounts in the header. Viewers cannot connect providers.
            Slotloom requests calendar access first and never reads inbox
            messages.
          </AlertDescription>
        </Alert>
      </div>
    </Shell>
  );
}

function DeliveryStatus({
  label,
  available,
  detail,
}: {
  label: string;
  available: boolean;
  detail: string;
}) {
  return (
    <div className="rounded-xl border p-3">
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm font-medium">{label}</p>
        <Badge variant={available ? "secondary" : "outline"}>
          {available ? "Available" : "Unavailable"}
        </Badge>
      </div>
      <p className="mt-1 truncate text-xs text-muted-foreground">{detail}</p>
    </div>
  );
}

function OwnerConnection({
  provider,
  ownerEmail,
  encryptionReady,
}: {
  provider: IntegrationProvider;
  ownerEmail: string;
  encryptionReady: boolean;
}) {
  const [busy, setBusy] = useState(false);
  const connection = provider.connections.find((item) => item.isCurrentUser);
  const isGoogle = provider.provider === "google";
  const name = isGoogle ? "Google" : "Microsoft";
  const mailName = isGoogle ? "Gmail" : "Outlook";

  async function connect(includeMail: boolean) {
    setBusy(true);
    try {
      const result = await api.connectIntegration(
        provider.provider,
        includeMail,
      );
      location.assign(result.authorizationUrl);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Could not start OAuth.",
      );
      setBusy(false);
    }
  }

  async function disconnect() {
    setBusy(true);
    try {
      await api.disconnectIntegration(provider.provider);
      location.reload();
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Could not disconnect the account.",
      );
      setBusy(false);
    }
  }

  return (
    <div className="rounded-xl border p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-medium">{name}</p>
          <p className="mt-1 text-xs text-muted-foreground">
            {connection?.providerEmail || ownerEmail}
          </p>
        </div>
        <Badge variant={connection ? "secondary" : "outline"}>
          {connection
            ? connection.status === "error"
              ? "Reconnect required"
              : "Connected"
            : "Not connected"}
        </Badge>
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        <Badge variant={connection ? "secondary" : "outline"}>
          {isGoogle ? "Calendar + Meet" : "Calendar + Teams"}
        </Badge>
        <Badge variant={connection?.mailCapable ? "secondary" : "outline"}>
          {mailName} {connection?.mailCapable ? "enabled" : "optional"}
        </Badge>
      </div>
      {!provider.configured && (
        <p className="mt-4 text-xs text-muted-foreground">
          Configure the {name} application in Workspace settings first.
        </p>
      )}
      <div className="mt-4 flex flex-wrap gap-2">
        {!connection ? (
          <Button
            size="sm"
            onClick={() => connect(false)}
            disabled={busy || !provider.configured || !encryptionReady}
          >
            {busy ? <Loader2 className="animate-spin" /> : <CheckCircle2 />}
            Connect {name} Calendar
          </Button>
        ) : (
          <>
            {connection.status === "error" ? (
              <Button
                size="sm"
                onClick={() => connect(connection.mailCapable)}
                disabled={busy}
              >
                {busy && <Loader2 className="animate-spin" />}
                Reconnect
              </Button>
            ) : !connection.mailCapable ? (
              <Button size="sm" onClick={() => connect(true)} disabled={busy}>
                {busy && <Loader2 className="animate-spin" />}
                Enable {mailName} sending
              </Button>
            ) : (
              <Button size="sm" onClick={() => connect(true)} disabled={busy}>
                {busy && <Loader2 className="animate-spin" />}
                Reauthorize
              </Button>
            )}
            <Button
              size="sm"
              variant="outline"
              onClick={disconnect}
              disabled={busy}
            >
              <Unplug />
              Disconnect
            </Button>
          </>
        )}
      </div>
    </div>
  );
}
