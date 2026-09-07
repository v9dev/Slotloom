import {
  ArrowLeft,
  ArrowRight,
  Check,
  LockKeyhole,
  ShieldCheck,
} from "lucide-react";
import { useEffect } from "react";
import { BrandLogo } from "@/components/BrandLogo";
import { PublicFooter } from "@/components/PublicFooter";
import { ThemeToggle } from "@/components/ThemeToggle";
import { brand, setPageTitle } from "@/brand";
import { Button } from "@/components/ui/button";

const assurances = [
  "Your workspace stays behind Cloudflare Access",
  "Provider connections require explicit authorization",
  "Calendar changes remain visible in activity history",
];

export default function Login() {
  useEffect(() => setPageTitle("Sign in"), []);

  return (
    <main
      id="main-content"
      tabIndex={-1}
      className="relative flex min-h-svh flex-col items-center justify-center overflow-hidden bg-muted/35 px-4 py-10 sm:px-6"
    >
      <div
        aria-hidden="true"
        className="absolute inset-0 -z-10 bg-[linear-gradient(to_right,color-mix(in_oklch,var(--foreground)_4%,transparent)_1px,transparent_1px),linear-gradient(to_bottom,color-mix(in_oklch,var(--foreground)_4%,transparent)_1px,transparent_1px)] bg-[size:56px_56px] [mask-image:radial-gradient(ellipse_at_center,black,transparent_78%)]"
      />

      <div className="grid w-full max-w-4xl overflow-hidden rounded-[1.75rem] border border-foreground/10 bg-background shadow-[0_1px_2px_rgba(15,23,42,.06),0_28px_80px_rgba(15,23,42,.13)] lg:grid-cols-[.92fr_1.08fr]">
        <aside
          aria-label={`About ${brand.name}`}
          className="relative order-2 hidden overflow-hidden bg-foreground p-10 text-background lg:order-1 lg:block"
        >
          <div
            aria-hidden="true"
            className="absolute inset-0 bg-[radial-gradient(circle_at_20%_0%,color-mix(in_oklch,var(--brand-blue)_55%,transparent),transparent_38%),radial-gradient(circle_at_100%_100%,color-mix(in_oklch,var(--brand-violet)_48%,transparent),transparent_42%)] opacity-70"
          />
          <div className="relative flex h-full min-h-80 flex-col">
            <a
              href="/"
              aria-label={`${brand.name} home`}
              className="inline-flex w-fit items-center gap-2.5 rounded-lg text-sm font-semibold focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-background/60"
            >
              <BrandLogo compact className="size-8 rounded-lg" />
              <span translate="no">{brand.name}</span>
            </a>

            <div className="my-auto py-12 lg:py-16">
              <p className="font-mono text-[11px] font-semibold uppercase tracking-[.2em] text-background/60">
                Protected workspace
              </p>
              <p className="mt-4 max-w-sm text-4xl font-semibold leading-tight tracking-[-0.035em] text-balance">
                Keep the calendar intentional.
              </p>
              <p className="mt-4 max-w-sm text-sm leading-6 text-pretty text-background/68">
                Review booking requests, coordinate your team, and connect
                providers from one controlled workspace.
              </p>

              <div
                aria-hidden="true"
                className="mt-8 max-w-sm overflow-hidden rounded-xl border border-background/12 bg-background/6 p-3 backdrop-blur"
              >
                <div className="flex items-center justify-between border-b border-background/10 px-1 pb-3 text-[11px] text-background/60">
                  <span>This week</span>
                  <span className="tabular-nums">12 open slots</span>
                </div>
                <div className="mt-3 grid grid-cols-5 gap-1.5">
                  {[35, 72, 46, 84, 58].map((height, index) => (
                    <div
                      key={height}
                      className="flex h-16 items-end rounded-md bg-background/6 p-1"
                    >
                      <span
                        className={`w-full rounded-[3px] ${index === 3 ? "bg-brand-violet" : "bg-brand-blue"}`}
                        style={{ height: `${height}%` }}
                      />
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <p className="flex items-center gap-2 text-xs text-background/60">
              <ShieldCheck className="size-4" aria-hidden="true" />
              Secured at the edge by Cloudflare Access
            </p>
          </div>
        </aside>

        <section className="order-1 flex flex-col p-7 sm:p-10 lg:order-2 lg:p-12">
          <div className="flex items-center justify-between gap-4">
            <a
              href="/"
              aria-label={`${brand.name} home`}
              className="inline-flex items-center gap-2.5 rounded-lg text-sm font-semibold focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50 lg:hidden"
            >
              <BrandLogo compact className="size-8 rounded-lg" />
              <span translate="no">{brand.name}</span>
            </a>
            <div className="ml-auto flex items-center gap-1">
              <ThemeToggle />
              <Button asChild variant="ghost" size="sm">
                <a href="/">
                  <ArrowLeft aria-hidden="true" />
                  Back home
                </a>
              </Button>
            </div>
          </div>

          <div className="my-auto py-10 sm:py-12 lg:py-14">
            <span className="flex size-11 items-center justify-center rounded-xl border border-foreground/10 bg-muted/50 shadow-sm">
              <LockKeyhole className="size-4.5" aria-hidden="true" />
            </span>
            <h1 className="mt-6 text-3xl font-semibold tracking-[-0.035em] text-balance sm:text-4xl">
              Sign in to your workspace
            </h1>
            <p className="mt-3 max-w-md text-sm leading-6 text-pretty text-muted-foreground">
              Continue through your organization’s secure access policy. No
              separate {brand.name} password is required.
            </p>

            <Button
              asChild
              className="mt-8 h-11 w-full justify-between px-4"
              size="lg"
            >
              <a href="/admin">
                Continue with Cloudflare Access
                <ArrowRight aria-hidden="true" />
              </a>
            </Button>

            <div className="my-7 flex items-center gap-3 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
              <span className="h-px flex-1 bg-border" />
              Cloudflare Access
              <span className="h-px flex-1 bg-border" />
            </div>

            <ul className="space-y-3">
              {assurances.map((item) => (
                <li
                  key={item}
                  className="flex items-start gap-2.5 text-xs leading-5 text-muted-foreground"
                >
                  <span className="mt-0.5 flex size-4 shrink-0 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-700 dark:text-emerald-300">
                    <Check className="size-2.5" aria-hidden="true" />
                  </span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>

          <p className="text-xs leading-5 text-muted-foreground">
            Google and Microsoft connections stay optional and require the
            connected user’s authorization.
          </p>
        </section>
      </div>

      <PublicFooter className="mt-7 w-full max-w-4xl px-2" />
    </main>
  );
}
