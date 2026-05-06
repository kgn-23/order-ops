<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->


# Project Rules - KGN Order Ops CRM

## Project Overview
- **Next.js 16.2.4** (App Router only) + **React 19.2.4**
- **Shadcn UI** primitives under `components/ui/*`
- **Prisma 7.8.0** + `@prisma/adapter-pg` + PostgreSQL

## Architecture Rules (Always Follow)
- **Server Components first** — Use them by default
- **Server Actions** for all mutations (with `revalidatePath` / `revalidateTag`)
- Never use client-side data fetching (`useSWR`, `tanstack-query`, etc.) unless truly needed for real-time
- All database work via Prisma in Server Components or Server Actions
- Strict TypeScript — no `any`

## UI Rules (ShadcnUI)
- Use **only Shadcn components**

## Prisma + Database Rules
- Use latest Prisma 7 patterns + PostgreSQL adapter
- Always include `createdAt`, `updatedAt`, `deletedAt` (soft deletes)
- Use proper indexes and relations
- Prefer `select` over `include` for performance
- Wrap multi-step operations in transactions
- Never expose raw Prisma client on client side
