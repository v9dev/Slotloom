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
- Cloudflare Email Sending sends transactional messages.
- Cloudflare Access protects administrative routes.
- Turnstile protects the public booking form.

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

| Variable | Example | Purpose |
| --- | --- | --- |
| `APP_URL` | `https://app.example.com` | Public frontend origin |
| `BOOTSTRAP_OWNER_EMAIL` | `owner@example.com` | First workspace owner |
| `FROM_EMAIL` | `Slotloom <notifications@example.com>` | Verified sender |
| `TEAM_DOMAIN` | `https://your-team.cloudflareaccess.com` | Access team domain |
| `POLICY_AUD` | `REPLACE_WITH_ACCESS_AUD` | Access application audience |
| `TURNSTILE_SITE_KEY` | `REPLACE_WITH_TURNSTILE_SITE_KEY` | Public widget key |

Store `TURNSTILE_SECRET` only as an encrypted Worker secret:

```sh
pnpm exec wrangler secret put TURNSTILE_SECRET
```

The Turnstile site key is intentionally public in the browser. The secret key
must never be committed or configured as a plain variable.

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

Verify a sender domain in Cloudflare Email Sending and bind it as `EMAIL` in
the Worker. Configure `FROM_EMAIL` with an address permitted by that verified
domain. Keep DNS ownership and verification details outside this repository.

## Pages deployment

Connect the Pages project to the repository through the Cloudflare dashboard:

- Production branch: `main`
- Build command: `pnpm build`
- Output directory: `dist`
- Required variable: `BACKEND_URL=https://example-slotloom-api.example-account.workers.dev`
- Optional build pin: `PNPM_VERSION=10.28.0`

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
- output from `wrangler whoami`, deploy, resource-list, or secret-list commands

If a credential is ever committed, removing the text is not enough. Rotate it,
rewrite the reachable Git history, remove cached CI artifacts where possible,
and ask the Git host to purge sensitive cached objects.
