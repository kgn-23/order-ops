# Reusable Table Pattern Playbook

This document explains the standard way to build production-grade data tables in this codebase.

Use this pattern for new list screens (orders, team users, activity, webhooks, etc.) so behavior stays consistent.

## Goals

- Server-side pagination, filtering, sorting
- URL-synced table state (shareable links + back/forward support)
- Fast rendering on large pages (virtualized rows)
- Bulk actions via Server Actions
- Loading, empty, and error states
- Role-safe access and query validation

## Architecture

Follow this split:

1. **Server page**: parse `searchParams`, validate allowlists, fetch data.
2. **Server query layer**: Prisma query builder + cache + typed response.
3. **Client table component**: render filters/table, row selection, virtualization, bulk actions.
4. **Route-level UX states**: `loading.tsx` and `error.tsx`.
5. **Security layer**: role checks + optional rate limiting.

## 1) Server Query Contract (Data Layer)

Create a typed input and output in `lib/<domain>/queries.ts` (e.g. `lib/orders/queries.ts`).

Recommended input shape:

- `page: number`
- `pageSize: number`
- `searchKey: string` (allowlist only)
- `q?: string`
- `stage?: string` (or module-specific filter)
- `sortBy: string` (allowlist only)
- `sortDir: "asc" | "desc"`

Recommended output shape:

- `rows: RowType[]`
- `total: number`
- `page: number`
- `pageSize: number`
- `totalPages: number`
- `counts: {...}` (summary cards for the page context)

Implementation rules:

- Always sanitize page/pageSize (`Math.max`, allowlisted sizes).
- Build `where` from validated filters only.
- Build `orderBy` from validated sort keys only.
- Return only selected fields (`select`, never broad `include` unless needed).
- Use `unstable_cache` with tags for list queries.
- After writes, call `updateTag(...)` and `revalidatePath(...)`.

## 2) Server Page Pattern

In `app/<role>/<module>/page.tsx`:

- Parse `searchParams`
- Validate against allowlists
- Fetch in parallel:
  - `getFormOptions()` (for bulk dropdowns)
  - `get<Module>Page(...)`
- Pass typed props to a client table component

Keep the page as a Server Component.

## 3) Client Table Component Pattern

Create `components/<module>/admin-<module>-table.tsx` (or equivalent), with:

- Filter form (`method="get"`) and **Apply** button (no debounce needed)
- Reset button to canonical query params
- Clickable sort headers
- Pagination controls
- Summary cards
- Empty state row/message
- Mobile card layout (`md:hidden`)
- Desktop virtualized list (`md:block`)

### Virtualization

Use `@tanstack/react-virtual`:

- Scroll container: fixed max-height + `overflow-auto`
- Sticky header at top
- Virtual body rows with absolute positioning
- Overscan for smooth scrolling

Notes:

- Keep row height predictable for simpler virtualization.
- Use compact field selection to avoid heavy row objects.

## 4) Bulk Actions Pattern

For reusable bulk operations:

1. Row selection state: `Set<string>` for selected ids.
2. Add controls above table:
   - Bulk assign (caller select)
   - Bulk status/stage update
3. Call Server Actions from client (`useTransition` + toast feedback).
4. Clear selection after success.

Server Action rules:

- Validate payload with zod schema in `lib/validators/contracts.ts`.
- Role guard with `requireRole([...])`.
- Use transaction for multi-row writes.
- Write activity logs per row or per operation.
- Call `revalidatePath` and `updateTag`.

## 5) Loading / Error / Empty States

Per route:

- `app/<role>/<module>/loading.tsx`: realistic skeleton layout.
- `app/<role>/<module>/error.tsx`: retry + reset link.

In table body:

- Explicit empty state when no rows match current filters.

## 6) Security and Access

- Enforce role access in route layout/page (`requireRole`).
- Validate query params through strict allowlists.
- Avoid dynamic raw query construction; use Prisma object inputs.
- Optional: add rate limiting in `middleware.ts`/`proxy.ts` for high-traffic list routes.

## 7) Performance Checklist

Before marking done:

- [ ] Query uses pagination + selected fields only
- [ ] Filters and sort are server-side
- [ ] List query cached (`unstable_cache`) with tag
- [ ] Mutations call `updateTag` and `revalidatePath`
- [ ] Virtualization added for large page sizes
- [ ] Sticky header works with scroll container
- [ ] URL sync works with back/forward navigation

## 8) Reusable File Blueprint

Use this file set each time:

- `lib/<domain>/queries.ts` (new query + types)
- `lib/validators/contracts.ts` (new schemas for bulk actions)
- `app/actions/<module>.ts` (bulk server actions)
- `app/<role>/<module>/page.tsx` (server shell)
- `components/<module>/<role>-<module>-table.tsx` (client table)
- `app/<role>/<module>/loading.tsx`
- `app/<role>/<module>/error.tsx`

## 9) Common Mistakes to Avoid

- Fetching all rows and slicing in client.
- Missing allowlist checks for `sortBy` / `searchKey`.
- Adding cache but forgetting to invalidate on write.
- Rendering 200+ rows without virtualization.
- Creating bulk actions without transaction/logging.
- Losing URL state on filter apply.

---

If you follow this playbook, new data tables will stay consistent, performant, and easier to maintain.
