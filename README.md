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
pnpm install
```

Create a `.env` file in the project root:

```env
DATABASE_URL="postgresql://USER:PASSWORD@HOST:5432/DATABASE?sslmode=require"

# Optional — India Post tracking API
INDIA_POST_USERNAME=""
INDIA_POST_PASSWORD=""
INDIA_POST_BASE_URL="https://test.cept.gov.in/beextcustomer/v1"

# Optional — rate limiting on admin order routes (Upstash Redis)
UPSTASH_REDIS_REST_URL=""
UPSTASH_REDIS_REST_TOKEN=""
ADMIN_ORDERS_RATE_LIMIT_PER_MINUTE="120"

# Optional — local dev without sign-in (JSON AppSession)
MOCK_SESSION_JSON=""

# Optional — seed overrides
ADMIN_EMAIL="admin@kgn.com"
ADMIN_PASSWORD="admin123"
ADMIN_NAME="KGN Admin"
ADMIN_PHONE="9658020786"
SEED_MANAGER_EMAIL="manager@kgn.local"
SEED_MANAGER_PASSWORD="manager123"
SEED_CALLER_EMAIL="caller@kgn.local"
SEED_CALLER_PASSWORD="caller123"
SEED_CALLER_TEAM_NAME="Primary Caller Team"
```

Apply migrations and seed the database:

```bash
pnpm db:migrate
pnpm db:seed
```

Start the dev server:

```bash
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
