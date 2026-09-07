import { CheckCircle2, Clock3, Loader2, Star, XCircle } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { api } from "@/api";
import type { Booking, Slot } from "@/types";
import type { MeetingFeedback } from "@/types";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { BrandLogo } from "@/components/BrandLogo";
import { PublicFooter } from "@/components/PublicFooter";
import { setPageTitle } from "@/brand";
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
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default function ManageBooking({ token }: { token: string }) {
  const [booking, setBooking] = useState<Booking>();
  const [slots, setSlots] = useState<Slot[]>([]);
  const [selected, setSelected] = useState("");
  const [error, setError] = useState("");
  const [done, setDone] = useState("");
  const [loading, setLoading] = useState(true);
  const [feedback, setFeedback] = useState<MeetingFeedback | null>(null);
  const [rating, setRating] = useState(0);
  const [feedbackMessage, setFeedbackMessage] = useState("");
  const [feedbackSent, setFeedbackSent] = useState(false);
  useEffect(() => {
    api
      .manageBooking(token)
      .then((result) => {
        setBooking(result.booking);
        setSlots(result.slots);
        setFeedback(result.feedback);
        setRating(result.feedback?.rating || 0);
        setFeedbackMessage(result.feedback?.message || "");
      })
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false));
  }, [token]);
  useEffect(() => {
    setPageTitle(booking?.linkTitle || "Manage booking");
  }, [booking?.linkTitle]);
  const groups = useMemo(
    () =>
      slots
        .filter((slot) => !slot.booked)
        .reduce<Record<string, Slot[]>>((all, slot) => {
          const day = new Intl.DateTimeFormat("en", {
            weekday: "short",
            month: "short",
            day: "numeric",
          }).format(new Date(slot.startsAt));
          (all[day] ||= []).push(slot);
          return all;
        }, {}),
    [slots],
  );
  async function action(kind: "cancel" | "reschedule") {
    if (kind === "reschedule" && !selected)
      return setError("Choose a new time first.");
    try {
      const result = await api.updateManagedBooking(token, {
        action: kind,
        startsAt: selected,
      });
      setDone(result.status);
      setError("");
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Could not update your selected slot",
      );
    }
  }
  async function submitFeedback() {
    if (!rating) return setError("Choose a rating first.");
    try {
      await api.submitFeedback(token, rating, feedbackMessage);
      setFeedback({
        rating,
        message: feedbackMessage,
        created_at: new Date().toISOString(),
      });
      setFeedbackSent(true);
      setError("");
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "Could not send feedback",
      );
    }
  }
  if (loading)
    return (
      <main
        id="main-content"
        tabIndex={-1}
        className="flex min-h-svh items-center justify-center"
      >
        <div
          role="status"
          className="flex items-center gap-2 text-sm text-muted-foreground"
        >
          <Loader2 className="animate-spin" aria-hidden="true" />
          Loading booking…
        </div>
      </main>
    );
  if (error && !booking)
    return (
      <main
        id="main-content"
        tabIndex={-1}
        className="flex min-h-svh items-center justify-center p-4"
      >
        <Alert variant="destructive" className="max-w-md">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      </main>
    );
  if (done)
    return (
      <main
        id="main-content"
        tabIndex={-1}
        className="flex min-h-svh items-center justify-center bg-muted/30 p-4"
      >
        <Card className="w-full max-w-md text-center">
          <CardHeader>
            <span className="mx-auto flex size-12 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-700 dark:text-emerald-300">
              <CheckCircle2 aria-hidden="true" />
            </span>
            <CardTitle className="pt-3">Slot updated</CardTitle>
            <CardDescription>
              {done === "cancelled"
                ? "Your selected slot has been cancelled."
                : done === "confirmed"
                  ? "Your meeting has been rescheduled. Check your email for the updated confirmation and calendar invitation."
                  : "Your new preferred time has been sent to the organizer."}
            </CardDescription>
          </CardHeader>
        </Card>
      </main>
    );
  return (
    <main
      id="main-content"
      tabIndex={-1}
      className="min-h-svh bg-muted/30 p-4 sm:py-10"
    >
      <Card className="mx-auto w-full max-w-3xl">
        <CardHeader>
          <BrandLogo className="mb-4 self-start" />
          <CardTitle>Manage your selected slot</CardTitle>
          <CardDescription>
            {booking?.linkTitle} · Currently{" "}
            {booking &&
              new Intl.DateTimeFormat("en", {
                dateStyle: "full",
                timeStyle: "short",
              }).format(new Date(booking.startsAt))}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-7">
          <div>
            <h2 className="text-sm font-medium">
              Choose another available time
            </h2>
            <div className="mt-4 space-y-5">
              {Object.keys(groups).length ? (
                Object.entries(groups).map(([day, items]) => (
                  <div key={day}>
                    <p className="mb-2 text-xs font-medium text-muted-foreground">
                      {day}
                    </p>
                    <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                      {items.map((slot) => (
                        <Button
                          key={slot.startsAt}
                          variant={
                            selected === slot.startsAt ? "default" : "outline"
                          }
                          onClick={() => setSelected(slot.startsAt)}
                        >
                          <Clock3 />
                          {new Intl.DateTimeFormat("en", {
                            hour: "numeric",
                            minute: "2-digit",
                          }).format(new Date(slot.startsAt))}
                        </Button>
                      ))}
                    </div>
                  </div>
                ))
              ) : (
                <div className="rounded-xl border border-dashed p-6 text-sm text-muted-foreground">
                  No alternative times are currently available.
                </div>
              )}
            </div>
          </div>
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          <div className="flex flex-col-reverse justify-between gap-3 border-t pt-5 sm:flex-row">
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive">
                  <XCircle />
                  Cancel slot
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Cancel this slot?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Your selected time will be released for someone else. The
                    organizer will see that this slot was cancelled.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Keep slot</AlertDialogCancel>
                  <AlertDialogAction
                    variant="destructive"
                    onClick={() => action("cancel")}
                  >
                    Yes, cancel slot
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
            <Button disabled={!selected} onClick={() => action("reschedule")}>
              Send new time
            </Button>
          </div>
          <div className="rounded-xl border bg-violet-500/5 p-5">
            <h2 className="font-medium">How did the meeting go?</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Your feedback helps the organizer improve future meetings.
            </p>
            <div className="mt-4 flex gap-1" aria-label="Meeting rating">
              {[1, 2, 3, 4, 5].map((value) => (
                <Button
                  key={value}
                  type="button"
                  size="icon"
                  variant="ghost"
                  aria-label={`${value} star${value > 1 ? "s" : ""}`}
                  onClick={() => setRating(value)}
                  className={
                    value <= rating ? "text-amber-500" : "text-muted-foreground"
                  }
                >
                  <Star className={value <= rating ? "fill-current" : ""} />
                </Button>
              ))}
            </div>
            <Textarea
              className="mt-3 bg-background"
              rows={4}
              maxLength={2000}
              value={feedbackMessage}
              onChange={(event) => setFeedbackMessage(event.target.value)}
              placeholder="Share anything that worked well or could be improved (optional)"
            />
            <div className="mt-3 flex items-center justify-between gap-3">
              <p className="text-xs text-muted-foreground">
                {feedbackSent
                  ? "Thank you—your feedback was saved."
                  : feedback
                    ? "You can update your previous feedback."
                    : "Only the meeting team can view this."}
              </p>
              <Button type="button" onClick={submitFeedback} disabled={!rating}>
                {feedback ? "Update feedback" : "Send feedback"}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
      <PublicFooter className="mx-auto w-full max-w-3xl px-2 py-6" />
    </main>
  );
}
