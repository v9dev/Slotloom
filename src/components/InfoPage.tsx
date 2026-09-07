import {
  Accessibility as AccessibilityIcon,
  ArrowLeft,
  Cookie,
  ExternalLink,
  LifeBuoy,
} from "lucide-react";
import { useEffect, type ReactNode } from "react";
import { brand, setPageTitle } from "@/brand";
import { BrandLogo } from "@/components/BrandLogo";
import { PublicFooter } from "@/components/PublicFooter";
import { PublicPageBackdrop } from "@/components/PublicPageBackdrop";
import { Button } from "@/components/ui/button";

export type InfoDocument = "cookies" | "accessibility" | "support";

const repositoryIssues = "https://github.com/v9dev/Slotloom/issues";
const repositorySecurityPolicy =
  "https://github.com/v9dev/Slotloom/blob/main/SECURITY.md";
const wcagStandard = "https://www.w3.org/TR/WCAG22/";

const documentDetails = {
  cookies: {
    title: "Cookie & storage notice",
    summary:
      "What the default Slotloom application stores in your browser and why.",
    updated: "September 7, 2026",
    icon: Cookie,
  },
  accessibility: {
    title: "Accessibility statement",
    summary:
      "How Slotloom supports accessible scheduling and where to report a barrier.",
    updated: "September 7, 2026",
    icon: AccessibilityIcon,
  },
  support: {
    title: "Help & support",
    summary:
      "The right place to get help with a booking, workspace, bug, or security concern.",
    updated: "September 7, 2026",
    icon: LifeBuoy,
  },
} as const;

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="scroll-mt-8 space-y-3">
      <h2 className="text-xl font-semibold tracking-tight">{title}</h2>
      <div className="space-y-3 text-sm leading-7 text-muted-foreground">
        {children}
      </div>
    </section>
  );
}

function ExternalTextLink({
  href,
  children,
}: {
  href: string;
  children: ReactNode;
}) {
  return (
    <a
      className="font-medium text-foreground underline underline-offset-4"
      href={href}
      target="_blank"
      rel="noreferrer"
    >
      {children}
      <ExternalLink className="ml-1 inline size-3" aria-hidden="true" />
    </a>
  );
}

function StorageItem({
  name,
  technology,
  duration,
  purpose,
}: {
  name: string;
  technology: string;
  duration: string;
  purpose: string;
}) {
  return (
    <div className="rounded-xl border bg-muted/20 p-4 sm:p-5">
      <h3 className="font-semibold text-foreground">{name}</h3>
      <p className="mt-1 text-sm leading-6 text-muted-foreground">{purpose}</p>
      <dl className="mt-4 grid gap-3 border-t pt-4 text-xs sm:grid-cols-2">
        <div>
          <dt className="font-medium text-muted-foreground">Technology</dt>
          <dd
            className="mt-1 break-words font-mono text-foreground"
            translate="no"
          >
            {technology}
          </dd>
        </div>
        <div>
          <dt className="font-medium text-muted-foreground">
            Typical duration
          </dt>
          <dd className="mt-1 text-foreground">{duration}</dd>
        </div>
      </dl>
    </div>
  );
}

function CookiePolicy() {
  return (
    <>
      <p>
        This notice describes cookies and similar browser storage used by the
        default {brand.name} application. Slotloom is self-hosted, so a
        workspace operator may configure additional services and must update
        this notice when its deployment uses different technologies.
      </p>

      <Section title="Storage used by the default application">
        <div className="grid gap-3">
          <StorageItem
            name="Theme preference"
            technology="Browser local storage"
            duration="Until changed or cleared"
            purpose="Remembers the light, dark, or system theme after you choose it."
          />
          <StorageItem
            name="Notice acknowledgement"
            technology="Browser local storage"
            duration="Until cleared or the notice changes"
            purpose="Remembers that you dismissed the cookie and storage notice."
          />
          <StorageItem
            name="Workspace sign-in fallback"
            technology="Browser session storage"
            duration="Until the browser tab or session closes"
            purpose="Keeps a local administrator signed in only when the workspace operator enables token-based fallback access."
          />
          <StorageItem
            name="Connected-account security"
            technology="Short-lived, HttpOnly first-party cookie"
            duration="10 minutes"
            purpose="Protects a Google or Microsoft connection attempt from request forgery, then is deleted after the callback."
          />
          <StorageItem
            name="Cloudflare access & protection"
            technology="Security cookies and browser signals"
            duration="Set by the operator’s Cloudflare configuration"
            purpose="Authenticates protected workspace pages and can distinguish legitimate visitors from automated abuse. Turnstile normally returns a one-time token and may set a clearance cookie when pre-clearance is enabled."
          />
        </div>
      </Section>

      <Section title="Advertising and analytics">
        <p>
          The default Slotloom application does not include advertising cookies,
          cross-site tracking, or third-party advertising pixels. It records
          limited server-side page-view and reliability information as described
          in the Privacy Policy without using it for targeted advertising.
        </p>
        <p>
          This notice is informational because the listed browser technologies
          support a feature you request, authentication, security, or your saved
          choices. If an operator adds non-essential analytics, advertising, or
          profiling technologies, they must provide any choices and obtain any
          consent required for that deployment.
        </p>
      </Section>

      <Section title="Your controls">
        <p>
          Use the theme control to change your appearance preference. You can
          also clear this site’s cookies and storage in your browser settings.
          Clearing authentication or security storage can sign you out, restart
          an account connection, or require another security check.
        </p>
      </Section>

      <Section title="Questions and changes">
        <p>
          Contact the workspace operator about the storage used by this
          deployment. This notice should be updated before the operator enables
          a new browser-storage purpose. Privacy rights and the information
          processed by Slotloom are explained in the{" "}
          <a
            className="font-medium text-foreground underline underline-offset-4"
            href="/privacy"
          >
            Privacy Policy
          </a>
          .
        </p>
      </Section>
    </>
  );
}

function AccessibilityStatement() {
  return (
    <>
      <p>
        Slotloom is intended to let visitors and workspace members schedule and
        manage meetings regardless of device, input method, or assistive
        technology. Each workspace operator is responsible for preserving that
        accessibility when changing branding, content, or integrations.
      </p>

      <Section title="Accessibility measures">
        <ul className="list-disc space-y-2 pl-5">
          <li>Semantic headings, landmarks, forms, buttons, and links.</li>
          <li>Keyboard operation and visible focus indicators.</li>
          <li>Responsive layouts that support zoom and narrow screens.</li>
          <li>Light and dark themes with system-preference support.</li>
          <li>Reduced-motion support and plain-language status messages.</li>
          <li>
            Labels and text alternatives for controls and meaningful images.
          </li>
        </ul>
      </Section>

      <Section title="Standard and conformance status">
        <p>
          The project uses the{" "}
          <ExternalTextLink href={wcagStandard}>
            Web Content Accessibility Guidelines 2.2
          </ExternalTextLink>{" "}
          Level AA as its design and engineering target. This statement is not a
          claim of full conformance, and this deployment has not completed an
          independent accessibility certification.
        </p>
      </Section>

      <Section title="Known limitations">
        <p>
          Third-party experiences such as Cloudflare security challenges,
          Google, Microsoft, and provider-hosted meeting pages are outside the
          application’s direct control. Workspace-provided logos, colors, and
          written content can also affect accessibility. The project continues
          to review complex administrative workflows and new features as they
          change.
        </p>
      </Section>

      <Section title="Report an accessibility barrier">
        <p>
          For a booking or workspace-specific barrier, contact the organizer or
          workspace operator using the details in your invitation or booking
          email. For a problem in the open-source interface, open a{" "}
          <ExternalTextLink href={repositoryIssues}>
            GitHub issue
          </ExternalTextLink>
          . Do not include personal booking information, access tokens, or
          confidential meeting details in a public issue.
        </p>
      </Section>
    </>
  );
}

function SupportGuide() {
  return (
    <>
      <p>
        Slotloom is self-hosted, so the person or organization operating this
        workspace is the first contact for account and booking help. Use the
        route below that matches your question.
      </p>

      <div className="grid gap-3 sm:grid-cols-2">
        {[
          {
            title: "Booking or rescheduling",
            text: "Contact the organizer using your booking email, calendar invitation, or management link.",
          },
          {
            title: "Workspace access",
            text: "Ask the workspace owner or administrator to review your membership and Cloudflare Access permission.",
          },
          {
            title: "Privacy request",
            text: "Contact the workspace operator to access, correct, export, or erase information held by this deployment.",
          },
          {
            title: "Integration problem",
            text: "A workspace administrator can review Google, Microsoft, email, and calendar configuration in Workspace settings.",
          },
        ].map((item) => (
          <section
            className="rounded-xl border bg-muted/20 p-5"
            key={item.title}
          >
            <h2 className="font-semibold text-foreground">{item.title}</h2>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              {item.text}
            </p>
          </section>
        ))}
      </div>

      <Section title="Product bugs and feature requests">
        <p>
          Use the project’s{" "}
          <ExternalTextLink href={repositoryIssues}>
            GitHub issue tracker
          </ExternalTextLink>{" "}
          for reproducible software problems and feature requests. Include the
          affected page, expected result, actual result, browser, and steps to
          reproduce. Remove names, email addresses, meeting links, tokens, and
          other private information first.
        </p>
      </Section>

      <Section title="Security concerns">
        <p>
          Do not report a vulnerability in a public issue. Follow the private
          reporting instructions in the{" "}
          <ExternalTextLink href={repositorySecurityPolicy}>
            Slotloom Security Policy
          </ExternalTextLink>
          .
        </p>
      </Section>
    </>
  );
}

export default function InfoPage({ document }: { document: InfoDocument }) {
  const details = documentDetails[document];
  const Icon = details.icon;

  useEffect(() => setPageTitle(details.title), [details.title]);

  return (
    <main
      id="main-content"
      tabIndex={-1}
      className="relative min-h-svh overflow-hidden bg-muted/30 px-4 py-8 sm:px-6 sm:py-12"
    >
      <PublicPageBackdrop />
      <div className="relative mx-auto max-w-3xl">
        <header className="mb-8 rounded-2xl border bg-background p-6 shadow-sm sm:p-8">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <a
              href="/"
              aria-label={`${brand.name} home`}
              className="rounded-lg focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
            >
              <BrandLogo className="max-w-44" />
            </a>
            <Button asChild variant="outline" className="min-h-11 px-4">
              <a href="/">
                <ArrowLeft aria-hidden="true" />
                Home
              </a>
            </Button>
          </div>
          <div className="mt-10 max-w-2xl">
            <span className="mb-4 flex size-11 items-center justify-center rounded-xl bg-brand-blue/10 text-brand-blue">
              <Icon className="size-5" aria-hidden="true" />
            </span>
            <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
              {details.title}
            </h1>
            <p className="mt-3 max-w-xl text-sm leading-6 text-muted-foreground">
              {details.summary}
            </p>
            <p className="mt-3 text-xs text-muted-foreground">
              Last updated {details.updated}
            </p>
          </div>
        </header>

        <article className="space-y-10 rounded-2xl border bg-background p-6 shadow-sm sm:p-10">
          {document === "cookies" ? (
            <CookiePolicy />
          ) : document === "accessibility" ? (
            <AccessibilityStatement />
          ) : (
            <SupportGuide />
          )}
        </article>

        <PublicFooter className="px-2 py-7" />
      </div>
    </main>
  );
}
