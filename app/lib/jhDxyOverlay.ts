import "server-only";

import type {
  JhDashboardData,
  JhMarketMetric,
  JhPeriodChange,
} from "@/app/lib/jhMarketTypes";

type YahooChartResponse = {
  chart?: {
    result?: Array<{
      meta?: {
        regularMarketPrice?: number;
        regularMarketTime?: number;
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

type DxyQuote = {
  date: string;
  updatedAt: string;
  current: number;
  history: Array<{ date: string; value: number }>;
};

const DXY_YAHOO_SYMBOL = "DX-Y.NYB";
const CHANGE_LAGS = [1, 5, 20, 60] as const;
const CHANGE_LABELS = ["1D", "5D", "20D", "60D"] as const;

function round(value: number, digits = 2): number {
  const factor = 10 ** digits;
  return Math.round((value + Number.EPSILON) * factor) / factor;
}

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.min(maximum, Math.max(minimum, value));
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

function mean(values: number[]): number | null {
  if (values.length === 0) return null;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function standardDeviation(values: number[]): number | null {
  const average = mean(values);
  if (average === null || values.length < 2) return null;
  const variance =
    values.reduce((sum, value) => sum + (value - average) ** 2, 0) /
    values.length;
  const result = Math.sqrt(variance);
  return Number.isFinite(result) ? result : null;
}

function percentileRank(current: number, values: number[]): number | null {
  if (values.length < 2) return null;
  const belowOrEqual = values.filter((value) => value <= current).length;
  return round((belowOrEqual / values.length) * 100, 1);
}

function percentChange(current: number, previous: number | undefined): number | null {
  if (previous === undefined || previous === 0) return null;
  return round(((current / previous) - 1) * 100, 2);
}

async function fetchYahooDxyFromHost(host: string): Promise<DxyQuote | null> {
  const url = `https://${host}/v8/finance/chart/${encodeURIComponent(
    DXY_YAHOO_SYMBOL
  )}?range=1y&interval=1d&includePrePost=false&events=div%2Csplits`;

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
    const meta = result?.meta;
    if (!result || !meta) return null;

    const timeZone = meta.exchangeTimezoneName || "America/New_York";
    const timestamps = result.timestamp ?? [];
    const closes = result.indicators?.quote?.[0]?.close ?? [];
    const history = timestamps
      .map((timestamp, index) => {
        const close = closes[index];
        if (typeof close !== "number" || !Number.isFinite(close)) return null;
        return {
          date: dateFromUnix(timestamp, timeZone),
          value: close,
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
      return {
        date,
        updatedAt: new Date(marketTime * 1000).toISOString(),
        current: marketPrice,
        history: history.filter((item) => item.date < date),
      };
    }

    const latest = history[0];
    if (!latest) return null;

    return {
      date: latest.date,
      updatedAt: `${latest.date}T00:00:00.000Z`,
      current: latest.value,
      history: history.slice(1),
    };
  } catch {
    return null;
  }
}

async function fetchYahooDxy(): Promise<DxyQuote | null> {
  const primary = await fetchYahooDxyFromHost("query1.finance.yahoo.com");
  if (primary) return primary;
  return fetchYahooDxyFromHost("query2.finance.yahoo.com");
}

function buildChanges(quote: DxyQuote): JhPeriodChange[] {
  return CHANGE_LAGS.map((lag, index) => ({
    key: (["short", "medium", "long", "extended"] as const)[index],
    label: CHANGE_LABELS[index],
    value: percentChange(quote.current, quote.history[lag - 1]?.value),
    unit: "%",
  }));
}

function calculateConsecutive(values: number[]): {
  direction: JhMarketMetric["consecutiveDirection"];
  count: number;
} {
  if (values.length < 2) return { direction: "flat", count: 0 };
  const firstDifference = values[0] - values[1];
  if (firstDifference === 0) return { direction: "flat", count: 0 };

  const direction = firstDifference > 0 ? "up" : "down";
  let count = 1;

  for (let index = 1; index < Math.min(values.length - 1, 10); index += 1) {
    const difference = values[index] - values[index + 1];
    if (
      (direction === "up" && difference > 0) ||
      (direction === "down" && difference < 0)
    ) {
      count += 1;
    } else {
      break;
    }
  }

  return { direction, count };
}

function surprisePercentile(values: number[]): number | null {
  if (values.length < 12) return null;
  const changes: number[] = [];
  for (let index = 0; index < Math.min(values.length - 1, 252); index += 1) {
    const previous = values[index + 1];
    if (previous === 0) continue;
    changes.push(Math.abs(((values[index] / previous) - 1) * 100));
  }
  if (changes.length < 10) return null;
  return percentileRank(changes[0], changes);
}

function buildDxyMetric(
  quote: DxyQuote,
  dashboard: JhDashboardData
): JhMarketMetric {
  const values = [quote.current, ...quote.history.map((item) => item.value)];
  const statisticalValues = values.slice(0, 252);
  const average = mean(statisticalValues);
  const deviation = standardDeviation(statisticalValues);
  const percentile = percentileRank(quote.current, statisticalValues);
  const zScore =
    average !== null && deviation !== null && deviation > 0
      ? round((quote.current - average) / deviation, 2)
      : null;
  const high = statisticalValues.length > 0 ? Math.max(...statisticalValues) : null;
  const distanceFromHigh =
    high !== null && high !== 0
      ? round(((quote.current / high) - 1) * 100, 2)
      : null;
  const trendAverage = mean(values.slice(0, 20));
  const trend: JhMarketMetric["trend"] =
    trendAverage === null
      ? "unknown"
      : quote.current > trendAverage
        ? "up"
        : quote.current < trendAverage
          ? "down"
          : "flat";
  const trendLabel =
    trend === "up"
      ? "20일 평균 위"
      : trend === "down"
        ? "20일 평균 아래"
        : trend === "flat"
          ? "20일 평균선 부근"
          : "추세 데이터 부족";
  const consecutive = calculateConsecutive(values);
  const surprise = surprisePercentile(values);
  const extremeness = percentile === null ? 30 : Math.abs(percentile - 50) * 2;
  const importanceScore = Math.round(
    clamp((surprise ?? 35) * 0.45 + extremeness * 0.35 + (trend === "flat" ? 35 : 55) * 0.2, 0, 100)
  );
  const ageDays = daysBetween(quote.date, dashboard.asOfDate);
  const fxDisplayOrders = dashboard.metrics
    .filter((metric) => metric.category === "fx")
    .map((metric) => metric.displayOrder);
  const displayOrder =
    fxDisplayOrders.length > 0 ? Math.max(...fxDisplayOrders) + 1 : 900;

  return {
    id: "live-dxy-yahoo",
    symbol: "DXY",
    sourceSeriesCode: DXY_YAHOO_SYMBOL,
    nameKo: "미국 달러 인덱스 (DXY)",
    nameEn: "U.S. Dollar Index",
    category: "fx",
    country: "US",
    market: "ICE",
    unit: "Index",
    frequency: "daily",
    description:
      "유로·엔·파운드 등 주요 통화 바스켓 대비 미국 달러 가치를 나타내는 DXY 시장지수입니다.",
    displayOrder,
    sourceCode: "YAHOO",
    sourceName: "Yahoo Finance market quote",
    provider: "Yahoo Finance",
    observedAt: quote.date,
    currentValue: round(quote.current, 3),
    currentUnit: "Index",
    changes: buildChanges(quote),
    percentile,
    zScore,
    distanceFromHigh,
    trend,
    trendLabel,
    consecutiveDirection: consecutive.direction,
    consecutiveCount: consecutive.count,
    surprisePercentile: surprise,
    importanceScore,
    stale: ageDays > 4,
    staleDays: ageDays,
    sourceAgeDays: ageDays,
    sourceUpdatedAt: quote.updatedAt,
    checkedAt: new Date().toISOString(),
    nextReleaseDate: null,
    releaseName: null,
    freshnessStatus: ageDays > 4 ? "delayed" : "fresh",
    freshnessLabel:
      ageDays > 4
        ? "DXY 시장지수 확인 필요 · Yahoo Finance"
        : "DXY 시장지수 최신 · Yahoo Finance",
    error: null,
  };
}

function prependDxyCopyPack(
  dashboard: JhDashboardData,
  metric: JhMarketMetric
): string {
  const changes = metric.changes
    .map((change) => {
      if (change.value === null) return `${change.label} N/A`;
      return `${change.label} ${change.value > 0 ? "+" : ""}${change.value.toFixed(2)}%`;
    })
    .join(" | ");

  return [
    "### DXY LIVE MARKET INDEX",
    `- 미국 달러 인덱스 (DXY): ${metric.currentValue ?? "N/A"} Index | ${changes} | Observation ${metric.observedAt ?? "N/A"} | Percentile ${metric.percentile ?? "N/A"} | Z ${metric.zScore ?? "N/A"} | Source Yahoo Finance`,
    "- DTWEXBGS(미국 달러지수)는 연준의 광의 무역가중 달러지수이고, DXY는 주요 6개 통화 바스켓 기반 시장지수이므로 서로 다른 지표로 별도 해석한다.",
    "",
    dashboard.copyPack,
  ].join("\n");
}

export async function applyDxyMarketMetric(
  dashboard: JhDashboardData
): Promise<JhDashboardData> {
  if (dashboard.asOfDate !== koreanToday()) return dashboard;

  const alreadyExists = dashboard.metrics.some(
    (metric) => metric.symbol === "DXY" || metric.sourceSeriesCode === DXY_YAHOO_SYMBOL
  );
  if (alreadyExists) return dashboard;

  const quote = await fetchYahooDxy();
  if (!quote) return dashboard;

  const dxyMetric = buildDxyMetric(quote, dashboard);
  const metrics = [...dashboard.metrics, dxyMetric].sort(
    (left, right) => left.displayOrder - right.displayOrder
  );
  const latestDataUpdate =
    !dashboard.latestDataUpdate || quote.date > dashboard.latestDataUpdate
      ? quote.date
      : dashboard.latestDataUpdate;
  const isFresh = dxyMetric.freshnessStatus === "fresh";
  const categoryOrder = dashboard.categoryOrder.includes("fx")
    ? dashboard.categoryOrder
    : [...dashboard.categoryOrder, "fx"];

  const nextDashboard: JhDashboardData = {
    ...dashboard,
    generatedAt: new Date().toISOString(),
    latestDataUpdate,
    marketStatus: `${dashboard.marketStatus} · DXY 시장지수 추가`,
    coverage: {
      ...dashboard.coverage,
      totalSeries: dashboard.coverage.totalSeries + 1,
      seriesWithData: dashboard.coverage.seriesWithData + 1,
      freshSeries: (dashboard.coverage.freshSeries ?? 0) + (isFresh ? 1 : 0),
      staleSeries: dashboard.coverage.staleSeries + (isFresh ? 0 : 1),
      unavailableSeries: dashboard.coverage.unavailableSeries ?? 0,
    },
    categoryOrder,
    metrics,
  };

  return {
    ...nextDashboard,
    copyPack: prependDxyCopyPack(nextDashboard, dxyMetric),
  };
}
