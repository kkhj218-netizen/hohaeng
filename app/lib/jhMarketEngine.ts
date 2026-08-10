import "server-only";

import { getJhSupabaseAdmin } from "@/app/lib/jhDataSupabase";
import type {
  JhBiggestChange,
  JhCollectionRun,
  JhDashboardData,
  JhFreshnessStatus,
  JhMarketMetric,
  JhMarketSignal,
  JhPeriodChange,
  JhRegime,
  JhRelativeStrength,
  JhSignalSeverity,
} from "@/app/lib/jhMarketTypes";

type JsonObject = Record<string, unknown>;

type MarketSeriesRow = {
  id: string;
  source_id: string | null;
  symbol: string;
  source_series_code: string | null;
  name_ko: string;
  name_en: string;
  category: string;
  country: string | null;
  market: string | null;
  unit: string | null;
  frequency: string;
  description: string | null;
  transform_rule: JsonObject | null;
  display_order: number | null;
};

type SourceRow = {
  id: string;
  source_code: string;
  source_name: string;
  provider: string;
};

type HistoricalRow = {
  observed_at: string;
  value: number | string | null;
};

type CollectionRunRow = {
  id: number | string;
  started_at: string;
  finished_at: string | null;
  status: string;
  records_fetched: number | null;
  records_saved: number | null;
  error_message: string | null;
  metadata: JsonObject | null;
};

type ArchiveIndexRow = {
  id: number | string;
  started_at: string;
  archive_date: string | null;
};

type HistoryResult = {
  series: MarketSeriesRow;
  rows: HistoricalRow[];
  error: string | null;
};

type DisplayPoint = {
  observedAt: string;
  rawValue: number;
  displayValue: number | null;
};

type FrequencyConfig = {
  labels: [string, string, string, string];
  lags: [number, number, number, number];
  percentileWindow: number;
  historyLimit: number;
  trendWindow: number;
  trendWindowLabel: string;
  staleAfterDays: number;
  sourceStaleAfterDays: number;
};

type SeriesCollectionState = {
  checkedAt: string | null;
  sourceUpdatedAt: string | null;
  nextReleaseDate: string | null;
  releaseName: string | null;
};

type FreshnessResult = {
  status: JhFreshnessStatus;
  label: string;
  observationAgeDays: number;
  sourceAgeDays: number | null;
};

type ComputedMetric = {
  metric: JhMarketMetric;
  changeMode: string;
  riskDirection: string;
  crossedTrend: boolean;
};

const CATEGORY_ORDER = [
  "equities",
  "volatility",
  "rates",
  "credit",
  "liquidity",
  "inflation",
  "labor",
  "growth",
  "commodities",
  "fx",
  "crypto",
];

const CATEGORY_LABELS: Record<string, string> = {
  equities: "주식시장",
  volatility: "변동성",
  rates: "금리·채권",
  credit: "신용시장",
  liquidity: "유동성",
  inflation: "물가",
  labor: "고용",
  growth: "경기",
  commodities: "원자재",
  fx: "환율",
  crypto: "가상자산",
};

const FREQUENCY_CONFIG: Record<string, FrequencyConfig> = {
  daily: {
    labels: ["1D", "5D", "20D", "60D"],
    lags: [1, 5, 20, 60],
    percentileWindow: 252,
    historyLimit: 340,
    trendWindow: 20,
    trendWindowLabel: "20일",
    staleAfterDays: 8,
    sourceStaleAfterDays: 7,
  },
  weekly: {
    labels: ["1W", "4W", "13W", "52W"],
    lags: [1, 4, 13, 52],
    percentileWindow: 104,
    historyLimit: 160,
    trendWindow: 13,
    trendWindowLabel: "13주",
    staleAfterDays: 21,
    sourceStaleAfterDays: 18,
  },
  monthly: {
    labels: ["1M", "3M", "6M", "12M"],
    lags: [1, 3, 6, 12],
    percentileWindow: 120,
    historyLimit: 260,
    trendWindow: 12,
    trendWindowLabel: "12개월",
    staleAfterDays: 80,
    sourceStaleAfterDays: 50,
  },
  quarterly: {
    labels: ["1Q", "2Q", "4Q", "8Q"],
    lags: [1, 2, 4, 8],
    percentileWindow: 80,
    historyLimit: 160,
    trendWindow: 8,
    trendWindowLabel: "8분기",
    staleAfterDays: 180,
    sourceStaleAfterDays: 125,
  },
};

const CHANGE_KEYS: JhPeriodChange["key"][] = [
  "short",
  "medium",
  "long",
  "extended",
];

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.min(maximum, Math.max(minimum, value));
}

function round(value: number, digits = 2): number {
  const factor = 10 ** digits;
  return Math.round((value + Number.EPSILON) * factor) / factor;
}

function safeNumber(value: number | string | null | undefined): number | null {
  if (value === null || value === undefined || value === "") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function dateOnly(value: string): string {
  return value.slice(0, 10);
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

function normalizeAsOfDate(value?: string | null): string {
  const today = koreanToday();

  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return today;
  }

  const parsed = new Date(`${value}T00:00:00.000Z`);
  if (Number.isNaN(parsed.getTime())) return today;
  return value > today ? today : value;
}

function daysBetween(from: string, to: string): number {
  const fromTime = new Date(`${dateOnly(from)}T00:00:00.000Z`).getTime();
  const toTime = new Date(`${dateOnly(to)}T00:00:00.000Z`).getTime();

  if (Number.isNaN(fromTime) || Number.isNaN(toTime)) return 0;
  return Math.max(0, Math.floor((toTime - fromTime) / 86_400_000));
}

function shortKoreanDate(value: string): string {
  const [, month, day] = dateOnly(value).split("-");
  return `${Number(month)}월 ${Number(day)}일`;
}

function computeFreshness(
  frequency: string,
  observedAt: string,
  asOfDate: string,
  state?: SeriesCollectionState
): FreshnessResult {
  const config = frequencyConfig(frequency);
  const observationAgeDays = daysBetween(observedAt, asOfDate);
  const sourceAgeDays = state?.sourceUpdatedAt
    ? daysBetween(state.sourceUpdatedAt, asOfDate)
    : null;
  const delayed =
    sourceAgeDays === null
      ? observationAgeDays > config.staleAfterDays
      : sourceAgeDays > config.sourceStaleAfterDays &&
        observationAgeDays > config.staleAfterDays;

  if (delayed) {
    return {
      status: "delayed",
      label: "업데이트 확인 필요",
      observationAgeDays,
      sourceAgeDays,
    };
  }

  const normalized = frequency.toLowerCase();
  if (normalized === "monthly" || normalized === "quarterly") {
    return {
      status: "awaiting_release",
      label: state?.nextReleaseDate
        ? `공식 최신 · ${shortKoreanDate(state.nextReleaseDate)} 발표 대기`
        : "공식 최신 · 다음 발표 대기",
      observationAgeDays,
      sourceAgeDays,
    };
  }

  return {
    status: "fresh",
    label: state?.sourceUpdatedAt ? "FRED 원천 최신" : "최신 유효값",
    observationAgeDays,
    sourceAgeDays,
  };
}

function frequencyConfig(frequency: string): FrequencyConfig {
  return FREQUENCY_CONFIG[frequency.toLowerCase()] ?? FREQUENCY_CONFIG.monthly;
}

function stringRule(
  rule: JsonObject | null,
  key: string,
  fallback: string
): string {
  const value = rule?.[key];
  return typeof value === "string" ? value : fallback;
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

function buildDisplayPoints(
  series: MarketSeriesRow,
  rows: HistoricalRow[]
): DisplayPoint[] {
  const changeMode = stringRule(series.transform_rule, "change_mode", "pct");
  const rawPoints = rows
    .map((row) => {
      const rawValue = safeNumber(row.value);
      return rawValue === null
        ? null
        : {
            observedAt: row.observed_at,
            rawValue,
          };
    })
    .filter(
      (point): point is { observedAt: string; rawValue: number } =>
        point !== null
    );

  return rawPoints.map((point, index) => {
    let displayValue: number | null = point.rawValue;

    if (changeMode === "yoy_pct") {
      const yearLag = series.frequency.toLowerCase() === "quarterly" ? 4 : 12;
      const comparison = rawPoints[index + yearLag]?.rawValue;
      displayValue =
        comparison && comparison !== 0
          ? ((point.rawValue / comparison) - 1) * 100
          : null;
    } else if (changeMode === "qoq_annualized") {
      const comparison = rawPoints[index + 1]?.rawValue;
      displayValue =
        comparison && comparison > 0 && point.rawValue > 0
          ? ((point.rawValue / comparison) ** 4 - 1) * 100
          : null;
    }

    return {
      ...point,
      displayValue:
        displayValue !== null && Number.isFinite(displayValue)
          ? displayValue
          : null,
    };
  });
}

function changeUnit(
  series: MarketSeriesRow,
  changeMode: string
): JhPeriodChange["unit"] {
  if (changeMode === "pct") return "%";
  if (changeMode === "yoy_pct" || changeMode === "qoq_annualized") {
    return "pp";
  }
  if (changeMode === "point") {
    return series.category === "rates" || series.category === "credit"
      ? "bp"
      : "pt";
  }
  return "value";
}

function calculateChange(
  series: MarketSeriesRow,
  points: DisplayPoint[],
  index: number,
  lag: number,
  changeMode: string
): number | null {
  const current = points[index]?.displayValue;
  const previous = points[index + lag]?.displayValue;

  if (current === null || current === undefined) return null;
  if (previous === null || previous === undefined) return null;

  if (changeMode === "pct") {
    return previous === 0 ? null : ((current / previous) - 1) * 100;
  }

  const difference = current - previous;
  if (
    changeMode === "point" &&
    (series.category === "rates" || series.category === "credit")
  ) {
    return difference * 100;
  }

  return difference;
}

function calculateSurprisePercentile(
  series: MarketSeriesRow,
  points: DisplayPoint[],
  changeMode: string,
  window: number
): number | null {
  const changes: number[] = [];
  const maximum = Math.min(points.length - 1, window);

  for (let index = 0; index < maximum; index += 1) {
    const value = calculateChange(series, points, index, 1, changeMode);
    if (value !== null) changes.push(Math.abs(value));
  }

  if (changes.length < 10) return null;
  return percentileRank(changes[0], changes);
}

function calculateConsecutive(points: DisplayPoint[]): {
  direction: JhMarketMetric["consecutiveDirection"];
  count: number;
} {
  const values = points
    .map((point) => point.displayValue)
    .filter((value): value is number => value !== null);

  if (values.length < 2) return { direction: "flat", count: 0 };

  const firstDifference = values[0] - values[1];
  if (firstDifference === 0) return { direction: "flat", count: 0 };

  const direction = firstDifference > 0 ? "up" : "down";
  let count = 1;

  for (let index = 1; index < Math.min(values.length - 1, 10); index += 1) {
    const difference = values[index] - values[index + 1];
    if ((direction === "up" && difference > 0) || (direction === "down" && difference < 0)) {
      count += 1;
    } else {
      break;
    }
  }

  return { direction, count };
}

function initialImportanceScore(
  surprisePercentile: number | null,
  percentile: number | null,
  crossedTrend: boolean,
  consecutiveCount: number,
  crossConfirmation = 50
): number {
  const magnitude = surprisePercentile ?? 35;
  const extremeness = percentile === null ? 30 : Math.abs(percentile - 50) * 2;
  const trendImpact = crossedTrend ? 100 : 45;
  const persistence = clamp(consecutiveCount * 20, 20, 100);

  return Math.round(
    clamp(
      magnitude * 0.3 +
        extremeness * 0.25 +
        crossConfirmation * 0.2 +
        trendImpact * 0.15 +
        persistence * 0.1,
      0,
      100
    )
  );
}

function emptyMetric(
  series: MarketSeriesRow,
  source: SourceRow | undefined,
  error: string | null,
  state?: SeriesCollectionState
): JhMarketMetric {
  const config = frequencyConfig(series.frequency);

  return {
    id: series.id,
    symbol: series.symbol,
    sourceSeriesCode: series.source_series_code ?? series.symbol,
    nameKo: series.name_ko,
    nameEn: series.name_en,
    category: series.category,
    country: series.country,
    market: series.market,
    unit: series.unit ?? "",
    frequency: series.frequency,
    description: series.description,
    displayOrder: series.display_order ?? 999,
    sourceCode: source?.source_code ?? "FRED",
    sourceName: source?.source_name ?? "Federal Reserve Economic Data",
    provider: source?.provider ?? "Federal Reserve Bank of St. Louis",
    observedAt: null,
    currentValue: null,
    currentUnit: series.unit ?? "",
    changes: config.labels.map((label, index) => ({
      key: CHANGE_KEYS[index],
      label,
      value: null,
      unit: "value" as const,
    })),
    percentile: null,
    zScore: null,
    distanceFromHigh: null,
    trend: "unknown",
    trendLabel: "데이터 없음",
    consecutiveDirection: "flat",
    consecutiveCount: 0,
    surprisePercentile: null,
    importanceScore: 0,
    stale: true,
    staleDays: null,
    sourceAgeDays: null,
    sourceUpdatedAt: state?.sourceUpdatedAt ?? null,
    checkedAt: state?.checkedAt ?? null,
    nextReleaseDate: state?.nextReleaseDate ?? null,
    releaseName: state?.releaseName ?? null,
    freshnessStatus: "unavailable",
    freshnessLabel: "데이터 없음",
    error,
  };
}

function computeMetric(
  result: HistoryResult,
  source: SourceRow | undefined,
  asOfDate: string,
  state?: SeriesCollectionState
): ComputedMetric {
  const { series, rows, error } = result;
  if (error || rows.length === 0) {
    return {
      metric: emptyMetric(series, source, error, state),
      changeMode: stringRule(series.transform_rule, "change_mode", "pct"),
      riskDirection: stringRule(
        series.transform_rule,
        "risk_direction",
        "neutral"
      ),
      crossedTrend: false,
    };
  }

  const config = frequencyConfig(series.frequency);
  const changeMode = stringRule(series.transform_rule, "change_mode", "pct");
  const riskDirection = stringRule(
    series.transform_rule,
    "risk_direction",
    "neutral"
  );
  const points = buildDisplayPoints(series, rows);
  const currentIndex = points.findIndex((point) => point.displayValue !== null);

  if (currentIndex < 0) {
    return {
      metric: emptyMetric(
        series,
        source,
        "계산 가능한 관측값이 부족합니다.",
        state
      ),
      changeMode,
      riskDirection,
      crossedTrend: false,
    };
  }

  const usablePoints = points.slice(currentIndex);
  const currentPoint = usablePoints[0];
  const historicalValues = usablePoints
    .slice(0, config.percentileWindow)
    .map((point) => point.displayValue)
    .filter((value): value is number => value !== null);
  const currentValue = currentPoint.displayValue!;
  const average = mean(historicalValues);
  const deviation = standardDeviation(historicalValues);
  const percentile = percentileRank(currentValue, historicalValues);
  const zScore =
    average !== null && deviation !== null && deviation > 0
      ? round((currentValue - average) / deviation, 2)
      : null;
  const high = historicalValues.length > 0 ? Math.max(...historicalValues) : null;
  const distanceFromHigh =
    high !== null && high !== 0
      ? round(((currentValue / high) - 1) * 100, 2)
      : null;

  const unit = changeUnit(series, changeMode);
  const changes: JhPeriodChange[] = config.lags.map((lag, index) => {
    const value = calculateChange(series, usablePoints, 0, lag, changeMode);
    return {
      key: CHANGE_KEYS[index],
      label: config.labels[index],
      value: value === null ? null : round(value, Math.abs(value) >= 100 ? 1 : 2),
      unit,
    };
  });

  const trendValues = usablePoints
    .slice(0, config.trendWindow + 1)
    .map((point) => point.displayValue)
    .filter((value): value is number => value !== null);
  const currentAverage = mean(trendValues.slice(0, config.trendWindow));
  const previousAverage = mean(trendValues.slice(1, config.trendWindow + 1));
  const previousValue = trendValues[1] ?? null;
  const crossedUp =
    currentAverage !== null &&
    previousAverage !== null &&
    previousValue !== null &&
    currentValue > currentAverage &&
    previousValue <= previousAverage;
  const crossedDown =
    currentAverage !== null &&
    previousAverage !== null &&
    previousValue !== null &&
    currentValue < currentAverage &&
    previousValue >= previousAverage;
  const crossedTrend = crossedUp || crossedDown;
  const trend: JhMarketMetric["trend"] =
    currentAverage === null
      ? "unknown"
      : currentValue > currentAverage
        ? "up"
        : currentValue < currentAverage
          ? "down"
          : "flat";
  const trendLabel = crossedUp
    ? `${config.trendWindowLabel} 평균 상향 돌파`
    : crossedDown
      ? `${config.trendWindowLabel} 평균 하향 이탈`
      : trend === "up"
        ? `${config.trendWindowLabel} 평균 위`
        : trend === "down"
          ? `${config.trendWindowLabel} 평균 아래`
          : "평균선 부근";

  const consecutive = calculateConsecutive(usablePoints);
  const surprisePercentile = calculateSurprisePercentile(
    series,
    usablePoints,
    changeMode,
    config.percentileWindow
  );
  const freshness = computeFreshness(
    series.frequency,
    currentPoint.observedAt,
    asOfDate,
    state
  );
  const currentUnit =
    changeMode === "yoy_pct"
      ? "% YoY"
      : changeMode === "qoq_annualized"
        ? "% SAAR"
        : series.unit ?? "";

  const metric: JhMarketMetric = {
    id: series.id,
    symbol: series.symbol,
    sourceSeriesCode: series.source_series_code ?? series.symbol,
    nameKo: series.name_ko,
    nameEn: series.name_en,
    category: series.category,
    country: series.country,
    market: series.market,
    unit: series.unit ?? "",
    frequency: series.frequency,
    description: series.description,
    displayOrder: series.display_order ?? 999,
    sourceCode: source?.source_code ?? "FRED",
    sourceName: source?.source_name ?? "Federal Reserve Economic Data",
    provider: source?.provider ?? "Federal Reserve Bank of St. Louis",
    observedAt: dateOnly(currentPoint.observedAt),
    currentValue: round(currentValue, Math.abs(currentValue) >= 10_000 ? 1 : 3),
    currentUnit,
    changes,
    percentile,
    zScore,
    distanceFromHigh,
    trend,
    trendLabel,
    consecutiveDirection: consecutive.direction,
    consecutiveCount: consecutive.count,
    surprisePercentile,
    importanceScore: initialImportanceScore(
      surprisePercentile,
      percentile,
      crossedTrend,
      consecutive.count
    ),
    stale: freshness.status === "delayed",
    staleDays: freshness.observationAgeDays,
    sourceAgeDays: freshness.sourceAgeDays,
    sourceUpdatedAt: state?.sourceUpdatedAt ?? null,
    checkedAt: state?.checkedAt ?? null,
    nextReleaseDate: state?.nextReleaseDate ?? null,
    releaseName: state?.releaseName ?? null,
    freshnessStatus: freshness.status,
    freshnessLabel: freshness.label,
    error: null,
  };

  return { metric, changeMode, riskDirection, crossedTrend };
}

async function mapWithConcurrency<T, R>(
  items: T[],
  concurrency: number,
  worker: (item: T) => Promise<R>
): Promise<R[]> {
  const results = new Array<R>(items.length);
  let nextIndex = 0;

  async function runWorker(): Promise<void> {
    while (true) {
      const index = nextIndex;
      nextIndex += 1;
      if (index >= items.length) return;
      results[index] = await worker(items[index]);
    }
  }

  await Promise.all(
    Array.from({ length: Math.min(concurrency, items.length) }, runWorker)
  );
  return results;
}

async function fetchHistory(
  series: MarketSeriesRow,
  asOfDate: string
): Promise<HistoryResult> {
  const { data, error } = await getJhSupabaseAdmin()
    .from("historical_data")
    .select("observed_at, value")
    .eq("series_id", series.id)
    .lte("observed_at", `${asOfDate}T23:59:59.999Z`)
    .order("observed_at", { ascending: false })
    .limit(frequencyConfig(series.frequency).historyLimit);

  return {
    series,
    rows: error ? [] : ((data ?? []) as HistoricalRow[]),
    error: error ? error.message : null,
  };
}

function metadataNumber(metadata: JsonObject | null, key: string): number | null {
  const value = metadata?.[key];
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function isJsonObject(value: unknown): value is JsonObject {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function isDashboardSnapshot(value: unknown): value is JhDashboardData {
  if (!isJsonObject(value)) return false;
  return (
    typeof value.asOfDate === "string" &&
    typeof value.generatedAt === "string" &&
    Array.isArray(value.metrics) &&
    Array.isArray(value.biggestChanges) &&
    Array.isArray(value.anomalies) &&
    typeof value.copyPack === "string"
  );
}

async function fetchArchivedDashboard(
  asOfDate: string
): Promise<JhDashboardData | null> {
  const { data, error } = await getJhSupabaseAdmin()
    .from("collection_runs")
    .select("metadata")
    .eq("source_code", "FRED")
    .contains("metadata", { archive_date: asOfDate })
    .order("started_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error || !data) return null;
  const metadata = (data as { metadata: JsonObject | null }).metadata;
  const snapshot = metadata?.dashboard_archive;
  return isDashboardSnapshot(snapshot) ? snapshot : null;
}

function mapCollectionRun(row: CollectionRunRow | undefined): JhCollectionRun | null {
  if (!row) return null;

  return {
    id: Number(row.id),
    startedAt: row.started_at,
    finishedAt: row.finished_at,
    status: row.status,
    recordsFetched: row.records_fetched ?? 0,
    recordsSaved: row.records_saved ?? 0,
    errorMessage: row.error_message,
    seriesSucceeded: metadataNumber(row.metadata, "series_succeeded"),
    seriesFailed: metadataNumber(row.metadata, "series_failed"),
    seriesUpdated: metadataNumber(row.metadata, "series_updated"),
    seriesUnchanged: metadataNumber(row.metadata, "series_unchanged"),
    metadataWarnings: metadataNumber(row.metadata, "metadata_warnings"),
  };
}

function metadataString(metadata: JsonObject | null, key: string): string | null {
  const value = metadata?.[key];
  return typeof value === "string" && value.length > 0 ? value : null;
}

function latestSeriesCollectionStates(
  row: CollectionRunRow | undefined
): Map<string, SeriesCollectionState> {
  const map = new Map<string, SeriesCollectionState>();
  const value = row?.metadata?.series_results;
  if (!Array.isArray(value)) return map;

  for (const item of value) {
    if (!isJsonObject(item)) continue;
    const code = metadataString(item, "code");
    if (!code) continue;
    map.set(code, {
      checkedAt:
        metadataString(item, "checked_at") ??
        metadataString(row?.metadata ?? null, "source_checked_at") ??
        row?.finished_at ??
        row?.started_at ??
        null,
      sourceUpdatedAt: metadataString(item, "source_last_updated_at"),
      nextReleaseDate: metadataString(item, "next_release_date"),
      releaseName: metadataString(item, "release_name"),
    });
  }

  return map;
}

function latestDatesFromMetadata(row: CollectionRunRow | undefined): Map<string, string> {
  const map = new Map<string, string>();
  const value = row?.metadata?.series_results;
  if (!Array.isArray(value)) return map;

  for (const item of value) {
    if (!item || typeof item !== "object") continue;
    const record = item as JsonObject;
    const code = record.code;
    const latest = record.latest_observation_date;
    if (typeof code === "string" && typeof latest === "string") {
      map.set(code, latest);
    }
  }

  return map;
}

function detectNewReleases(runs: CollectionRunRow[]): Set<string> {
  if (runs.length < 2) return new Set();
  const latest = latestDatesFromMetadata(runs[0]);
  const previous = latestDatesFromMetadata(runs[1]);
  const releases = new Set<string>();

  for (const [code, latestDate] of latest) {
    const previousDate = previous.get(code);
    if (previousDate && latestDate > previousDate) releases.add(code);
  }

  return releases;
}

function riskSign(computed: ComputedMetric): number {
  const change = computed.metric.changes[0]?.value;
  if (change === null || change === undefined || change === 0) return 0;
  if (computed.riskDirection === "up") return change > 0 ? 1 : -1;
  if (computed.riskDirection === "down") return change < 0 ? 1 : -1;
  return 0;
}

function applyCrossConfirmation(computed: ComputedMetric[]): JhMarketMetric[] {
  const keyCategories = new Set([
    "equities",
    "volatility",
    "rates",
    "credit",
    "fx",
    "crypto",
  ]);
  const keySignals = computed
    .filter((item) => keyCategories.has(item.metric.category))
    .map(riskSign)
    .filter((value) => value !== 0);

  return computed.map((item) => {
    const sign = riskSign(item);
    const agreeing = sign === 0 ? 0 : keySignals.filter((value) => value === sign).length;
    const crossConfirmation = sign === 0 ? 40 : clamp(40 + agreeing * 10, 40, 100);

    return {
      ...item.metric,
      importanceScore: initialImportanceScore(
        item.metric.surprisePercentile,
        item.metric.percentile,
        item.crossedTrend,
        item.metric.consecutiveCount,
        crossConfirmation
      ),
    };
  });
}

function metricMap(metrics: JhMarketMetric[]): Map<string, JhMarketMetric> {
  return new Map(metrics.map((metric) => [metric.symbol, metric]));
}

function changeByKey(
  metric: JhMarketMetric | undefined,
  key: JhPeriodChange["key"]
): number | null {
  return metric?.changes.find((change) => change.key === key)?.value ?? null;
}

function severityForScore(score: number): JhSignalSeverity {
  if (score >= 90) return "critical";
  if (score >= 75) return "high";
  if (score >= 55) return "medium";
  return "low";
}

function crossAssetSignals(metrics: JhMarketMetric[]): JhMarketSignal[] {
  const bySymbol = metricMap(metrics);
  const sp500 = bySymbol.get("SP500");
  const nasdaq = bySymbol.get("NASDAQCOM");
  const vix = bySymbol.get("VIXCLS");
  const highYield = bySymbol.get("BAMLH0A0HYM2");
  const signals: JhMarketSignal[] = [];
  const spChange = changeByKey(sp500, "short");
  const nasdaqChange = changeByKey(nasdaq, "short");
  const vixChange = changeByKey(vix, "short");
  const creditChange = changeByKey(highYield, "short");

  if (
    spChange !== null &&
    nasdaqChange !== null &&
    Math.sign(spChange) !== Math.sign(nasdaqChange)
  ) {
    const score = 78;
    signals.push({
      id: "divergence-nasdaq-sp500",
      type: "divergence",
      severity: severityForScore(score),
      title: "나스닥·S&P 500 방향 불일치",
      description: `나스닥 ${round(nasdaqChange, 2)}%, S&P 500 ${round(spChange, 2)}%로 성장주와 대형주 시장의 방향이 갈렸습니다.`,
      importanceScore: score,
      relatedSymbols: ["NASDAQCOM", "SP500"],
    });
  }

  if (spChange !== null && vixChange !== null && spChange > 0 && vixChange > 0) {
    const score = 86;
    signals.push({
      id: "divergence-equity-volatility",
      type: "divergence",
      severity: severityForScore(score),
      title: "주가 상승과 VIX 상승 동시 발생",
      description: `S&P 500은 ${round(spChange, 2)}% 올랐지만 VIX도 ${round(vixChange, 2)}pt 상승해 옵션시장의 경계가 함께 커졌습니다.`,
      importanceScore: score,
      relatedSymbols: ["SP500", "VIXCLS"],
    });
  }

  if (
    spChange !== null &&
    creditChange !== null &&
    spChange > 0 &&
    creditChange > 0
  ) {
    const score = 84;
    signals.push({
      id: "divergence-equity-credit",
      type: "divergence",
      severity: severityForScore(score),
      title: "주식·신용시장 다이버전스",
      description: `S&P 500은 올랐지만 하이일드 스프레드가 ${round(creditChange, 1)}bp 확대돼 신용시장은 위험을 더 크게 반영했습니다.`,
      importanceScore: score,
      relatedSymbols: ["SP500", "BAMLH0A0HYM2"],
    });
  }

  return signals;
}

function buildSignals(
  metrics: JhMarketMetric[],
  newReleaseSymbols: Set<string>
): JhMarketSignal[] {
  const signals: JhMarketSignal[] = [...crossAssetSignals(metrics)];

  for (const metric of metrics) {
    if (metric.currentValue === null || metric.error) continue;

    if (metric.percentile !== null && (metric.percentile <= 10 || metric.percentile >= 90)) {
      const high = metric.percentile >= 90;
      const score = Math.max(metric.importanceScore, high ? metric.percentile : 100 - metric.percentile);
      signals.push({
        id: `extreme-percentile-${metric.symbol}`,
        type: "extreme",
        severity: severityForScore(score),
        title: `${metric.nameKo} ${high ? "고점권" : "저점권"}`,
        description: `현재 값이 비교 구간의 ${round(metric.percentile, 1)}백분위로 역사적 ${high ? "상단" : "하단"}에 위치합니다.`,
        importanceScore: score,
        relatedSymbols: [metric.symbol],
      });
    }

    if (metric.zScore !== null && Math.abs(metric.zScore) >= 2) {
      const score = Math.max(metric.importanceScore, Math.min(96, 70 + Math.abs(metric.zScore) * 8));
      signals.push({
        id: `extreme-zscore-${metric.symbol}`,
        type: "extreme",
        severity: severityForScore(score),
        title: `${metric.nameKo} 통계적 극단 구간`,
        description: `Z-Score ${metric.zScore > 0 ? "+" : ""}${metric.zScore.toFixed(2)}로 장기 평균에서 크게 벗어났습니다.`,
        importanceScore: score,
        relatedSymbols: [metric.symbol],
      });
    }

    if (metric.trendLabel.includes("돌파") || metric.trendLabel.includes("이탈")) {
      const score = Math.max(62, metric.importanceScore);
      signals.push({
        id: `trend-cross-${metric.symbol}`,
        type: "trend",
        severity: severityForScore(score),
        title: `${metric.nameKo} 추세 변화`,
        description: metric.trendLabel,
        importanceScore: score,
        relatedSymbols: [metric.symbol],
      });
    } else if (metric.consecutiveCount >= 5) {
      const score = Math.max(58, metric.importanceScore);
      signals.push({
        id: `trend-persistence-${metric.symbol}`,
        type: "trend",
        severity: severityForScore(score),
        title: `${metric.nameKo} ${metric.consecutiveCount}회 연속 ${metric.consecutiveDirection === "up" ? "상승" : "하락"}`,
        description: `같은 방향의 움직임이 ${metric.consecutiveCount}개 관측치 연속 이어지고 있습니다.`,
        importanceScore: score,
        relatedSymbols: [metric.symbol],
      });
    }

    if (metric.surprisePercentile !== null && metric.surprisePercentile >= 95) {
      const change = metric.changes[0];
      if (change.value !== null) {
        const score = Math.max(metric.importanceScore, metric.surprisePercentile);
        signals.push({
          id: `surprise-${metric.symbol}`,
          type: "surprise",
          severity: severityForScore(score),
          title: `${metric.nameKo} 이례적 변화`,
          description: `${change.label} 변화가 최근 분포의 ${round(metric.surprisePercentile, 1)}백분위 규모입니다.`,
          importanceScore: score,
          relatedSymbols: [metric.symbol],
        });
      }
    }

    if (newReleaseSymbols.has(metric.sourceSeriesCode)) {
      const score = Math.max(68, metric.importanceScore);
      signals.push({
        id: `release-${metric.symbol}`,
        type: "release",
        severity: severityForScore(score),
        title: `${metric.nameKo} 새 관측값 반영`,
        description: `${metric.observedAt} 기준 값이 이번 수집에서 새로 확인됐습니다.`,
        importanceScore: score,
        relatedSymbols: [metric.symbol],
      });
    }
  }

  return signals
    .sort((left, right) => right.importanceScore - left.importanceScore)
    .filter(
      (signal, index, all) =>
        all.findIndex((candidate) => candidate.id === signal.id) === index
    )
    .slice(0, 10);
}

function buildBiggestChanges(
  metrics: JhMarketMetric[],
  newReleaseSymbols: Set<string>
): JhBiggestChange[] {
  const ranked = metrics
    .filter((metric) => {
      const change = metric.changes[0];
      if (metric.currentValue === null || change?.value === null || metric.error) return false;
      if (metric.frequency === "monthly" || metric.frequency === "quarterly") {
        return (
          newReleaseSymbols.has(metric.sourceSeriesCode) ||
          (metric.sourceAgeDays !== null &&
            metric.sourceAgeDays !== undefined &&
            metric.sourceAgeDays <= 3)
        );
      }
      return !metric.stale;
    })
    .sort((left, right) => {
      const leftSurprise = left.surprisePercentile ?? 0;
      const rightSurprise = right.surprisePercentile ?? 0;
      return right.importanceScore + rightSurprise * 0.35 - (left.importanceScore + leftSurprise * 0.35);
    })
    .slice(0, 5);

  return ranked.map((metric, index) => {
    const change = metric.changes[0];
    const surprise = metric.surprisePercentile ?? 50;
    const upperTail = Math.max(1, Math.round(100 - surprise));

    return {
      rank: index + 1,
      symbol: metric.symbol,
      name: metric.nameKo,
      observedAt: metric.observedAt!,
      changeLabel: change.label,
      changeValue: change.value!,
      changeUnit: change.unit,
      surprisePercentile: surprise,
      importanceScore: metric.importanceScore,
      explanation:
        metric.surprisePercentile === null
          ? `${metric.trendLabel}, 중요도 ${metric.importanceScore}점`
          : `최근 관측 변화 분포의 상위 ${upperTail}% 수준, 중요도 ${metric.importanceScore}점`,
    };
  });
}

function buildRelativeStrength(metrics: JhMarketMetric[]): JhRelativeStrength[] {
  const bySymbol = metricMap(metrics);
  const pairs = [
    {
      id: "nasdaq-sp500",
      label: "나스닥 vs S&P 500",
      left: "NASDAQCOM",
      right: "SP500",
    },
    {
      id: "dow-nasdaq",
      label: "다우 vs 나스닥",
      left: "DJIA",
      right: "NASDAQCOM",
    },
    {
      id: "bitcoin-sp500",
      label: "비트코인 vs S&P 500",
      left: "CBBTCUSD",
      right: "SP500",
    },
  ];

  return pairs.flatMap((pair) => {
    const left = bySymbol.get(pair.left);
    const right = bySymbol.get(pair.right);
    if (!left || !right || left.currentValue === null || right.currentValue === null) return [];

    const differences = (["medium", "long", "extended"] as const).map((key) => {
      const leftValue = changeByKey(left, key);
      const rightValue = changeByKey(right, key);
      return leftValue === null || rightValue === null
        ? null
        : round(leftValue - rightValue, 2);
    });
    const reference = differences[1] ?? differences[0];
    const leader = reference === null || reference >= 0 ? left.nameKo : right.nameKo;
    const laggard = leader === left.nameKo ? right.nameKo : left.nameKo;

    return [
      {
        id: pair.id,
        label: pair.label,
        leader,
        laggard,
        short: differences[0],
        medium: differences[1],
        long: differences[2],
        shortLabel: left.changes.find((change) => change.key === "medium")?.label ?? "5D",
        mediumLabel: left.changes.find((change) => change.key === "long")?.label ?? "20D",
        longLabel: left.changes.find((change) => change.key === "extended")?.label ?? "60D",
        interpretation:
          reference === null
            ? "비교 데이터 부족"
            : `${leader}이(가) ${laggard}보다 ${Math.abs(reference).toFixed(2)}%p 강합니다.`,
      },
    ];
  });
}

function calculateRegime(metrics: JhMarketMetric[]): {
  regime: JhRegime;
  score: number;
  confidence: number;
} {
  const bySymbol = metricMap(metrics);
  let score = 50;
  let evidence = 0;

  const addReturnEvidence = (symbol: string, weight: number) => {
    const value = changeByKey(bySymbol.get(symbol), "medium");
    if (value === null) return;
    score -= clamp(value * weight, -15, 15);
    evidence += 1;
  };

  addReturnEvidence("SP500", 3.2);
  addReturnEvidence("NASDAQCOM", 2.6);
  addReturnEvidence("CBBTCUSD", 0.5);

  const vixPercentile = bySymbol.get("VIXCLS")?.percentile;
  if (vixPercentile !== null && vixPercentile !== undefined) {
    score += clamp((vixPercentile - 50) * 0.32, -15, 15);
    evidence += 1;
  }

  const credit = changeByKey(bySymbol.get("BAMLH0A0HYM2"), "medium");
  if (credit !== null) {
    score += clamp(credit * 0.7, -15, 15);
    evidence += 1;
  }

  const dollar = changeByKey(bySymbol.get("DTWEXBGS"), "medium");
  if (dollar !== null) {
    score += clamp(dollar * 1.5, -8, 8);
    evidence += 1;
  }

  if (evidence < 3) {
    return { regime: "Neutral", score: 50, confidence: 20 };
  }

  score = Math.round(clamp(score, 0, 100));
  const regime: JhRegime = score >= 60 ? "Risk-Off" : score <= 40 ? "Risk-On" : "Neutral";
  const confidence = Math.round(clamp(Math.abs(score - 50) * 3 + evidence * 4, 20, 95));
  return { regime, score, confidence };
}

function formatMetricValue(value: number | null, unit: string): string {
  if (value === null) return "N/A";
  const maximumDigits = Math.abs(value) >= 1_000 ? 1 : Math.abs(value) >= 10 ? 2 : 3;
  return `${new Intl.NumberFormat("ko-KR", {
    maximumFractionDigits: maximumDigits,
  }).format(value)}${unit ? ` ${unit}` : ""}`;
}

function formatChange(change: JhPeriodChange | undefined): string {
  if (!change || change.value === null) return "N/A";
  const sign = change.value > 0 ? "+" : "";
  const unit = change.unit === "value" ? "" : change.unit;
  return `${sign}${change.value.toFixed(Math.abs(change.value) >= 100 ? 1 : 2)}${unit}`;
}

function buildCopyPack(
  data: Omit<JhDashboardData, "copyPack">
): string {
  const freshSeries =
    data.coverage.freshSeries ??
    Math.max(0, data.coverage.seriesWithData - data.coverage.staleSeries);
  const awaitingReleaseSeries = data.coverage.awaitingReleaseSeries ?? 0;
  const lines: string[] = [
    "JH FUND MORNING MEETING",
    "",
    `DATE: ${data.asOfDate}`,
    `GENERATED_AT: ${data.generatedAt}`,
    `MARKET_STATUS: ${data.marketStatus}`,
    `LATEST_DATA_UPDATE: ${data.latestDataUpdate ?? "N/A"}`,
    `SOURCE_CHECKED_AT: ${data.sourceCheckedAt ?? "N/A"}`,
    `DATA_COVERAGE: ${data.coverage.seriesWithData}/${data.coverage.totalSeries}`,
    `DATA_FRESHNESS: FRESH ${freshSeries} | AWAITING_RELEASE ${awaitingReleaseSeries} | DELAYED ${data.coverage.staleSeries} | UNAVAILABLE ${data.coverage.unavailableSeries ?? 0}`,
    "FRESHNESS_POLICY: 관측일은 그 수치가 대표하는 기간이며 수집일이 아니다. FRESH와 AWAITING_RELEASE는 FRED 원천 확인 기준 공식 최신값이고, DELAYED는 당일 방향 판단에서 제외한다.",
    `RULE_BASED_REGIME: ${data.regime} (Risk Score ${data.regimeScore}/100, Confidence ${data.regimeConfidence}/100)`,
    "",
    "### TOP CHANGES",
  ];

  if (data.biggestChanges.length === 0) {
    lines.push("- 아직 계산 가능한 최신 변화가 없습니다.");
  } else {
    for (const item of data.biggestChanges) {
      const sign = item.changeValue > 0 ? "+" : "";
      const unit = item.changeUnit === "value" ? "" : item.changeUnit;
      lines.push(
        `${item.rank}. ${item.name} (${item.symbol}) ${item.changeLabel} ${sign}${item.changeValue}${unit} | ${item.explanation} | 데이터 ${item.observedAt}`
      );
    }
  }

  lines.push("", "### ANOMALIES");
  if (data.anomalies.length === 0) {
    lines.push("- 감지된 주요 이상신호 없음");
  } else {
    for (const signal of data.anomalies) {
      lines.push(
        `- [${signal.type.toUpperCase()} / ${signal.importanceScore}] ${signal.title}: ${signal.description}`
      );
    }
  }

  for (const category of data.categoryOrder) {
    const categoryMetrics = data.metrics.filter((metric) => metric.category === category);
    if (categoryMetrics.length === 0) continue;
    lines.push("", `### ${CATEGORY_LABELS[category]?.toUpperCase() ?? category.toUpperCase()}`);

    for (const metric of categoryMetrics) {
      const changes = metric.changes
        .map((change) => `${change.label} ${formatChange(change)}`)
        .join(" | ");
      lines.push(
        `- ${metric.nameKo} (${metric.symbol}): ${formatMetricValue(metric.currentValue, metric.currentUnit)} | ${changes} | Percentile ${metric.percentile ?? "N/A"} | Z ${metric.zScore ?? "N/A"} | Trend ${metric.trendLabel} | Observation ${metric.observedAt ?? "N/A"} | Freshness ${(metric.freshnessStatus ?? (metric.stale ? "delayed" : "fresh")).toUpperCase()} | SourceUpdated ${metric.sourceUpdatedAt ?? "N/A"} | NextRelease ${metric.nextReleaseDate ?? "N/A"} | Source ${metric.sourceCode}`
      );
    }
  }

  lines.push("", "### RELATIVE STRENGTH");
  if (data.relativeStrength.length === 0) {
    lines.push("- 비교 데이터 부족");
  } else {
    for (const item of data.relativeStrength) {
      lines.push(
        `- ${item.label}: ${item.shortLabel} ${item.short ?? "N/A"}%p | ${item.mediumLabel} ${item.medium ?? "N/A"}%p | ${item.longLabel} ${item.long ?? "N/A"}%p | ${item.interpretation}`
      );
    }
  }

  lines.push(
    "",
    "### POSITIONING",
    "- V1 공식 FRED 40개 소스에는 CFTC 포지셔닝 데이터가 포함되지 않음. 데이터 없이 추정하지 말 것.",
    "",
    "### BREADTH",
    "- V1 공식 FRED 40개 소스에는 직접적인 시장 폭 지표가 포함되지 않음. 나스닥·S&P 500·다우 상대 움직임만 보조 근거로 사용할 것.",
    "",
    "---",
    "",
    "당신은 JH Fund Investment Committee다.",
    "역할: CIO, Global Macro Strategist, Quant Strategist, Equity Strategist, Futures Trader, Technical Analyst, Volatility Strategist, Risk Manager.",
    "",
    "위 데이터만 근거로 오늘 시장을 분석하라. 단순 데이터 나열을 금지하고 각 데이터가 서로 어떻게 연결되는지 설명하라. FRESH와 AWAITING_RELEASE는 공식 최신값으로 사용하되 관측 기간을 명시하고, DELAYED와 UNAVAILABLE은 당일 방향성 근거에서 제외하며 추정하지 말라.",
    "",
    "특히 Market Regime, Macro, Liquidity, Rates, Equity Trend, Breadth, Volatility, Credit, Positioning, Cross Asset Confirmation, Divergence, Tail Risk를 종합한다.",
    "",
    "출력 형식:",
    "### EXECUTIVE SUMMARY",
    "오늘 시장을 5줄 이내로 요약.",
    "",
    "### MARKET REGIME",
    "Risk-On / Neutral / Risk-Off 및 Confidence 0~100.",
    "",
    "### INVESTMENT COMMITTEE SCORE",
    "Macro, Liquidity, Trend, Breadth, Volatility, Credit, Positioning을 각각 0~10으로 평가.",
    "",
    "### WHAT CHANGED?",
    "어제와 비교해 가장 중요한 변화 TOP 3.",
    "",
    "### HIDDEN SIGNALS",
    "일반 투자자가 놓치기 쉬운 교차자산 신호와 다이버전스.",
    "",
    "### BULL / BASE / BEAR CASE",
    "각 시나리오의 확률과 조건. 세 확률 합은 반드시 100%.",
    "",
    "### INVALIDATION",
    "현재 시나리오가 틀렸다고 판단할 조건.",
    "",
    "### KEY LEVELS / DATA TO WATCH",
    "오늘 반드시 확인할 데이터 3~5개.",
    "",
    "### RISK MANAGER",
    "현재 시장에서 가장 위험한 변수 TOP 3.",
    "",
    "### JH DECISION SUPPORT",
    "Long / Short / Neutral을 단정하지 말고 상대적으로 유리한 포지션과 관점 변경 조건을 설명.",
    "",
    "### THREADS CONTENT",
    "가장 흥미로운 소재 하나를 골라 Hook → 왜 이상한가 → 쉬운 설명 → 전문적 의미 → 앞으로 볼 것 순서로 300~500자 초안을 작성. 투자 권유가 아닌 시장 분석 형태로 작성."
  );

  return lines.join("\n");
}

async function fetchArchiveDates(series: MarketSeriesRow[]): Promise<string[]> {
  const anchor =
    series.find((item) => item.symbol === "SP500") ??
    series.find((item) => item.frequency.toLowerCase() === "daily");
  if (!anchor) return [];

  const { data, error } = await getJhSupabaseAdmin()
    .from("historical_data")
    .select("observed_at")
    .eq("series_id", anchor.id)
    .order("observed_at", { ascending: false })
    .limit(45);

  if (error) return [];
  return Array.from(
    new Set(
      (data ?? []).map((row) => dateOnly(String((row as { observed_at: string }).observed_at)))
    )
  ).slice(0, 30);
}

export async function getJhMarketDashboard(
  requestedAsOf?: string | null
): Promise<JhDashboardData> {
  const asOfDate = normalizeAsOfDate(requestedAsOf);
  const hasExplicitAsOf = Boolean(
    requestedAsOf && /^\d{4}-\d{2}-\d{2}$/.test(requestedAsOf)
  );
  const supabase = getJhSupabaseAdmin();

  const [seriesResult, sourcesResult, runsResult, archiveIndexResult] = await Promise.all([
    supabase
      .from("market_series")
      .select(
        "id, source_id, symbol, source_series_code, name_ko, name_en, category, country, market, unit, frequency, description, transform_rule, display_order"
      )
      .eq("is_active", true)
      .order("display_order", { ascending: true }),
    supabase
      .from("source_registry")
      .select("id, source_code, source_name, provider")
      .eq("is_active", true),
    supabase
      .from("collection_runs")
      .select(
        "id, started_at, finished_at, status, records_fetched, records_saved, error_message, metadata"
      )
      .eq("source_code", "FRED")
      .order("started_at", { ascending: false })
      .limit(10),
    supabase
      .from("collection_runs")
      .select("id, started_at, archive_date:metadata->>archive_date")
      .eq("source_code", "FRED")
      .order("started_at", { ascending: false })
      .limit(60),
  ]);

  if (seriesResult.error) {
    throw new Error(`JH 지표 목록 조회 실패: ${seriesResult.error.message}`);
  }

  const series = (seriesResult.data ?? []) as MarketSeriesRow[];
  const sources = sourcesResult.error ? [] : ((sourcesResult.data ?? []) as SourceRow[]);
  const runs = runsResult.error ? [] : ((runsResult.data ?? []) as CollectionRunRow[]);
  const usableRuns = runs.filter(
    (run) => run.status === "success" || run.status === "partial"
  );
  const latestUsableRun = usableRuns[0];
  const archiveIndex = archiveIndexResult.error
    ? []
    : ((archiveIndexResult.data ?? []) as unknown as ArchiveIndexRow[]);
  const storedArchiveDates = Array.from(
    new Set(
      archiveIndex
        .map((row) => row.archive_date)
        .filter((value): value is string => typeof value === "string")
    )
  ).sort((left, right) => right.localeCompare(left));

  if (hasExplicitAsOf) {
    const archivedDashboard = await fetchArchivedDashboard(asOfDate);
    if (archivedDashboard) {
      return {
        ...archivedDashboard,
        archiveDates: Array.from(
          new Set([...storedArchiveDates, ...archivedDashboard.archiveDates])
        )
          .sort((left, right) => right.localeCompare(left))
          .slice(0, 60),
      };
    }
  }

  const sourceById = new Map(sources.map((source) => [source.id, source]));
  const seriesCollectionStates =
    asOfDate === koreanToday()
      ? latestSeriesCollectionStates(latestUsableRun)
      : new Map<string, SeriesCollectionState>();
  const histories = await mapWithConcurrency(series, 8, (item) =>
    fetchHistory(item, asOfDate)
  );
  const computed = histories.map((history) =>
    computeMetric(
      history,
      history.series.source_id
        ? sourceById.get(history.series.source_id)
        : undefined,
      asOfDate,
      seriesCollectionStates.get(
        history.series.source_series_code ?? history.series.symbol
      )
    )
  );
  const metrics = applyCrossConfirmation(computed).sort(
    (left, right) => left.displayOrder - right.displayOrder
  );
  const newReleaseSymbols = detectNewReleases(usableRuns);
  const biggestChanges = buildBiggestChanges(metrics, newReleaseSymbols);
  const anomalies = buildSignals(metrics, newReleaseSymbols);
  const relativeStrength = buildRelativeStrength(metrics);
  const regime = calculateRegime(metrics);
  const calculatedArchiveDates = await fetchArchiveDates(series);
  const archiveDates = Array.from(
    new Set([...storedArchiveDates, ...calculatedArchiveDates])
  )
    .sort((left, right) => right.localeCompare(left))
    .slice(0, 60);
  const datedMetrics = metrics.filter(
    (metric): metric is JhMarketMetric & { observedAt: string } =>
      metric.observedAt !== null
  );
  const latestDataUpdate =
    datedMetrics.length > 0
      ? datedMetrics.reduce(
          (latest, metric) => (metric.observedAt > latest ? metric.observedAt : latest),
          datedMetrics[0].observedAt
        )
      : null;
  const seriesWithData = metrics.filter((metric) => metric.currentValue !== null).length;
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
  const unavailableSeries = metrics.length - seriesWithData;
  const failedSeries = histories.filter((history) => history.error).length;
  const marketStatus =
    seriesWithData === 0
      ? "아직 수집된 데이터 없음"
      : staleSeries > 0
        ? `공식 최신 ${freshSeries + awaitingReleaseSeries}개 · 업데이트 확인 필요 ${staleSeries}개`
        : "FRED 원천 기준 공식 최신 데이터 확인";
  const sourceCheckedAt =
    metadataString(latestUsableRun?.metadata ?? null, "source_checked_at") ??
    latestUsableRun?.finished_at ??
    latestUsableRun?.started_at ??
    null;
  const categoryOrder = CATEGORY_ORDER.filter((category) =>
    metrics.some((metric) => metric.category === category)
  );

  const dashboardWithoutCopy: Omit<JhDashboardData, "copyPack"> = {
    asOfDate,
    generatedAt: new Date().toISOString(),
    latestDataUpdate,
    sourceCheckedAt,
    marketStatus,
    regime: regime.regime,
    regimeScore: regime.score,
    regimeConfidence: regime.confidence,
    coverage: {
      totalSeries: series.length,
      seriesWithData,
      staleSeries,
      failedSeries,
      freshSeries,
      awaitingReleaseSeries,
      unavailableSeries,
    },
    categoryOrder,
    categoryLabels: CATEGORY_LABELS,
    metrics,
    biggestChanges,
    anomalies,
    relativeStrength,
    archiveDates,
    collectionRun: mapCollectionRun(runs[0]),
  };

  return {
    ...dashboardWithoutCopy,
    copyPack: buildCopyPack(dashboardWithoutCopy),
  };
}

export async function archiveJhMarketDashboard(
  runId: number
): Promise<JhDashboardData> {
  const supabase = getJhSupabaseAdmin();
  const dashboard = await getJhMarketDashboard();
  const { data: run, error: runError } = await supabase
    .from("collection_runs")
    .select("metadata")
    .eq("id", runId)
    .single();

  if (runError || !run) {
    throw new Error(
      `일별 Data Pack 실행 기록 조회 실패: ${runError?.message ?? "기록 없음"}`
    );
  }

  const existingMetadata = isJsonObject((run as { metadata: unknown }).metadata)
    ? ((run as { metadata: JsonObject }).metadata ?? {})
    : {};
  const { error: updateError } = await supabase
    .from("collection_runs")
    .update({
      metadata: {
        ...existingMetadata,
        archive_date: dashboard.asOfDate,
        dashboard_archive: dashboard,
      },
    })
    .eq("id", runId);

  if (updateError) {
    throw new Error(`일별 Data Pack 보관 실패: ${updateError.message}`);
  }

  return dashboard;
}
