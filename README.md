<div align="center">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="./public/brand/logo-dark.svg">
    <source media="(prefers-color-scheme: light)" srcset="./public/brand/logo-light.svg">
    <img alt="Slotloom" src="./public/brand/logo-light.svg" width="360">
  </picture>

  <p><strong>Open-source scheduling and meeting follow-up, built for Cloudflare.</strong></p>

  <p>
    <a href="https://github.com/v9dev/Slotloom/actions/workflows/ci.yml"><img alt="CI" src="https://github.com/v9dev/Slotloom/actions/workflows/ci.yml/badge.svg"></a>
    <a href="./LICENSE"><img alt="Apache 2.0 License" src="https://img.shields.io/badge/license-Apache--2.0-2563eb.svg"></a>
    <img alt="Node.js 22+" src="https://img.shields.io/badge/Node.js-22%2B-339933?logo=nodedotjs&logoColor=white">
    <img alt="pnpm 10" src="https://img.shields.io/badge/pnpm-10-F69220?logo=pnpm&logoColor=white">
  </p>

  <p>
    <img alt="React" src="https://img.shields.io/badge/React-20232A?logo=react&logoColor=61DAFB">
    <img alt="TypeScript" src="https://img.shields.io/badge/TypeScript-3178C6?logo=typescript&logoColor=white">
    <img alt="Vite" src="https://img.shields.io/badge/Vite-646CFF?logo=vite&logoColor=white">
    <img alt="Tailwind CSS" src="https://img.shields.io/badge/Tailwind_CSS-06B6D4?logo=tailwindcss&logoColor=white">
    <img alt="Cloudflare" src="https://img.shields.io/badge/Cloudflare-F38020?logo=cloudflare&logoColor=white">
  </p>
</div>

Slotloom is a self-hosted, white-label platform for publishing availability,
collecting preferred meeting times, and managing follow-up from one workspace.
It runs without a traditional server: Pages serves the React app, while Workers,
D1, R2, Durable Objects, and Email Sending power the backend.

## Highlights

- Multiple booking links with independent schedules, validity, and timezones
- Double-booking protection with secure rescheduling and cancellation links
- Owner, admin, member, and viewer roles protected by Cloudflare Access
- Runtime white-label branding, including logos, colors, favicon, and email identity
- Email templates, calendar invitations, follow-ups, feedback, and audit history
- Real-time dashboard notifications and optional Turnstile bot protection

## Stack

| Layer     | Technology                                       |
| --------- | ------------------------------------------------ |
| Web       | React, TypeScript, Vite, Tailwind CSS, shadcn/ui |
| Compute   | Cloudflare Pages and Workers                     |
| Data      | Cloudflare D1, R2, and Durable Objects           |
| Security  | Cloudflare Access and Turnstile                  |
| Messaging | Cloudflare Email Sending and React Email         |
| Quality   | Vitest, TypeScript, and GitHub Actions           |

## Quick start

Requires Node.js 22+, pnpm 10, and Wrangler.

```sh
git clone https://github.com/v9dev/Slotloom.git
cd Slotloom
pnpm install
cp .dev.vars.example .dev.vars
pnpm dev:setup
pnpm db:migrate:local
pnpm dev
```

Open `http://localhost:5173/admin`. Vite runs on port `5173` and proxies API and
WebSocket traffic to the local Worker on port `8787`.

## Configuration

- Worker variables: `FROM_EMAIL`, `APP_URL`, `TEAM_DOMAIN`, `POLICY_AUD`,
  `BOOTSTRAP_OWNER_EMAIL`, and optional `TURNSTILE_SITE_KEY`
- Worker secret: optional encrypted `TURNSTILE_SECRET`
- Pages variables: `BACKEND_URL` and `PNPM_VERSION=10.28.0`
- Local-only authentication: `ADMIN_TOKEN` in the ignored `.dev.vars` file

Branding and booking schedules are managed in the application, not through
environment variables. See the [deployment handover](HANDOFF.md) for provisioning,
Access, Turnstile, Email Sending, and production configuration.

## Deployment

GitHub Actions performs CI only and never deploys Cloudflare resources.

```sh
pnpm db:migrate:remote
pnpm deploy:api
```

Deploy the Worker manually with Wrangler. Connect the Pages project to `main` in
the Cloudflare dashboard and let Pages build the frontend with `pnpm build` and
publish `dist`.

## Quality

```sh
pnpm run ci
```

This runs structure checks, TypeScript, tests, the production build, and a
Wrangler deployment dry-run.

## Project documentation

- [Deployment and operational handover](HANDOFF.md)
- [Contributing guide](CONTRIBUTING.md)
- [Security policy](SECURITY.md)

## License

Licensed under the [Apache License 2.0](LICENSE).
