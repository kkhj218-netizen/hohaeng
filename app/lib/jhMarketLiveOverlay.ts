import "server-only";

import type {
  JhDashboardData,
  JhMarketMetric,
  JhPeriodChange,
} from "@/app/lib/jhMarketTypes";

type LiveOverlayConfig = {
  yahooSymbol: string;
  stooqSymbol: string;
  label: string;
  transform?: (value: number) => number;
};

type MarketQuote = {
  date: string;
  current: number;
  history: Array<{ date: string; value: number }>;
  source: "YAHOO" | "STOOQ";
};

type YahooChartResponse = {
  chart?: {
    result?: Array<{
      meta?: {
        regularMarketPrice?: number;
        regularMarketTime?: number;
        previousClose?: number;
        chartPreviousClose?: number;
        exchangeTimezoneName?: string;
      };
      timestamp?: number[];
      indicators?: {
        quote?: Array<{
          close?: Array<number | null>;
        }>;
      };
    }>;
    error?: unknown;
  };
};

const COPPER_POUNDS_PER_METRIC_TON = 2204.6226218;

const LIVE_OVERLAYS: Record<string, LiveOverlayConfig> = {
  DEXKOUS: {
    yahooSymbol: "KRW=X",
    stooqSymbol: "usdkrw",
    label: "원·달러 시장환율",
  },
  DEXJPUS: {
    yahooSymbol: "JPY=X",
    stooqSymbol: "usdjpy",
    label: "엔·달러 시장환율",
  },
  DEXUSEU: {
    yahooSymbol: "EURUSD=X",
    stooqSymbol: "eurusd",
    label: "유로·달러 시장환율",
  },
  DCOILWTICO: {
    yahooSymbol: "CL=F",
    stooqSymbol: "cl.f",
    label: "WTI 선물 시장가격",
  },
  PCOPPUSDM: {
    yahooSymbol: "HG=F",
    stooqSymbol: "hg.f",
    label: "구리 선물 시장가격",
    transform: copperToMetricTon,
  },
  GOLDAMGBD228NLBM: {
    yahooSymbol: "GC=F",
    stooqSymbol: "gc.f",
    label: "금 선물 시장가격",
  },
  DCOILBRENTEU: {
    yahooSymbol: "BZ=F",
    stooqSymbol: "cb.f",
    label: "브렌트유 선물 시장가격",
  },
};

function copperToMetricTon(value: number): number {
  if (value > 2_000) return value;
  const dollarsPerPound = value > 50 ? value / 100 : value;
  return dollarsPerPound * COPPER_POUNDS_PER_METRIC_TON;
}

function round(value: number, digits = 2): number {
  const factor = 10 ** digits;
  return Math.round((value + Number.EPSILON) * factor) / factor;
}

function roundCurrent(value: number): number {
  if (Math.abs(value) >= 10_000) return round(value, 1);
  if (Math.abs(value) >= 1_000) return round(value, 2);
  if (Math.abs(value) >= 100) return round(value, 3);
  return round(value, 4);
}

function koreanToday(): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${values.year}-${values.month}-${values.day}`;
}

function dateFromUnix(seconds: number, timeZone = "UTC"): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date(seconds * 1000));
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${values.year}-${values.month}-${values.day}`;
}

function daysBetween(from: string, to: string): number {
  const fromTime = new Date(`${from}T00:00:00.000Z`).getTime();
  const toTime = new Date(`${to}T00:00:00.000Z`).getTime();
  if (!Number.isFinite(fromTime) || !Number.isFinite(toTime)) return 0;
  return Math.max(0, Math.floor((toTime - fromTime) / 86_400_000));
}

function transformValue(config: LiveOverlayConfig, value: number): number {
  return config.transform ? config.transform(value) : value;
}

async function fetchYahooQuote(
  config: LiveOverlayConfig
): Promise<MarketQuote | null> {
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(
    config.yahooSymbol
  )}?range=6mo&interval=1d&includePrePost=false&events=div%2Csplits`;

  try {
    const response = await fetch(url, {
      cache: "no-store",
      headers: {
        Accept: "application/json,text/plain;q=0.9,*/*;q=0.8",
        "User-Agent":
          "Mozilla/5.0 (compatible; HOHAENG-OS/1.0; +https://hohaeng.vercel.app)",
      },
      signal: AbortSignal.timeout(10_000),
    });

    if (!response.ok) return null;

    const payload = (await response.json()) as YahooChartResponse;
    const result = payload.chart?.result?.[0];
    if (!result?.meta) return null;

    const meta = result.meta;
    const timeZone = meta.exchangeTimezoneName || "UTC";
    const timestamps = result.timestamp ?? [];
    const closes = result.indicators?.quote?.[0]?.close ?? [];

    const history = timestamps
      .map((timestamp, index) => {
        const raw = closes[index];
        if (typeof raw !== "number" || !Number.isFinite(raw)) return null;
        return {
          date: dateFromUnix(timestamp, timeZone),
          value: transformValue(config, raw),
        };
      })
      .filter(
        (item): item is { date: string; value: number } => item !== null
      )
      .sort((left, right) => right.date.localeCompare(left.date));

    const marketPrice = meta.regularMarketPrice;
    const marketTime = meta.regularMarketTime;

    if (
      typeof marketPrice === "number" &&
      Number.isFinite(marketPrice) &&
      typeof marketTime === "number" &&
      Number.isFinite(marketTime)
    ) {
      const date = dateFromUnix(marketTime, timeZone);
      const current = transformValue(config, marketPrice);
      const olderHistory = history.filter((item) => item.date < date);

      if (olderHistory.length === 0) {
        const previous = meta.previousClose ?? meta.chartPreviousClose;
        if (typeof previous === "number" && Number.isFinite(previous)) {
          olderHistory.push({
            date,
            value: transformValue(config, previous),
          });
        }
      }

      return {
        date,
        current,
        history: olderHistory,
        source: "YAHOO",
      };
    }

    const latest = history[0];
    if (!latest) return null;

    return {
      date: latest.date,
      current: latest.value,
      history: history.slice(1),
      source: "YAHOO",
    };
  } catch {
    return null;
  }
}

function normalizeDate(value: string): string | null {
  const trimmed = value.trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return trimmed;
  if (/^\d{8}$/.test(trimmed)) {
    return `${trimmed.slice(0, 4)}-${trimmed.slice(4, 6)}-${trimmed.slice(6, 8)}`;
  }
  return null;
}

function safeNumber(value: string | undefined): number | null {
  if (!value || value === "N/D" || value === "-") return null;
  const parsed = Number(value.replace(/,/g, ""));
  return Number.isFinite(parsed) ? parsed : null;
}

function parseCsvRow(line: string): string[] {
  const values: string[] = [];
  let current = "";
  let quoted = false;

  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];
    if (char === '"') {
      if (quoted && line[index + 1] === '"') {
        current += '"';
        index += 1;
      } else {
        quoted = !quoted;
      }
      continue;
    }
    if (char === "," && !quoted) {
      values.push(current);
      current = "";
      continue;
    }
    current += char;
  }

  values.push(current);
  return values;
}

async function fetchStooqQuote(
  config: LiveOverlayConfig
): Promise<MarketQuote | null> {
  const url = `https://stooq.com/q/l/?s=${encodeURIComponent(
    config.stooqSymbol
  )}&f=sd2t2ohlcvp&h&e=csv`;

  try {
    const response = await fetch(url, {
      cache: "no-store",
      headers: {
        Accept: "text/csv,text/plain;q=0.9,*/*;q=0.8",
        "User-Agent": "HOHAENG-OS/1.0 (+https://hohaeng.vercel.app)",
      },
      signal: AbortSignal.timeout(8_000),
    });

    if (!response.ok) return null;
    const text = await response.text();
    if (!text || /Exceeded|apikey/i.test(text)) return null;

    const lines = text
      .trim()
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean);
    if (lines.length < 2) return null;

    const headers = parseCsvRow(lines[0]).map((header) =>
      header.trim().toLowerCase()
    );
    const values = parseCsvRow(lines[1]);
    const row = Object.fromEntries(
      headers.map((header, index) => [header, values[index] ?? ""])
    );

    const date = normalizeDate(row.date ?? "");
    const close = safeNumber(row.close);
    const previous = safeNumber(row.prev ?? row.previous);
    if (!date || close === null) return null;

    return {
      date,
      current: transformValue(config, close),
      history:
        previous === null
          ? []
          : [{ date, value: transformValue(config, previous) }],
      source: "STOOQ",
    };
  } catch {
    return null;
  }
}

async function fetchMarketQuote(
  config: LiveOverlayConfig
): Promise<MarketQuote | null> {
  const yahoo = await fetchYahooQuote(config);
  if (yahoo) return yahoo;
  return fetchStooqQuote(config);
}

function percentChange(current: number, previous: number | undefined): number | null {
  if (previous === undefined || previous === 0) return null;
  return round(((current / previous) - 1) * 100, 2);
}

function liveChanges(
  metric: JhMarketMetric,
  quote: MarketQuote
): JhPeriodChange[] {
  const requestedLags = [1, 5, 20, 60];

  return metric.changes.map((existing, index) => {
    const lag = requestedLags[index];
    const comparison = quote.history[lag - 1]?.value;
    const value = percentChange(quote.current, comparison);

    if (value === null) return existing;

    return {
      ...existing,
      label: existing.label || `${lag}D`,
      value,
      unit: "%",
    };
  });
}

function overlayMetric(
  metric: JhMarketMetric,
  config: LiveOverlayConfig,
  quote: MarketQuote,
  asOfDate: string
): JhMarketMetric | null {
  if (metric.observedAt && quote.date < metric.observedAt) return null;

  const ageDays = daysBetween(quote.date, asOfDate);
  const sourceName =
    quote.source === "YAHOO" ? "Yahoo Finance" : "Stooq";

  return {
    ...metric,
    observedAt: quote.date,
    currentValue: roundCurrent(quote.current),
    changes: liveChanges(metric, quote),
    sourceCode: `${quote.source}+FRED`,
    sourceName: `${sourceName} market quote + FRED history`,
    provider: `${sourceName} market quote + FRED`,
    stale: ageDays > 4,
    staleDays: ageDays,
    sourceAgeDays: ageDays,
    sourceUpdatedAt: `${quote.date}T00:00:00.000Z`,
    checkedAt: new Date().toISOString(),
    freshnessStatus: ageDays > 4 ? "delayed" : "fresh",
    freshnessLabel:
      ageDays > 4
        ? `${config.label} 확인 필요 · FRED 이력 유지`
        : `${config.label} 최신 · ${sourceName} + FRED 이력`,
    error: null,
  };
}

function prependCopyPack(
  dashboard: JhDashboardData,
  overlaidMetrics: JhMarketMetric[]
): string {
  if (overlaidMetrics.length === 0) return dashboard.copyPack;

  const lines = [
    "### LIVE MARKET OVERRIDE — 아래 값 우선 적용",
    "환율·원자재의 현재값과 일별 변화는 시장시세 보강값이며, 장기 통계·백분위·Z-score의 기반은 FRED 이력을 사용한다.",
    ...overlaidMetrics.map((metric) => {
      const changes = metric.changes
        .map((change) => {
          if (change.value === null) return `${change.label} N/A`;
          return `${change.label} ${change.value > 0 ? "+" : ""}${change.value.toFixed(2)}%`;
        })
        .join(" | ");
      return `- ${metric.nameKo} (${metric.sourceSeriesCode}): ${metric.currentValue ?? "N/A"} ${metric.currentUnit} | ${changes} | Observation ${metric.observedAt ?? "N/A"} | Source ${metric.sourceCode}`;
    }),
    "",
    "IMPORTANT: 아래 기존 FRED 섹션과 같은 심볼의 현재값이 다르면 LIVE MARKET OVERRIDE를 우선한다.",
    "",
  ];

  return `${lines.join("\n")}\n${dashboard.copyPack}`;
}

export async function applyLiveMarketOverlay(
  dashboard: JhDashboardData
): Promise<JhDashboardData> {
  const today = koreanToday();

  // 과거 스냅샷은 당시 저장 상태를 그대로 유지한다.
  if (dashboard.asOfDate !== today) return dashboard;

  const targets = dashboard.metrics
    .map((metric) => {
      const config = LIVE_OVERLAYS[metric.sourceSeriesCode];
      return config ? { metric, config } : null;
    })
    .filter(
      (item): item is { metric: JhMarketMetric; config: LiveOverlayConfig } =>
        item !== null
    );

  if (targets.length === 0) return dashboard;

  const quoteResults = await Promise.all(
    targets.map(async ({ metric, config }) => ({
      metric,
      config,
      quote: await fetchMarketQuote(config),
    }))
  );

  const overlayById = new Map<string, JhMarketMetric>();

  for (const result of quoteResults) {
    if (!result.quote) continue;
    const overlaid = overlayMetric(
      result.metric,
      result.config,
      result.quote,
      dashboard.asOfDate
    );
    if (overlaid) overlayById.set(result.metric.id, overlaid);
  }

  if (overlayById.size === 0) return dashboard;

  const metrics = dashboard.metrics.map(
    (metric) => overlayById.get(metric.id) ?? metric
  );
  const overlaidMetrics = metrics.filter((metric) => overlayById.has(metric.id));
  const datedMetrics = metrics.filter(
    (metric): metric is JhMarketMetric & { observedAt: string } =>
      metric.observedAt !== null
  );
  const latestDataUpdate =
    datedMetrics.length > 0
      ? datedMetrics.reduce(
          (latest, metric) =>
            metric.observedAt > latest ? metric.observedAt : latest,
          datedMetrics[0].observedAt
        )
      : dashboard.latestDataUpdate;

  const seriesWithData = metrics.filter(
    (metric) => metric.currentValue !== null
  ).length;
  const freshSeries = metrics.filter(
    (metric) =>
      metric.currentValue !== null && metric.freshnessStatus === "fresh"
  ).length;
  const awaitingReleaseSeries = metrics.filter(
    (metric) =>
      metric.currentValue !== null &&
      metric.freshnessStatus === "awaiting_release"
  ).length;
  const staleSeries = metrics.filter(
    (metric) => metric.currentValue !== null && metric.stale
  ).length;

  const nextDashboard: JhDashboardData = {
    ...dashboard,
    generatedAt: new Date().toISOString(),
    latestDataUpdate,
    marketStatus: `FRED 공식 이력 + 시장시세 ${overlaidMetrics.length}개 최신 보강`,
    coverage: {
      ...dashboard.coverage,
      seriesWithData,
      freshSeries,
      awaitingReleaseSeries,
      staleSeries,
      unavailableSeries: metrics.length - seriesWithData,
    },
    metrics,
  };

  return {
    ...nextDashboard,
    copyPack: prependCopyPack(nextDashboard, overlaidMetrics),
  };
}
