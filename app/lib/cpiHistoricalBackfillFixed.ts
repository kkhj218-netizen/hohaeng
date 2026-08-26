import "server-only";

import { runCpiHistoricalBackfill } from "@/app/lib/cpiHistoricalBackfill";

/**
 * FRED release/dates defaults to ascending release dates. The historical
 * backfill only needs the recent 2016~ window, so the old query's
 * `limit=256&sort_order=asc` could return only very old CPI release dates and
 * then filter all of them out.
 *
 * Keep the existing backfill implementation intact and correct only the FRED
 * CPI release-date request while this one-shot admin job is running.
 */
export async function runCpiHistoricalBackfillFixed() {
  const originalFetch = globalThis.fetch;

  const patchedFetch = (async (
    input: Parameters<typeof fetch>[0],
    init?: Parameters<typeof fetch>[1],
  ) => {
    if (typeof input === "string" && input.startsWith("https://api.stlouisfed.org/fred/release/dates?")) {
      const url = new URL(input);
      if (url.searchParams.get("release_id") === "10") {
        url.searchParams.set("sort_order", "desc");
        url.searchParams.set("limit", "256");
        return originalFetch(url.toString(), init);
      }
    }

    return originalFetch(input, init);
  }) as typeof fetch;

  globalThis.fetch = patchedFetch;
  try {
    return await runCpiHistoricalBackfill();
  } finally {
    globalThis.fetch = originalFetch;
  }
}
