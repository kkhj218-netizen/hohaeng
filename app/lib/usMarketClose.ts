import "server-only";

export type UsMarketCloseQuote = {
  symbol: string;
  yahooSymbol: string;
  name: string;
  kind: "cash" | "future";
  date: string;
  timeEt: string;
  current: number;
  previousClose: number | null;
  changePercent: number | null;
  sessionHigh: number | null;
  sessionLow: number | null;
  rangePercent: number | null;
  source: "Yahoo Finance";
  note: string;
};

export type UsMarketCloseDashboard = {
  generatedAt: string;
  cash: UsMarketCloseQuote[];
  futures: UsMarketCloseQuote[];
};

type YahooChartResponse = {
  chart?: {
    result?: Array<{
      meta?: {
        exchangeTimezoneName?: string;
      };
      timestamp?: number[];
      indicators?: {
        quote?: Array<{
          close?: Array<number | null>;
          high?: Array<number | null>;
          low?: Array<number | null>;
        }>;
      };
    }>;
  };
};

type Definition = {
  symbol: string;
  yahooSymbol: string;
  name: string;
};

const CASH_DEFINITIONS: Definition[] = [
  { symbol: "NASDAQ", yahooSymbol: "^IXIC", name: "나스닥 종합" },
  { symbol: "SP500", yahooSymbol: "^GSPC", name: "S&P 500" },
  { symbol: "DOW", yahooSymbol: "^DJI", name: "다우존스" },
  { symbol: "RUT", yahooSymbol: "^RUT", name: "러셀 2000" },
];

const FUTURE_DEFINITIONS: Definition[] = [
  { symbol: "NQ", yahooSymbol: "NQ=F", name: "나스닥100 선물" },
  { symbol: "ES", yahooSymbol: "ES=F", name: "S&P500 선물" },
  { symbol: "YM", yahooSymbol: "YM=F", name: "다우 선물" },
  { symbol: "RTY", yahooSymbol: "RTY=F", name: "러셀2000 선물" },
];

function round(value: number, digits = 2): number {
  const factor = 10 ** digits;
  return Math.round((value + Number.EPSILON) * factor) / factor;
}

function percentChange(current: number, previous: number | null): number | null {
  if (previous === null || previous === 0) return null;
  return round(((current / previous) - 1) * 100, 2);
}

function sessionRangePercent(high: number | null, low: number | null, close: number) {
  if (high === null || low === null || close === 0 || high < low) return null;
  return round(((high - low) / close) * 100, 2);
}

function newYorkParts(value: Date) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/New_York",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(value);
  const map = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return {
    date: `${map.year}-${map.month}-${map.day}`,
    hour: Number(map.hour),
    minute: Number(map.minute),
  };
}

function dateFromUnix(seconds: number, timeZone: string): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date(seconds * 1000));
  const map = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${map.year}-${map.month}-${map.day}`;
}

async function fetchYahoo(symbol: string, query: string): Promise<YahooChartResponse | null> {
  for (const host of ["query1.finance.yahoo.com", "query2.finance.yahoo.com"]) {
    try {
      const response = await fetch(
        `https://${host}/v8/finance/chart/${encodeURIComponent(symbol)}?${query}`,
        {
          next: { revalidate: 300 },
          headers: {
            Accept: "application/json,text/plain;q=0.9,*/*;q=0.8",
            "User-Agent":
              "Mozilla/5.0 (compatible; HOHAENG-OS/1.0; +https://hohaeng.vercel.app)",
          },
          signal: AbortSignal.timeout(10_000),
        },
      );
      if (!response.ok) continue;
      return (await response.json()) as YahooChartResponse;
    } catch {
      // backup host로 재시도
    }
  }
  return null;
}

async function fetchCashClose(definition: Definition): Promise<UsMarketCloseQuote | null> {
  const payload = await fetchYahoo(
    definition.yahooSymbol,
    "range=1mo&interval=1d&includePrePost=false&events=div%2Csplits",
  );
  const result = payload?.chart?.result?.[0];
  if (!result) return null;

  const timeZone = result.meta?.exchangeTimezoneName || "America/New_York";
  const timestamps = result.timestamp ?? [];
  const quote = result.indicators?.quote?.[0];
  const closes = quote?.close ?? [];
  const highs = quote?.high ?? [];
  const lows = quote?.low ?? [];

  const rows = timestamps
    .map((timestamp, index) => {
      const close = closes[index];
      if (typeof close !== "number" || !Number.isFinite(close)) return null;
      const highRaw = highs[index];
      const lowRaw = lows[index];
      const high = typeof highRaw === "number" && Number.isFinite(highRaw) ? highRaw : null;
      const low = typeof lowRaw === "number" && Number.isFinite(lowRaw) ? lowRaw : null;
      return {
        timestamp,
        date: dateFromUnix(timestamp, timeZone),
        close,
        high,
        low,
      };
    })
    .filter(
      (row): row is {
        timestamp: number;
        date: string;
        close: number;
        high: number | null;
        low: number | null;
      } => row !== null,
    )
    .sort((a, b) => b.timestamp - a.timestamp);

  if (rows.length === 0) return null;

  const nowNy = newYorkParts(new Date());
  const beforeRegularClose = nowNy.hour < 16 || (nowNy.hour === 16 && nowNy.minute < 5);

  let latest = rows[0];
  if (beforeRegularClose && latest.date === nowNy.date && rows[1]) {
    latest = rows[1];
  }

  const previous = rows.find((row) => row.date < latest.date)?.close ?? null;
  return {
    ...definition,
    kind: "cash",
    date: latest.date,
    timeEt: "16:00",
    current: round(latest.close, latest.close >= 10_000 ? 1 : 2),
    previousClose: previous,
    changePercent: percentChange(latest.close, previous),
    sessionHigh: latest.high,
    sessionLow: latest.low,
    rangePercent: sessionRangePercent(latest.high, latest.low, latest.close),
    source: "Yahoo Finance",
    note: "미국 정규장 종가",
  };
}

function minuteOfDayEt(timestamp: number): { date: string; minute: number } {
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

async function fetchFutureCashCloseSnapshot(
  definition: Definition,
): Promise<UsMarketCloseQuote | null> {
  const payload = await fetchYahoo(
    definition.yahooSymbol,
    "range=10d&interval=5m&includePrePost=true&events=div%2Csplits",
  );
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
  const targetMinute = 16 * 60;
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
        .filter((row) => row.minute >= targetMinute - 10 && row.minute <= targetMinute + 5)
        .sort((a, b) => {
          const aDistance = Math.abs(a.minute - targetMinute);
          const bDistance = Math.abs(b.minute - targetMinute);
          if (aDistance !== bDistance) return aDistance - bDistance;
          return b.timestamp - a.timestamp;
        });
      const best = candidates[0];
      return best ? { date, close: best.close, minute: best.minute } : null;
    })
    .filter(
      (item): item is { date: string; close: number; minute: number } => item !== null,
    )
    .sort((a, b) => b.date.localeCompare(a.date));

  const latest = snapshots[0];
  if (!latest) return null;
  const previous = snapshots.find((item) => item.date < latest.date)?.close ?? null;

  return {
    ...definition,
    kind: "future",
    date: latest.date,
    timeEt: `${String(Math.floor(latest.minute / 60)).padStart(2, "0")}:${String(
      latest.minute % 60,
    ).padStart(2, "0")}`,
    current: round(latest.close, latest.close >= 10_000 ? 1 : 2),
    previousClose: previous,
    changePercent: percentChange(latest.close, previous),
    sessionHigh: null,
    sessionLow: null,
    rangePercent: null,
    source: "Yahoo Finance",
    note: "미국 현물 정규장 마감 16:00 ET 동시점 · 선물 공식 정산가 아님",
  };
}

export async function getUsMarketCloseDashboard(): Promise<UsMarketCloseDashboard> {
  const [cash, futures] = await Promise.all([
    Promise.all(CASH_DEFINITIONS.map(fetchCashClose)),
    Promise.all(FUTURE_DEFINITIONS.map(fetchFutureCashCloseSnapshot)),
  ]);

  return {
    generatedAt: new Date().toISOString(),
    cash: cash.filter((item): item is UsMarketCloseQuote => item !== null),
    futures: futures.filter((item): item is UsMarketCloseQuote => item !== null),
  };
}
