import { Clipboard, KeyRound, Loader2, PlugZap, Trash2 } from "lucide-react";
import { FormEvent, useEffect, useState } from "react";
import { api } from "@/api";
import type { IntegrationOverview, IntegrationProvider } from "@/types";
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
import { Field } from "./shared";

const providerName = (provider: IntegrationProvider) =>
  provider.provider === "google" ? "Google" : "Microsoft";

export function ProviderApplications() {
  const [overview, setOverview] = useState<IntegrationOverview>();
  const [error, setError] = useState("");
  const load = async () => {
    setOverview(await api.integrations());
    setError("");
  };

  useEffect(() => {
    load().catch((cause) =>
      setError(
        cause instanceof Error
          ? cause.message
          : "Could not load provider applications.",
      ),
    );
  }, []);

  return (
    <Card className="lg:col-span-2">
      <CardHeader>
        <span className="flex size-9 items-center justify-center rounded-lg bg-violet-500/10 text-violet-700 dark:text-violet-300">
          <PlugZap className="size-4" />
        </span>
        <CardTitle className="pt-3">
          Google and Microsoft applications
        </CardTitle>
        <CardDescription>
          Configure the shared OAuth applications once. Each organizer then
          authorizes their own calendar account without seeing these
          credentials.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
        {!overview ? (
          <Loader2 className="mx-auto my-10 animate-spin" />
        ) : (
          <>
            {!overview.encryptionReady && (
              <Alert variant="destructive">
                <KeyRound />
                <AlertTitle>Worker encryption key required</AlertTitle>
                <AlertDescription>
                  Add <code>OAUTH_ENCRYPTION_KEY</code> as an encrypted Worker
                  secret before saving provider credentials.
                </AlertDescription>
              </Alert>
            )}
            <div className="grid gap-4 xl:grid-cols-2">
              {overview.providers.map((provider) => (
                <ApplicationPanel
                  key={provider.provider}
                  provider={provider}
                  encryptionReady={overview.encryptionReady}
                  reload={load}
                />
              ))}
            </div>
            <Alert>
              <KeyRound />
              <AlertTitle>Credential storage</AlertTitle>
              <AlertDescription>
                Client secrets are write-only and stored as authenticated JWE
                ciphertext. Client IDs, tenant IDs, and callback URLs are
                non-secret configuration. Access and refresh tokens are also
                encrypted and never returned to the browser.
              </AlertDescription>
            </Alert>
          </>
        )}
      </CardContent>
    </Card>
  );
}

function ApplicationPanel({
  provider,
  encryptionReady,
  reload,
}: {
  provider: IntegrationProvider;
  encryptionReady: boolean;
  reload: () => Promise<void>;
}) {
  const [clientId, setClientId] = useState(provider.clientId);
  const [clientSecret, setClientSecret] = useState("");
  const [tenantId, setTenantId] = useState(provider.tenantId || "common");
  const [busy, setBusy] = useState<"save" | "remove" | null>(null);
  const name = providerName(provider);

  useEffect(() => {
    setClientId(provider.clientId);
    setClientSecret("");
    setTenantId(provider.tenantId || "common");
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
      toast.success(`${name} application saved`);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Could not save credentials.",
      );
    } finally {
      setBusy(null);
    }
  }

  async function remove() {
    setBusy("remove");
    try {
      await api.removeIntegrationConfig(provider.provider);
      await reload();
      toast.success(`${name} application removed`);
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Could not remove the application.",
      );
    } finally {
      setBusy(null);
    }
  }

  async function copyCallback() {
    await navigator.clipboard.writeText(provider.callbackUrl);
    toast.success("Callback URL copied");
  }

  return (
    <div className="rounded-xl border p-4 sm:p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-semibold">{name}</p>
          <p className="mt-1 text-xs leading-5 text-muted-foreground">
            {provider.provider === "google"
              ? "Google Calendar and Google Meet, with optional Gmail sending."
              : "Microsoft Calendar and Teams, with optional Outlook sending."}
          </p>
        </div>
        <Badge variant={provider.configured ? "secondary" : "outline"}>
          {provider.configured ? "Configured" : "Not configured"}
        </Badge>
      </div>

      <div className="mt-5">
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
            aria-label={`Copy ${name} callback URL`}
            onClick={copyCallback}
          >
            <Clipboard />
          </Button>
        </div>
      </div>

      <form onSubmit={save} className="mt-5 space-y-4">
        {provider.provider === "microsoft" && (
          <Field label="Directory (tenant) ID">
            <Input
              value={tenantId}
              onChange={(event) => setTenantId(event.target.value)}
              autoComplete="off"
              required
              placeholder="common"
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
        <p className="text-xs leading-5 text-muted-foreground">
          {provider.provider === "google" ? (
            <>
              Enable Google Calendar and Gmail APIs. Calendar access is
              requested first. Gmail sending is requested only when a user
              enables it.
            </>
          ) : (
            <>
              Use <code>common</code> for organizational and personal Microsoft
              accounts. Add delegated <code>User.Read</code>,{" "}
              <code>Calendars.ReadWrite</code>, and <code>Mail.Send</code>. Mail
              permission is requested only when enabled by the user.
            </>
          )}
        </p>
        <div className="flex flex-wrap gap-2">
          <Button disabled={Boolean(busy) || !encryptionReady}>
            {busy === "save" && <Loader2 className="animate-spin" />}
            Save application
          </Button>
          {provider.configured && (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  type="button"
                  variant="outline"
                  disabled={Boolean(busy)}
                >
                  <Trash2 />
                  Remove
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Remove {name}?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This removes the encrypted application secret and every
                    local
                    {` ${name} `}connection. Existing provider calendar events
                    are not deleted.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Keep application</AlertDialogCancel>
                  <AlertDialogAction variant="destructive" onClick={remove}>
                    Remove application
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
        </div>
      </form>
    </div>
  );
}
