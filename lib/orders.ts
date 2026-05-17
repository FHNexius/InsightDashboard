/**
 * Domain types and status-normalization logic for NikoHealth order counts.
 *
 * The four buckets are fixed by the product spec. Anything that doesn't map to
 * one of these is treated as "unknown" and logged server-side, never shown.
 */

export type StatusKey = "new" | "hold" | "inProgress" | "completed";

export type StatusCounts = Record<StatusKey, number>;

export interface CountsResponse {
  counts: StatusCounts;
  total: number;
  lastFetched: string;
  /**
   * False when the NikoHealth API isn't configured yet (no key/base URL).
   * The dashboard treats this as an intentional empty state, not an error.
   */
  configured: boolean;
}

export const STATUS_KEYS: readonly StatusKey[] = [
  "new",
  "hold",
  "inProgress",
  "completed",
] as const;

export const STATUS_LABELS: Record<StatusKey, string> = {
  new: "NEW",
  hold: "HOLD",
  inProgress: "IN PROGRESS",
  completed: "COMPLETED",
};

export function emptyCounts(): StatusCounts {
  return { new: 0, hold: 0, inProgress: 0, completed: 0 };
}

/**
 * Normalize an arbitrary raw status string to one of the four known buckets.
 *
 * Matching is case-insensitive and tolerates separators/spacing variations,
 * e.g. "in_progress", "In Progress", "InProgress", "IN-PROGRESS" all map to
 * "inProgress". Returns null when the status is unrecognized so the caller can
 * decide how to handle (log + drop) it.
 */
export function normalizeStatus(raw: string | null | undefined): StatusKey | null {
  if (raw == null) return null;

  // Lowercase, then collapse any non-alphanumeric run (spaces, _, -, etc.)
  // so all separator variants reduce to a single canonical token.
  const canonical = String(raw)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "");

  switch (canonical) {
    case "new":
      return "new";
    case "hold":
    case "onhold":
      return "hold";
    case "inprogress":
    case "progress":
    case "processing":
      return "inProgress";
    case "completed":
    case "complete":
    case "done":
      return "completed";
    default:
      return null;
  }
}

/**
 * Count a list of raw status strings into the four buckets.
 *
 * Returns the counts plus the list of unrecognized raw values so the API route
 * can log them server-side without surfacing them to the client.
 */
export function countByStatus(rawStatuses: Array<string | null | undefined>): {
  counts: StatusCounts;
  total: number;
  unknown: string[];
} {
  const counts = emptyCounts();
  const unknown: string[] = [];

  for (const raw of rawStatuses) {
    const key = normalizeStatus(raw);
    if (key === null) {
      unknown.push(String(raw));
      continue;
    }
    counts[key] += 1;
  }

  return { counts, total: rawStatuses.length, unknown };
}
