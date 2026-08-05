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

Set these under **Workers & Pages → slotloom-api → Settings → Variables and Secrets**.

| Variable | Meaning |
|---|---|
| `APP_NAME` | Safe fallback name used before workspace branding is saved. |
| `ORGANIZER_EMAIL` | Fallback reply-to address when a response has no assigned owner or link creator. |
| `FROM_EMAIL` | Verified sender, for example `Meetings <meetings@your-domain.com>`. |
| `APP_URL` | Public Pages URL, used for secure management links, images and email actions. |
| `TIME_ZONE` | Fallback IANA timezone such as `UTC`, `Asia/Kolkata`, or `America/New_York`. |
| `TEAM_DOMAIN` | Your Cloudflare Access organization URL, such as `https://acme.cloudflareaccess.com`. This is not your website domain. The Worker uses it to download Access signing keys and validate who signed in. |
| `POLICY_AUD` | The Audience tag from the Cloudflare Access application. It binds accepted login tokens to this specific protected application. |
| `BOOTSTRAP_OWNER_EMAIL` | Email allowed to become the first workspace owner. It must exactly match the authenticated Access email. |
| `ALLOW_ADMIN_TOKEN` | Local fallback switch. Keep `false` in production. |
| `TURNSTILE_SITE_KEY` | Public Turnstile widget key. Leave empty when Turnstile is disabled. |
| `DAYS_AHEAD` | Legacy fallback horizon. New booking links store their own value. |
| `SLOT_TIMES` | Legacy fallback slot list. New booking links store availability rules in D1. |

Secret:

| Secret | Meaning |
|---|---|
| `TURNSTILE_SECRET` | Private Turnstile verification key. Store as an encrypted Worker secret, never in Git. |

`ADMIN_TOKEN` is only for local development and must not be configured in production.

### Pages variables

Set these in the Pages project for both production and previews where appropriate.

| Variable | Meaning |
|---|---|
| `BACKEND_URL` | Deployed Worker origin, such as `https://slotloom-api.account.workers.dev`. |
| `VITE_APP_NAME` | Build-time fallback name shown before runtime branding loads. |
| `VITE_BRAND_LOGO` | Build-time fallback logo for light backgrounds. |
| `VITE_BRAND_LOGO_DARK` | Build-time fallback logo for dark backgrounds. |
| `VITE_BRAND_FAVICON` | Build-time fallback favicon. |

Branding can subsequently be changed by an owner from **Settings → Workspace branding** without rebuilding the frontend.

## First Cloudflare deployment

Authenticate Wrangler in the account that will own the Worker:

```sh
pnpm exec wrangler login
pnpm exec wrangler d1 create slotloom-db
```

Wrangler returns a D1 database ID. Put that non-secret ID in `wrangler.jsonc`, then run:

```sh
pnpm db:migrate:remote
pnpm deploy:api
```

The first Worker deployment creates the `NotificationHub` Durable Object namespace from the migration in `wrangler.jsonc`.

Next:

1. Onboard the `FROM_EMAIL` domain in Cloudflare Email Sending.
2. Configure Worker variables and the optional Turnstile secret.
3. Create a Pages project from this GitHub repository.
4. Use `pnpm build` as the build command and `dist` as the output directory.
5. Set `BACKEND_URL` to the Worker origin.
6. Attach the public domain to Pages.
7. Set Worker `APP_URL` to that final public domain.
8. Protect `/admin*` and `/api/admin/*` with Cloudflare Access.

## Cloudflare dashboard Git deployment

GitHub Actions is CI-only. It runs the quality checks below, including a
Wrangler dry-run, without Cloudflare credentials and does not deploy anything.

Configure production deployment from the Cloudflare dashboard by connecting the
same GitHub repository to both Cloudflare projects:

- Pages deploys the frontend on pushes to `main`.
- Workers Builds deploys `slotloom-api` on pushes to `main`.

Recommended Worker deploy command:

```sh
pnpm db:migrate:remote && pnpm deploy:api
```

The Wrangler file uses `keep_vars: true`, so instance-specific variables configured in the Cloudflare dashboard are preserved during Git deployments. Encrypted secrets are also preserved.

## Cloudflare Access setup

Create a self-hosted Access application for:

- `your-domain.com/admin*`
- `your-domain.com/api/admin/*`

Allow only trusted administrator emails. Copy:

- the Access team URL into `TEAM_DOMAIN`
- the application Audience tag into `POLICY_AUD`

The Pages proxy forwards the Access assertion to the Worker. The Worker verifies its signature, issuer, expiry and audience again before serving admin data.

## White-labeling

An owner can configure the complete workspace identity from **Settings → Workspace branding**:

- application name and tagline
- a full workspace logo
- a separate square favicon
- primary and accent colors
- direct image uploads or externally hosted HTTPS URLs

Uploaded images are stored in the `slotloom-brand-assets` R2 bucket. Create it before enabling uploads:

```sh
pnpm exec wrangler r2 bucket create slotloom-brand-assets
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
