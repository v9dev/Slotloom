# Security policy

## Reporting a vulnerability

Please do not publish exploitable vulnerabilities in a public issue. Contact the repository maintainer privately through the security contact listed in the GitHub repository profile.

Include the affected route or component, reproduction steps, expected impact, and any suggested mitigation. Avoid accessing data that does not belong to you.

## Supported version

Security fixes target the latest version on the default branch.

## Deployment responsibilities

Operators must protect `/admin*` and `/api/admin/*` with Cloudflare Access, keep `ALLOW_ADMIN_TOKEN=false` in production, store secrets as encrypted bindings, restrict workspace membership, and keep dependencies and Cloudflare compatibility dates current.
