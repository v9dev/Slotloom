import {
  ArrowRight,
  CalendarCheck,
  Check,
  GitFork,
  Mail,
  ShieldCheck,
  Sparkles,
  Users,
} from "lucide-react";
import { useEffect, type ReactNode } from "react";
import { brand, setPageTitle } from "@/brand";
import { BrandLogo } from "@/components/BrandLogo";
import { PublicFooter } from "@/components/PublicFooter";
import { Button } from "@/components/ui/button";

const repositoryUrl = "https://github.com/v9dev/Slotloom";

const features = [
  {
    icon: CalendarCheck,
    title: "Flexible scheduling links",
    description:
      "Publish your availability, collect the right details, and let visitors choose a time that works.",
  },
  {
    icon: Sparkles,
    title: "Reviewed meeting creation",
    description:
      "Review each response before creating a Google Meet or Microsoft Teams event for the selected attendees.",
  },
  {
    icon: Mail,
    title: "Choice of email delivery",
    description:
      "Send transactional booking messages through an authorized Gmail or Outlook account, with Worker email as an optional fallback.",
  },
  {
    icon: Users,
    title: "Workspace controls",
    description:
      "Keep ownership clear with team roles, response assignment, activity history, and personal provider connections.",
  },
];

function Step({
  number,
  title,
  children,
}: {
  number: string;
  title: string;
  children: ReactNode;
}) {
  return (
    <li className="flex gap-4">
      <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-foreground text-sm font-semibold text-background">
        {number}
      </span>
      <div className="pt-1">
        <p className="font-medium">{title}</p>
        <p className="mt-1 text-sm leading-6 text-muted-foreground">
          {children}
        </p>
      </div>
    </li>
  );
}

export default function Home() {
  useEffect(() => setPageTitle(), []);

  return (
    <main className="min-h-svh overflow-hidden bg-background">
      <header className="border-b bg-background/90 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
          <a href="/" aria-label={`${brand.name} home`}>
            <BrandLogo className="max-w-40" />
          </a>
          <div className="flex items-center gap-1 sm:gap-2">
            <Button asChild variant="ghost" className="hidden sm:inline-flex">
              <a href="#features">Features</a>
            </Button>
            <Button asChild variant="ghost" className="hidden sm:inline-flex">
              <a href="#data-use">Data use</a>
            </Button>
            <Button asChild>
              <a href="/login">
                Sign in
                <ArrowRight />
              </a>
            </Button>
          </div>
        </div>
      </header>

      <section className="relative border-b">
        <div
          aria-hidden="true"
          className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_top_left,color-mix(in_oklch,var(--brand-blue)_14%,transparent),transparent_34%),radial-gradient(circle_at_80%_10%,color-mix(in_oklch,var(--brand-violet)_14%,transparent),transparent_30%)]"
        />
        <div className="mx-auto grid max-w-6xl gap-12 px-4 py-20 sm:px-6 sm:py-28 lg:grid-cols-[1.15fr_.85fr] lg:items-center lg:py-32">
          <div className="max-w-3xl">
            <p className="mb-5 inline-flex items-center gap-2 rounded-full border bg-background/80 px-3 py-1.5 text-xs font-medium shadow-sm">
              <GitFork className="size-3.5" />
              Open-source scheduling for Cloudflare
            </p>
            <h1 className="text-base font-semibold text-brand-blue">
              {brand.name}
            </h1>
            <p className="mt-3 text-5xl font-semibold tracking-[-0.045em] sm:text-6xl lg:text-7xl">
              {brand.tagline}
            </p>
            <p className="mt-6 max-w-2xl text-lg leading-8 text-muted-foreground sm:text-xl">
              Slotloom helps teams share availability, collect booking
              responses, and turn approved requests into calendar events with
              Google Meet or Microsoft Teams.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Button asChild size="lg" className="h-11 px-5">
                <a href="/login">
                  Open your workspace
                  <ArrowRight />
                </a>
              </Button>
              <Button asChild size="lg" variant="outline" className="h-11 px-5">
                <a href={repositoryUrl} target="_blank" rel="noreferrer">
                  <GitFork />
                  View source
                </a>
              </Button>
            </div>
            <p className="mt-5 text-xs leading-5 text-muted-foreground">
              Google and Microsoft connections are optional and always require
              the account holder’s explicit authorization.
            </p>
          </div>

          <div className="relative mx-auto w-full max-w-lg lg:mx-0">
            <div className="absolute -inset-5 -z-10 rounded-[2rem] bg-gradient-to-br from-brand-blue/15 to-brand-violet/15 blur-2xl" />
            <div className="rounded-3xl border bg-background/95 p-6 shadow-2xl shadow-black/10 sm:p-8">
              <div className="flex items-center justify-between gap-4 border-b pb-5">
                <div>
                  <p className="text-sm font-semibold">
                    A clearer meeting flow
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    From availability to a confirmed event
                  </p>
                </div>
                <span className="flex size-10 items-center justify-center rounded-xl bg-brand-violet/10 text-brand-violet">
                  <CalendarCheck className="size-5" />
                </span>
              </div>
              <ol className="mt-6 space-y-6">
                <Step number="1" title="Share a booking link">
                  Set availability and collect the attendee details you need.
                </Step>
                <Step number="2" title="Review the response">
                  Confirm the time, title, organizer, and attendee list.
                </Step>
                <Step number="3" title="Create and communicate">
                  Create the provider event and send the appropriate booking
                  messages.
                </Step>
              </ol>
            </div>
          </div>
        </div>
      </section>

      <section id="features" className="scroll-mt-8 border-b py-20 sm:py-24">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="max-w-2xl">
            <p className="text-sm font-semibold text-brand-violet">
              Built for the whole flow
            </p>
            <h2 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">
              Scheduling that stays under your control
            </h2>
            <p className="mt-4 text-base leading-7 text-muted-foreground">
              Slotloom combines public booking, internal review, meeting
              creation, and communication in one self-hosted workspace.
            </p>
          </div>
          <div className="mt-10 grid gap-px overflow-hidden rounded-2xl border bg-border sm:grid-cols-2">
            {features.map(({ icon: Icon, title, description }) => (
              <article key={title} className="bg-background p-6 sm:p-8">
                <span className="flex size-10 items-center justify-center rounded-xl bg-muted text-foreground">
                  <Icon className="size-5" />
                </span>
                <h3 className="mt-5 text-lg font-semibold">{title}</h3>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">
                  {description}
                </p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section id="data-use" className="scroll-mt-8 bg-muted/30 py-20 sm:py-24">
        <div className="mx-auto grid max-w-6xl gap-10 px-4 sm:px-6 lg:grid-cols-[.8fr_1.2fr] lg:items-start">
          <div>
            <span className="flex size-11 items-center justify-center rounded-xl bg-brand-blue/10 text-brand-blue">
              <ShieldCheck className="size-5" />
            </span>
            <h2 className="mt-5 text-3xl font-semibold tracking-tight sm:text-4xl">
              Connected accounts stay in your control
            </h2>
            <p className="mt-4 text-base leading-7 text-muted-foreground">
              Provider access is optional, permission-based, and limited to the
              scheduling and email actions a user enables.
            </p>
          </div>
          <div className="rounded-2xl border bg-background p-6 shadow-sm sm:p-8">
            <ul className="space-y-5">
              {[
                "Slotloom identifies the Google or Microsoft account you explicitly connect.",
                "Calendar access creates, updates, or cancels Slotloom-managed events and obtains Google Meet or Microsoft Teams joining details.",
                "Gmail or Outlook sending is optional and used only for transactional booking messages selected by the workspace.",
                "Slotloom does not request inbox-reading permission and does not use connected account data for advertising.",
                "Provider credentials and OAuth tokens are encrypted in the configured deployment.",
              ].map((item) => (
                <li key={item} className="flex gap-3 text-sm leading-6">
                  <span className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-700 dark:text-emerald-300">
                    <Check className="size-3" />
                  </span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
            <div className="mt-7 flex flex-wrap gap-3 border-t pt-6">
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

      <section className="border-y py-16 sm:py-20">
        <div className="mx-auto flex max-w-4xl flex-col items-center px-4 text-center sm:px-6">
          <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">
            Make scheduling feel considered again.
          </h2>
          <p className="mt-4 max-w-2xl text-base leading-7 text-muted-foreground">
            Open your protected workspace to manage availability, responses,
            meetings, integrations, and your team.
          </p>
          <Button asChild size="lg" className="mt-7 h-11 px-5">
            <a href="/login">
              Sign in to Slotloom
              <ArrowRight />
            </a>
          </Button>
        </div>
      </section>

      <PublicFooter className="mx-auto max-w-6xl px-4 py-8 sm:px-6" />
    </main>
  );
}
