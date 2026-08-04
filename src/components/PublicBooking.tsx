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
  const [selected, setSelected] = useState("");
  const [day, setDay] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [visitorTimeZone, setVisitorTimeZone] = useState(browserTimeZone());
  const [turnstileToken, setTurnstileToken] = useState("");
  useEffect(() => {
    api
      .publicLink(slug)
      .then(setData)
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false));
  }, [slug]);
  const groups = useMemo(
    () =>
      data?.slots.reduce<Record<string, Slot[]>>((all, slot) => {
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
      });
      setStep("success");
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Could not send your availability.",
      );
    } finally {
      setSending(false);
    }
  }
  if (loading)
    return (
      <main className="flex min-h-svh items-center justify-center">
        <Loader2 className="size-5 animate-spin" />
      </main>
    );
  if (!data)
    return (
      <main className="flex min-h-svh items-center justify-center p-4">
        <Card className="max-w-md">
          <CardHeader>
            <CalendarDays className="mb-4 size-6" />
            <h1 className="text-xl font-semibold">This link is unavailable</h1>
            <p className="text-sm text-muted-foreground">
              {error || "Ask the organizer for a new link."}
            </p>
          </CardHeader>
        </Card>
      </main>
    );
  const progress = step === "email" ? 1 : step === "slot" ? 2 : 3;
  return (
    <main className="min-h-svh bg-muted/30 px-4 py-8 sm:py-14">
      <div className="mx-auto w-full max-w-5xl">
        <BrandLogo className="mb-6" />
        <div className="grid overflow-hidden rounded-2xl border bg-background shadow-xl shadow-black/[.04] md:grid-cols-[320px_1fr]">
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
          <section className="p-6 sm:p-8 md:p-10">
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
                {data.turnstileSiteKey && (
                  <TurnstileWidget
                    siteKey={data.turnstileSiteKey}
                    onToken=REPLACE_WITH_SECRET
                  />
                )}
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
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                  {(groups[activeDay] || []).map((slot) => (
                    <Button
                      type="button"
                      disabled={slot.booked}
                      variant={
                        selected === slot.startsAt ? "default" : "outline"
                      }
                      className={
                        slot.booked
                          ? "border-red-500/20 bg-red-500/10 text-red-700 opacity-70 dark:text-red-300"
                          : undefined
                      }
                      key={slot.startsAt}
                      onClick={() => setSelected(slot.startsAt)}
                      aria-label={`${new Intl.DateTimeFormat("en", {
                        hour: "numeric",
                        minute: "2-digit",
                        timeZone: visitorTimeZone,
                      }).format(new Date(slot.startsAt))}${slot.booked ? ", booked" : ""}`}
                    >
                      <span>
                        {new Intl.DateTimeFormat("en", {
                          hour: "numeric",
                          minute: "2-digit",
                          timeZone: visitorTimeZone,
                        }).format(new Date(slot.startsAt))}
                      </span>
                      {slot.booked && <span className="ml-1 text-[10px] font-medium">Booked</span>}
                    </Button>
                  ))}
                </div>
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
                {error && (
                  <Alert variant="destructive">
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}
                <div className="flex justify-between">
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => setStep("slot")}
                  >
                    <ArrowLeft />
                    Back
                  </Button>
                  <Button disabled={sending}>
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
          Your information is used only to coordinate this meeting.
        </p>
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
    const render = () => {
      const turnstile = (
        window as typeof window & {
          turnstile?: {
            render(
              element: HTMLElement,
              options: { sitekey: string; callback: (token: string) => void },
            ): string;
          };
        }
      ).turnstile;
      if (!cancelled && target.current && turnstile)
        turnstile.render(target.current, {
          sitekey: siteKey,
          callback: onToken,
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
    };
  }, [siteKey, onToken]);
  return <div ref={target} className="min-h-16" />;
}
