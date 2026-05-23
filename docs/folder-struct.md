# KGN Order Ops — folder layout

## Rule of thumb

| Folder | Purpose |
|--------|---------|
| `app/` | **Routes only** — pages, layouts, API routes, thin action re-exports |
| `lib/` | **All shared server/domain code** — DB, auth, queries, validators, actions |
| `components/` | UI (feature folders + `ui/` for shadcn) |

## Target tree

```
app/
  admin|manager|caller/     # pages + layouts
  api/webhook/            # route handlers
  actions/                # re-exports only
    auth.ts               # sign-in (stays here)
    phase1.ts             # → lib/orders/actions
    team.ts               # → lib/team/actions
    order-details.ts      # → lib/orders/actions/order-details

lib/
  db.ts
  auth.ts
  ist-time.ts
  route-access.ts
  activity-params.ts
  utils.ts
  validators/
    contracts.ts          # Zod schemas (was app/server/contracts)
  domain/
    modules.ts
    carrier-adapter.ts
    assignment-strategy.ts
  orders/
    types.ts, queries.ts, search-params.ts, list-variants.ts
    load-list-page.ts, form-options.ts, parse-upload.ts
    source.ts, upload-source.ts, format.ts
    actions/              # mutations (was app/actions/phase1)
  team/
    queries.ts
    actions.ts
  call-logs/
    queries.ts
  dashboard/
    queries.ts
  activity/
    queries.ts
  webhooks/
    queries.ts

components/
  orders/
    orders-list-page.tsx
    admin-orders-table.tsx
    orders-table/         # table UI pieces
```

## Import cheat sheet

| Need | Import from |
|------|-------------|
| Prisma client | `@/lib/db` |
| Session / roles | `@/lib/auth` |
| IST dates | `@/lib/ist-time` |
| Order list data | `@/lib/orders/queries` |
| Order mutations | `@/lib/orders/actions` |
| Zod input schemas | `@/lib/validators/contracts` |
| Team CRUD actions | `@/lib/team/actions` |
| Call logs page | `@/lib/call-logs/queries` |
| Admin dashboard KPIs | `@/lib/dashboard/queries` |

## Adding a feature

1. Add types + queries under `lib/<feature>/`.
2. Add mutations under `lib/<feature>/actions/` (with `"use server"`).
3. Optional thin re-export in `app/actions/` if you want a stable path.
4. Page stays a thin Server Component in `app/`.
