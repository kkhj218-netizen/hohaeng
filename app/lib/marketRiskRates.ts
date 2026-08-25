import "server-only";

import { unstable_cache } from "next/cache";

import type { JhMarketMetric, JhPeriodChange } from "@/app/lib/jhMarketTypes";

type SourceKind = "vix" | "treasury";

type Quote = {
  symbol: string;
  date: string;
  current: number;
  history: Array<{ date: string; value: number }>;
  sourceKind: SourceKind;
};

export type MarketRiskRatesSnapshot = {
  generatedAt: string;
  quotes: Quote[];
};

type YahooChartResponse = {
  chart?: {
    result?: Array<{
      meta?: { exchangeTimezoneName?: string };
      timestamp?: number[];
      indicators?: {
        quote?: Array<{ close?: Array<number | null> }>;
      };
    }>;
  };
};

const CACHE_SECONDS = 30 * 60;
const FETCH_TIMEOUT_MS = 5_000;
const TREASURY_URL =
  "https://home.treasury.gov/resource-center/data-chart-center/interest-rates/pages/xml?data=daily_treasury_yield_curve&field_tdr_date_value=2026";

const TREASURY_FIELDS: Record<string, string> = {
  DGS1MO: "BC_1MONTH",
  DGS3MO: "BC_3MONTH",
  DGS6MO: "BC_6MONTH",
  DGS1: "BC_1YEAR",
  DGS2: "BC_2YEAR",
  DGS3: "BC_3YEAR",
  DGS5: "BC_5YEAR",
  DGS7: "BC_7YEAR",
  DGS10: "BC_10YEAR",
  DGS20: "BC_20YEAR",
  DGS30: "BC_30YEAR",
};

function round(value: number, digits = 2) {
  const factor = 10 ** digits;
  return Math.round((value + Number.EPSILON) * factor) / factor;
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

function daysBetween(from: string, to: string) {
  const left = new Date(`${from}T00:00:00Z`).getTime();
  const right = new Date(`${to}T00:00:00Z`).getTime();
  if (!Number.isFinite(left) || !Number.isFinite(right)) return 0;
  return Math.max(0, Math.floor((right - left) / 86_400_000));
}

async function fetchVix(): Promise<Quote | null> {
  for (const host of ["query1.finance.yahoo.com", "query2.finance.yahoo.com"]) {
    try {
      const response = await fetch(
        `https://${host}/v8/finance/chart/%5EVIX?range=6mo&interval=1d&includePrePost=false&events=div%2Csplits`,
        {
          next: { revalidate: CACHE_SECONDS },
          headers: {
            Accept: "application/json,text/plain;q=0.9,*/*;q=0.8",
            "User-Agent": "Mozilla/5.0 (compatible; HOHAENG-OS/1.0; +https://hohaeng.vercel.app)",
          },
          signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
        },
      );
      if (!response.ok) continue;
      const payload = (await response.json()) as YahooChartResponse;
      const result = payload.chart?.result?.[0];
      if (!result) continue;
      const timeZone = result.meta?.exchangeTimezoneName || "America/New_York";
      const timestamps = result.timestamp ?? [];
      const closes = result.indicators?.quote?.[0]?.close ?? [];
      const rows = timestamps
        .map((timestamp, index) => {
          const value = closes[index];
          if (typeof value !== "number" || !Number.isFinite(value)) return null;
          return { timestamp, date: dateFromUnix(timestamp, timeZone), value };
        })
        .filter((row): row is { timestamp: number; date: string; value: number } => row !== null)
        .sort((a, b) => b.timestamp - a.timestamp);
      const nowNy = newYorkNow();
      let latest = rows[0];
      if (!latest) continue;
      if (latest.date === nowNy.date && nowNy.minute < 16 * 60 + 5 && rows[1]) latest = rows[1];
      const history = rows.filter((row) => row.date <= latest.date).map((row) => ({ date: row.date, value: row.value }));
      return { symbol: "VIXCLS", date: latest.date, current: round(latest.value, 2), history, sourceKind: "vix" };
    } catch {
      // 다음 Yahoo 호스트로 재시도
    }
  }
  return null;
}

function property(entry: string, name: string) {
  const match = entry.match(new RegExp(`<d:${name}(?:\\s[^>]*)?>([^<]*)<\\/d:${name}>`, "i"));
  return match?.[1]?.trim() ?? null;
}

function parseTreasuryXml(xml: string): Quote[] {
  const entries = xml.match(/<entry\b[\s\S]*?<\/entry>/gi) ?? [];
  const rows = entries
    .map((entry) => {
      const rawDate = property(entry, "NEW_DATE");
      if (!rawDate) return null;
      const date = rawDate.slice(0, 10);
      const values: Record<string, number> = {};
      for (const [symbol, field] of Object.entries(TREASURY_FIELDS)) {
        const raw = property(entry, field);
        const parsed = raw === null ? NaN : Number(raw);
        if (Number.isFinite(parsed)) values[symbol] = parsed;
      }
      return { date, values };
    })
    .filter((row): row is { date: string; values: Record<string, number> } => row !== null)
    .sort((a, b) => b.date.localeCompare(a.date));

  return Object.keys(TREASURY_FIELDS)
    .map((symbol) => {
      const available = rows.filter((row) => Number.isFinite(row.values[symbol]));
      const latest = available[0];
      if (!latest) return null;
      return {
        symbol,
        date: latest.date,
        current: round(latest.values[symbol], 3),
        history: available.map((row) => ({ date: row.date, value: row.values[symbol] })),
        sourceKind: "treasury" as const,
      };
    })
    .filter((quote): quote is Quote => quote !== null);
}

async function fetchTreasuryRates(): Promise<Quote[]> {
  try {
    const response = await fetch(TREASURY_URL, {
      next: { revalidate: CACHE_SECONDS },
      headers: {
        Accept: "application/xml,text/xml;q=0.9,*/*;q=0.8",
        "User-Agent": "HOHAENG-OS/1.0 (+https://hohaeng.vercel.app)",
      },
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    });
    if (!response.ok) return [];
    return parseTreasuryXml(await response.text());
  } catch {
    return [];
  }
}

async function buildSnapshot(): Promise<MarketRiskRatesSnapshot> {
  const [vix, treasury] = await Promise.all([fetchVix(), fetchTreasuryRates()]);
  return {
    generatedAt: new Date().toISOString(),
    quotes: [...(vix ? [vix] : []), ...treasury],
  };
}

const cachedSnapshot = unstable_cache(buildSnapshot, ["market-risk-rates-v1"], {
  revalidate: CACHE_SECONDS,
  tags: ["market-risk-rates"],
});

export async function getMarketRiskRatesSnapshot() {
  return cachedSnapshot();
}

function overlayChanges(metric: JhMarketMetric, quote: Quote): JhPeriodChange[] {
  const lags = [1, 5, 20, 60];
  return metric.changes.map((change, index) => {
    const comparison = quote.history[lags[index]]?.value;
    if (comparison === undefined) return change;
    const value = quote.sourceKind === "treasury"
      ? round((quote.current - comparison) * 100, 2)
      : round(quote.current - comparison, 2);
    return {
      ...change,
      value,
      unit: quote.sourceKind === "treasury" ? "bp" : "pt",
    };
  });
}

export function applyMarketRiskRates(
  metrics: JhMarketMetric[],
  snapshot: MarketRiskRatesSnapshot,
): JhMarketMetric[] {
  const quoteMap = new Map(snapshot.quotes.map((quote) => [quote.symbol.toUpperCase(), quote]));
  const today = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());

  return metrics.map((metric) => {
    const quote = quoteMap.get(metric.symbol.toUpperCase()) ?? quoteMap.get(metric.sourceSeriesCode.toUpperCase());
    if (!quote) return metric;
    if (metric.observedAt && quote.date < metric.observedAt) return metric;

    const ageDays = daysBetween(quote.date, today);
    const isVix = quote.sourceKind === "vix";
    return {
      ...metric,
      observedAt: quote.date,
      currentValue: quote.current,
      currentUnit: isVix ? "Index" : "Percent",
      changes: overlayChanges(metric, quote),
      sourceCode: isVix ? "YAHOO+FRED" : "USTREASURY+FRED",
      sourceName: isVix
        ? "Yahoo Finance VIX close + FRED history"
        : "U.S. Treasury official daily rate + FRED history",
      provider: isVix ? "Yahoo Finance + FRED" : "U.S. Department of the Treasury + FRED",
      stale: ageDays > 4,
      staleDays: ageDays,
      sourceAgeDays: ageDays,
      sourceUpdatedAt: `${quote.date}T00:00:00.000Z`,
      checkedAt: snapshot.generatedAt,
      freshnessStatus: ageDays > 4 ? "delayed" : "fresh",
      freshnessLabel: isVix
        ? `VIX 정규장 마감 최신 · Yahoo + FRED 이력`
        : `미 재무부 공식 최신 금리 · FRED 이력`,
      error: null,
    };
  });
}
