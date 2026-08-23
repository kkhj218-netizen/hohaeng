import "server-only";

import { unstable_cache } from "next/cache";

import {
  getUsMarketCloseDashboard,
  type UsMarketCloseQuote,
} from "@/app/lib/usMarketClose";

export type MajorFutureQuote = UsMarketCloseQuote & {
  group: "index" | "commodity";
  unitLabel: string;
};

type Definition = {
  symbol: string;
  yahooSymbol: string;
  name: string;
  unitLabel: string;
};

type YahooChartResponse = {
  chart?: {
    result?: Array<{
      timestamp?: number[];
      indicators?: {
        quote?: Array<{
          close?: Array<number | null>;
        }>;
      };
    }>;
  };
};

const INDEX_UNITS: Record<string, string> = {
  NQ: "Index",
  ES: "Index",
  YM: "Index",
  RTY: "Index",
};

const COMMODITY_FUTURES: Definition[] = [
  { symbol: "CL", yahooSymbol: "CL=F", name: "WTI 원유 선물", unitLabel: "USD/bbl" },
  { symbol: "GC", yahooSymbol: "GC=F", name: "금 선물", unitLabel: "USD/oz" },
  { symbol: "SI", yahooSymbol: "SI=F", name: "은 선물", unitLabel: "USD/oz" },
  { symbol: "NG", yahooSymbol: "NG=F", name: "천연가스 선물", unitLabel: "USD/MMBtu" },
  { symbol: "HG", yahooSymbol: "HG=F", name: "구리 선물", unitLabel: "USD/lb" },
];

const CACHE_SECONDS = 900;
const FETCH_TIMEOUT_MS = 5_000;
const TARGET_MINUTE_ET = 16 * 60;

function round(value: number, digits = 2) {
  const factor = 10 ** digits;
  return Math.round((value + Number.EPSILON) * factor) / factor;
}

function percentChange(current: number, previous: number | null) {
  if (previous === null || previous === 0) return null;
  return round(((current / previous) - 1) * 100, 2);
}

function minuteOfDayEt(timestamp: number) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/New_York",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(new Date(timestamp * 1000));
  const map = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return {
    date: `${map.year}-${map.month}-${map.day}`,
    minute: Number(map.hour) * 60 + Number(map.minute),
  };
}

async function fetchYahoo(symbol: string): Promise<YahooChartResponse | null> {
  const query = "range=10d&interval=5m&includePrePost=true&events=div%2Csplits";

  for (const host of ["query1.finance.yahoo.com", "query2.finance.yahoo.com"]) {
    try {
      const response = await fetch(
        `https://${host}/v8/finance/chart/${encodeURIComponent(symbol)}?${query}`,
        {
          next: { revalidate: CACHE_SECONDS },
          headers: {
            Accept: "application/json,text/plain;q=0.9,*/*;q=0.8",
            "User-Agent":
              "Mozilla/5.0 (compatible; HOHAENG-OS/1.0; +https://hohaeng.vercel.app)",
          },
          signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
        },
      );
      if (!response.ok) continue;
      return (await response.json()) as YahooChartResponse;
    } catch {
      // 보조 호스트로 재시도
    }
  }

  return null;
}

async function fetchCommoditySnapshot(
  definition: Definition,
): Promise<MajorFutureQuote | null> {
  const payload = await fetchYahoo(definition.yahooSymbol);
  const result = payload?.chart?.result?.[0];
  if (!result) return null;

  const timestamps = result.timestamp ?? [];
  const closes = result.indicators?.quote?.[0]?.close ?? [];
  const rows = timestamps
    .map((timestamp, index) => {
      const close = closes[index];
      if (typeof close !== "number" || !Number.isFinite(close)) return null;
      const et = minuteOfDayEt(timestamp);
      return { timestamp, date: et.date, minute: et.minute, close };
    })
    .filter(
      (row): row is { timestamp: number; date: string; minute: number; close: number } =>
        row !== null,
    );

  const now = Date.now();
  const byDate = new Map<string, Array<(typeof rows)[number]>>();

  for (const row of rows) {
    if (row.timestamp * 1000 > now) continue;
    const list = byDate.get(row.date) ?? [];
    list.push(row);
    byDate.set(row.date, list);
  }

  const snapshots = Array.from(byDate.entries())
    .map(([date, list]) => {
      const candidates = list
        .filter(
          (row) =>
            row.minute >= TARGET_MINUTE_ET - 10 &&
            row.minute <= TARGET_MINUTE_ET + 5,
        )
        .sort((left, right) => {
          const leftDistance = Math.abs(left.minute - TARGET_MINUTE_ET);
          const rightDistance = Math.abs(right.minute - TARGET_MINUTE_ET);
          if (leftDistance !== rightDistance) return leftDistance - rightDistance;
          return right.timestamp - left.timestamp;
        });

      const best = candidates[0];
      return best ? { date, close: best.close, minute: best.minute } : null;
    })
    .filter(
      (item): item is { date: string; close: number; minute: number } => item !== null,
    )
    .sort((left, right) => right.date.localeCompare(left.date));

  const latest = snapshots[0];
  if (!latest) return null;
  const previous = snapshots.find((item) => item.date < latest.date)?.close ?? null;

  return {
    symbol: definition.symbol,
    yahooSymbol: definition.yahooSymbol,
    name: definition.name,
    kind: "future",
    date: latest.date,
    timeEt: `${String(Math.floor(latest.minute / 60)).padStart(2, "0")}:${String(
      latest.minute % 60,
    ).padStart(2, "0")}`,
    current: round(latest.close, Math.abs(latest.close) >= 1_000 ? 2 : 3),
    previousClose: previous,
    changePercent: percentChange(latest.close, previous),
    sessionHigh: null,
    sessionLow: null,
    rangePercent: null,
    source: "Yahoo Finance",
    note: "미국 현물 정규장 마감 16:00 ET 동시점 · 선물 공식 정산가 아님",
    group: "commodity",
    unitLabel: definition.unitLabel,
  };
}

async function buildMajorFuturesSnapshot(): Promise<MajorFutureQuote[]> {
  const [market, commodities] = await Promise.all([
    getUsMarketCloseDashboard(),
    Promise.all(COMMODITY_FUTURES.map(fetchCommoditySnapshot)),
  ]);

  const indexFutures = market.futures
    .filter((quote) => quote.symbol in INDEX_UNITS)
    .map((quote) => ({
      ...quote,
      group: "index" as const,
      unitLabel: INDEX_UNITS[quote.symbol] ?? "Index",
    }));

  return [
    ...indexFutures,
    ...commodities.filter((quote): quote is MajorFutureQuote => quote !== null),
  ];
}

const cachedMajorFuturesSnapshot = unstable_cache(
  buildMajorFuturesSnapshot,
  ["major-futures-16et-v1"],
  { revalidate: CACHE_SECONDS },
);

export async function getMajorFuturesSnapshot() {
  return cachedMajorFuturesSnapshot();
}
