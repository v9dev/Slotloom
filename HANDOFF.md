# Slotloom project handoff

This document is the complete continuation context for moving Slotloom to another machine, publishing it to GitHub, and completing its Cloudflare production setup. It contains no secrets.

## Product definition

Slotloom is an open-source, white-label meeting availability and follow-up platform. An organizer creates a public scheduling link with a date range, timezone, weekly availability, slot duration, interval, notice period and buffers. A visitor opens `/book/:slug`, enters a name and email, and selects one available slot. Booked slots are unavailable to later visitors.

A submitted slot is a **response**, not yet a confirmed meeting. The workspace team reviews responses, assigns owners, adds a meeting URL, sends confirmation or follow-up email, and tracks the result as confirmed, completed, missed, cancelled or rescheduling. Visitors receive secure management links for permitted self-service actions and feedback.

This is intentionally lighter than a full calendar platform. Automatic Google or Microsoft calendar event creation is not implemented yet.

## Deployment and tenancy model

The current release is one isolated workspace per deployment:

- one Pages frontend
- one Worker API
- one D1 database
- one R2 brand-assets bucket
- one Durable Object namespace
- one Access-protected admin workspace

This model is fully white-label and is appropriate for separate organizations or self-hosters. It is **not yet a shared multi-tenant SaaS database**. Before unrelated customers share one deployment, add a workspace/tenant ID to users, settings, links, bookings, notifications, templates, activity, assets and every database query, plus hostname-to-workspace resolution and tenant-isolation tests.

## Implemented application flows

### Public booking

- Route: `/book/:slug`
- Responsive name, email and optional phone collection
- Browser timezone auto-detection with manual timezone selection
- Link validity date range
- Weekly availability and generated slots
- Minimum notice, meeting duration, interval and buffer controls
- Server-side availability validation
- Double-booking prevention using D1 constraints/transactions
- Booked slots displayed as unavailable
- Optional Turnstile verification
- Device type, language, referrer and Cloudflare location context
- Confirmation screen and acknowledgement email

### Response and meeting workflow

- Responses table with search, status filters and pagination
- Link-to-response and response-to-link navigation
- Assignment to owner/admin/member
- Internal notes, meeting URL and meeting notes
- Workflow states: `new`, `under_review`, `awaiting_visitor`, `confirmed`, `completed`, `missed`, `cancelled`, `rescheduling`
- Manual confirmation and status email actions
- Secure visitor management token
- Rescheduling tied to the original visitor and booking
- `.ics` calendar attachment for confirmed meeting details
- Feedback rating and message after a meeting

### Scheduling links

- Create, edit, copy, archive, restore and permanently delete
- Automatically generated editable slug
- Draft, active, paused and archived states
- Independent date range, timezone and weekly availability
- Independent duration, interval, buffers, notice and days-ahead settings
- Analytics and response counts
- Destructive actions use explicit confirmation and semantic danger styling

### Dashboard and operations

- Overview metrics and recent data
- Filtered/paginated response, link and activity views
- Notification center with unread state and view-all navigation
- Hibernating WebSocket real-time notification delivery
- Persistent notification history in D1
- Team users with owner, admin, member and viewer roles
- User status, activity and audit records
- Data retention setting and scheduled cleanup Worker cron

### Email

- Cloudflare Email Sending binding
- Organizer email used as `Reply-To`
- Editable templates stored in D1
- React Email preview in light and dark modes
- Templates for availability received, meeting details, rescheduled confirmation, reminder, missed, reschedule and cancellation
- Meeting titles only where the meeting identity is required
- Brand logo, name and primary/accent colors in rendered email
- Calendar attachment for applicable confirmed-meeting messages
- Delivery events logged in D1

Local Email Sending may not deliver; use a deployed Worker and verified sender to test real delivery.

### White labeling

Owners configure branding under **Settings → Workspace branding**:

- application name
- tagline
- logo for light backgrounds
- logo for dark backgrounds
- independent square favicon
- primary brand color
- accent color
- direct uploads up to 2 MB or HTTPS asset URLs

Brand configuration is loaded at runtime from `/api/public/brand`, so Pages does not need rebuilding after a brand change. Uploaded assets are stored in R2 and served through `/api/public/brand-assets/*`. Branding is used by login, dashboard navigation, public booking, browser title/favicon, charts, emails and calendar identity.

## Technology and repository map

- React, TypeScript, Vite: frontend
- Tailwind CSS v4 and shadcn/ui: interface
- React Email: email rendering and previews
- Cloudflare Pages: frontend and same-origin API proxy
- Cloudflare Worker: API and scheduled cleanup
- D1: relational application data
- R2: uploaded brand images
- Durable Object: hibernating WebSocket notification hub
- Cloudflare Access: production admin authentication
- Cloudflare Email Sending: outgoing mail
- Turnstile: optional public abuse protection
- Vitest: unit tests

Important paths:

```text
src/components/                 React pages and UI
src/components/admin/           Dashboard feature modules
src/components/ui/              shadcn/ui components
src/emails/                     React Email component and presentation copy
src/api.ts                      Browser API client
src/brand.ts                    Runtime brand state and CSS variables
worker/index.ts                 Worker router and admin API
worker/public-routes.ts         Booking and visitor-management routes
worker/domain.ts                Domain, auth, email and shared Worker logic
worker/brand-assets.ts          R2 upload and public asset delivery
worker/notification-hub.ts      Durable Object WebSocket hub
functions/api/[[path]].ts       Pages-to-Worker same-origin proxy
migrations/                     D1 migrations 0001 through 0020
wrangler.jsonc                  Worker resources and deployment config
wrangler.pages.jsonc            Pages deployment config
```

The structure check enforces a hard 1,000-line maximum. `worker/index.ts` is currently at the limit and should be the first module refactored before adding routes.

## Authentication model

### Local

Local development uses a private bearer token only when:

```env
ALLOW_ADMIN_TOKEN=true
ADMIN_TOKEN=REPLACE_WITH_SECRET
BOOTSTRAP_OWNER_EMAIL=local-development
TEAM_DOMAIN=
POLICY_AUD=
```

The frontend stores the token in session storage and sends it as `Authorization: Bearer ...`. The first authenticated local identity bootstraps the owner matching `BOOTSTRAP_OWNER_EMAIL`.

### Production

Cloudflare Access protects `/admin*` and `/api/admin/*`. Access sends `Cf-Access-Jwt-Assertion`. The Worker independently verifies its signature, issuer, expiry and audience using:

```env
TEAM_DOMAIN=https://your-team.cloudflareaccess.com
POLICY_AUD=REPLACE_WITH_SECRET
BOOTSTRAP_OWNER_EMAIL=owner@your-domain.com
ALLOW_ADMIN_TOKEN=false
```

`TEAM_DOMAIN` is the Cloudflare Zero Trust organization domain, not the Pages domain, email domain or Worker URL. The Worker loads signing keys from `${TEAM_DOMAIN}/cdn-cgi/access/certs`. The first real Access login email must exactly match `BOOTSTRAP_OWNER_EMAIL`; later users are managed in the team UI.

Never configure `ADMIN_TOKEN` as a production authentication path.

## Environment files

- `.dev.vars`: real local Worker values; ignored by Git
- `.dev.vars.example`: safe local Worker template; committed
- `.env`: optional real Vite build fallbacks; ignored by Git
- `.env.example`: safe Vite template; committed
- Pages `BACKEND_URL`: configure in the Pages dashboard, not in `.env`
- Production Worker variables/secrets: configure in the Worker dashboard or with Wrangler secrets

Run `pnpm dev:setup` to add missing keys from `.dev.vars.example` while preserving existing values. Always replace the example admin token.

Worker variables:

| Name | Purpose |
|---|---|
| `APP_NAME` | Fallback name before runtime branding loads |
| `ORGANIZER_EMAIL` | Fallback organizer and reply address |
| `FROM_EMAIL` | Verified Cloudflare sender identity |
| `APP_URL` | Final public Pages origin used in links and email assets |
| `TIME_ZONE` | Fallback IANA timezone |
| `TEAM_DOMAIN` | Access organization URL |
| `POLICY_AUD` | Access application audience |
| `BOOTSTRAP_OWNER_EMAIL` | First production owner identity |
| `ALLOW_ADMIN_TOKEN` | Local-token switch; production must be `false` |
| `ADMIN_TOKEN` | Local-only bearer token |
| `TURNSTILE_SITE_KEY` | Public Turnstile site key; configure with the secret or omit both |
| `TURNSTILE_SECRET` | Encrypted Turnstile secret |

Scheduling horizon, weekdays and time windows are configured per booking link in
**Admin → Links** and persisted in D1. They are not Worker environment variables.

Pages variables:

| Name | Purpose |
|---|---|
| `BACKEND_URL` | Deployed Worker origin without a trailing slash |
| `PNPM_VERSION` | Pages build-tool version; set to `10.28.0` |
| `VITE_APP_NAME` | Build-time fallback name |
| `VITE_BRAND_LOGO` | Build-time light logo |
| `VITE_BRAND_LOGO_DARK` | Build-time dark logo |
| `VITE_BRAND_FAVICON` | Build-time favicon |

The committed `.node-version` pins both local and Pages builds to Node.js
`22.22.2`. Pages previews should not use the production `BACKEND_URL` unless it is
acceptable for preview traffic to read and mutate production D1 data.

## Start on a different machine

Prerequisites: Git, Node.js 22+, pnpm 10 and Wrangler/Cloudflare access.

```sh
git clone YOUR_GITHUB_REPOSITORY_URL
cd slotloom
pnpm install
cp .dev.vars.example .dev.vars
pnpm dev:setup
```

Edit `.dev.vars` and replace `ADMIN_TOKEN`. Do not commit it. Then:

```sh
pnpm db:migrate:local
pnpm dev
```

Open `http://localhost:5173/admin` and enter the local token. `pnpm dev` starts both Vite (`5173`) and Wrangler (`8787`). If either port is occupied, stop the old process; strict ports prevent link-origin mismatches.

Before starting feature work, run:

```sh
pnpm typecheck
pnpm test
pnpm build
pnpm exec wrangler deploy --dry-run
```

## First production provisioning

The Wrangler provisioning steps below were completed on 2026-08-05 in Cloudflare
account `00000000000000000000000000000000`:

- Worker: `example-slotloom-api`
- Worker origin: `https://example-slotloom-api.thedevimapro.workers.dev`
- deployed version: `00000000-0000-0000-0000-000000000000`
- D1: `example-slotloom-db` (`00000000-0000-0000-0000-000000000000`, APAC)
- remote D1 migrations: all migrations through `0020_complete_white_label.sql`
- R2: `example-slotloom-assets` (Standard storage)
- Durable Object: SQLite-backed `NotificationHub`
- cron: `17 2 * * *`
- live smoke test: `GET /api/public/brand` returned HTTP 200
- production booking links: none yet; create them through **Admin → Links** after
  Pages and Access are configured

The create commands are retained as recovery/reference steps; do not rerun them
for this account because the named resources already exist.

1. Log into the Cloudflare account that will own compute:

   ```sh
   pnpm exec wrangler login
   ```

2. Create D1:

   ```sh
   pnpm exec wrangler d1 create example-slotloom-db
   ```

3. Replace `REPLACE_WITH_D1_DATABASE_ID` in `wrangler.jsonc` with the returned ID.

4. Create the brand asset bucket:

   ```sh
   pnpm exec wrangler r2 bucket create example-slotloom-assets
   ```

5. Apply all migrations:

   ```sh
   pnpm db:migrate:remote
   ```

6. Deploy the Worker:

   ```sh
   pnpm deploy:api
   ```

   This also creates the SQLite-backed `NotificationHub` Durable Object namespace declared in `wrangler.jsonc`.

7. In **Workers & Pages → example-slotloom-api → Settings → Variables and Secrets**,
   configure these production values:

   | Worker name | Value to enter | Where it comes from |
   |---|---|---|
   | `APP_NAME` | `Slotloom` | chosen application fallback name |
   | `ORGANIZER_EMAIL` | real organizer email | chosen scheduling owner/reply-to address |
   | `FROM_EMAIL` | for example `Meetings <meetings@your-domain.com>` | sender on a domain onboarded in Email Service |
   | `APP_URL` | final `https://app.example.com` Pages origin, no trailing slash | Pages project after its first UI deployment/custom-domain attachment |
   | `TIME_ZONE` | for example `Asia/Kolkata` | chosen IANA timezone |
   | `TEAM_DOMAIN` | `https://<team>.app.example.com` | Zero Trust team domain |
   | `POLICY_AUD` | Access application AUD tag | Access self-hosted application details |
   | `BOOTSTRAP_OWNER_EMAIL` | exact owner login email | email allowed by the Access policy |
   | `ALLOW_ADMIN_TOKEN` | `false` | fixed production safety setting |
   | `TURNSTILE_SITE_KEY` | widget site key | optional Turnstile widget details |

   Add `TURNSTILE_SECRET` as an **encrypted secret**, not plain text, using the
   secret from the same optional Turnstile widget. Configure both Turnstile keys
   together or omit both. Never create production `ADMIN_TOKEN`.

8. Onboard and verify the `FROM_EMAIL` sender/domain for Cloudflare Email Sending.

9. Create a Pages project connected to the GitHub repository:

   - repository: `v9dev/Slotloom`
   - production branch: `main`
   - root directory: `/`
   - build command: `pnpm build`
   - output directory: `dist`
   - build image: v3
   - production `BACKEND_URL`: `https://example-slotloom-api.thedevimapro.workers.dev`
   - production and preview `PNPM_VERSION`: `10.28.0`
   - production and preview `VITE_APP_NAME`: `Slotloom`

   `.node-version` supplies Node.js `22.22.2`. The three `VITE_BRAND_*`
   variables are optional because the repository includes fallback assets. Leave
   preview `BACKEND_URL` unset until a separate preview Worker exists, unless
   previews are intentionally allowed to use production data.

10. Attach the frontend domain to Pages and set Worker `APP_URL` to that final HTTPS origin.

11. After the Pages custom domain is active, configure Cloudflare Access:

    - open **Zero Trust → Access controls → Applications**
    - create a **Self-hosted and private** application
    - add the custom hostname with `/admin*` and again with `/api/admin/*`
    - add an Allow policy containing only trusted administrator identities
    - create the app, then open **Configure → Additional settings** and copy the
      **Application Audience (AUD) Tag** into Worker `POLICY_AUD`
    - open **Zero Trust → Settings**, copy the team domain, prefix it with
      `https://`, and store it as Worker `TEAM_DOMAIN`

    `POLICY_AUD` and `TEAM_DOMAIN` are plain variables. The AUD is unique to this
    Access application and changes only if the application is deleted/recreated.

12. Sign in once using the exact `BOOTSTRAP_OWNER_EMAIL`, verify the owner record, then add other team users from the dashboard.

13. Optionally enable Turnstile entirely through the Cloudflare dashboard:

    - open **Turnstile → Add widget**
    - widget name: `Slotloom booking form`
    - mode: **Managed**
    - production hostname: final Pages custom hostname, without scheme or path
    - optionally add the production `app.example.com` hostname
    - add `localhost` and `127.0.0.1` only for local real-widget testing
    - leave pre-clearance disabled
    - copy the generated site key into plain Worker variable
      `TURNSTILE_SITE_KEY`
    - copy the generated secret into encrypted Worker secret
      `TURNSTILE_SECRET`

    Never put either Turnstile value in Pages or Git. Configure both Worker values
    together or omit both. The Worker rejects partial configuration, calls
    Siteverify server-side, and validates the hostname against `APP_URL` plus the
    action `booking-submit`.

For two Cloudflare accounts, keep Pages, Worker, D1, R2, Durable Objects and Access together in the compute account when possible. DNS can remain managed in the domain account, but custom-domain attachment and cross-account proxying must be validated before launch. The stable fallback is the Pages-provided domain for the frontend and the Worker `app.example.com` origin behind the Pages proxy.

## GitHub CI and Cloudflare dashboard deployment

No remote is configured by this document. Before pushing, verify `.dev.vars`, `.env`, `.wrangler`, `dist` and `node_modules` remain ignored.

Suggested commands:

```sh
git status
git remote add origin YOUR_GITHUB_REPOSITORY_URL
git push -u origin main
```

The repository includes GitHub Actions CI, Dependabot configuration, a pull-request template, Apache 2.0 license, contribution instructions and a security policy. GitHub Actions only validates the project; its Wrangler command uses `--dry-run`, has no Cloudflare credentials and does not deploy.

Production deployment is deliberately split:

- connect only Pages to `main` through the Cloudflare dashboard Git integration
- deploy the Worker manually with `pnpm db:migrate:remote` followed by
  `pnpm deploy:api`
- do not enable Workers Builds and do not deploy Pages with Wrangler
- configure production values in Cloudflare; `keep_vars: true` prevents Wrangler
  from deleting dashboard Worker variables during later CLI deployments

## D1 migration policy

- Never edit an already deployed migration.
- Add the next numbered migration after `0020_complete_white_label.sql`.
- Apply locally first, test, then apply remotely before deploying code that depends on it.
- Back up important production data before destructive schema changes.

## Verified state at handoff

The following passed immediately before this handoff:

- structure/file-size check
- TypeScript project build
- 7 Vitest tests
- Vite production build
- Wrangler deployment dry-run with D1, R2, Email and Durable Object bindings
- local D1 migrations through `0020`
- local Worker startup
- Vite same-origin API proxy
- runtime public branding endpoint
- local-token owner authentication

The real `.dev.vars` exists locally and is ignored. It is not part of Git and will not move to the new machine.

## Production work that is genuinely still required

These are external configuration or future product tasks, not hidden completed features:

1. Configure production Worker variables and secrets.
2. Verify the Email Sending domain and perform real delivery tests.
3. Create Pages from `v9dev/Slotloom` using the Cloudflare dashboard Git integration.
4. Configure the final frontend domain and Worker `APP_URL`.
5. Configure and test Cloudflare Access with the real owner email.
6. Optionally configure Turnstile and test production verification.
7. Run final booking, management-link, email, branding-upload and Access smoke tests.
8. Add end-to-end browser tests and broader Worker integration tests; current automated coverage is intentionally small.
9. Refactor `worker/index.ts` before adding more routes because it is at the line limit.
10. Build tenant isolation before offering a shared multi-client SaaS instance.
11. Build Google Calendar/Microsoft Graph OAuth only if automatic event creation becomes a product requirement.

Do not mark production ready until items 1 through 5 and the production smoke tests
in item 7 have been completed on the final domain.
