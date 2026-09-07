import {
  ArrowRight,
  CalendarCheck,
  Check,
  CheckCircle2,
  Clock3,
  GitFork,
  Globe2,
  Mail,
  ShieldCheck,
  Sparkles,
  Users,
} from "lucide-react";
import { useEffect } from "react";
import { brand, setPageTitle } from "@/brand";
import { BrandLogo } from "@/components/BrandLogo";
import { PublicFooter } from "@/components/PublicFooter";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Button } from "@/components/ui/button";

const repositoryUrl = "https://github.com/v9dev/Slotloom";

const workflow = [
  {
    icon: CalendarCheck,
    step: "01",
    title: "Publish availability",
    description:
      "Give each meeting type its own schedule, questions, validity window, and timezone.",
  },
  {
    icon: Users,
    step: "02",
    title: "Review the request",
    description:
      "Check the attendee, proposed time, title, and collaborators before anything reaches a calendar.",
  },
  {
    icon: CheckCircle2,
    step: "03",
    title: "Create & communicate",
    description:
      "Create the approved event, add Meet or Teams, and send the right transactional email.",
  },
];

const capabilities = [
  {
    icon: CalendarCheck,
    title: "Scheduling links",
    description:
      "Independent availability, durations, booking windows, and visitor questions for every link.",
  },
  {
    icon: Sparkles,
    title: "Human review",
    description:
      "A deliberate checkpoint between a visitor’s response and the event that lands on your calendar.",
  },
  {
    icon: Mail,
    title: "Connected delivery",
    description:
      "Optional Gmail, Outlook, or Worker Email delivery for confirmations and follow-up.",
  },
  {
    icon: ShieldCheck,
    title: "Workspace control",
    description:
      "Clear roles, response ownership, activity history, retention controls, and encrypted credentials.",
  },
];

const previewDays = ["Mon", "Tue", "Wed", "Thu"];
const previewTimes = ["9:00", "10:30", "12:00", "1:30"];
const previewSlots = [
  { day: 0, row: 0, label: "Open", tone: "bg-brand-blue/12 text-brand-blue" },
  {
    day: 1,
    row: 1,
    label: "30 min",
    tone: "bg-brand-violet/12 text-brand-violet",
  },
  { day: 2, row: 2, label: "Open", tone: "bg-brand-blue/12 text-brand-blue" },
  {
    day: 3,
    row: 0,
    label: "45 min",
    tone: "bg-brand-violet/12 text-brand-violet",
  },
  {
    day: 1,
    row: 3,
    label: "Open",
    tone: "bg-emerald-500/12 text-emerald-700 dark:text-emerald-300",
  },
];

function SchedulePreview() {
  return (
    <div className="relative mx-auto w-full max-w-xl lg:mx-0">
      <div
        aria-hidden="true"
        className="absolute -inset-6 -z-10 rounded-[2.25rem] bg-[radial-gradient(circle_at_30%_10%,color-mix(in_oklch,var(--brand-blue)_18%,transparent),transparent_58%),radial-gradient(circle_at_90%_90%,color-mix(in_oklch,var(--brand-violet)_16%,transparent),transparent_52%)] blur-2xl"
      />
      <div
        role="img"
        aria-label="A weekly availability view with open meeting times and one request ready for review"
        className="overflow-hidden rounded-[1.75rem] border border-foreground/10 bg-background/95 shadow-[0_1px_2px_rgba(15,23,42,.06),0_24px_70px_rgba(15,23,42,.13)] backdrop-blur"
      >
        <div aria-hidden="true">
          <div className="flex items-center justify-between gap-4 border-b border-foreground/8 px-5 py-4 sm:px-6">
            <div className="flex items-center gap-3">
              <span className="flex size-9 items-center justify-center rounded-xl bg-foreground text-background shadow-sm">
                <CalendarCheck className="size-4" aria-hidden="true" />
              </span>
              <div>
                <p className="text-sm font-semibold">Team availability</p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  Next available week
                </p>
              </div>
            </div>
            <span className="inline-flex items-center gap-2 rounded-full border border-emerald-500/20 bg-emerald-500/8 px-2.5 py-1 text-[11px] font-medium text-emerald-700 dark:text-emerald-300">
              <span className="size-1.5 rounded-full bg-emerald-500" />
              12 open slots
            </span>
          </div>

          <div className="p-4 sm:p-5">
            <div className="grid grid-cols-[44px_repeat(4,minmax(0,1fr))] overflow-hidden rounded-xl border border-foreground/8 bg-muted/20">
              <div className="border-b border-foreground/8" />
              {previewDays.map((date) => (
                <div
                  key={date}
                  className="border-b border-l border-foreground/8 px-1 py-2.5 text-center text-[10px] font-medium text-muted-foreground sm:text-[11px]"
                >
                  {date}
                </div>
              ))}
              {previewTimes.flatMap((time, row) => [
                <div
                  key={`${time}-label`}
                  className="border-b border-foreground/8 px-2 py-4 text-[10px] tabular-nums text-muted-foreground last:border-b-0"
                >
                  {time}
                </div>,
                ...previewDays.map((date, day) => {
                  const slot = previewSlots.find(
                    (candidate) =>
                      candidate.day === day && candidate.row === row,
                  );
                  return (
                    <div
                      key={`${date}-${time}`}
                      className="min-h-13 border-b border-l border-foreground/8 p-1.5"
                    >
                      {slot && (
                        <div
                          className={`flex h-full min-h-10 items-center justify-center rounded-md px-1 text-[10px] font-semibold ${slot.tone}`}
                        >
                          {slot.label}
                        </div>
                      )}
                    </div>
                  );
                }),
              ])}
            </div>

            <div className="relative z-10 -mt-1 ml-auto flex w-[92%] items-center gap-3 rounded-xl border border-foreground/10 bg-background p-3 shadow-[0_1px_2px_rgba(15,23,42,.05),0_12px_30px_rgba(15,23,42,.12)] sm:w-[82%] sm:p-4">
              <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-brand-violet/12 text-brand-violet">
                <Users className="size-4" aria-hidden="true" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-xs font-semibold sm:text-sm">
                  Priya requested Tuesday at 10:30
                </p>
                <p className="mt-0.5 truncate text-[10px] text-muted-foreground sm:text-xs">
                  Product introduction · 30 minutes
                </p>
              </div>
              <span className="rounded-md bg-foreground px-2.5 py-1.5 text-[10px] font-semibold text-background sm:text-xs">
                Review
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function Home() {
  useEffect(() => setPageTitle(), []);

  return (
    <main
      id="main-content"
      tabIndex={-1}
      className="min-h-svh overflow-hidden bg-background"
    >
      <header className="sticky top-0 z-40 border-b border-foreground/8 bg-background/82 backdrop-blur-xl">
        <div className="mx-auto flex min-h-16 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
          <a
            href="/"
            aria-label={`${brand.name} home`}
            className="rounded-lg focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
          >
            <BrandLogo className="max-w-40" />
          </a>
          <nav
            aria-label="Primary"
            className="flex items-center gap-1 sm:gap-2"
          >
            <Button asChild variant="ghost" className="hidden sm:inline-flex">
              <a href="#workflow">How it works</a>
            </Button>
            <Button asChild variant="ghost" className="hidden md:inline-flex">
              <a href="#control">
                Why <span translate="no">{brand.name}</span>
              </a>
            </Button>
            <ThemeToggle />
            <Button asChild>
              <a href="/login">
                Open workspace
                <ArrowRight aria-hidden="true" />
              </a>
            </Button>
          </nav>
        </div>
      </header>

      <section className="relative border-b border-foreground/8">
        <div
          aria-hidden="true"
          className="absolute inset-0 -z-10 bg-[linear-gradient(to_right,color-mix(in_oklch,var(--foreground)_5%,transparent)_1px,transparent_1px),linear-gradient(to_bottom,color-mix(in_oklch,var(--foreground)_5%,transparent)_1px,transparent_1px)] bg-[size:64px_64px] [mask-image:linear-gradient(to_bottom,black,transparent_90%)]"
        />
        <div className="mx-auto grid max-w-7xl gap-14 px-4 py-16 sm:px-6 sm:py-24 lg:grid-cols-[1.03fr_.97fr] lg:items-center lg:gap-16 lg:px-8 lg:py-28">
          <div className="max-w-3xl">
            <p className="mb-6 inline-flex items-center gap-2 rounded-full border border-foreground/10 bg-background/90 px-3 py-1.5 text-xs font-medium shadow-sm">
              <GitFork className="size-3.5" aria-hidden="true" />
              Open-source scheduling, built for Cloudflare
            </p>
            <p className="text-sm font-semibold text-brand-blue">
              <span translate="no">{brand.name}</span>
            </p>
            <h1 className="mt-3 max-w-3xl text-5xl font-semibold leading-[.95] tracking-[-0.055em] text-balance sm:text-6xl lg:text-[4.75rem]">
              {brand.tagline}
            </h1>
            <p className="mt-7 max-w-2xl text-lg leading-8 text-pretty text-muted-foreground sm:text-xl">
              Share availability, review every response, and create the right
              calendar event only when your team is ready.
            </p>
            <div className="mt-9 flex flex-col gap-3 sm:flex-row">
              <Button asChild size="lg" className="h-11 px-4 sm:min-w-44">
                <a href="/login">
                  Open your workspace
                  <ArrowRight aria-hidden="true" />
                </a>
              </Button>
              <Button
                asChild
                size="lg"
                variant="outline"
                className="h-11 px-4 sm:min-w-40"
              >
                <a href="#workflow">See the workflow</a>
              </Button>
            </div>
            <div className="mt-8 flex flex-wrap gap-x-6 gap-y-3 text-xs text-muted-foreground">
              {[
                "Self-hosted",
                "Review before creating",
                "Google & Microsoft ready",
              ].map((item) => (
                <span key={item} className="inline-flex items-center gap-2">
                  <Check
                    className="size-3.5 text-emerald-600"
                    aria-hidden="true"
                  />
                  {item}
                </span>
              ))}
            </div>
          </div>

          <SchedulePreview />
        </div>
      </section>

      <section
        id="workflow"
        className="scroll-mt-20 border-b border-foreground/8 py-20 sm:py-28"
      >
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid gap-8 lg:grid-cols-[.72fr_1.28fr] lg:items-end">
            <div>
              <p className="text-sm font-semibold text-brand-violet">
                One deliberate workflow
              </p>
              <h2 className="mt-3 text-4xl font-semibold leading-tight tracking-[-0.035em] text-balance sm:text-5xl">
                Share availability. Keep the final say.
              </h2>
            </div>
            <p className="max-w-2xl text-base leading-7 text-pretty text-muted-foreground lg:justify-self-end lg:text-lg">
              Slotloom keeps the useful pause that most schedulers remove: your
              team reviews the request before committing calendars, attendees,
              or provider automation.
            </p>
          </div>

          <ol className="mt-12 grid overflow-hidden rounded-2xl border border-foreground/10 bg-foreground/8 shadow-sm md:grid-cols-3 md:gap-px">
            {workflow.map(({ icon: Icon, step, title, description }) => (
              <li key={step} className="relative bg-background p-6 sm:p-8">
                <div className="flex items-center justify-between gap-4">
                  <span className="font-mono text-xs font-semibold tracking-widest text-muted-foreground">
                    {step}
                  </span>
                  <span className="flex size-10 items-center justify-center rounded-xl bg-muted text-foreground">
                    <Icon className="size-4.5" aria-hidden="true" />
                  </span>
                </div>
                <h3 className="mt-10 text-xl font-semibold tracking-tight">
                  {title}
                </h3>
                <p className="mt-3 text-sm leading-6 text-pretty text-muted-foreground">
                  {description}
                </p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section id="control" className="scroll-mt-20 bg-muted/30 py-20 sm:py-28">
        <div className="mx-auto grid max-w-7xl gap-12 px-4 sm:px-6 lg:grid-cols-[.78fr_1.22fr] lg:gap-20 lg:px-8">
          <div className="lg:sticky lg:top-28 lg:self-start">
            <span className="flex size-11 items-center justify-center rounded-xl border border-brand-blue/15 bg-brand-blue/10 text-brand-blue shadow-sm">
              <ShieldCheck className="size-5" aria-hidden="true" />
            </span>
            <h2 className="mt-6 text-4xl font-semibold leading-tight tracking-[-0.035em] text-balance sm:text-5xl">
              A scheduling layer you can actually own.
            </h2>
            <p className="mt-5 max-w-xl text-base leading-7 text-pretty text-muted-foreground">
              Keep the workflow, provider access, team roles, and data policy in
              one self-hosted workspace—not scattered across another stack of
              subscriptions.
            </p>
            <Button asChild variant="outline" size="lg" className="mt-8">
              <a href={repositoryUrl} target="_blank" rel="noreferrer">
                <GitFork aria-hidden="true" />
                Explore the source
              </a>
            </Button>
          </div>

          <div className="overflow-hidden rounded-2xl border border-foreground/10 bg-background shadow-[0_1px_2px_rgba(15,23,42,.04),0_18px_50px_rgba(15,23,42,.06)]">
            {capabilities.map(({ icon: Icon, title, description }) => (
              <article
                key={title}
                className="grid gap-4 border-b border-foreground/8 p-6 last:border-b-0 sm:grid-cols-[48px_1fr] sm:p-8"
              >
                <span className="flex size-11 items-center justify-center rounded-xl bg-muted text-foreground">
                  <Icon className="size-5" aria-hidden="true" />
                </span>
                <div className="min-w-0">
                  <h3 className="text-lg font-semibold tracking-tight">
                    {title}
                  </h3>
                  <p className="mt-2 text-sm leading-6 text-pretty text-muted-foreground">
                    {description}
                  </p>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section
        id="data-use"
        className="scroll-mt-20 border-y border-foreground/8 py-20 sm:py-24"
      >
        <div className="mx-auto grid max-w-7xl gap-10 px-4 sm:px-6 lg:grid-cols-[.82fr_1.18fr] lg:items-start lg:px-8">
          <div>
            <p className="inline-flex items-center gap-2 text-sm font-semibold text-brand-blue">
              <Globe2 className="size-4" aria-hidden="true" />
              Connected on your terms
            </p>
            <h2 className="mt-4 text-3xl font-semibold tracking-[-0.03em] text-balance sm:text-4xl">
              Your accounts stay under your control.
            </h2>
            <p className="mt-4 max-w-lg text-base leading-7 text-pretty text-muted-foreground">
              Provider access is optional, permission-based, and limited to the
              scheduling and email actions a user enables.
            </p>
          </div>
          <div className="rounded-2xl border border-foreground/10 bg-background p-6 shadow-[0_1px_2px_rgba(15,23,42,.04),0_16px_40px_rgba(15,23,42,.06)] sm:p-8">
            <ul className="space-y-5">
              {[
                "Connect only the Google or Microsoft account you choose.",
                "Create, update, or cancel workspace-managed events and their Meet or Teams details.",
                "Send transactional booking messages without requesting inbox-reading permission.",
                "Keep OAuth tokens and provider credentials encrypted in your deployment.",
              ].map((item) => (
                <li key={item} className="flex gap-3 text-sm leading-6">
                  <span className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-700 dark:text-emerald-300">
                    <Check className="size-3" aria-hidden="true" />
                  </span>
                  <span className="text-pretty">{item}</span>
                </li>
              ))}
            </ul>
            <div className="mt-7 flex flex-wrap gap-3 border-t border-foreground/8 pt-6">
              <Button asChild variant="outline">
                <a href="/privacy">Read the privacy policy</a>
              </Button>
              <Button asChild variant="ghost">
                <a href="/terms">Terms of service</a>
              </Button>
            </div>
          </div>
        </div>
      </section>

      <section className="relative overflow-hidden py-20 sm:py-28">
        <div
          aria-hidden="true"
          className="absolute inset-x-0 bottom-0 -z-10 mx-auto h-72 max-w-5xl bg-[radial-gradient(ellipse_at_bottom,color-mix(in_oklch,var(--brand-blue)_16%,transparent),transparent_68%)]"
        />
        <div className="mx-auto flex max-w-4xl flex-col items-center px-4 text-center sm:px-6">
          <Clock3 className="size-6 text-brand-violet" aria-hidden="true" />
          <h2 className="mt-5 text-4xl font-semibold tracking-[-0.04em] text-balance sm:text-5xl">
            Make every meeting earn its place.
          </h2>
          <p className="mt-5 max-w-2xl text-base leading-7 text-pretty text-muted-foreground">
            Open your protected workspace to manage availability, responses,
            meetings, integrations, and your team.
          </p>
          <Button asChild size="lg" className="mt-8 h-11 px-4">
            <a href="/login">
              Sign in to {brand.name}
              <ArrowRight aria-hidden="true" />
            </a>
          </Button>
        </div>
      </section>

      <PublicFooter className="mx-auto max-w-7xl border-t border-foreground/8 px-4 py-8 sm:px-6 lg:px-8" />
    </main>
  );
}
