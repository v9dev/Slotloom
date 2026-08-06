import { ArrowLeft, ExternalLink, ShieldCheck } from "lucide-react";
import { useEffect, type ReactNode } from "react";
import { brand, setPageTitle } from "@/brand";
import { BrandLogo } from "@/components/BrandLogo";
import { PublicFooter } from "@/components/PublicFooter";
import { Button } from "@/components/ui/button";

const effectiveDate = "August 6, 2026";
const googleUserDataPolicy =
  "https://developers.google.com/terms/api-services-user-data-policy";
const repositorySecurityPolicy =
  "https://github.com/v9dev/Slotloom/blob/main/SECURITY.md";

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

function PrivacyPolicy() {
  return (
    <>
      <p>
        This policy explains how a deployment of {brand.name} handles personal
        information. In this policy, “workspace operator” means the person or
        organization that deploys and administers the workspace. The workspace
        operator controls the information processed through that deployment.
        Slotloom is self-hosted, so the open-source contributors do not receive
        workspace data merely because the software is used.
      </p>

      <Section title="Information processed">
        <p>
          Meeting visitors provide a name, email address, selected time and
          timezone, and may provide a phone number, company, message, meeting
          title, feedback, or rescheduling choice. When a booking link enables
          it, a visitor can also suggest additional attendees by name and email
          address. The organizer reviews those suggestions before creating the
          meeting. The workspace also stores meeting status, organizer notes,
          joining details, email delivery records, and activity required to
          coordinate the request.
        </p>
        <p>
          For security and basic service analytics, the application can process
          device type, browser user agent, language, referring page, approximate
          city, region and country supplied by Cloudflare, page-view counts, and
          privacy-preserving rate-limit identifiers. It does not include
          advertising trackers in the default distribution.
        </p>
        <p>
          Workspace users provide a name and email address. The application
          stores their role, status, last-seen time, security and audit
          activity, and connected calendar or mailbox account details.
        </p>
      </Section>

      <Section title="Google and Microsoft account data">
        <p>
          Connecting an account is optional and requires the user’s explicit
          OAuth consent. The application stores the provider account identifier,
          email address, approved scopes, token expiry, encrypted access and
          refresh tokens, and identifiers for provider events created by
          Slotloom.
        </p>
        <p>
          Google Calendar and Microsoft Calendar access is used to create,
          update, or cancel Slotloom-managed events, invite the reviewed meeting
          attendee list, and obtain the Google Meet or Microsoft Teams joining
          link. The application does not scan unrelated calendar history to
          profile users.
        </p>
        <p>
          Gmail and Microsoft Mail access is limited to sending transactional
          booking messages selected by the workspace. Slotloom does not request
          permission to read inbox messages and does not read mailbox content.
        </p>
        <p>
          Slotloom’s use and transfer of information received from Google APIs
          to any other app adheres to the Google API Services User Data Policy,
          including its Limited Use requirements. Read the{" "}
          <a
            className="font-medium text-foreground underline underline-offset-4"
            href={googleUserDataPolicy}
            target="_blank"
            rel="noreferrer"
          >
            Google API Services User Data Policy
            <ExternalLink className="ml-1 inline size-3" />
          </a>
          .
        </p>
      </Section>

      <Section title="How information is used">
        <ul className="list-disc space-y-2 pl-5">
          <li>
            Publish availability and prevent conflicting meeting requests.
          </li>
          <li>Create, update, cancel, and communicate meeting arrangements.</li>
          <li>
            Send confirmations, reminders, follow-ups, and calendar invites.
          </li>
          <li>
            Authenticate workspace users and enforce workspace permissions.
          </li>
          <li>
            Protect forms, rate-limit abuse, troubleshoot failures, and keep
            audit records.
          </li>
          <li>Provide aggregate workspace usage and delivery information.</li>
        </ul>
        <p>
          Personal information is not sold, used for targeted advertising,
          provided to data brokers, or used to train generalized artificial
          intelligence models by the default Slotloom application.
        </p>
      </Section>

      <Section title="When information is shared">
        <p>
          Information is available to authorized members of the workspace and to
          meeting participants as needed. A calendar invitation can disclose
          attendee names or email addresses to the other people invited to that
          meeting. Information can also be processed by services selected by the
          workspace operator, including Cloudflare for hosting, storage, access
          control, bot protection, and optional email; Google for Calendar,
          Meet, and Gmail; and Microsoft for Calendar, Teams, and Outlook. Those
          services process information under their own terms and privacy
          policies.
        </p>
        <p>
          Information may also be disclosed when required by law, to protect
          users or the service, or during a business transfer where legally
          permitted. It is not otherwise shared for an unrelated purpose without
          appropriate notice and consent.
        </p>
      </Section>

      <Section title="Cookies and local storage">
        <p>
          Slotloom uses only functional storage in its default configuration. An
          OAuth connection uses a short-lived, secure state cookie. Cloudflare
          Access can set authentication cookies for protected workspace pages,
          Cloudflare Turnstile can process security signals when enabled, and
          the browser can remember a light or dark theme preference. Slotloom
          does not use advertising cookies.
        </p>
      </Section>

      <Section title="Retention and deletion">
        <p>
          The workspace operator selects a retention period for completed,
          cancelled, and missed meeting requests. The default is 365 days and
          supported values range from 30 days to 10 years. Expired management
          tokens and short-lived rate-limit records are removed separately.
          Active requests, workspace configuration, security records, and audit
          history can remain while needed to operate and protect the workspace.
        </p>
        <p>
          A workspace administrator can erase a visitor’s personal information
          from a request, including its additional attendee list, stored custom
          meeting title, feedback text, and related notifications. Anonymous
          status, rating, and timing records can be retained. A connected user
          can disconnect Google or Microsoft from My connected accounts, which
          removes local OAuth tokens and attempts provider revocation where
          supported. Users can also revoke Slotloom directly from their Google
          or Microsoft account security settings. Provider events already
          delivered to participant calendars may remain until separately
          removed.
        </p>
      </Section>

      <Section title="Security">
        <p>
          Slotloom uses HTTPS, role-based workspace access, authenticated OAuth
          flows, and encrypted storage for provider client secrets and OAuth
          tokens. Administrators are expected to protect the application with
          Cloudflare Access, restrict workspace membership, rotate credentials,
          and keep the deployment current. No security control can guarantee
          absolute protection.
        </p>
      </Section>

      <Section title="Your choices and rights">
        <p>
          You may decline optional fields or OAuth access, revoke a provider
          connection, and ask the workspace operator to provide, correct,
          export, or erase personal information. Legal rights vary by location.
          For a booking-related request, contact the organizer or workspace
          operator using the details in your Slotloom email or meeting
          invitation. Do not post personal information in a public GitHub issue.
        </p>
      </Section>

      <Section title="International processing and children">
        <p>
          Cloud services may process information outside your country. The
          workspace operator is responsible for selecting services and legal
          safeguards appropriate to its users. Slotloom is not directed to
          children under 13 or any higher minimum age required by local law.
        </p>
      </Section>

      <Section title="Changes and contact">
        <p>
          This policy may change when the application or its data practices
          change. The updated date will be shown above. Material changes to the
          use of connected Google or Microsoft data should be disclosed before
          that data is used for a new purpose.
        </p>
        <p>
          Contact the workspace operator for privacy or data requests. Report a
          vulnerability privately using the{" "}
          <a
            className="font-medium text-foreground underline underline-offset-4"
            href={repositorySecurityPolicy}
            target="_blank"
            rel="noreferrer"
          >
            Slotloom security policy
            <ExternalLink className="ml-1 inline size-3" />
          </a>
          .
        </p>
      </Section>
    </>
  );
}

function TermsOfService() {
  return (
    <>
      <p>
        These terms govern access to this deployment of {brand.name}. “Workspace
        operator” means the person or organization that deploys and administers
        the workspace. By using a booking page, management link, workspace, or
        connected integration, you agree to these terms and any additional terms
        presented by the workspace operator.
      </p>

      <Section title="The service">
        <p>
          Slotloom is open-source scheduling software used to publish
          availability, collect meeting requests, coordinate responses, create
          online meetings, and send related communications. A submitted time is
          not a confirmed meeting unless the application or organizer expressly
          confirms it.
        </p>
      </Section>

      <Section title="Eligibility and authority">
        <p>
          You must be legally able to agree to these terms. If you use a
          workspace for an organization, you represent that you are authorized
          to act for that organization. The service is not intended for children
          under 13 or any higher minimum age required by applicable law.
        </p>
      </Section>

      <Section title="Accounts and connected services">
        <p>
          Workspace access is personal to the authorized user. You are
          responsible for protecting your identity-provider account, reviewing
          workspace membership, and promptly revoking access that is no longer
          required.
        </p>
        <p>
          If you connect Google or Microsoft, you authorize Slotloom to use the
          approved permissions to identify your provider account, manage
          Slotloom-created calendar events, generate meeting links, and send
          transactional booking email. You can disconnect the account at any
          time. Google, Microsoft, Cloudflare, and other selected services are
          governed by their own terms, availability, and account requirements.
        </p>
      </Section>

      <Section title="Acceptable use">
        <p>You may not use the service to:</p>
        <ul className="list-disc space-y-2 pl-5">
          <li>
            Break the law, violate another person’s rights, or misrepresent your
            identity.
          </li>
          <li>
            Send spam, phishing, harassment, malware, or deceptive meeting
            invitations.
          </li>
          <li>
            Probe, bypass, or disrupt authentication, rate limits, Turnstile, or
            other safeguards.
          </li>
          <li>
            Access another person’s workspace, booking, calendar, mailbox, or
            personal information without permission.
          </li>
          <li>
            Use provider data for advertising, surveillance, data brokerage, or
            another undisclosed purpose.
          </li>
        </ul>
      </Section>

      <Section title="Content and meeting information">
        <p>
          You retain ownership of information you submit. You give the workspace
          operator and its selected processors permission to host, process,
          transmit, and display that information only as needed to operate the
          service, coordinate meetings, comply with law, and protect the
          service. You are responsible for having the rights and permissions
          required for attendee details and other content you provide.
        </p>
      </Section>

      <Section title="Availability and changes">
        <p>
          The service can depend on Cloudflare, Google, Microsoft, email
          systems, network providers, and organizer configuration. Meeting
          links, invitations, delivery, or availability are not guaranteed. The
          workspace operator may maintain, change, restrict, or discontinue its
          deployment and may suspend access to protect users or enforce these
          terms.
        </p>
      </Section>

      <Section title="Open-source software">
        <p>
          The Slotloom source code is licensed separately under the Apache
          License 2.0. That software license governs copying, modification, and
          distribution of the code. These service terms govern use of this
          deployed workspace and do not replace the open-source license.
        </p>
      </Section>

      <Section title="Disclaimers and liability">
        <p>
          To the maximum extent permitted by law, the service is provided “as
          is” and “as available,” without warranties of uninterrupted operation,
          fitness for a particular purpose, or error-free delivery. The
          workspace operator and Slotloom contributors are not liable for
          indirect, incidental, special, consequential, or lost-profit damages
          arising from use of the service. Rights that cannot legally be waived
          remain unaffected.
        </p>
      </Section>

      <Section title="Privacy, termination, and contact">
        <p>
          The Privacy Policy explains how the deployment handles personal
          information. You may stop using the service or revoke a connected
          provider at any time. The workspace operator may suspend or end access
          for misuse, security risk, legal requirements, or discontinuation.
        </p>
        <p>
          Contact the organizer or workspace operator using the contact details
          in your booking email or invitation for service, legal, or privacy
          questions. These terms may be updated as the service changes.
          Continued use after an updated version becomes effective constitutes
          acceptance where permitted by law.
        </p>
      </Section>
    </>
  );
}

export default function LegalPage({
  document,
}: {
  document: "privacy" | "terms";
}) {
  const privacy = document === "privacy";
  const title = privacy ? "Privacy policy" : "Terms of service";

  useEffect(() => setPageTitle(title), [title]);

  return (
    <main className="min-h-svh bg-muted/30 px-4 py-8 sm:px-6 sm:py-12">
      <div className="mx-auto max-w-3xl">
        <header className="mb-8 rounded-2xl border bg-background p-6 shadow-sm sm:p-8">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <BrandLogo className="max-w-44" />
            <Button asChild variant="outline" size="sm">
              <a href="/">
                <ArrowLeft />
                Home
              </a>
            </Button>
          </div>
          <div className="mt-10 max-w-2xl">
            <span className="mb-4 flex size-10 items-center justify-center rounded-xl bg-blue-500/10 text-blue-700 dark:text-blue-300">
              <ShieldCheck className="size-5" />
            </span>
            <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
              {title}
            </h1>
            <p className="mt-3 text-sm text-muted-foreground">
              Effective and last updated {effectiveDate}
            </p>
          </div>
        </header>

        <article className="space-y-10 rounded-2xl border bg-background p-6 shadow-sm sm:p-10">
          {privacy ? <PrivacyPolicy /> : <TermsOfService />}
        </article>

        <PublicFooter className="px-2 py-7" />
      </div>
    </main>
  );
}
