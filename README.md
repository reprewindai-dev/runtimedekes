# DEKES Signed Runtime App

DEKES is the customer-facing lead intelligence and buyer qualification product shell rebuilt as a greenfield runtime. The app owns acquisition, qualification, billing, quotas, and customer operations. Execution optimization, governance, and control-plane integrations remain adapter-only.

## Core money loop

1. A customer signs up and gets a free trial organization.
2. The customer creates a query and runs it.
3. The execution adapter performs live search using the configured provider.
4. Results are filtered, entity-resolved, enriched, and scored.
5. Qualified leads become `QUALIFIED` or `SEND_NOW`.
6. Quota enforcement and billing gates push the customer toward plan upgrades.

## Stack

- Next.js App Router
- TypeScript
- Prisma + PostgreSQL
- Secure cookie sessions with hashed session tokens
- Stripe Checkout + Billing Portal
- External execution, ECOBE, and control-plane adapters

## Local setup

1. Copy `.env.example` to `.env`.
2. Provide a PostgreSQL database URL.
3. Provide a search provider key for `serper` or `brave`.
4. Install dependencies with `npm install`.
5. Generate Prisma client with `npx prisma generate`.
6. Apply migrations with `npx prisma migrate dev --name init`.
7. Seed plans with `npm run db:bootstrap`.
8. Start with `npm run dev`.

## Production notes

- The app fails closed when required provider credentials are missing.
- Stripe billing is active only when Stripe keys and plan price IDs are configured.
- ECOBE and control-plane integrations are optional and adapter-driven.

## Automation

- `npm run self-run` runs typecheck, tests, build, and any configured live smoke or benchmark steps.
- `.github/workflows/self-run.yml` runs that automation on push to `main` and on a daily schedule.
