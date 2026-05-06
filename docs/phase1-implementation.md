# Phase 1 Implementation Notes

## Migration Strategy

1. Ensure `DATABASE_URL` points to the target PostgreSQL instance.
2. Generate client and validate schema:
   - `pnpm prisma format`
   - `pnpm prisma generate`
3. Apply migration in development:
   - `pnpm prisma migrate dev --name phase1_core`
4. Deploy migration in non-dev environments:
   - `pnpm prisma migrate deploy`

## What is Implemented

- Domain boundaries and extension interfaces for Phase 2 hooks.
- Full Phase 1 Prisma data model with soft-delete timestamps and indexes.
- Server Actions contracts for upload, assignment, tracking, call logging, follow-ups, and address verification.
- RBAC helpers with route-level middleware guards.
- Dashboard surface for admin/manager metrics and caller operations.

## Phase 2 Ready Hooks Already Present

- Carrier adapter interface includes `tracking`, `booking`, and `label` contracts.
- Assignment strategy pattern supports manual, round-robin, and rule-based selection.
- `Order` model includes future booking, label, and source-system fields.
- `OrderStatusEvent` stores normalized stage plus raw external payload and idempotency key.
