# Slotloom

**Scheduling, without the overhead.**

Slotloom is an open-source, white-label availability and meeting follow-up platform built for Cloudflare. Create booking links, collect responses, review selected slots, send meeting details, handle rescheduling, and track outcomes without adopting a full calendar platform.

## What Slotloom includes

- Responsive public slot-booking flow
- Multiple booking links with independent schedules and validity dates
- Clear booked-slot states and double-booking protection
- Role-based workspace for owners, admins, members, and viewers
- Searchable, filtered, paginated response and activity tables
- Editable React Email templates with light and dark previews
- Manual meeting-link workflow with `.ics` calendar invitations
- Secure visitor cancellation, rescheduling, and feedback links
- Real-time dashboard notifications using hibernating WebSockets
- D1 audit history, retention controls, and privacy-safe deletion
- UI-managed white-label name, tagline, light/dark logos, favicon, colors, and email identity
- Cloudflare Access authentication and optional Turnstile protection

## Architecture

```text
Browser
  │
  ├── Cloudflare Pages: React application and same-origin API proxy
  │
  └── Cloudflare Worker: API, permissions, scheduling and email
          ├── D1: application data and notification history
          ├── R2: uploaded workspace logos and favicons
          ├── Durable Object: live notification connections
          └── Email Sending: confirmations and follow-ups
```

KV, Queues, Firebase, and a traditional server are not required. R2 is used only for logo and favicon uploads; externally hosted asset URLs can be used instead.

## Technology

- React, TypeScript and Vite
- Tailwind CSS v4 and shadcn/ui
- React Email
- Cloudflare Pages, Workers, D1 and Durable Objects
- Cloudflare Email Sending, Access and optional Turnstile
- Vitest

## Local development

Requirements: Node.js 22 or newer, pnpm 10, and a Cloudflare account for remote services.

```sh
pnpm install
cp .dev.vars.example .dev.vars
pnpm db:migrate:local
```

Prepare `.dev.vars`, replace its generated `ADMIN_TOKEN` with a private value, then start both the Worker and Vite:

```sh
pnpm dev:setup
pnpm dev
```

`pnpm dev` starts both services. Vite runs on `http://localhost:5173` and proxies `/api` plus notification WebSockets to the local Worker on port `8787`. Running Vite alone makes the UI appear but leaves API calls unavailable.

If startup says port `5173` or `8787` is already in use, stop the older development process before retrying. Slotloom intentionally does not move to another port because `APP_URL` and email links must match the frontend origin.

Open `http://localhost:5173/admin`. Create the first booking link from the dashboard.

Local email delivery may fail without a remote Email Sending binding. Responses remain stored and delivery attempts remain logged.

## Configuration reference

### Worker variables

Set these under **Workers & Pages → example-slotloom-api → Settings → Variables and Secrets**.

| Variable | Meaning |
|---|---|
| `APP_NAME` | Safe fallback name used before workspace branding is saved. |
| `ORGANIZER_EMAIL` | Fallback reply-to address when a response has no assigned owner or link creator. |
| `FROM_EMAIL` | Verified sender, for example `Meetings <meetings@your-domain.com>`. |
| `APP_URL` | Public Pages URL, used for secure management links, images and email actions. |
| `TIME_ZONE` | Fallback IANA timezone such as `UTC`, `Asia/Kolkata`, or `America/New_York`. |
| `TEAM_DOMAIN` | Your Cloudflare Access organization URL, such as `https://your-team.cloudflareaccess.com`. This is not your website domain. The Worker uses it to download Access signing keys and validate who signed in. |
| `POLICY_AUD` | The Audience tag from the Cloudflare Access application. It binds accepted login tokens to this specific protected application. |
| `BOOTSTRAP_OWNER_EMAIL` | Email allowed to become the first workspace owner. It must exactly match the authenticated Access email. |
| `ALLOW_ADMIN_TOKEN` | Local fallback switch. Keep `false` in production. |
| `TURNSTILE_SITE_KEY` | Public Turnstile widget key. Configure it together with `TURNSTILE_SECRET`, or leave both absent. |

Secret:

| Secret | Meaning |
|---|---|
| `TURNSTILE_SECRET` | Private Turnstile verification key. Store as an encrypted Worker secret, never in Git. |

`ADMIN_TOKEN` is only for local development and must not be configured in production.

Scheduling horizon, weekdays and time windows are not Worker environment
variables. Manage them under **Admin → Links**; each booking link stores its own
availability rules in D1.

### Pages variables

Set these in the Pages project for both production and previews where appropriate.

| Variable | Meaning |
|---|---|
| `BACKEND_URL` | Deployed Worker origin, such as `https://example-slotloom-api.account.workers.dev`. |
| `PNPM_VERSION` | Pages build-tool version. Use `10.28.0` to match this repository. |
| `VITE_APP_NAME` | Build-time fallback name shown before runtime branding loads. |
| `VITE_BRAND_LOGO` | Build-time fallback logo for light backgrounds. |
| `VITE_BRAND_LOGO_DARK` | Build-time fallback logo for dark backgrounds. |
| `VITE_BRAND_FAVICON` | Build-time fallback favicon. |

The committed `.node-version` pins Pages builds to Node.js `22.22.2`. Do not point
preview deployments at the production Worker unless preview traffic is allowed to
read and change production data; use a separate preview Worker or leave preview
`BACKEND_URL` unset.

Branding can subsequently be changed by an owner from **Settings → Workspace branding** without rebuilding the frontend.

## First Cloudflare deployment

Authenticate Wrangler in the account that will own the Worker:

```sh
pnpm exec wrangler login
pnpm exec wrangler d1 create example-slotloom-db
```

Wrangler returns a D1 database ID. Put that non-secret ID in `wrangler.jsonc`, then run:

```sh
pnpm db:migrate:remote
pnpm deploy:api
```

The first Worker deployment creates the SQLite-backed `NotificationHub` Durable Object namespace declared in `wrangler.jsonc`.

Next:

1. Onboard the `FROM_EMAIL` domain in Cloudflare Email Sending.
2. Configure Worker variables and the optional Turnstile secret.
3. Create a Pages project from this GitHub repository.
4. Use `pnpm build` as the build command and `dist` as the output directory.
5. Set `BACKEND_URL` to the Worker origin.
6. Attach the public domain to Pages.
7. Set Worker `APP_URL` to that final public domain.
8. Protect `/admin*` and `/api/admin/*` with Cloudflare Access.

## Deployment ownership

GitHub Actions is CI-only. It runs the quality checks below, including a
Wrangler dry-run, without Cloudflare credentials and does not deploy anything.

Use these two separate production paths:

- Deploy `example-slotloom-api` manually with Wrangler after applying D1 migrations.
- Connect only the Pages project to the GitHub repository in the Cloudflare
  dashboard so Pages deploys the frontend from `main`.

Worker deployment commands:

```sh
pnpm db:migrate:remote
pnpm deploy:api
```

Do not enable Workers Builds for this deployment model and do not use Wrangler to
deploy Pages. The Wrangler file uses `keep_vars: true`, so instance-specific
Worker variables configured in the Cloudflare dashboard are preserved during
manual CLI deployments. Encrypted secrets are also preserved.

## Cloudflare Access setup

After attaching a Cloudflare-managed custom domain to Pages:

1. Go to **Zero Trust → Access controls → Applications**.
2. Create a **Self-hosted and private** application.
3. Add the public hostname twice, using paths `/admin*` and `/api/admin/*`.
4. Add an Allow policy for trusted administrator emails and create the app.
5. Open **Configure → Additional settings** and copy the **Application Audience
   (AUD) Tag** into Worker `POLICY_AUD`.
6. Open **Zero Trust → Settings**, copy the team domain, add `https://`, and store
   it as Worker `TEAM_DOMAIN` (for example,
   `https://your-team.cloudflareaccess.com`).
7. Set `BOOTSTRAP_OWNER_EMAIL` to the exact email used for the first Access login.

`POLICY_AUD` and `TEAM_DOMAIN` are plain Worker variables, not secrets. The Pages
proxy forwards the Access assertion; the Worker verifies its signature, issuer,
expiry and audience before serving admin data. See Cloudflare's
[Access JWT validation guide](https://developers.cloudflare.com/cloudflare-one/access-controls/applications/http-apps/authorization-cookie/validating-json/).

## Turnstile dashboard setup

1. Go to **Cloudflare dashboard → Turnstile → Add widget**.
2. Name it `Slotloom booking form` and choose **Managed** mode.
3. Add the final Pages custom hostname without `https://` or a path. Add the
   `app.example.com` hostname only if it will serve production traffic. Add `localhost`
   and `127.0.0.1` only when testing the real widget locally.
4. Leave pre-clearance disabled; this app validates every booking token through
   Siteverify in the Worker.
5. Create the widget and copy both generated keys.
6. In **Workers & Pages → example-slotloom-api → Settings → Variables and Secrets**, add
   `TURNSTILE_SITE_KEY` as plain text and `TURNSTILE_SECRET` as an encrypted
   secret. Do not put either value in Pages.

Configure both keys or neither. A partial configuration now returns a safe `503`
instead of silently accepting unverified bookings. The Worker also validates the
widget hostname against `APP_URL` and the action `booking-submit`. See the
[dashboard widget guide](https://developers.cloudflare.com/turnstile/get-started/widget-management/dashboard/)
and [mandatory Siteverify guidance](https://developers.cloudflare.com/turnstile/get-started/server-side-validation/).

## White-labeling

An owner can configure the complete workspace identity from **Settings → Workspace branding**:

- application name and tagline
- a full workspace logo
- a separate square favicon
- primary and accent colors
- direct image uploads or externally hosted HTTPS URLs

Uploaded images are stored in the `example-slotloom-assets` R2 bucket. Create it before enabling uploads:

```sh
pnpm exec wrangler r2 bucket create example-slotloom-assets
```

The public brand configuration is loaded at runtime, so changing a client workspace does not require rebuilding Pages. The identity is used by the login screen, dashboard, booking flow, browser metadata, emails and calendar invitations.

The current open-source distribution represents one isolated workspace per deployment. This gives each organization its own D1 database, assets, domain and branding. A shared multi-tenant hosted service additionally requires tenant IDs and isolation across every database query; do not place unrelated customers in one deployment until that isolation layer is enabled.

## Quality checks

```sh
pnpm typecheck
pnpm test
pnpm build
pnpm exec wrangler deploy --dry-run
```

`pnpm check:structure` enforces a 1,000-line hard ceiling and reports files above 500 lines for refactoring review.

## Security

Do not commit `.dev.vars`, `.env`, API tokens, Access credentials or Turnstile secrets. See [SECURITY.md](SECURITY.md) for responsible disclosure.

## Contributing

Contributions are welcome. Read [CONTRIBUTING.md](CONTRIBUTING.md) before opening a pull request.

## License

Licensed under the Apache License 2.0. See [LICENSE](LICENSE).
