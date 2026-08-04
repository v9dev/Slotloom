# Contributing to Slotloom

Thank you for helping improve Slotloom.

## Development

1. Fork the repository and create a focused branch.
2. Install dependencies with `pnpm install`.
3. Copy `.dev.vars.example` to `.dev.vars` and use local-only values.
4. Apply local migrations with `pnpm db:migrate:local`.
5. Make small, accessible, responsive changes that preserve white-label behavior.
6. Run `pnpm typecheck`, `pnpm test`, and `pnpm build`.
7. Explain behavior changes and migration requirements in the pull request.

Never commit secrets, production email addresses, database exports, visitor data, or `.wrangler` state.

For schema changes, add a new ordered SQL file under `migrations`. Do not rewrite a migration that may already be deployed.

By contributing, you agree that your contribution is licensed under Apache-2.0.
