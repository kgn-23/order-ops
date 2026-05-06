import { NextRequest, NextResponse } from "next/server";

import { saveWebhookEvent } from "@/app/api/webhook/_store";

export async function POST(request: NextRequest) {
  const rawBody = await request.text();
  const headers = Object.fromEntries(request.headers.entries());

  await saveWebhookEvent({
    endpoint: "booking",
    method: request.method,
    headers,
    rawBody,
  });

  return NextResponse.json({ ok: true, endpoint: "booking", received: true });
}
