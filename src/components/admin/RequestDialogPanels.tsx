import { Mail, Trash2 } from "lucide-react";
import type { BookingDetail } from "@/types";
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
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { TabsContent } from "@/components/ui/tabs";
import { fmt } from "./shared";

export function RequestVisitorPanel({
  detail,
  bookingId,
  canEdit,
  isBusy,
  isErasing,
  onErase,
}: {
  detail: BookingDetail;
  bookingId: string;
  canEdit: boolean;
  isBusy: boolean;
  isErasing: boolean;
  onErase: () => void;
}) {
  return (
    <TabsContent value="visitor">
      {detail.feedback && (
        <div className="mb-4 rounded-xl border border-amber-500/20 bg-amber-500/5 p-4">
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm font-medium">Meeting feedback</p>
            <Badge
              variant="outline"
              className="border-amber-500/20 bg-amber-500/10 text-amber-700 dark:text-amber-300"
            >
              {detail.feedback.rating}/5
            </Badge>
          </div>
          <p className="mt-2 whitespace-pre-wrap break-words text-sm text-muted-foreground">
            {detail.feedback.message || "No written feedback."}
          </p>
        </div>
      )}
      <div className="grid gap-3 sm:grid-cols-2">
        {[
          ["Email", detail.booking.email],
          ["Phone", detail.booking.phone || "Not provided"],
          ["Selected time", fmt(detail.booking.startsAt)],
          ["Visitor time zone", detail.booking.timeZone],
          ["Device", detail.booking.deviceType || "Unknown"],
          ["Approximate location", detail.booking.location || "Unavailable"],
          ["Language", detail.booking.browserLanguage || "Unknown"],
          ["Referrer", detail.booking.referrer || "Direct"],
        ].map(([label, value]) => (
          <div className="min-w-0 rounded-xl border p-3" key={label}>
            <p className="text-xs text-muted-foreground">{label}</p>
            <p className="mt-1 break-words text-sm font-medium">{value}</p>
          </div>
        ))}
      </div>
      {detail.attendees.length > 1 && (
        <div className="mt-4 rounded-xl border p-4">
          <p className="text-sm font-medium">Suggested additional attendees</p>
          <div className="mt-3 space-y-2">
            {detail.attendees
              .filter((attendee) => !attendee.primary)
              .map((attendee) => (
                <p className="break-words text-sm" key={attendee.email}>
                  {attendee.name} · {attendee.email}
                </p>
              ))}
          </div>
        </div>
      )}
      {canEdit &&
        detail.booking.email !== `deleted+${bookingId}@invalid.local` && (
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                type="button"
                variant="destructive"
                className="mt-4"
                disabled={isBusy}
              >
                <Trash2 aria-hidden="true" />
                Erase visitor data
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Erase personal data?</AlertDialogTitle>
                <AlertDialogDescription>
                  This permanently removes the visitor’s identity, contact
                  details, additional attendee list, stored meeting title,
                  feedback text, device information, notes, notifications, and
                  self-service access. Anonymous meeting statistics are
                  retained. This cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Keep data</AlertDialogCancel>
                <AlertDialogAction variant="destructive" onClick={onErase}>
                  {isErasing ? "Erasing…" : "Erase permanently"}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        )}
    </TabsContent>
  );
}

export function RequestEmailsPanel({ detail }: { detail: BookingDetail }) {
  return (
    <TabsContent value="emails">
      <div className="space-y-3">
        {detail.emails.length ? (
          detail.emails.map((email) => (
            <div
              className="flex min-w-0 items-start gap-3 rounded-xl border p-3"
              key={email.id}
            >
              <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-muted">
                <Mail className="size-4" aria-hidden="true" />
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-3">
                  <p className="truncate text-sm font-medium capitalize">
                    {email.template.replaceAll("_", " ")}
                  </p>
                  <Badge
                    className="shrink-0"
                    variant={
                      email.status === "sent" ? "secondary" : "destructive"
                    }
                  >
                    {email.status}
                  </Badge>
                </div>
                <p className="mt-1 break-words text-xs text-muted-foreground">
                  {email.recipient} · {fmt(email.created_at)}
                  {email.delivery_method ? ` · ${email.delivery_method}` : ""}
                  {email.sender_email ? ` · ${email.sender_email}` : ""}
                  {email.used_fallback ? " · fallback" : ""}
                </p>
                {email.error && (
                  <p className="mt-2 break-words text-xs text-destructive">
                    {email.error}
                  </p>
                )}
              </div>
            </div>
          ))
        ) : (
          <div className="rounded-xl border border-dashed p-6 text-center text-sm text-muted-foreground">
            No emails have been sent for this request.
          </div>
        )}
      </div>
    </TabsContent>
  );
}

export function RequestActivityPanel({ detail }: { detail: BookingDetail }) {
  return (
    <TabsContent value="activity">
      {detail.activities.length ? (
        <div className="space-y-4">
          {detail.activities.map((activity) => (
            <div className="flex min-w-0 gap-3" key={activity.id}>
              <span
                className="mt-1.5 size-2 shrink-0 rounded-full bg-foreground/50"
                aria-hidden="true"
              />
              <div className="min-w-0">
                <p className="break-words text-sm">{activity.summary}</p>
                <p className="mt-0.5 break-words text-xs text-muted-foreground">
                  {fmt(activity.created_at)}
                  {activity.actor_email ? ` · ${activity.actor_email}` : ""}
                </p>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="rounded-xl border border-dashed p-6 text-center text-sm text-muted-foreground">
          No activity has been recorded for this request.
        </div>
      )}
    </TabsContent>
  );
}
