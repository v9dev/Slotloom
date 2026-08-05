import {
  CalendarCheck2,
  CheckCircle2,
  Clipboard,
  KeyRound,
  Loader2,
  Mail,
  PlugZap,
  Send,
  ShieldCheck,
  Trash2,
} from "lucide-react";
import { FormEvent, useEffect, useState } from "react";
import { api } from "@/api";
import type {
  CalendarProvider,
  EmailDeliveryMethod,
  EmailDeliveryOverview,
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
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import { toast } from "sonner";
import { Field, Loading, Shell, fmt } from "./shared";

export function Integrations({ user }: { user: WorkspaceUser }) {
  const [overview, setOverview] = useState<IntegrationOverview>();
  const [emailDelivery, setEmailDelivery] = useState<EmailDeliveryOverview>();
  const [emailMethod, setEmailMethod] = useState<EmailDeliveryMethod>("worker");
  const [workerFallback, setWorkerFallback] = useState(false);
  const [emailBusy, setEmailBusy] = useState<"save" | "test" | null>(null);
  const [defaultProvider, setDefaultProvider] = useState<
    "manual" | CalendarProvider
  >("manual");
  const [savingDefault, setSavingDefault] = useState(false);
  const load = async () => {
    const [result, delivery] = await Promise.all([
      api.integrations(),
      api.emailDelivery(),
    ]);
    setOverview(result);
    setDefaultProvider(result.defaultProvider);
    setEmailDelivery(delivery);
    setEmailMethod(delivery.method);
    setWorkerFallback(delivery.workerFallback);
  };

  useEffect(() => {
    const query = new URLSearchParams(location.search);
    const result = query.get("oauth");
    const provider = query.get("provider");
    if (result === "connected")
      toast.success(
        `${provider === "microsoft" ? "Microsoft Teams" : "Google Meet"} connected`,
      );
    else if (result === "error")
      toast.error(
        "The calendar connection was not completed. Check the provider configuration and try again.",
      );
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
      toast.success("Automatic meeting provider updated");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Could not save the provider.",
      );
    } finally {
      setSavingDefault(false);
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
      workerFallback !== emailDelivery.workerFallback);
  return (
    <Shell
      title="Calendar and email integrations"
      description="Create online meetings and choose how Slotloom sends transactional email."
    >
      <div className="space-y-4">
        {!overview.encryptionReady && (
          <Alert variant="destructive">
            <KeyRound />
            <AlertTitle>Worker encryption key required</AlertTitle>
            <AlertDescription>
              Add <code>OAUTH_ENCRYPTION_KEY</code> as an encrypted Cloudflare
              Worker secret before saving provider credentials. This external
              root key cannot safely be stored in the same database it protects.
            </AlertDescription>
          </Alert>
        )}

        <Card>
          <CardHeader>
            <span className="flex size-9 items-center justify-center rounded-lg bg-blue-500/10 text-blue-700 dark:text-blue-300">
              <CalendarCheck2 className="size-4" />
            </span>
            <CardTitle className="pt-3">Meeting automation</CardTitle>
            <CardDescription>
              Slotloom creates the provider event, saves the joining link, and
              lets Google or Microsoft send the single native calendar invite.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-3 sm:flex-row sm:items-end">
            <div className="flex-1">
              <Field label="Default meeting provider">
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
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <span className="flex size-9 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-700 dark:text-emerald-300">
              <Mail className="size-4" />
            </span>
            <CardTitle className="pt-3">Transactional email delivery</CardTitle>
            <CardDescription>
              Choose the workspace sender for availability receipts, reminders,
              follow-ups, and manual meeting details. Provider calendar invites
              are never duplicated by this setting.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <Field label="Delivery method">
              <Select
                value={emailMethod}
                onValueChange={(value) =>
                  setEmailMethod(value as EmailDeliveryMethod)
                }
                disabled={!emailDelivery.canManage || Boolean(emailBusy)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="worker">
                    Cloudflare Worker Email
                  </SelectItem>
                  <SelectItem value="google">Connected Google Gmail</SelectItem>
                  <SelectItem value="microsoft">
                    Connected Microsoft Outlook
                  </SelectItem>
                </SelectContent>
              </Select>
            </Field>

            <div className="grid gap-3 sm:grid-cols-3">
              <DeliveryStatus
                label="Worker Email"
                available={emailDelivery.workerAvailable}
                detail={emailDelivery.workerFrom || "Binding not configured"}
              />
              {overview.providers.map((provider) => {
                const connection = provider.connections.find(
                  (item) => item.isCurrentUser,
                );
                return (
                  <DeliveryStatus
                    key={provider.provider}
                    label={provider.provider === "google" ? "Gmail" : "Outlook"}
                    available={Boolean(
                      emailDelivery.oauthAvailable[provider.provider],
                    )}
                    detail={
                      connection
                        ? connection.mailCapable
                          ? connection.providerEmail
                          : "Reauthorize for email"
                        : emailDelivery.oauthAvailable[provider.provider]
                          ? "Owner fallback available"
                          : "Not connected"
                    }
                  />
                );
              })}
            </div>

            {emailMethod !== "worker" && (
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
                  Save email delivery
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

        <div className="grid gap-4 xl:grid-cols-2">
          {overview.providers.map((provider) => (
            <ProviderCard
              key={provider.provider}
              provider={provider}
              overview={overview}
              user={user}
              reload={load}
            />
          ))}
        </div>

        <Alert>
          <ShieldCheck />
          <AlertTitle>Credential handling</AlertTitle>
          <AlertDescription>
            Client secrets, access tokens, refresh tokens, and PKCE verifiers
            are stored as authenticated JWE ciphertext. Client IDs, tenant IDs,
            callback URLs, and connection status are non-secret configuration.
            Saved secrets are write-only and are never sent back to this page.
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

function ProviderCard({
  provider,
  overview,
  user,
  reload,
}: {
  provider: IntegrationProvider;
  overview: IntegrationOverview;
  user: WorkspaceUser;
  reload: () => Promise<void>;
}) {
  const [clientId, setClientId] = useState(provider.clientId);
  const [clientSecret, setClientSecret] = useState("");
  const [tenantId, setTenantId] = useState(provider.tenantId || "common");
  const [busy, setBusy] = useState<
    "save" | "connect" | "disconnect" | "remove" | null
  >(null);
  const currentConnection = provider.connections.find(
    (connection) => connection.isCurrentUser,
  );

  useEffect(() => {
    setClientId(provider.clientId);
    setTenantId(provider.tenantId || "common");
    setClientSecret("");
  }, [provider.clientId, provider.tenantId]);

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy("save");
    try {
      await api.saveIntegrationConfig(provider.provider, {
        clientId,
        clientSecret,
        ...(provider.provider === "microsoft" ? { tenantId } : {}),
      });
      await reload();
      toast.success(`${provider.label} credentials saved`);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Could not save credentials.",
      );
    } finally {
      setBusy(null);
    }
  }

  async function connect() {
    setBusy("connect");
    try {
      const result = await api.connectIntegration(provider.provider);
      location.assign(result.authorizationUrl);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Could not start OAuth.",
      );
      setBusy(null);
    }
  }

  async function disconnect() {
    setBusy("disconnect");
    try {
      await api.disconnectIntegration(provider.provider);
      await reload();
      toast.success(`${provider.label} disconnected`);
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Could not disconnect account.",
      );
    } finally {
      setBusy(null);
    }
  }

  async function removeConfig() {
    setBusy("remove");
    try {
      await api.removeIntegrationConfig(provider.provider);
      await reload();
      toast.success(`${provider.label} configuration removed`);
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Could not remove configuration.",
      );
    } finally {
      setBusy(null);
    }
  }

  async function copyCallback() {
    await navigator.clipboard.writeText(provider.callbackUrl);
    toast.success("Callback URL copied");
  }

  const disabled = Boolean(busy);
  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between gap-3">
          <span className="flex size-9 items-center justify-center rounded-lg bg-violet-500/10 text-violet-700 dark:text-violet-300">
            <PlugZap className="size-4" />
          </span>
          <Badge variant={provider.configured ? "secondary" : "outline"}>
            {provider.configured ? "Configured" : "Not configured"}
          </Badge>
        </div>
        <CardTitle className="pt-3">{provider.label}</CardTitle>
        <CardDescription>
          {provider.provider === "google"
            ? "Creates Google Meet events and can send transactional email through Gmail."
            : "Creates Microsoft Teams events and can send transactional email through Outlook."}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        <div>
          <p className="mb-2 text-xs font-medium text-muted-foreground">
            OAuth callback URL
          </p>
          <div className="flex gap-2">
            <Input
              value={provider.callbackUrl}
              readOnly
              className="font-mono text-xs"
            />
            <Button
              type="button"
              variant="outline"
              size="icon"
              aria-label="Copy callback URL"
              onClick={copyCallback}
            >
              <Clipboard />
            </Button>
          </div>
        </div>

        {overview.canManageConfig && (
          <form onSubmit={save} className="space-y-4 rounded-xl border p-4">
            <div>
              <p className="text-sm font-medium">Provider application</p>
              <p className="text-xs text-muted-foreground">
                These credentials are shared by the workspace. Every organizer
                authorizes their own calendar account below.
              </p>
            </div>
            {provider.provider === "microsoft" && (
              <Field label="Directory (tenant) ID">
                <Input
                  value={tenantId}
                  onChange={(event) => setTenantId(event.target.value)}
                  autoComplete="off"
                  required
                  placeholder="Microsoft Entra tenant ID"
                />
              </Field>
            )}
            <Field label="Client ID">
              <Input
                value={clientId}
                onChange={(event) => setClientId(event.target.value)}
                autoComplete="off"
                required
                placeholder="OAuth application client ID"
              />
            </Field>
            <Field
              label={
                provider.provider === "microsoft"
                  ? "Client secret value"
                  : "Client secret"
              }
            >
              <Input
                type="password"
                value={clientSecret}
                onChange={(event) => setClientSecret(event.target.value)}
                autoComplete="new-password"
                required={!provider.hasClientSecret}
                placeholder={
                  provider.hasClientSecret
                    ? "Leave blank to keep the saved secret"
                    : "Enter the secret value"
                }
              />
            </Field>
            {provider.provider === "microsoft" && (
              <p className="text-xs text-muted-foreground">
                Use <code>common</code> with a multi-tenant registration to let
                organizational and personal Microsoft accounts authorize. Paste
                the secret value shown once by Entra, not the Secret ID. Add
                delegated <code>User.Read</code>,{" "}
                <code>Calendars.ReadWrite</code>, and <code>Mail.Send</code>.
                Creating Teams links still requires a supported Teams account
                and license.
              </p>
            )}
            {provider.provider === "google" && (
              <p className="text-xs text-muted-foreground">
                Enable the Google Calendar and Gmail APIs. Configure an External
                OAuth audience to allow accounts outside your Workspace. Gmail
                sending is a sensitive scope and may require Google OAuth
                verification for public use.
              </p>
            )}
            <div className="flex flex-wrap gap-2">
              <Button
                type="submit"
                disabled={disabled || !overview.encryptionReady}
              >
                {busy === "save" && <Loader2 className="animate-spin" />}
                Save credentials
              </Button>
              {provider.configured && (
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button type="button" variant="outline" disabled={disabled}>
                      <Trash2 />
                      Remove
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>
                        Remove {provider.label}?
                      </AlertDialogTitle>
                      <AlertDialogDescription>
                        This deletes the encrypted application secret and every
                        local {provider.label} connection. Existing events
                        remain in provider calendars. Select another email
                        delivery method first if this provider currently sends
                        workspace email.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Keep integration</AlertDialogCancel>
                      <AlertDialogAction
                        variant="destructive"
                        onClick={removeConfig}
                      >
                        Remove configuration
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              )}
            </div>
          </form>
        )}

        <div className="rounded-xl border p-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium">Your organizer account</p>
              <p className="truncate text-xs text-muted-foreground">
                {currentConnection
                  ? `${currentConnection.providerEmail} · ${currentConnection.status}`
                  : user.email}
              </p>
              {currentConnection && (
                <Badge
                  className="mt-2"
                  variant={
                    currentConnection.mailCapable ? "secondary" : "outline"
                  }
                >
                  {currentConnection.mailCapable
                    ? "Calendar and email"
                    : "Calendar only, reauthorize for email"}
                </Badge>
              )}
            </div>
            {currentConnection ? (
              <div className="flex gap-2">
                <Button
                  type="button"
                  onClick={connect}
                  disabled={disabled || !provider.configured}
                >
                  {busy === "connect" && <Loader2 className="animate-spin" />}
                  {currentConnection.status === "error"
                    ? "Reconnect"
                    : "Reauthorize"}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={disconnect}
                  disabled={disabled}
                >
                  {busy === "disconnect" && (
                    <Loader2 className="animate-spin" />
                  )}
                  Disconnect
                </Button>
              </div>
            ) : (
              <Button
                type="button"
                onClick={connect}
                disabled={
                  disabled ||
                  !provider.configured ||
                  !overview.encryptionReady ||
                  user.role === "viewer"
                }
              >
                {busy === "connect" ? (
                  <Loader2 className="animate-spin" />
                ) : (
                  <CheckCircle2 />
                )}
                Connect {provider.label}
              </Button>
            )}
          </div>
        </div>

        {overview.canManageConfig && provider.connections.length > 0 && (
          <div>
            <p className="mb-2 text-xs font-medium text-muted-foreground">
              Workspace organizer connections
            </p>
            <div className="space-y-2">
              {provider.connections.map((connection) => (
                <div
                  key={connection.id}
                  className="flex items-center justify-between gap-3 rounded-lg border px-3 py-2 text-sm"
                >
                  <div className="min-w-0">
                    <p className="truncate font-medium">
                      {connection.workspaceUserEmail}
                    </p>
                    <p className="truncate text-xs text-muted-foreground">
                      {connection.providerEmail} · Updated{" "}
                      {fmt(connection.updatedAt)}
                    </p>
                  </div>
                  <Badge
                    variant={
                      connection.status === "active"
                        ? "secondary"
                        : "destructive"
                    }
                  >
                    {connection.status}
                    {connection.mailCapable ? " · email" : " · calendar only"}
                  </Badge>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
