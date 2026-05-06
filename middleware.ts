/**
 * Optional rate limiting for GET /admin/orders when Upstash Redis env is set:
 * - UPSTASH_REDIS_REST_URL
 * - UPSTASH_REDIS_REST_TOKEN
 *
 * Tune via ADMIN_ORDERS_RATE_LIMIT_PER_MINUTE (default 120). If unset or Redis
 * env missing, requests pass through unchanged.
 */

import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

const ORDERS_PATH_PREFIX = "/admin/orders";

export async function middleware(request: NextRequest) {
  if (request.method !== "GET") {
    return NextResponse.next();
  }

  const { pathname } = request.nextUrl;
  if (!pathname.startsWith(ORDERS_PATH_PREFIX)) {
    return NextResponse.next();
  }

  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) {
    return NextResponse.next();
  }

  const limitPerMinute = Number(process.env.ADMIN_ORDERS_RATE_LIMIT_PER_MINUTE ?? "120");
  const safeLimit = Number.isFinite(limitPerMinute) && limitPerMinute > 0 ? Math.min(1000, Math.floor(limitPerMinute)) : 120;

  const redis = new Redis({ url, token });
  const ratelimit = new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(safeLimit, "60 s"),
    prefix: "kgn_admin_orders",
  });

  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    request.headers.get("x-real-ip") ??
    "anonymous";

  const { success, limit, remaining, reset } = await ratelimit.limit(ip);

  if (!success) {
    return NextResponse.json(
      { error: "Too many requests. Try again shortly." },
      {
        status: 429,
        headers: {
          "Retry-After": String(Math.ceil((reset - Date.now()) / 1000) || 60),
          "X-RateLimit-Limit": String(limit),
          "X-RateLimit-Remaining": String(remaining),
        },
      },
    );
  }

  const res = NextResponse.next();
  res.headers.set("X-RateLimit-Limit", String(limit));
  res.headers.set("X-RateLimit-Remaining", String(remaining));
  return res;
}

export const config = {
  matcher: ["/admin/orders", "/admin/orders/:path*"],
};
