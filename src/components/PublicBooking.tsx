import {
  ArrowLeft,
  ArrowRight,
  CalendarDays,
  Check,
  Clock3,
  Globe2,
  Loader2,
  Mail,
  Phone,
} from "lucide-react";
import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { api } from "@/api";
import type { BookingLink, Slot } from "@/types";
import { BrandLogo } from "@/components/BrandLogo";
import { PublicFooter } from "@/components/PublicFooter";
import {
  AttendeeEditor,
  attendeeDraftError,
  type AttendeeDraft,
} from "@/components/AttendeeEditor";
import { brand, setPageTitle } from "@/brand";
import { browserTimeZone, TimeZoneSelect } from "@/components/TimeZoneSelect";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type Step = "email" | "slot" | "phone" | "success";

function unavailableBookingCopy(message: string) {
  const normalized = message.toLowerCase();

  if (normalized.includes("expired"))
    return {
      label: "Link expired",
      title: "This booking window has closed",
      description:
        "The organizer is no longer accepting responses through this link. Ask them to share a current booking link.",
      canRetry: false,
    };

  if (normalized.includes("security configuration"))
    return {
      label: "Setup required",
      title: "Booking is temporarily unavailable",
      description:
        "The organizer needs to finish setting up this booking page. Try again later or contact them directly.",
      canRetry: true,
    };

  if (normalized.includes("not available"))
    return {
      label: "Link unavailable",
      title: "This booking link is no longer active",
      description:
        "The organizer may have paused or replaced this link. Ask them to share an active booking link.",
      canRetry: false,
    };

  return {
    label: "Couldn’t load page",
    title: "We couldn’t load this booking page",
    description:
      "Check your connection and try again. If the problem continues, ask the organizer for a current booking link.",
    canRetry: true,
  };
}

export default function PublicBooking({ slug }: { slug: string }) {
  const [data, setData] = useState<{
    link: BookingLink;
    slots: Slot[];
    turnstileSiteKey: string | null;
  }>();
  const [step, setStep] = useState<Step>("email");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [meetingTitle, setMeetingTitle] = useState("");
  const [attendees, setAttendees] = useState<AttendeeDraft[]>([]);
  const [selected, setSelected] = useState("");
  const [day, setDay] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [visitorTimeZone, setVisitorTimeZone] = useState(browserTimeZone());
  const [turnstileToken, setTurnstileToken] = useState("");
  const [turnstileAttempt, setTurnstileAttempt] = useState(0);
  useEffect(() => {
    api
      .publicLink(slug)
      .then(setData)
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false));
  }, [slug]);
  useEffect(() => {
    setPageTitle(data?.link.title || "Book a meeting");
  }, [data?.link.title]);
  const groups = useMemo(
    () =>
      data?.slots
        .filter((slot) => !slot.booked)
        .reduce<Record<string, Slot[]>>((all, slot) => {
          const key = new Intl.DateTimeFormat("en", {
            weekday: "short",
            month: "short",
            day: "numeric",
            timeZone: visitorTimeZone,
          }).format(new Date(slot.startsAt));
          (all[key] ||= []).push(slot);
          return all;
        }, {}) || {},
    [data, visitorTimeZone],
  );
  const dates = Object.keys(groups);
  const activeDay = day || dates[0] || "";
  function emailNext(event: FormEvent) {
    event.preventDefault();
    if (name.trim().length < 2) return setError("Enter your full name.");
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
      return setError("Enter a valid email address.");
    const attendeeError = attendeeDraftError(attendees, email);
    if (data?.link.allowAdditionalAttendees && attendeeError)
      return setError(attendeeError);
    setError("");
    setStep("slot");
  }
  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!selected) return setError("Choose an available time.");
    setSending(true);
    setError("");
    try {
      await api.createBooking(slug, {
        name,
        email,
        phone,
        startsAt: selected,
        timeZone: visitorTimeZone,
        turnstileToken,
        meetingTitle: data?.link.allowCustomMeetingTitle
          ? meetingTitle.trim()
          : undefined,
        attendees: data?.link.allowAdditionalAttendees
          ? attendees.map((attendee) => ({
              name: attendee.name.trim(),
              email: attendee.email.trim(),
            }))
          : undefined,
      });
      setStep("success");
    } catch (e) {
      if (data?.turnstileSiteKey) {
        setTurnstileToken("");
        setTurnstileAttempt((current) => current + 1);
      }
      setError(
        e instanceof Error ? e.message : "Could not send your availability.",
      );
    } finally {
      setSending(false);
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
          <Loader2 className="size-5 animate-spin" aria-hidden="true" />
          Loading availability…
        </div>
      </main>
    );
  if (!data) {
    const unavailable = unavailableBookingCopy(error);
    return (
      <main
        id="main-content"
        tabIndex={-1}
        className="relative flex min-h-svh items-center justify-center overflow-hidden bg-muted/30 px-4 py-10 sm:px-6"
      >
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 opacity-60 [background-image:linear-gradient(to_right,color-mix(in_oklch,var(--border)_55%,transparent)_1px,transparent_1px),linear-gradient(to_bottom,color-mix(in_oklch,var(--border)_55%,transparent)_1px,transparent_1px)] [background-size:48px_48px] [mask-image:radial-gradient(ellipse_at_center,black,transparent_74%)]"
        />
        <div className="relative w-full max-w-lg">
          <a
            href="/"
            aria-label={`${brand.name} home`}
            className="inline-flex rounded-lg focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
          >
            <BrandLogo className="max-w-44" />
          </a>
          <Card className="mt-6 w-full gap-0 overflow-hidden border-border/80 py-0 shadow-[0_1px_2px_rgba(15,23,42,.06),0_24px_70px_rgba(15,23,42,.13)]">
            <CardHeader className="gap-0 border-b bg-background/92 p-6 sm:p-8">
              <div className="flex items-center justify-between gap-4">
                <span className="flex size-11 items-center justify-center rounded-xl border bg-muted/40 text-muted-foreground shadow-sm">
                  <CalendarDays className="size-5" aria-hidden="true" />
                </span>
                <span className="rounded-full border bg-muted/40 px-3 py-1 text-xs font-medium text-muted-foreground">
                  {unavailable.label}
                </span>
              </div>
              <h1 className="mt-8 max-w-md text-3xl font-semibold tracking-tight sm:text-4xl">
                {unavailable.title}
              </h1>
              <p className="mt-3 max-w-md text-sm leading-6 text-muted-foreground sm:text-base">
                {unavailable.description}
              </p>
            </CardHeader>
            <CardContent className="flex flex-col gap-4 bg-muted/20 p-6 sm:flex-row sm:items-center sm:justify-between sm:p-8">
              <Button asChild size="lg" className="min-h-11 px-4">
                <a href="/">
                  <ArrowLeft aria-hidden="true" />
                  Return home
                </a>
              </Button>
              {unavailable.canRetry ? (
                <Button
                  type="button"
                  variant="outline"
                  size="lg"
                  className="min-h-11 px-4"
                  onClick={() => window.location.reload()}
                >
                  Try again
                </Button>
              ) : (
                <p className="max-w-52 text-sm leading-5 text-muted-foreground sm:text-right">
                  Need to schedule? Contact the organizer for a new link.
                </p>
              )}
            </CardContent>
          </Card>
          <PublicFooter className="mt-6 border-t px-2 pt-5" />
        </div>
      </main>
    );
  }
  const progress = step === "email" ? 1 : step === "slot" ? 2 : 3;
  return (
    <main
      id="main-content"
      tabIndex={-1}
      className="min-h-svh bg-muted/30 px-4 py-8 sm:py-14"
    >
      <div className="mx-auto w-full max-w-5xl">
        <div className="mb-6">
          <BrandLogo />
          <p className="mt-2 text-sm text-muted-foreground">{brand.tagline}</p>
        </div>
        <div className="grid overflow-hidden rounded-2xl border bg-background shadow-xl shadow-black/[.04] md:grid-cols-[320px_minmax(0,1fr)]">
          <aside className="border-b bg-muted/30 p-6 md:border-r md:border-b-0 md:p-8">
            <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Book your slot
            </p>
            <h1 className="mt-4 text-2xl font-semibold tracking-tight">
              {data.link.title}
            </h1>
            {data.link.description && (
              <p className="mt-3 text-sm leading-6 text-muted-foreground">
                {data.link.description}
              </p>
            )}
            <div className="mt-8 space-y-3 text-sm">
              <p className="flex items-center gap-3">
                <Clock3 className="size-4 text-muted-foreground" />
                {data.link.durationMinutes} minutes
              </p>
              <p className="flex items-center gap-3">
                <Globe2 className="size-4 text-muted-foreground" />
                {data.link.timeZone.replaceAll("_", " ")}
              </p>
            </div>
            <div className="mt-10 flex gap-2">
              {[1, 2, 3].map((n) => (
                <span
                  key={n}
                  className={`h-1.5 flex-1 rounded-full ${n <= progress ? "bg-primary" : "bg-border"}`}
                />
              ))}
            </div>
            <p className="mt-3 text-xs text-muted-foreground">
              Step {progress} of 3
            </p>
          </aside>
          <section className="min-w-0 p-6 sm:p-8 md:p-10">
            {step === "email" && (
              <form className="mx-auto max-w-md space-y-7" onSubmit={emailNext}>
                <div>
                  <Mail className="mb-5 size-6" />
                  <h2 className="text-2xl font-semibold tracking-tight">
                    Tell us about you
                  </h2>
                  <p className="mt-2 text-sm text-muted-foreground">
                    We’ll send the meeting update here.
                  </p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="name">Full name</Label>
                  <Input
                    id="name"
                    autoFocus
                    autoComplete="name"
                    placeholder="Your name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email address</Label>
                  <Input
                    id="email"
                    type="email"
                    autoComplete="email"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>
                {data.link.allowCustomMeetingTitle && (
                  <div className="space-y-2">
                    <Label htmlFor="meeting-title">
                      Meeting title{" "}
                      <span className="font-normal text-muted-foreground">
                        (optional)
                      </span>
                    </Label>
                    <Input
                      id="meeting-title"
                      maxLength={140}
                      placeholder={data.link.title}
                      value={meetingTitle}
                      onChange={(event) => setMeetingTitle(event.target.value)}
                    />
                    <p className="text-xs text-muted-foreground">
                      This is a suggestion. The organizer can review it before
                      creating the meeting.
                    </p>
                  </div>
                )}
                {data.link.allowAdditionalAttendees && (
                  <AttendeeEditor
                    attendees={attendees}
                    onChange={setAttendees}
                  />
                )}
                {error && (
                  <Alert variant="destructive">
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}
                <Button className="w-full justify-between" size="lg">
                  Continue
                  <ArrowRight />
                </Button>
              </form>
            )}
            {step === "slot" && (
              <div className="space-y-7">
                <div>
                  <h2 className="text-2xl font-semibold tracking-tight">
                    Choose a time
                  </h2>
                  <p className="mt-2 text-sm text-muted-foreground">
                    Select a convenient time in your timezone.
                  </p>
                </div>
                <div className="max-w-sm space-y-2">
                  <Label>Display timezone</Label>
                  <TimeZoneSelect
                    value={visitorTimeZone}
                    onValueChange={setVisitorTimeZone}
                    label="Display time zone"
                  />
                </div>
                {dates.length ? (
                  <>
                    <div className="flex gap-2 overflow-x-auto pb-2">
                      {dates.map((date) => (
                        <Button
                          key={date}
                          type="button"
                          variant={activeDay === date ? "default" : "outline"}
                          className="h-auto min-w-28 flex-col items-start px-4 py-3"
                          onClick={() => {
                            setDay(date);
                            setSelected("");
                          }}
                        >
                          <span className="text-xs opacity-70">
                            {date.split(",")[0]}
                          </span>
                          <span>{date.split(",").slice(1)}</span>
                        </Button>
                      ))}
                    </div>
                    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
                      {(groups[activeDay] || []).map((slot) => (
                        <Button
                          type="button"
                          variant={
                            selected === slot.startsAt ? "default" : "outline"
                          }
                          key={slot.startsAt}
                          onClick={() => setSelected(slot.startsAt)}
                          aria-label={new Intl.DateTimeFormat("en", {
                            hour: "numeric",
                            minute: "2-digit",
                            timeZone: visitorTimeZone,
                          }).format(new Date(slot.startsAt))}
                        >
                          {new Intl.DateTimeFormat("en", {
                            hour: "numeric",
                            minute: "2-digit",
                            timeZone: visitorTimeZone,
                          }).format(new Date(slot.startsAt))}
                        </Button>
                      ))}
                    </div>
                  </>
                ) : (
                  <div className="rounded-xl border border-dashed p-8 text-center">
                    <CalendarDays className="mx-auto size-5 text-muted-foreground" />
                    <p className="mt-3 text-sm font-medium">
                      No times are available in this date range
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Ask the organizer to add more availability.
                    </p>
                  </div>
                )}
                {error && (
                  <Alert variant="destructive">
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}
                <div className="flex justify-between">
                  <Button variant="ghost" onClick={() => setStep("email")}>
                    <ArrowLeft />
                    Back
                  </Button>
                  <Button disabled={!selected} onClick={() => setStep("phone")}>
                    Continue
                    <ArrowRight />
                  </Button>
                </div>
              </div>
            )}
            {step === "phone" && (
              <form className="mx-auto max-w-md space-y-7" onSubmit={submit}>
                <div>
                  <Phone className="mb-5 size-6" />
                  <h2 className="text-2xl font-semibold tracking-tight">
                    Add a phone number
                  </h2>
                  <p className="mt-2 text-sm text-muted-foreground">
                    Optional. Useful only if there is a last-minute issue.
                  </p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">
                    Phone number{" "}
                    <span className="font-normal text-muted-foreground">
                      (optional)
                    </span>
                  </Label>
                  <Input
                    id="phone"
                    type="tel"
                    autoFocus
                    autoComplete="tel"
                    placeholder="+1 555 000 0000"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                  />
                </div>
                {data.turnstileSiteKey && (
                  <TurnstileWidget
                    key={turnstileAttempt}
                    siteKey={data.turnstileSiteKey}
                    onToken={setTurnstileToken}
                  />
                )}
                {error && (
                  <Alert variant="destructive">
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}
                <div className="flex justify-between">
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => {
                      setTurnstileToken("");
                      setTurnstileAttempt((current) => current + 1);
                      setStep("slot");
                    }}
                  >
                    <ArrowLeft />
                    Back
                  </Button>
                  <Button
                    disabled={
                      sending ||
                      Boolean(data.turnstileSiteKey && !turnstileToken)
                    }
                  >
                    {sending ? <Loader2 className="animate-spin" /> : <Check />}
                    Submit slot
                  </Button>
                </div>
              </form>
            )}
            {step === "success" && (
              <div className="mx-auto flex max-w-md flex-col items-center py-10 text-center">
                <span className="mb-6 flex size-12 items-center justify-center rounded-full bg-primary text-primary-foreground">
                  <Check />
                </span>
                <h2 className="text-2xl font-semibold tracking-tight">
                  Slot submitted
                </h2>
                <p className="mt-3 text-sm leading-6 text-muted-foreground">
                  This is not a confirmed meeting yet. The organizer will review
                  your time and email the final details.
                </p>
              </div>
            )}
          </section>
        </div>
        <p className="mt-5 text-center text-xs text-muted-foreground">
          Your information is used only to coordinate this meeting. Read our{" "}
          <a className="underline underline-offset-4" href="/privacy">
            privacy policy
          </a>
          .
        </p>
        <PublicFooter className="mt-6 border-t px-2 pt-5" />
      </div>
    </main>
  );
}

function TurnstileWidget({
  siteKey,
  onToken,
}: {
  siteKey: string;
  onToken: (token: string) => void;
}) {
  const target = useRef<HTMLDivElement>(null);
  useEffect(() => {
    let cancelled = false;
    let widgetId: string | undefined;
    type TurnstileApi = {
      render(
        element: HTMLElement,
        options: {
          sitekey: string;
          action: string;
          size: "flexible";
          callback: (token: string) => void;
          "expired-callback": () => void;
          "error-callback": () => void;
        },
      ): string;
      remove(widgetId: string): void;
    };
    const api = () =>
      (
        window as typeof window & {
          turnstile?: TurnstileApi;
        }
      ).turnstile;
    const render = () => {
      const turnstile = api();
      if (!cancelled && !widgetId && target.current && turnstile)
        widgetId = turnstile.render(target.current, {
          sitekey: siteKey,
          action: "booking-submit",
          size: "flexible",
          callback: onToken,
          "expired-callback": () => onToken(""),
          "error-callback": () => onToken(""),
        });
    };
    const existing = document.querySelector<HTMLScriptElement>(
      "script[data-turnstile]",
    );
    if (existing) {
      render();
      existing.addEventListener("load", render);
      return () => {
        cancelled = true;
        existing.removeEventListener("load", render);
        if (widgetId) api()?.remove(widgetId);
      };
    }
    const script = document.createElement("script");
    script.src =
      "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
    script.async = true;
    script.defer = true;
    script.dataset.turnstile = "true";
    script.addEventListener("load", render);
    document.head.appendChild(script);
    return () => {
      cancelled = true;
      script.removeEventListener("load", render);
      if (widgetId) api()?.remove(widgetId);
    };
  }, [siteKey, onToken]);
  return <div ref={target} className="min-h-16" />;
}
