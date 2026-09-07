import { CalendarDays, Loader2, Mail, UserRound } from "lucide-react";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { api } from "@/api";
import {
  AttendeeEditor,
  attendeeDraftError,
  type AttendeeDraft,
} from "@/components/AttendeeEditor";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
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
import { Textarea } from "@/components/ui/textarea";
import type { CalendarProvider, MeetingOptions } from "@/types";
import { DateTimeSelect, localDateTime } from "./shared";

type MeetingMethod = "manual" | CalendarProvider;

export function CreateMeetingDialog({
  bookingId,
  open,
  onOpenChange,
  onCreated,
}: {
  bookingId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: () => void | Promise<void>;
}) {
  const [options, setOptions] = useState<MeetingOptions>();
  const [organizerEmail, setOrganizerEmail] = useState("");
  const [provider, setProvider] = useState<MeetingMethod>("manual");
  const [title, setTitle] = useState("");
  const [meetingUrl, setMeetingUrl] = useState("");
  const [meetingNotes, setMeetingNotes] = useState("");
  const [attendees, setAttendees] = useState<AttendeeDraft[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    setOptions(undefined);
    setError("");
    api
      .meetingOptions(bookingId)
      .then((result) => {
        setOptions(result);
        setOrganizerEmail(result.suggestedOrganizer);
        setProvider(result.suggestedProvider);
        const linkTitle = result.booking.linkTitle || "Meeting";
        setTitle(
          result.booking.meetingTitle.localeCompare(linkTitle, undefined, {
            sensitivity: "accent",
          }) === 0
            ? ""
            : result.booking.meetingTitle,
        );
        setMeetingUrl(result.booking.meetingUrl || "");
        setMeetingNotes(result.booking.meetingNotes || "");
        setAttendees(
          result.attendees
            .filter((attendee) => !attendee.primary)
            .map(({ name, email }) => ({ name, email })),
        );
      })
      .catch((cause: Error) => setError(cause.message))
      .finally(() => setLoading(false));
  }, [bookingId, open]);

  const organizer = useMemo(
    () =>
      options?.organizers.find(
        (candidate) => candidate.email === organizerEmail,
      ),
    [options, organizerEmail],
  );
  const selectedProvider = organizer?.providers.find(
    (candidate) => candidate.provider === provider,
  );
  const calendarTitle = options
    ? `${options.booking.linkTitle || "Meeting"}${title.trim() ? `: ${title.trim()}` : ""} — ${options.booking.name}`
    : "";
  useEffect(() => {
    if (provider !== "manual" && organizer && !selectedProvider?.available)
      setProvider("manual");
  }, [organizer, provider, selectedProvider?.available]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!options) return;
    const attendeeError = attendeeDraftError(attendees, options.booking.email);
    if (attendeeError) return setError(attendeeError);
    if (provider !== "manual" && !selectedProvider?.available)
      return setError("Choose an available provider for this organizer.");
    const form = new FormData(event.currentTarget);
    const localTime = String(form.get("finalStartsAt") || "");
    const date = new Date(localTime);
    if (!localTime || Number.isNaN(date.getTime()))
      return setError("Choose a valid meeting date and time.");
    setSubmitting(true);
    setError("");
    try {
      const result = await api.createMeeting(bookingId, {
        organizerEmail,
        provider,
        title,
        finalStartsAt: date.toISOString(),
        meetingUrl,
        meetingNotes,
        attendees: attendees.map((attendee) => ({
          name: attendee.name.trim(),
          email: attendee.email.trim(),
        })),
      });
      if (result.additionalInviteFailures.length)
        toast.warning(
          `Meeting created, but ${result.additionalInviteFailures.length} additional invitation${result.additionalInviteFailures.length === 1 ? "" : "s"} failed.`,
        );
      else
        toast.success(
          result.deliveryMethod === "calendar"
            ? "Meeting created and provider invitations sent"
            : `Meeting created and invitations sent through ${result.deliveryMethod}`,
        );
      await onCreated();
      onOpenChange(false);
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "Could not create meeting",
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92svh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Create meeting</DialogTitle>
          <DialogDescription>
            Choose the organizer and delivery method, review every attendee,
            then create one invitation for the group.
          </DialogDescription>
        </DialogHeader>
        {loading ? (
          <div className="flex min-h-56 items-center justify-center">
            <Loader2 className="animate-spin" />
          </div>
        ) : options ? (
          <form className="space-y-6" onSubmit={submit}>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Organizer</Label>
                <Select
                  disabled={options.currentUserRole === "member"}
                  value={organizerEmail}
                  onValueChange={setOrganizerEmail}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {options.organizers.map((candidate) => (
                      <SelectItem key={candidate.email} value={candidate.email}>
                        {candidate.name} · {candidate.email}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Final meeting time</Label>
                <DateTimeSelect
                  name="finalStartsAt"
                  initialValue={localDateTime(
                    options.booking.finalStartsAt || options.booking.startsAt,
                  )}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="meeting-title">
                Meeting topic{" "}
                <span className="font-normal text-muted-foreground">
                  (optional)
                </span>
              </Label>
              <Input
                autoComplete="off"
                id="meeting-title"
                maxLength={140}
                name="meetingTopic"
                placeholder="Frontend role…"
                value={title}
                onChange={(event) => setTitle(event.target.value)}
              />
              <p
                aria-live="polite"
                className="break-words text-xs text-muted-foreground"
              >
                Calendar title: {calendarTitle}
              </p>
            </div>

            <div className="space-y-3">
              <Label>Meeting provider</Label>
              <div className="grid gap-2 sm:grid-cols-3">
                {(["google", "microsoft", "manual"] as const).map((method) => {
                  const option = organizer?.providers.find(
                    (candidate) => candidate.provider === method,
                  );
                  const available = method === "manual" || option?.available;
                  return (
                    <Button
                      className="h-auto min-h-20 flex-col items-start gap-1 px-4 py-3 text-left"
                      disabled={!available}
                      key={method}
                      onClick={() => setProvider(method)}
                      type="button"
                      variant={provider === method ? "default" : "outline"}
                    >
                      <span className="flex w-full items-center gap-2">
                        {method === "manual" ? <Mail /> : <CalendarDays />}
                        {method === "google"
                          ? "Google Meet"
                          : method === "microsoft"
                            ? "Microsoft Teams"
                            : "Manual link"}
                      </span>
                      <span className="w-full truncate text-xs opacity-75">
                        {method === "manual"
                          ? "Personal email, then workspace fallback"
                          : option?.account || "Not connected"}
                      </span>
                    </Button>
                  );
                })}
              </div>
              {provider !== "manual" && selectedProvider && (
                <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                  <UserRound className="size-3.5" />
                  Invitations are sent by {selectedProvider.account}.
                  {selectedProvider.usedOwnerFallback && (
                    <Badge variant="secondary">Owner fallback</Badge>
                  )}
                </div>
              )}
            </div>

            {provider === "manual" && (
              <div className="space-y-2">
                <Label htmlFor="meeting-url">HTTPS meeting link</Label>
                <Input
                  id="meeting-url"
                  placeholder="https://…"
                  required
                  type="url"
                  value={meetingUrl}
                  onChange={(event) => setMeetingUrl(event.target.value)}
                />
              </div>
            )}

            <div className="rounded-xl border p-4">
              <p className="text-sm font-medium">Primary attendee</p>
              <p className="mt-1 text-sm text-muted-foreground">
                {options.booking.name} · {options.booking.email}
              </p>
            </div>
            <AttendeeEditor
              attendees={attendees}
              description="Review visitor suggestions or add attendees. Everyone receives the same calendar invitation."
              onChange={setAttendees}
            />

            <div className="space-y-2">
              <Label htmlFor="meeting-notes">Agenda or instructions</Label>
              <Textarea
                id="meeting-notes"
                maxLength={2000}
                placeholder="Optional agenda, preparation, or joining instructions"
                value={meetingNotes}
                onChange={(event) => setMeetingNotes(event.target.value)}
              />
            </div>

            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            <DialogFooter>
              <Button
                disabled={submitting}
                onClick={() => onOpenChange(false)}
                type="button"
                variant="outline"
              >
                Cancel
              </Button>
              <Button disabled={submitting || !organizerEmail}>
                {submitting && <Loader2 className="animate-spin" />}
                Create meeting
              </Button>
            </DialogFooter>
          </form>
        ) : (
          <Alert variant="destructive">
            <AlertDescription>
              {error || "Could not load meeting options."}
            </AlertDescription>
          </Alert>
        )}
      </DialogContent>
    </Dialog>
  );
}
