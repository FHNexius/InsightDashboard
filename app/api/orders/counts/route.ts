import { NextResponse } from "next/server";

import { countByStatus, emptyCounts, type CountsResponse } from "@/lib/orders";

// Always run on the server, never cache: this is a live operations view.
export const dynamic = "force-dynamic";
export const revalidate = 0;

/**
 * TODO(niko-swagger): Confirm the exact orders endpoint, query params, auth
 * scheme, and response shape against NikoHealth's Swagger docs.
 *
 * Assumptions made here that MUST be verified:
 *  - Endpoint path is `/orders` under NIKO_API_BASE_URL.
 *  - Auth is a Bearer token in the `Authorization` header. (Could instead be
 *    an `x-api-key` header or a query param — adjust below.)
 *  - The response is either a JSON array of orders, or an object with the
 *    array under one of: `data`, `orders`, `items`, `results`.
 *  - Each order's status lives on one of: `status`, `orderStatus`, `state`.
 *  - There may be pagination (page/limit, cursor, etc.) not handled here yet.
 */
const ORDERS_PATH = "/orders";

interface RawOrder {
  status?: unknown;
  orderStatus?: unknown;
  state?: unknown;
}

function extractOrderArray(payload: unknown): RawOrder[] {
  if (Array.isArray(payload)) return payload as RawOrder[];
  if (payload && typeof payload === "object") {
    const obj = payload as Record<string, unknown>;
    for (const key of ["data", "orders", "items", "results"]) {
      if (Array.isArray(obj[key])) return obj[key] as RawOrder[];
    }
  }
  return [];
}

function extractStatus(order: RawOrder): string | null {
  const candidate = order.status ?? order.orderStatus ?? order.state;
  return candidate == null ? null : String(candidate);
}

function errorResponse(message: string, status: number) {
  const body: CountsResponse & { error: string } = {
    counts: emptyCounts(),
    total: 0,
    lastFetched: new Date().toISOString(),
    error: message,
  };
  return NextResponse.json(body, {
    status,
    headers: { "Cache-Control": "no-store" },
  });
}

export async function GET() {
  const apiKey = process.env.NIKO_API_KEY;
  const baseUrl = process.env.NIKO_API_BASE_URL;

  if (!apiKey || !baseUrl) {
    // Never echo the key; just report which config is missing.
    console.error(
      "[orders/counts] Missing config:",
      !apiKey ? "NIKO_API_KEY" : "",
      !baseUrl ? "NIKO_API_BASE_URL" : "",
    );
    return errorResponse("Server is not configured to reach NikoHealth.", 500);
  }

  const url = `${baseUrl.replace(/\/+$/, "")}${ORDERS_PATH}`;

  let upstream: Response;
  try {
    upstream = await fetch(url, {
      method: "GET",
      headers: {
        // TODO(niko-swagger): confirm auth header name/scheme.
        Authorization: `Bearer ${apiKey}`,
        Accept: "application/json",
      },
      cache: "no-store",
    });
  } catch (err) {
    // Log the error type only — avoid logging anything that could include
    // the request headers / API key.
    console.error(
      "[orders/counts] Upstream fetch failed:",
      err instanceof Error ? err.message : "unknown error",
    );
    return errorResponse("Failed to reach NikoHealth.", 502);
  }

  if (!upstream.ok) {
    console.error(
      `[orders/counts] Upstream returned ${upstream.status} ${upstream.statusText}`,
    );
    return errorResponse(
      `NikoHealth responded with ${upstream.status}.`,
      502,
    );
  }

  let payload: unknown;
  try {
    payload = await upstream.json();
  } catch {
    console.error("[orders/counts] Upstream response was not valid JSON.");
    return errorResponse("NikoHealth returned an unexpected response.", 502);
  }

  const orders = extractOrderArray(payload);
  const { counts, total, unknown } = countByStatus(orders.map(extractStatus));

  if (unknown.length > 0) {
    // Surface unrecognized statuses for ops visibility, but never to the client.
    const sample = Array.from(new Set(unknown)).slice(0, 20);
    console.warn(
      `[orders/counts] ${unknown.length} orders with unrecognized status. Distinct sample:`,
      sample,
    );
  }

  const body: CountsResponse = {
    counts,
    total,
    lastFetched: new Date().toISOString(),
  };

  return NextResponse.json(body, {
    headers: { "Cache-Control": "no-store" },
  });
}
