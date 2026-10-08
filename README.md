# FacePay Portal (facepay-backoffice)

One login, four role-based experiences, served at **portal.facepay.com**.

| Portal | Path | Roles |
| --- | --- | --- |
| Customer (Overview, My Money, Linked Accounts & Cards, Payments, Transfers, Statements, Disputes, Biometric Consent, Settings, Help) | `/customer` | customer |
| Merchant (Dashboard, Transactions, Refunds, Settlements, Customers, Terminals, Payment Links, Integrations, Team, Reports, Support) | `/merchant` | merchant_owner, merchant_cashier (limited) |
| Internal operations (Overview ... Audit Log, 15 sections) | `/admin` | support_agent (ops), kyc_risk_analyst, finance_operator, device_technician, integration_operator, auditor (read-only), super_user |
| Super-user console (Tenants, Roles, Policy Engine, Limits & Rules, Partner Config, Feature Flags, Platform Monitoring, Key Rotation, Approvals, Audit & IR, break-glass) | `/super` | super_user (auditor: audit only, read-only) |

Next.js 15 App Router, TypeScript, Tailwind, Recharts. Brand: midnight `#081020`, gold `#D4A53A`, Montserrat.

## Run locally

```bash
npm install
cp .env.example .env.local   # optional
npm run dev                  # http://localhost:3000
```

With `NEXT_PUBLIC_API_URL` unset the portal runs on built-in fixtures with the same shapes as the facepay-core contract (exact demo numbers: R 245,430, 1,428, R 172, 245,680, 3,428, R 48,320,450, 99.6%).
Demo users (password `facepay-demo`) are offered on the login page: `thabo@facepay.demo`, `owner@abcstore.demo`, `cashier@abcstore.demo`, `ops@facepay.demo`, `super@facepay.demo`, `auditor@facepay.demo`.

## Environment

| Variable | Purpose |
| --- | --- |
| `NEXT_PUBLIC_API_URL` | Base URL of facepay-core, e.g. `https://api.facepay.com`. Unset = fixtures. |
| `SESSION_SECRET` | 16+ char random secret used to HMAC-sign the httpOnly session cookie. **Required in production.** |

When the API is set, login calls `POST /v1/auth/login`; the returned bearer token lives only in the httpOnly cookie and is attached server-side. Reads use `/v1/wallet`, `/v1/transactions`, `/v1/admin/overview`, `/v1/merchant/dashboard`, `/v1/refunds`, `/v1/settlements`, `/v1/devices`, `/v1/merchants`, `/v1/customers` (always re-masked), `/v1/consents`, `/v1/approvals`, `/v1/audit-events`, `/v1/integrations`. If a response does not match the expected shape the page falls back to fixtures. Mutations go through `/api/proxy/*`, which enforces RBAC, CSRF origin checks, read-only roles and the refund maker/checker rule before forwarding.

## Security and RBAC

- `src/middleware.ts` authenticates every portal and proxy request and authorises by role and route (`src/lib/rbac.ts`); server components re-check.
- Navigation is derived from the same matrix. Auditor is read-only everywhere. Support agents see masked data and never biometrics; nobody can retrieve raw biometric media.
- Refunds: cashier direct limit R 250, owner R 1,000; above that a different approver with sufficient authority is required (`src/lib/refunds.ts`).
- Secure headers (CSP, HSTS, X-Frame-Options, nosniff, Referrer-Policy, Permissions-Policy) in `next.config.mjs`.
- Payments are never shown as paid without provider confirmation; balances are labelled as provider-sourced.

## Verify

```bash
npm run typecheck && npm run lint && npm test && npm run build
SESSION_SECRET=0123456789abcdef npx next start -p 3411 &
PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers NODE_PATH=$(npm root -g) npm run shots -- http://localhost:3411   # writes shots/*.png at 1440 width
```

## Deploy to Vercel (portal.facepay.com)

1. Import the `citizen-bnk/facepay-backoffice` repo in Vercel (framework preset: Next.js, defaults).
2. Project Settings > Environment Variables: set `NEXT_PUBLIC_API_URL` (e.g. `https://api.facepay.com`) and `SESSION_SECRET` (`openssl rand -hex 32`) for Production and Preview. Redeploy after changing `NEXT_PUBLIC_API_URL` (it is inlined at build).
3. Project Settings > Domains: add `portal.facepay.com`; create the DNS record Vercel shows (CNAME `portal` to `cname.vercel-dns.com`).
4. Ensure facepay-core allows requests from the Vercel server (calls are server-to-server, no CORS needed).
