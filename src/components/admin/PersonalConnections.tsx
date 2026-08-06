import {
  CalendarDays,
  CheckCircle2,
  Loader2,
  Mail,
  PlugZap,
  Unplug,
} from "lucide-react";
import { useEffect, useState } from "react";
import { api } from "@/api";
import type { CalendarProvider, PersonalIntegrationOverview } from "@/types";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";

export function PersonalConnections() {
  const query = new URLSearchParams(location.search);
  const [open, setOpen] = useState(query.get("connections") === "open");
  const [overview, setOverview] = useState<PersonalIntegrationOverview>();
  const [busy, setBusy] = useState<string | null>(null);

  const load = async () => setOverview(await api.personalConnections());

  useEffect(() => {
    const result = query.get("oauth");
    const provider = query.get("provider");
    if (result === "connected")
      toast.success(
        `${provider === "microsoft" ? "Microsoft" : "Google"} connected`,
      );
    else if (result === "error")
      toast.error("The provider connection was not completed. Try again.");
    if (query.get("connections")) history.replaceState({}, "", "/admin");
  }, []);

  useEffect(() => {
    if (open)
      load().catch((error) =>
        toast.error(
          error instanceof Error
            ? error.message
            : "Could not load connected accounts.",
        ),
      );
  }, [open]);

  async function connect(provider: CalendarProvider, includeMail: boolean) {
    setBusy(`${provider}-connect`);
    try {
      const result = await api.connectPersonalProvider(provider, includeMail);
      location.assign(result.authorizationUrl);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Could not connect.",
      );
      setBusy(null);
    }
  }

  async function disconnect(provider: CalendarProvider) {
    setBusy(`${provider}-disconnect`);
    try {
      await api.disconnectPersonalProvider(provider);
      await load();
      toast.success("Account disconnected");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Could not disconnect.",
      );
    } finally {
      setBusy(null);
    }
  }

  async function setPreference(provider: "auto" | CalendarProvider) {
    setBusy("preference");
    try {
      await api.setPersonalEmailProvider(provider);
      await load();
      toast.success("Personal email sender updated");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Could not save preference.",
      );
    } finally {
      setBusy(null);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" aria-label="My connected accounts">
          <PlugZap />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90svh] overflow-y-auto sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>My connected accounts</DialogTitle>
          <DialogDescription>
            Connect your own calendar for meetings. Gmail or Outlook sending is
            optional and can be enabled separately.
          </DialogDescription>
        </DialogHeader>

        {!overview ? (
          <Loader2 className="mx-auto my-12 animate-spin" />
        ) : (
          <div className="space-y-5">
            {!overview.encryptionReady && (
              <Alert variant="destructive">
                <AlertDescription>
                  The Worker OAuth encryption secret is not configured.
                </AlertDescription>
              </Alert>
            )}

            <div className="grid gap-3 sm:grid-cols-2">
              {overview.providers.map((provider) => (
                <div className="rounded-xl border p-4" key={provider.provider}>
                  <div className="flex items-start justify-between gap-3">
                    <span className="flex size-9 items-center justify-center rounded-lg bg-blue-500/10 text-blue-700 dark:text-blue-300">
                      <CalendarDays className="size-4" />
                    </span>
                    <Badge
                      variant={provider.connection ? "secondary" : "outline"}
                    >
                      {provider.connection
                        ? provider.connection.status === "error"
                          ? "Reconnect required"
                          : "Connected"
                        : "Not connected"}
                    </Badge>
                  </div>
                  <p className="mt-4 font-medium">{provider.label}</p>
                  <p className="mt-1 min-h-5 truncate text-xs text-muted-foreground">
                    {provider.connection?.providerEmail ||
                      (provider.configured
                        ? "Ready to connect"
                        : "Workspace setup required")}
                  </p>
                  {provider.connection && (
                    <div className="mt-2 space-y-1 text-xs">
                      <p
                        className={`flex items-center gap-1 ${
                          provider.connection.status === "error"
                            ? "text-amber-700 dark:text-amber-300"
                            : "text-emerald-700 dark:text-emerald-300"
                        }`}
                      >
                        <CheckCircle2 className="size-3" />
                        {provider.connection.status === "error"
                          ? "Calendar reconnection required"
                          : "Calendar and meetings"}
                      </p>
                      <p className="flex items-center gap-1 text-muted-foreground">
                        <Mail className="size-3" />
                        {provider.provider === "google"
                          ? "Gmail"
                          : "Outlook"}{" "}
                        {provider.connection.mailCapable
                          ? "sending enabled"
                          : "sending optional"}
                      </p>
                    </div>
                  )}
                  <div className="mt-4 flex flex-wrap gap-2">
                    <Button
                      size="sm"
                      onClick={() =>
                        connect(
                          provider.provider,
                          provider.connection?.status === "error"
                            ? Boolean(provider.connection.mailCapable)
                            : Boolean(provider.connection),
                        )
                      }
                      disabled={Boolean(busy) || !provider.configured}
                    >
                      {busy === `${provider.provider}-connect` && (
                        <Loader2 className="animate-spin" />
                      )}
                      {provider.connection
                        ? provider.connection.status === "error"
                          ? "Reconnect"
                          : provider.connection.mailCapable
                            ? "Reauthorize"
                            : `Enable ${provider.provider === "google" ? "Gmail" : "Outlook"}`
                        : `Connect ${provider.label} Calendar`}
                    </Button>
                    {provider.connection && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => disconnect(provider.provider)}
                        disabled={Boolean(busy)}
                      >
                        <Unplug />
                        Disconnect
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>

            <div className="rounded-xl border p-4">
              <div className="flex items-start gap-3">
                <Mail className="mt-0.5 size-4 text-muted-foreground" />
                <div className="flex-1">
                  <p className="text-sm font-medium">Preferred email sender</p>
                  <p className="mt-1 text-xs leading-5 text-muted-foreground">
                    Automatic uses your only connected mailbox. If both are
                    connected, select the one you want Slotloom to use.
                  </p>
                  <Select
                    value={overview.preference}
                    onValueChange={(value) =>
                      setPreference(value as "auto" | CalendarProvider)
                    }
                    disabled={Boolean(busy)}
                  >
                    <SelectTrigger className="mt-3">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="auto">Automatic</SelectItem>
                      {overview.providers.map((provider) => (
                        <SelectItem
                          key={provider.provider}
                          value={provider.provider}
                          disabled={!provider.connection?.mailCapable}
                        >
                          {provider.provider === "google" ? "Gmail" : "Outlook"}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            <p className="text-xs leading-5 text-muted-foreground">
              Calendar permission lets Slotloom create and update your meeting
              events. Mail permission is requested only when you enable sending.
              Slotloom does not read inbox messages. Review the{" "}
              <a href="/privacy">privacy policy</a> and{" "}
              <a href="/terms">terms</a>.
            </p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
