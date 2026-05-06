# UI Structure Guide

This project now uses a role-based route structure with modular, separated components.

## Route Structure

- `/admin/dashboard`
- `/admin/orders`
- `/manager/dashboard`
- `/manager/orders`
- `/caller/dashboard`
- `/caller/orders`

Root (`/`) redirects users to their default role section.

## Layout Ownership

- `app/admin/layout.tsx` -> admin-only shell and nav
- `app/manager/layout.tsx` -> manager shell and nav
- `app/caller/layout.tsx` -> caller shell and nav

Role authorization is enforced in layout files using `requireRole()`.

## Component Modules

- `components/roles/*` -> role shell/navigation wrappers
- `components/dashboard/*` -> dashboard-only presentation blocks
- `components/orders/*` -> order tables and operational forms
- `components/ui/*` -> shadcn primitives only

## Extension Rule

When adding UI:

1. Add or reuse shadcn primitives in `components/ui`.
2. Place feature components under the corresponding module folder (`dashboard`, `orders`, `roles`).
3. Keep pages in `app/<role>/<section>/page.tsx` thin and composed from modular components.
