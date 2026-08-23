import "server-only";

import { unstable_cache } from "next/cache";

import {
  getUsMarketCloseDashboard,
  type UsMarketCloseQuote,
} from "@/app/lib/usMarketClose";

export type MajorFutureQuote = UsMarketCloseQuote & {
  group: "index" | "commodity";
  unitLabel: string;
  snapshotMode: "16et" | "near-16et" | "daily-fallback";
  basisLabel: string;
};

type Definition = {
  symbol: string;
  yahooSymbol: string;
  name: string;
  unitLabel: string;
  group: "index" | "commodity";
};

type YahooChartResponse = {
  chart?: {
    result?: Array<{
      meta?: { exchangeTimezoneName?: string };
      timestamp?: number[];
      indicators?: {
        quote?: Array<{
          close?: Array<number | null>;
        }>;
      };
    }>;
  };
};

type Snapshot = {
  date: string;
  close: number;
  previous: number | null;
  minute: number | null;
  mode: "16et" | "near-16et" | "daily-fallback";
};

const DEFINITIONS: Definition[] = [
  { symbol: "NQ", yahooSymbol: "NQ=F", name: "나스닥100 선물", unitLabel: "Index", group: "index" },
  { symbol: "ES", yahooSymbol: "ES=F", name: "S&P500 선물", unitLabel: "Index", group: "index" },
  { symbol: "YM", yahooSymbol: "YM=F", name: "다우 선물", unitLabel: "Index", group: "index" },
  { symbol: "RTY", yahooSymbol: "RTY=F", name: "러셀2000 선물", unitLabel: "Index", group: "index" },
  { symbol: "CL", yahooSymbol: "CL=F", name: "WTI 원유 선물", unitLabel: "USD/bbl", group: "commodity" },
  { symbol: "GC", yahooSymbol: "GC=F", name: "금 선물", unitLabel: "USD/oz", group: "commodity" },
  { symbol: "SI", yahooSymbol: "SI=F", name: "은 선물", unitLabel: "USD/oz", group: "commodity" },
  { symbol: "NG", yahooSymbol: "NG=F", name: "천연가스 선물", unitLabel: "USD/MMBtu", group: "commodity" },
  { symbol: "HG", yahooSymbol: "HG=F", name: "구리 선물", unitLabel: "USD/lb", group: "commodity" },
];

const CACHE_SECONDS = 900;
const FETCH_TIMEOUT_MS = 4_500;
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

function dateFromUnix(seconds: number, timeZone: string) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date(seconds * 1000));
  const map = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${map.year}-${map.month}-${map.day}`;
}

function newYorkNow() {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/New_York",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(new Date());
  const map = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return {
    date: `${map.year}-${map.month}-${map.day}`,
    minute: Number(map.hour) * 60 + Number(map.minute),
  };
}

async function fetchYahoo(symbol: string, query: string): Promise<YahooChartResponse | null> {
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
      const payload = (await response.json()) as YahooChartResponse;
      if (payload.chart?.result?.[0]) return payload;
    } catch {
      // 다음 호스트 또는 낮은 해상도 데이터로 재시도
    }
  }
  return null;
}

function intradaySnapshot(
  payload: YahooChartResponse | null,
  toleranceMinutes: number,
  mode: "16et" | "near-16et",
): Snapshot | null {
  const result = payload?.chart?.result?.[0];
  if (!result) return null;

  const timestamps = result.timestamp ?? [];
  const closes = result.indicators?.quote?.[0]?.close ?? [];
  const byDate = new Map<string, Array<{ timestamp: number; minute: number; close: number }>>();
  const now = Date.now();

  timestamps.forEach((timestamp, index) => {
    const close = closes[index];
    if (typeof close !== "number" || !Number.isFinite(close) || timestamp * 1000 > now) return;
    const et = minuteOfDayEt(timestamp);
    const list = byDate.get(et.date) ?? [];
    list.push({ timestamp, minute: et.minute, close });
    byDate.set(et.date, list);
  });

  const snapshots = Array.from(byDate.entries())
    .map(([date, list]) => {
      const best = list
        .filter((row) => Math.abs(row.minute - TARGET_MINUTE_ET) <= toleranceMinutes)
        .sort((left, right) => {
          const leftDistance = Math.abs(left.minute - TARGET_MINUTE_ET);
          const rightDistance = Math.abs(right.minute - TARGET_MINUTE_ET);
          if (leftDistance !== rightDistance) return leftDistance - rightDistance;
          return right.timestamp - left.timestamp;
        })[0];
      return best ? { date, close: best.close, minute: best.minute } : null;
    })
    .filter((item): item is { date: string; close: number; minute: number } => item !== null)
    .sort((left, right) => right.date.localeCompare(left.date));

  const latest = snapshots[0];
  if (!latest) return null;
  const previous = snapshots.find((item) => item.date < latest.date)?.close ?? null;
  return { ...latest, previous, mode };
}

function dailySnapshot(payload: YahooChartResponse | null): Snapshot | null {
  const result = payload?.chart?.result?.[0];
  if (!result) return null;

  const timeZone = result.meta?.exchangeTimezoneName || "America/New_York";
  const timestamps = result.timestamp ?? [];
  const closes = result.indicators?.quote?.[0]?.close ?? [];
  const nowNy = newYorkNow();

  const rows = timestamps
    .map((timestamp, index) => {
      const close = closes[index];
      if (typeof close !== "number" || !Number.isFinite(close)) return null;
      return { timestamp, date: dateFromUnix(timestamp, timeZone), close };
    })
    .filter((item): item is { timestamp: number; date: string; close: number } => item !== null)
    .sort((left, right) => right.timestamp - left.timestamp);

  let latest = rows[0];
  if (!latest) return null;
  if (latest.date === nowNy.date && nowNy.minute < TARGET_MINUTE_ET + 5 && rows[1]) {
    latest = rows[1];
  }
  const previous = rows.find((item) => item.date < latest.date)?.close ?? null;
  return {
    date: latest.date,
    close: latest.close,
    previous,
    minute: null,
    mode: "daily-fallback",
  };
}

async function resilientSnapshot(definition: Definition): Promise<MajorFutureQuote | null> {
  const fiveMinute = intradaySnapshot(
    await fetchYahoo(
      definition.yahooSymbol,
      "range=10d&interval=5m&includePrePost=true&events=div%2Csplits",
    ),
    10,
    "16et",
  );

  const thirtyMinute = fiveMinute
    ? null
    : intradaySnapshot(
        await fetchYahoo(
          definition.yahooSymbol,
          "range=1mo&interval=30m&includePrePost=true&events=div%2Csplits",
        ),
        35,
        "near-16et",
      );

  const daily = fiveMinute || thirtyMinute
    ? null
    : dailySnapshot(
        await fetchYahoo(
          definition.yahooSymbol,
          "range=1mo&interval=1d&includePrePost=false&events=div%2Csplits",
        ),
      );

  const snapshot = fiveMinute ?? thirtyMinute ?? daily;
  if (!snapshot) return null;

  const timeEt =
    snapshot.minute === null
      ? "daily"
      : `${String(Math.floor(snapshot.minute / 60)).padStart(2, "0")}:${String(
          snapshot.minute % 60,
        ).padStart(2, "0")}`;
  const basisLabel =
    snapshot.mode === "16et"
      ? `${timeEt} ET`
      : snapshot.mode === "near-16et"
        ? `${timeEt} ET 근접값`
        : "일봉 마감 대체값";

  return {
    symbol: definition.symbol,
    yahooSymbol: definition.yahooSymbol,
    name: definition.name,
    kind: "future",
    date: snapshot.date,
    timeEt,
    current: round(snapshot.close, Math.abs(snapshot.close) >= 1_000 ? 2 : 3),
    previousClose: snapshot.previous,
    changePercent: percentChange(snapshot.close, snapshot.previous),
    sessionHigh: null,
    sessionLow: null,
    rangePercent: null,
    source: "Yahoo Finance",
    note:
      snapshot.mode === "daily-fallback"
        ? "16:00 ET 분봉을 가져오지 못해 Yahoo 일봉 마감값으로 대체"
        : "미국 현물 정규장 마감 16:00 ET 동시점 · 선물 공식 정산가 아님",
    group: definition.group,
    unitLabel: definition.unitLabel,
    snapshotMode: snapshot.mode,
    basisLabel,
  };
}

async function buildMajorFuturesSnapshot(): Promise<MajorFutureQuote[]> {
  const market = await getUsMarketCloseDashboard();
  const definitionBySymbol = new Map(DEFINITIONS.map((item) => [item.symbol, item]));

  const indexFutures: MajorFutureQuote[] = market.futures
    .filter((quote) => definitionBySymbol.get(quote.symbol)?.group === "index")
    .map((quote) => {
      const definition = definitionBySymbol.get(quote.symbol)!;
      return {
        ...quote,
        group: "index" as const,
        unitLabel: definition.unitLabel,
        snapshotMode: "16et" as const,
        basisLabel: `${quote.timeEt} ET`,
      };
    });

  const existingIndex = new Set(indexFutures.map((item) => item.symbol));
  const fallbackDefinitions = DEFINITIONS.filter(
    (item) => item.group === "commodity" || !existingIndex.has(item.symbol),
  );
  const fallbackQuotes = await Promise.all(fallbackDefinitions.map(resilientSnapshot));

  const result = [
    ...indexFutures,
    ...fallbackQuotes.filter((item): item is MajorFutureQuote => item !== null),
  ].sort((left, right) => {
    return DEFINITIONS.findIndex((item) => item.symbol === left.symbol) -
      DEFINITIONS.findIndex((item) => item.symbol === right.symbol);
  });

  // 외부 시세가 순간적으로 모두 실패했을 때 빈 배열을 정상 캐시로 저장하지 않는다.
  if (result.length === 0) {
    throw new Error("주요 선물 시세 원천이 일시적으로 응답하지 않습니다.");
  }

  return result;
}

const cachedMajorFuturesSnapshot = unstable_cache(
  buildMajorFuturesSnapshot,
  ["major-futures-16et-v2"],
  {
    revalidate: CACHE_SECONDS,
    tags: ["major-futures-16et"],
  },
);

export async function getMajorFuturesSnapshot() {
  return cachedMajorFuturesSnapshot();
}
