"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { RefreshCw } from "lucide-react";

import { StatusTile, StatusTileSkeleton } from "@/components/StatusTile";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  STATUS_KEYS,
  STATUS_LABELS,
  type CountsResponse,
} from "@/lib/orders";

const POLL_INTERVAL_MS = 30_000;

function formatTime(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });
}

export default function DashboardPage() {
  const [data, setData] = useState<CountsResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const inFlight = useRef(false);

  const load = useCallback(async () => {
    if (inFlight.current) return;
    inFlight.current = true;
    setRefreshing(true);
    try {
      const res = await fetch("/api/orders/counts", { cache: "no-store" });
      const body = (await res.json()) as CountsResponse & { error?: string };
      if (!res.ok || body.error) {
        throw new Error(body.error ?? `Request failed (${res.status})`);
      }
      setData(body);
      setError(null);
    } catch (err) {
      // Keep showing the last good counts; just surface a banner.
      setError(err instanceof Error ? err.message : "Failed to load counts.");
    } finally {
      inFlight.current = false;
      setRefreshing(false);
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
    const id = setInterval(() => void load(), POLL_INTERVAL_MS);
    return () => clearInterval(id);
  }, [load]);

  return (
    <main className="mx-auto min-h-screen max-w-7xl px-6 py-8">
      <header className="mb-8 flex flex-wrap items-end justify-between gap-4 border-b border-border pb-6">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">
            NikoHealth Operations
          </h1>
          <div className="mt-2 flex items-center gap-3 text-sm text-muted-foreground">
            <Badge variant="secondary">
              {data ? data.total.toLocaleString() : "—"} total orders
            </Badge>
            <span>
              Last updated{" "}
              <span className="tabular-nums">
                {data ? formatTime(data.lastFetched) : "—"}
              </span>
            </span>
          </div>
        </div>
        <button
          type="button"
          onClick={() => void load()}
          disabled={refreshing}
          className="inline-flex items-center gap-2 rounded-md border border-border bg-card px-3 py-2 text-sm font-medium shadow-sm transition-colors hover:bg-muted disabled:opacity-50"
        >
          <RefreshCw
            className={cn("h-4 w-4", refreshing && "animate-spin")}
            aria-hidden
          />
          Refresh
        </button>
      </header>

      {error && (
        <div
          role="alert"
          className="mb-6 rounded-md border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-800 dark:border-red-900 dark:bg-red-950 dark:text-red-200"
        >
          <span className="font-semibold">Live data unavailable.</span>{" "}
          {error}
          {data && " Showing last known counts."}
        </div>
      )}

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {loading && !data
          ? STATUS_KEYS.map((key) => <StatusTileSkeleton key={key} />)
          : STATUS_KEYS.map((key) => (
              <StatusTile
                key={key}
                status={key}
                label={STATUS_LABELS[key]}
                count={data ? data.counts[key] : 0}
              />
            ))}
      </div>
    </main>
  );
}
