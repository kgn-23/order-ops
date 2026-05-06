import type { CarrierPayload } from "@/app/domain/modules";

export type TrackOrderRequest = {
  trackingNumber: string;
  provider: string;
};

export type BookOrderRequest = {
  orderId: string;
  provider: string;
};

export type GenerateLabelRequest = {
  orderId: string;
  provider: string;
};

export interface CarrierAdapter {
  trackOrder(request: TrackOrderRequest): Promise<CarrierPayload>;
  bookOrder(request: BookOrderRequest): Promise<CarrierPayload>;
  generateLabel(request: GenerateLabelRequest): Promise<CarrierPayload>;
}

type IndiaPostTrackingItem = {
  del_status?: { del_status?: string };
  tracking_details?: Array<{ event?: string }>;
  booking_details?: { article_number?: string };
};

function getIndiaPostBaseUrl() {
  return (process.env.INDIA_POST_BASE_URL ?? "https://test.cept.gov.in/beextcustomer/v1").replace(
    /\/$/,
    "",
  );
}

function getErrorMessage(error: unknown) {
  if (error instanceof Error) return error.message;
  return String(error);
}

function normalizeFromIndiaPostStatus(status: string) {
  const s = status.toUpperCase();
  if (s.includes("DELIVER")) return "DELIVERED" as const;
  if (s.includes("RTO") || s.includes("RETURN")) return "RTO" as const;
  if (
    s.includes("DISPATCH") ||
    s.includes("RECEIVED") ||
    s.includes("INVOICED") ||
    s.includes("TRANSIT") ||
    s.includes("BAG") ||
    s.includes("OUT FOR") ||
    s.includes("ARRIVED") ||
    s.includes("CONSIGNMENT")
  ) {
    return "IN_TRANSIT" as const;
  }
  if (s.includes("BOOK")) return "BOOKED" as const;
  return "OTHER" as const;
}

async function getIndiaPostAccessToken() {
  const username = process.env.INDIA_POST_USERNAME;
  const password = process.env.INDIA_POST_PASSWORD;
  if (!username || !password) {
    throw new Error("Missing INDIA_POST_USERNAME / INDIA_POST_PASSWORD environment variables.");
  }

  const loginUrl = `${getIndiaPostBaseUrl()}/access/login`;
  let response: Response;
  try {
    response = await fetch(loginUrl, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ username, password }),
      cache: "no-store",
    });
  } catch (error) {
    throw new Error(
      `India Post login request failed (${loginUrl}): ${getErrorMessage(error)}`,
    );
  }
  if (!response.ok) {
    const body = await response.text();
    throw new Error(`India Post login failed (${response.status}): ${body}`);
  }

  const json = (await response.json()) as {
    data?: { access_token?: string };
  };
  const token = json.data?.access_token;
  if (!token) {
    throw new Error("India Post login response did not include access_token.");
  }
  return token;
}

export class IndiaPostAdapter implements CarrierAdapter {
  async trackOrder(request: TrackOrderRequest): Promise<CarrierPayload> {
    const token = await getIndiaPostAccessToken();
    const trackingUrl = `${getIndiaPostBaseUrl()}/tracking/bulk`;
    let response: Response;
    try {
      response = await fetch(trackingUrl, {
        method: "POST",
        headers: {
          authorization: `Bearer ${token}`,
          "content-type": "application/json",
        },
        body: JSON.stringify({ bulk: [request.trackingNumber] }),
        cache: "no-store",
      });
    } catch (error) {
      throw new Error(
        `India Post tracking request failed (${trackingUrl}): ${getErrorMessage(error)}`,
      );
    }
    if (!response.ok) {
      const body = await response.text();
      throw new Error(`India Post tracking API failed (${response.status}): ${body}`);
    }

    const json = (await response.json()) as {
      success?: boolean;
      message?: string;
      data?: IndiaPostTrackingItem[];
    };
    if (json.success === false) {
      throw new Error(json.message?.trim() || "India Post tracking API returned success: false.");
    }
    const rows = json.data;
    if (!rows?.length) {
      throw new Error("India Post returned no tracking data for this article.");
    }
    const first = rows[0];
    const apiArticle = first.booking_details?.article_number?.trim();
    const expected = request.trackingNumber.trim();
    if (apiArticle && apiArticle !== expected) {
      throw new Error(
        `India Post article mismatch (expected ${expected}, response had ${apiArticle}).`,
      );
    }
    const details = first.tracking_details;
    const latestEvent =
      details?.length && details.length > 0
        ? details[details.length - 1]?.event?.trim() || undefined
        : undefined;
    const deliveryFlag = first.del_status?.del_status?.trim() || undefined;
    const externalStatus = latestEvent ?? deliveryFlag ?? "UNKNOWN";

    return {
      provider: request.provider,
      operation: "TRACKING",
      orderRef: request.trackingNumber,
      externalStatus,
      normalizedStage: normalizeFromIndiaPostStatus(externalStatus),
      rawPayload: json as Record<string, unknown>,
    };
  }

  async bookOrder(request: BookOrderRequest): Promise<CarrierPayload> {
    return {
      provider: request.provider,
      operation: "BOOKING",
      orderRef: request.orderId,
      rawPayload: { note: "Phase 2 booking hook placeholder." },
    };
  }

  async generateLabel(request: GenerateLabelRequest): Promise<CarrierPayload> {
    return {
      provider: request.provider,
      operation: "LABEL",
      orderRef: request.orderId,
      rawPayload: { note: "Phase 2 label hook placeholder." },
    };
  }
}
