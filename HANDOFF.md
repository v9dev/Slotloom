# Slotloom deployment handoff

This document is a public deployment template. Never add live account IDs,
resource UUIDs, Worker or Pages URLs, custom domains, email addresses, Access
audiences, version IDs, tokens, or secret values here.

Keep production inventory in a private password manager or operations system.

## Architecture

- Cloudflare Pages serves the Vite frontend.
- A Cloudflare Worker serves the API.
- D1 stores application data.
- R2 stores brand assets.
- Gmail, Outlook, or optional Cloudflare Email Sending sends transactional messages.
- Cloudflare Access protects administrative routes.
- Turnstile protects the public booking form.
- Google Calendar and Microsoft Graph create provider-managed meetings.

GitHub Actions runs CI only. It does not deploy the Worker or Pages site.

## Local setup

```sh
pnpm install
cp .dev.vars.example .dev.vars
cp wrangler.example.jsonc wrangler.jsonc
pnpm dev:setup
pnpm db:migrate:local
pnpm dev
```

Both `.dev.vars` and `wrangler.jsonc` are ignored. Put local or production
values only in those ignored files or in Cloudflare.

## Cloudflare resources

Authenticate Wrangler and create resources in the intended Cloudflare account:

```sh
pnpm exec wrangler login
pnpm exec wrangler d1 create example-slotloom-db
pnpm exec wrangler r2 bucket create example-slotloom-assets
```

Copy the returned D1 identifier into the ignored `wrangler.jsonc`. Replace the
example Worker, database, and bucket names there with names for your account.
Do not copy the edited file back into `wrangler.example.jsonc`.

Apply migrations and deploy the Worker manually:

```sh
pnpm db:migrate:remote
pnpm deploy:api
```

## Worker configuration

Set these as plain Worker variables in Cloudflare. They are configuration, not
authentication secrets, but production values must still stay out of Git:

| Variable                | Example                                  | Purpose                                   |
| ----------------------- | ---------------------------------------- | ----------------------------------------- |
| `APP_URL`               | `https://app.example.com`                | Public frontend origin                    |
| `BOOTSTRAP_OWNER_EMAIL` | `owner@example.com`                      | First workspace owner                     |
| `FROM_EMAIL`            | `Slotloom <notifications@example.com>`   | Optional verified sender for Worker Email |
| `TEAM_DOMAIN`           | `https://your-team.cloudflareaccess.com` | Access team domain                        |
| `POLICY_AUD`            | `REPLACE_WITH_ACCESS_AUD`                | Access application audience               |
| `TURNSTILE_SITE_KEY`    | `REPLACE_WITH_TURNSTILE_SITE_KEY`        | Public widget key                         |

Store `TURNSTILE_SECRET` only as an encrypted Worker secret:

```sh
pnpm exec wrangler secret put TURNSTILE_SECRET
```

The Turnstile site key is intentionally public in the browser. The secret key
must never be committed or configured as a plain variable.

Calendar OAuth uses one additional Worker secret as the root encryption key.
Generate 32 random bytes, keep a recovery copy in a password manager, and enter
the base64 value into Wrangler's interactive prompt:

```sh
openssl rand -base64 32
pnpm exec wrangler secret put OAUTH_ENCRYPTION_KEY
```

Do not put this value in D1, Pages variables, `wrangler.jsonc`, or Git. Slotloom
uses it with JOSE compact JWE and AES-256-GCM to encrypt provider client secrets,
access tokens, refresh tokens, and temporary PKCE verifiers before D1 storage.
Losing or replacing the key makes existing encrypted provider data unreadable;
remove and reconnect the integrations if that happens.

## Cloudflare Access

Create a self-hosted Access application for the published admin hostname, such
as `app.example.com`. Use the public hostname, not the Worker URL and not a
private-network destination.

Add exact-email or identity-group Allow policies for administrators. A user
must be allowed by Cloudflare Access and also exist as an active member in
Slotloom. Copy the Access team domain and application audience into the Worker
variables described above.

## Turnstile

Create a managed widget and add every hostname that may render the booking
form, for example:

- `app.example.com`
- `example-slotloom.pages.dev` while the Pages hostname is still in use

Put the site key in the Worker variable and the secret key in the encrypted
Worker secret. Add a new custom hostname to the widget before moving traffic.

## Email Sending

Cloudflare Email Sending is optional. To make it available, verify a sender
domain, keep the `EMAIL` binding in the Worker configuration, and configure
`FROM_EMAIL` with an address permitted by that domain. Remove the `send_email`
block from a private Wrangler configuration when an installation will use only
OAuth mailboxes.

Each non-viewer connects a personal Google or Microsoft calendar from **My
connected accounts** in the workspace header. Gmail or Outlook sending is an
optional permission that the user enables separately. The owner selects **No
workspace fallback**, **Cloudflare Worker Email**, **Owner Gmail**, or **Owner
Outlook** in **Calendar and email**. Worker Email can also be the final fallback
after an owner OAuth fallback.

## Google OAuth

The callback URL is shown in **Workspace settings → Google and Microsoft
applications**. It uses `APP_URL`, so it is the Pages or custom app hostname,
not the Worker URL.

1. In Google Cloud, create or select a project and enable the Google Calendar
   API and Gmail API.
2. Configure the Google Auth Platform consent screen. Choose an External audience
   if Google accounts outside one Workspace organization should connect. While
   the app is in testing, add each permitted account as a test user.
3. Create an OAuth client with application type **Web application**.
4. Add the exact Slotloom Google callback URL as an authorized redirect URI.
5. Copy the client ID and client secret into **Workspace settings → Google** in
   Slotloom, then save.
6. Each owner, admin, or member opens **My connected accounts**, selects
   **Connect Google Calendar**, and approves identity and owned-calendar event
   access.
7. A user who wants Slotloom transactional email from Gmail selects **Enable
   Gmail** and approves the narrow `gmail.send` scope. Calendar meeting
   invitations do not require this optional mail permission.

Slotloom requests offline access so it can refresh tokens without asking the
organizer to sign in for every meeting. It creates a Google Calendar event with
Google Meet conference data and sends attendee updates from Google. For an
External app in Testing status, Google may expire refresh tokens for these
calendar scopes after seven days. Publish and complete any required verification
before relying on the integration in production. Google classifies
`gmail.send` as a sensitive scope, so a public OAuth application may require
additional verification. Existing calendar connections continue working and
reauthorize only when Gmail sending is enabled.

## Microsoft OAuth

1. In Microsoft Entra admin center, open **App registrations** and create an app.
2. To allow accounts from other organizations and personal Microsoft accounts,
   choose the corresponding multi-tenant supported-account option and use
   `common` as the Slotloom tenant value. For one organization only, use its
   Directory (tenant) ID instead.
3. Add a **Web** redirect URI using the exact Microsoft callback URL copied from
   **Workspace settings → Google and Microsoft applications**.
4. Under API permissions, add delegated Microsoft Graph permissions
   `User.Read`, `Calendars.ReadWrite`, and `Mail.Send`. The authorization request
   also includes `openid`, `profile`, `email`, and `offline_access`.
5. Create a client secret and immediately copy its **Value**, not its Secret ID,
   into **Workspace settings → Microsoft** with the application client ID and
   tenant value.
6. Each owner, admin, or member opens **My connected accounts**, selects
   **Connect Microsoft Calendar**, and consents to identity and calendar access.
7. A user who wants Slotloom transactional email from Outlook selects **Enable
   Outlook**. Slotloom then requests `Mail.Send`; it does not request mailbox
   read access.

Existing Microsoft calendar connections continue working and reauthorize only
when Outlook sending is enabled.

Account authorization and Teams meeting availability are separate. An account
can complete OAuth but still be unable to create a Teams meeting if its tenant,
calendar, policy, or license does not support Teams online meetings.

## Organizer selection and meeting lifecycle

- The workspace default is only the initial suggestion. The response handler
  chooses Google Meet, Microsoft Teams, or a manual HTTPS link in **Create
  meeting**.
- Owners and admins can choose any active organizer. A member can create or
  claim an unassigned meeting only for themselves and cannot take a response
  assigned to someone else.
- Slotloom first uses the selected organizer's active provider connection. If
  that person is not connected and the owner enabled calendar fallback, it uses
  an active owner connection and shows that fallback before creation.
- The organizer reviews the meeting title, final time, and attendee list before
  creation. Booking links can optionally let visitors suggest a title and up to
  nine additional attendees.
- Google or Microsoft sends the single provider-managed invitation. Slotloom
  does not send a second confirmation for that event, and every reviewed
  attendee is included.
- Time changes update the same provider event. Cancellation removes that event.
- Google or Microsoft sends the native calendar invitation, so Slotloom does not
  attach a duplicate ICS file for provider-managed meetings. Manual links retain
  Slotloom's ICS attachment.

## Transactional email routing

- Availability receipts, reminders, follow-ups, and manual meeting details first
  use the assigned organizer's personal mailbox. A user can choose Google,
  Microsoft, or Automatic; Automatic uses the only connected mail-capable
  account when there is exactly one.
- If the organizer has no usable personal mailbox, Slotloom uses the workspace
  fallback selected by the owner. That fallback can be disabled, use Worker
  Email, or use an owner Google or Microsoft connection.
- Worker Email is used directly as the workspace fallback, or after an owner
  OAuth fallback fails only when the owner enabled that final fallback.
- Provider meeting invitations, reschedules, and cancellations remain owned by
  Google Calendar or Microsoft Graph to prevent duplicate messages.
- Additional attendees receive meeting details but never receive the primary
  visitor's private self-service management token.
- Delivery history records each recipient, transport, and sender address. Provider secrets
  and tokens remain encrypted with the Worker-held JOSE root key.
- Disconnecting an account removes its encrypted tokens from D1. Existing remote
  calendar events remain until cancelled at the provider.

## Booking date and availability behavior

- A link's **valid from** and **valid until** dates are the exact scheduling
  range. The legacy `days_ahead` database field is used only for older links
  that do not have an end date.
- New links default to no minimum notice, so today is shown whenever a complete
  meeting still fits in an available window. Owners can add advance notice when
  needed.
- Past times, occupied times, and dates without any open slots are omitted from
  public and rescheduling pages. The Worker rechecks availability during
  submission to protect against simultaneous bookings.

Provider client IDs and tenant IDs are non-secret and are visible in the owner
UI. Provider client secrets are write-only. No Google or Microsoft credentials
belong in Worker or Pages variables.

Before changing the Pages/custom app domain, update `APP_URL` and add the two
new callback URLs to Google and Microsoft. Keep the old callbacks during the DNS
transition, then remove them after traffic has moved.

## Pages deployment

Connect the Pages project to the repository through the Cloudflare dashboard:

- Production branch: `main`
- Build command: `pnpm build`
- Output directory: `dist`
- Required variable: `BACKEND_URL=https://example-slotloom-api.example-account.workers.dev`

Deploy Pages from the Cloudflare UI. Do not add a Pages deployment step to
GitHub Actions.

## Public repository safety

Run the same guard used by CI before committing:

```sh
pnpm check:public
node scripts/check-public-repo.mjs --history
```

Commit only example values. In particular, never commit:

- Cloudflare account IDs, D1 UUIDs, deployment IDs, or live resource names
- live Worker, Pages, Access, or custom-domain URLs
- real owner, sender, member, or administrator email addresses
- Access audiences, API tokens, Turnstile secrets, or other credentials
- OAuth encryption keys, provider client secrets, access tokens, or refresh tokens
- output from `wrangler whoami`, deploy, resource-list, or secret-list commands

If a credential is ever committed, removing the text is not enough. Rotate it,
rewrite the reachable Git history, remove cached CI artifacts where possible,
and ask the Git host to purge sensitive cached objects.
