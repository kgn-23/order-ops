# Storefront dashboard analytics (IST)

## Scope

Storefront (`STOREFRONT`) orders only for admin and manager dashboards. Tracking/delivery KPIs removed from dashboard pages.

## Defaults

- Date range: today in IST (`from` = `to` = today).
- Admin: all teams; optional `teamId` filter.
- Manager: data scoped to team where `CallerTeam.leaderId` = session user.

## KPI cards

| Metric | Definition |
|--------|------------|
| New storefront orders | `Order.createdAt` in range, scoped by team assignment when filtered |
| Confirmed | Distinct orders with `OrderCommerceStatusEvent.toStatus = CONFIRMED` in range |
| Cancelled | Distinct orders with `toStatus = CANCELLED` in range |
| Calls logged | `CallLog` on storefront orders, `calledAt` in range |
| No answer | Calls with outcome `NO_ANSWER` |
| Confirm rate | `confirmed ÷ calls × 100` |
| COD exported | `exportedAt` in range |
| COD ready now | Current export queue (snapshot) |

## Charts (max 2)

1. Horizontal bar: confirmations by caller (top 12).
2. Multi-day range: line chart of daily calls + confirmations; single day: bar chart of status transitions.

## Team table

Per caller: calls, confirmed, cancelled, no answer, confirm %. Team total row.

## URL filters

`?from=YYYY-MM-DD&to=YYYY-MM-DD&teamId=` (admin team optional). Apply navigates with query string (server-rendered).
