# KGN Order Ops

Internal CRM for order operations: bulk upload, caller assignment, call logging, shipment tracking, and Shopify (storefront) order confirmation workflows.

## Stack

- **Next.js 16** (App Router) + **React 19**
- **PostgreSQL** + **Prisma 7** (`@prisma/adapter-pg`)
- **Shadcn UI** + Tailwind CSS v4
- Server Components and Server Actions by default

## Prerequisites

- Node.js 20+
- [pnpm](https://pnpm.io/)
- PostgreSQL database

## Setup

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000). Unauthenticated users are redirected to `/signin`.

## Seed data

By default, `pnpm db:seed` creates roles (`ADMIN`, `MANAGER`, `CALLER`) and an admin user.

| Variable | Default |
|----------|---------|
| `ADMIN_EMAIL` | `admin@kgn.com` |
| `ADMIN_PASSWORD` | `admin123` |

To also create a sample manager, caller team, and caller, uncomment `seedTeamSamples()` in `prisma/seed.ts` before running the seed.

## Roles and routes

After sign-in, users land on their role dashboard (`/admin`, `/manager`, or `/caller`).

| Role | Main areas |
|------|------------|
| **Admin** | Full access — team management, webhooks, all callers, bulk upload/assign, COD export |
| **Manager** | Team-scoped dashboard, tracking + Shopify orders, bulk upload/assign (team callers only), call logs, activity |
| **Caller** | Assigned orders (tracking + Shopify), call logging, follow-ups, call logs |

Order lists:

- **Tracking orders** — `/admin/orders`, `/manager/orders`, `/caller/orders`
- **Shopify orders** — `/admin/orders/commerce`, `/manager/orders/commerce`, `/caller/orders/commerce`

## Scripts

| Command | Description |
|---------|-------------|
| `pnpm dev` | Start development server |
| `pnpm build` | Production build |
| `pnpm start` | Run production server |
| `pnpm lint` | Run ESLint |
| `pnpm db:generate` | Generate Prisma client |
| `pnpm db:migrate` | Run migrations (dev) |
| `pnpm db:migrate:deploy` | Deploy migrations (production) |
| `pnpm db:push` | Push schema without migration (dev only) |
| `pnpm db:studio` | Open Prisma Studio |
| `pnpm db:seed` | Seed roles and users |

## Project layout

```
app/           Routes, layouts, API handlers (thin pages)
lib/           Auth, DB, queries, validators, server actions
components/    Feature UI + shadcn primitives (components/ui/)
prisma/        Schema, migrations, seed
```

Shared code lives under `lib/`, not `app/`. See [docs/folder-struct.md](docs/folder-struct.md) for import conventions and [docs/requirements.md](docs/requirements.md) for product scope.

## Architecture notes

- Mutations use Server Actions in `lib/**/actions/` with cache revalidation.
- Prisma client is generated to `app/generated/prisma` and used only on the server via `@/lib/db`.
- Order list UI follows the shared table pattern documented in [docs/table-pattern-playbook.md](docs/table-pattern-playbook.md).
