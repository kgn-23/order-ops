import { db } from "@/lib/db";
import { Prisma } from "@/app/generated/prisma/client";

type EndpointKind = "booking" | "non-booking";

function parseBody(raw: string) {
  try {
    return JSON.parse(raw) as unknown;
  } catch {
    return null;
  }
}

function toJsonValue(value: unknown): Prisma.InputJsonValue | Prisma.NullableJsonNullValueInput {
  if (value === null) return Prisma.JsonNull;
  if (
    typeof value === "string" ||
    typeof value === "number" ||
    typeof value === "boolean" ||
    Array.isArray(value) ||
    typeof value === "object"
  ) {
    return value as Prisma.InputJsonValue;
  }
  return Prisma.JsonNull;
}

export async function saveWebhookEvent(input: {
  endpoint: EndpointKind;
  method: string;
  headers: Record<string, string>;
  rawBody: string;
}) {
  const { endpoint, method, headers, rawBody } = input;
  const payload = parseBody(rawBody);

  await db.webhookInboxEvent.create({
    data: {
      endpoint,
      method,
      headers,
      payload: toJsonValue(payload),
      rawBody,
    },
  });
}
