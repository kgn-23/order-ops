import { db } from "@/lib/db";

export type WebhookInboxEventRow = {
  id: string;
  endpoint: string;
  method: string;
  payload: unknown;
  rawBody: string | null;
  receivedAt: Date;
};

export async function getWebhookInboxEvents(limit = 100): Promise<WebhookInboxEventRow[]> {
  return db.webhookInboxEvent.findMany({
    orderBy: { receivedAt: "desc" },
    take: limit,
    select: {
      id: true,
      endpoint: true,
      method: true,
      payload: true,
      rawBody: true,
      receivedAt: true,
    },
  });
}
