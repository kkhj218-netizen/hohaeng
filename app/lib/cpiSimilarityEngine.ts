import "server-only";

import { getJhSupabaseAdmin } from "@/app/lib/jhDataSupabase";

const CPI_EVENT_KEY = "US_CPI";
const HISTORY_START = "2016-01-01";

const METRIC_KEYS = ["headline_yoy", "headline_mom", "core_yoy", "core_mom"] as const;
type MetricKey = (typeof METRIC_KEYS)[number];

const ASSETS = [
  { key: "NQ", name: "나스닥100 선물" },
  { key: "RTY", name: "러셀2000 선물" },
  { key: "GC", name: "금 선물" },
  { key: "CL", name: "WTI 원유 선물" },
  { key: "DXY", name: "달러인덱스" },
  { key: "ZT", name: "미국 2년물 국채선물" },
  { key: "ZN", name: "미국 10년물 국채선물" },
] as const;

export type CpiSimilarityAssetKey = (typeof ASSETS)[number]["key"];
export type CpiTrendFilter =
  | "any"
  | "headline_cooling"
  | "headline_heating"
  | "core_cooling"
  | "core_heating";

export type CpiSimilarityFilters = {
  headlineYoyMin?: number;
  headlineYoyMax?: number;
  headlineMomMin?: number;
  headlineMomMax?: number;
  coreYoyMin?: number;
  coreYoyMax?: number;
  coreMomMin?: number;
  coreMomMax?: number;
  trend?: CpiTrendFilter;
};

type EventRow = {
  id: string;
  release_at: string;
  reference_period: string | null;
};

type MetricRow = {
  event_id: string;
  metric_key: string;
  actual_value: number | string | null;
  previous_value: number | string | null;
  forecast_value: number | string | null;
  surprise_value: number | string | null;
};

type ReactionRow = {
  event_id: string;
  asset_key: string;
  asset_name: string;
  return_30m_pct: number | string | null;
  return_close_pct: number | string | null;
  return_1d_pct: number | string | null;
  return_5d_pct: number | string | null;
};

type MetricPoint = {
  actual: number | null;
  previous: number | null;
  forecast: number | null;
  surprise: number | null;
};

export type CpiMetricSnapshot = Record<MetricKey, MetricPoint>;

export type CpiReactionSnapshot = {
  assetKey: string;
  assetName: string;
  thirtyMinute: number | null;
  close: number | null;
  oneDay: number | null;
  fiveDay: number | null;
};

export type CpiSimilarityCase = {
  id: string;
  releaseAt: string;
  referencePeriod: string | null;
  similarityScore: number;
  levelScore: number;
  trendScore: number | null;
  surpriseScore: number | null;
  surpriseUsed: boolean;
  metrics: CpiMetricSnapshot;
  reactions: Record<string, CpiReactionSnapshot>;
};

export type CpiHorizonStat = {
  sampleSize: number;
  positiveCount: number;
  positiveRate: number | null;
  averageReturn: number | null;
  medianReturn: number | null;
};

export type CpiAssetSimilarityStats = {
  assetKey: string;
  assetName: string;
  close: CpiHorizonStat;
  oneDay: CpiHorizonStat;
  fiveDay: CpiHorizonStat;
};

export type CpiSimilarityExplorer = {
  current: CpiSimilarityCase;
  matches: CpiSimilarityCase[];
  assetStats: CpiAssetSimilarityStats[];
  filteredCases: CpiSimilarityCase[];
  filteredAssetStats: CpiAssetSimilarityStats[];
  selectedAsset: CpiSimilarityAssetKey;
  filters: CpiSimilarityFilters;
  assets: Array<{ key: CpiSimilarityAssetKey; name: string }>;
};

function safeNumber(value: number | string | null | undefined): number | null {
  if (value === null || value === undefined || value === "") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function round(value: number, digits = 1): number {
  const factor = 10 ** digits;
  return Math.round((value + Number.EPSILON) * factor) / factor;
}

function blankMetricSnapshot(): CpiMetricSnapshot {
  return {
    headline_yoy: { actual: null, previous: null, forecast: null, surprise: null },
    headline_mom: { actual: null, previous: null, forecast: null, surprise: null },
    core_yoy: { actual: null, previous: null, forecast: null, surprise: null },
    core_mom: { actual: null, previous: null, forecast: null, surprise: null },
  };
}

function median(values: number[]): number | null {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? (sorted[middle - 1] + sorted[middle]) / 2
    : sorted[middle];
}

function horizonStat(values: Array<number | null>): CpiHorizonStat {
  const valid = values.filter((value): value is number => value !== null && Number.isFinite(value));
  const positiveCount = valid.filter((value) => value > 0).length;
  return {
    sampleSize: valid.length,
    positiveCount,
    positiveRate: valid.length > 0 ? round((positiveCount / valid.length) * 100, 1) : null,
    averageReturn:
      valid.length > 0 ? round(valid.reduce((sum, value) => sum + value, 0) / valid.length, 2) : null,
    medianReturn: valid.length > 0 ? round(median(valid) ?? 0, 2) : null,
  };
}

function continuousSimilarity(left: number | null, right: number | null, scale: number): number | null {
  if (left === null || right === null) return null;
  return Math.exp(-Math.abs(left - right) / scale);
}

function direction(value: number | null): -1 | 0 | 1 | null {
  if (value === null) return null;
  if (Math.abs(value) < 0.025) return 0;
  return value > 0 ? 1 : -1;
}

function trendSimilarity(current: MetricPoint, candidate: MetricPoint): number | null {
  if (current.actual === null || current.previous === null || candidate.actual === null || candidate.previous === null) {
    return null;
  }
  const currentDirection = direction(current.actual - current.previous);
  const candidateDirection = direction(candidate.actual - candidate.previous);
  if (currentDirection === null || candidateDirection === null) return null;
  if (currentDirection === candidateDirection) return 1;
  if (currentDirection === 0 || candidateDirection === 0) return 0.5;
  return 0;
}

function similarityScore(current: CpiMetricSnapshot, candidate: CpiMetricSnapshot) {
  const levelDefinitions: Array<[MetricKey, number, number]> = [
    ["headline_yoy", 18, 1.5],
    ["headline_mom", 12, 0.45],
    ["core_yoy", 18, 1.5],
    ["core_mom", 12, 0.45],
  ];
  const trendDefinitions: Array<[MetricKey, number]> = [
    ["headline_yoy", 7],
    ["headline_mom", 5],
    ["core_yoy", 7],
    ["core_mom", 5],
  ];
  const surpriseDefinitions: Array<[MetricKey, number, number]> = [
    ["headline_yoy", 10, 0.35],
    ["core_yoy", 6, 0.35],
  ];

  let weighted = 0;
  let weightTotal = 0;
  let levelWeighted = 0;
  let levelWeight = 0;
  let trendWeighted = 0;
  let trendWeight = 0;
  let surpriseWeighted = 0;
  let surpriseWeight = 0;

  for (const [key, weight, scale] of levelDefinitions) {
    const score = continuousSimilarity(current[key].actual, candidate[key].actual, scale);
    if (score === null) continue;
    weighted += score * weight;
    weightTotal += weight;
    levelWeighted += score * weight;
    levelWeight += weight;
  }

  for (const [key, weight] of trendDefinitions) {
    const score = trendSimilarity(current[key], candidate[key]);
    if (score === null) continue;
    weighted += score * weight;
    weightTotal += weight;
    trendWeighted += score * weight;
    trendWeight += weight;
  }

  for (const [key, weight, scale] of surpriseDefinitions) {
    const score = continuousSimilarity(current[key].surprise, candidate[key].surprise, scale);
    if (score === null) continue;
    weighted += score * weight;
    weightTotal += weight;
    surpriseWeighted += score * weight;
    surpriseWeight += weight;
  }

  return {
    total: weightTotal > 0 ? round((weighted / weightTotal) * 100, 1) : 0,
    level: levelWeight > 0 ? round((levelWeighted / levelWeight) * 100, 1) : 0,
    trend: trendWeight > 0 ? round((trendWeighted / trendWeight) * 100, 1) : null,
    surprise: surpriseWeight > 0 ? round((surpriseWeighted / surpriseWeight) * 100, 1) : null,
    surpriseUsed: surpriseWeight > 0,
  };
}

function inRange(value: number | null, min?: number, max?: number) {
  if (value === null) return false;
  if (min !== undefined && value < min) return false;
  if (max !== undefined && value > max) return false;
  return true;
}

function hasNumericFilter(filters: CpiSimilarityFilters) {
  return [
    filters.headlineYoyMin,
    filters.headlineYoyMax,
    filters.headlineMomMin,
    filters.headlineMomMax,
    filters.coreYoyMin,
    filters.coreYoyMax,
    filters.coreMomMin,
    filters.coreMomMax,
  ].some((value) => value !== undefined);
}

function matchesFilters(item: CpiSimilarityCase, filters: CpiSimilarityFilters) {
  const metrics = item.metrics;
  if ((filters.headlineYoyMin !== undefined || filters.headlineYoyMax !== undefined) &&
      !inRange(metrics.headline_yoy.actual, filters.headlineYoyMin, filters.headlineYoyMax)) return false;
  if ((filters.headlineMomMin !== undefined || filters.headlineMomMax !== undefined) &&
      !inRange(metrics.headline_mom.actual, filters.headlineMomMin, filters.headlineMomMax)) return false;
  if ((filters.coreYoyMin !== undefined || filters.coreYoyMax !== undefined) &&
      !inRange(metrics.core_yoy.actual, filters.coreYoyMin, filters.coreYoyMax)) return false;
  if ((filters.coreMomMin !== undefined || filters.coreMomMax !== undefined) &&
      !inRange(metrics.core_mom.actual, filters.coreMomMin, filters.coreMomMax)) return false;

  const trend = filters.trend ?? "any";
  if (trend !== "any") {
    const metric = trend.startsWith("headline") ? metrics.headline_yoy : metrics.core_yoy;
    if (metric.actual === null || metric.previous === null) return false;
    const delta = metric.actual - metric.previous;
    if (trend.endsWith("cooling") && delta >= 0) return false;
    if (trend.endsWith("heating") && delta <= 0) return false;
  }
  return true;
}

function assetStats(cases: CpiSimilarityCase[]): CpiAssetSimilarityStats[] {
  return ASSETS.map((asset) => {
    const rows = cases.map((item) => item.reactions[asset.key]).filter(Boolean);
    return {
      assetKey: asset.key,
      assetName: asset.name,
      close: horizonStat(rows.map((row) => row.close)),
      oneDay: horizonStat(rows.map((row) => row.oneDay)),
      fiveDay: horizonStat(rows.map((row) => row.fiveDay)),
    };
  });
}

function normalizeAssetKey(value?: string): CpiSimilarityAssetKey {
  return ASSETS.some((asset) => asset.key === value) ? (value as CpiSimilarityAssetKey) : "NQ";
}

export async function getCpiSimilarityExplorer(input?: {
  assetKey?: string;
  filters?: CpiSimilarityFilters;
}): Promise<CpiSimilarityExplorer | null> {
  const supabase = getJhSupabaseAdmin();
  const nowIso = new Date().toISOString();
  const { data: eventData, error: eventError } = await supabase
    .from("economic_events")
    .select("id,release_at,reference_period")
    .eq("event_key", CPI_EVENT_KEY)
    .gte("release_at", `${HISTORY_START}T00:00:00Z`)
    .lte("release_at", nowIso)
    .order("release_at", { ascending: false })
    .limit(140);

  if (eventError) throw new Error(`CPI 유사도 이벤트 조회 실패: ${eventError.message}`);
  const events = (eventData ?? []) as EventRow[];
  if (events.length === 0) return null;

  const ids = events.map((event) => event.id);
  const [{ data: metricData, error: metricError }, { data: reactionData, error: reactionError }] = await Promise.all([
    supabase
      .from("economic_event_metrics")
      .select("event_id,metric_key,actual_value,previous_value,forecast_value,surprise_value")
      .in("event_id", ids),
    supabase
      .from("economic_event_reactions")
      .select("event_id,asset_key,asset_name,return_30m_pct,return_close_pct,return_1d_pct,return_5d_pct")
      .in("event_id", ids),
  ]);

  if (metricError) throw new Error(`CPI 유사도 지표 조회 실패: ${metricError.message}`);
  if (reactionError) throw new Error(`CPI 유사도 시장반응 조회 실패: ${reactionError.message}`);

  const metricByEvent = new Map<string, CpiMetricSnapshot>();
  for (const event of events) metricByEvent.set(event.id, blankMetricSnapshot());
  for (const row of (metricData ?? []) as MetricRow[]) {
    if (!METRIC_KEYS.includes(row.metric_key as MetricKey)) continue;
    const snapshot = metricByEvent.get(row.event_id);
    if (!snapshot) continue;
    snapshot[row.metric_key as MetricKey] = {
      actual: safeNumber(row.actual_value),
      previous: safeNumber(row.previous_value),
      forecast: safeNumber(row.forecast_value),
      surprise: safeNumber(row.surprise_value),
    };
  }

  const reactionByEvent = new Map<string, Record<string, CpiReactionSnapshot>>();
  for (const row of (reactionData ?? []) as ReactionRow[]) {
    const target = reactionByEvent.get(row.event_id) ?? {};
    target[row.asset_key] = {
      assetKey: row.asset_key,
      assetName: row.asset_name,
      thirtyMinute: safeNumber(row.return_30m_pct),
      close: safeNumber(row.return_close_pct),
      oneDay: safeNumber(row.return_1d_pct),
      fiveDay: safeNumber(row.return_5d_pct),
    };
    reactionByEvent.set(row.event_id, target);
  }

  const latest = events.find((event) => {
    const snapshot = metricByEvent.get(event.id);
    return snapshot && METRIC_KEYS.every((key) => snapshot[key].actual !== null);
  });
  if (!latest) return null;

  const currentMetrics = metricByEvent.get(latest.id) ?? blankMetricSnapshot();
  const baseCurrent: CpiSimilarityCase = {
    id: latest.id,
    releaseAt: latest.release_at,
    referencePeriod: latest.reference_period,
    similarityScore: 100,
    levelScore: 100,
    trendScore: 100,
    surpriseScore: currentMetrics.headline_yoy.surprise !== null ? 100 : null,
    surpriseUsed: currentMetrics.headline_yoy.surprise !== null,
    metrics: currentMetrics,
    reactions: reactionByEvent.get(latest.id) ?? {},
  };

  const candidates: CpiSimilarityCase[] = events
    .filter((event) => event.id !== latest.id)
    .map((event) => {
      const metrics = metricByEvent.get(event.id) ?? blankMetricSnapshot();
      const score = similarityScore(currentMetrics, metrics);
      return {
        id: event.id,
        releaseAt: event.release_at,
        referencePeriod: event.reference_period,
        similarityScore: score.total,
        levelScore: score.level,
        trendScore: score.trend,
        surpriseScore: score.surprise,
        surpriseUsed: score.surpriseUsed,
        metrics,
        reactions: reactionByEvent.get(event.id) ?? {},
      };
    })
    .filter((item) => METRIC_KEYS.every((key) => item.metrics[key].actual !== null));

  const matches = [...candidates]
    .sort((a, b) => b.similarityScore - a.similarityScore || b.releaseAt.localeCompare(a.releaseAt))
    .slice(0, 10);

  const filters = input?.filters ?? {};
  const filterActive = hasNumericFilter(filters) || (filters.trend ?? "any") !== "any";
  const filteredCases = filterActive
    ? candidates.filter((item) => matchesFilters(item, filters)).sort((a, b) => b.releaseAt.localeCompare(a.releaseAt)).slice(0, 80)
    : [];

  return {
    current: baseCurrent,
    matches,
    assetStats: assetStats(matches),
    filteredCases,
    filteredAssetStats: assetStats(filteredCases),
    selectedAsset: normalizeAssetKey(input?.assetKey),
    filters,
    assets: ASSETS.map((asset) => ({ key: asset.key, name: asset.name })),
  };
}
