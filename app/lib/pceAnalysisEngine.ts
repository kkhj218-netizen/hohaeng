import "server-only";

import { getJhSupabaseAdmin } from "@/app/lib/jhDataSupabase";

const EVENT_KEY = "US_PCE";
const HISTORY_START = "2016-01-01";
const MARKET_START = "2015-01-01";
const FRED_BASE = "https://api.stlouisfed.org/fred";
const FETCH_TIMEOUT_MS = 15_000;

const METRIC_KEYS = ["headline_yoy", "headline_mom", "core_yoy", "core_mom"] as const;
export type PceMetricKey = (typeof METRIC_KEYS)[number];

export const PCE_ASSETS = [
  { key: "NQ", name: "나스닥100 선물" },
  { key: "RTY", name: "러셀2000 선물" },
  { key: "GC", name: "금 선물" },
  { key: "CL", name: "WTI 원유 선물" },
  { key: "DXY", name: "달러인덱스" },
  { key: "ZT", name: "미국 2년물 국채선물" },
  { key: "ZN", name: "미국 10년물 국채선물" },
] as const;

export type PceAssetKey = (typeof PCE_ASSETS)[number]["key"];
export type HorizonKey = "close" | "oneDay" | "fiveDay";

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

export type PceMetricSnapshot = Record<PceMetricKey, MetricPoint>;

export type PceReactionSnapshot = {
  assetKey: string;
  assetName: string;
  close: number | null;
  oneDay: number | null;
  fiveDay: number | null;
};

export type PceSimilarityCase = {
  id: string;
  releaseAt: string;
  referencePeriod: string | null;
  similarityScore: number;
  levelScore: number;
  trendScore: number | null;
  surpriseScore: number | null;
  surpriseUsed: boolean;
  metrics: PceMetricSnapshot;
  reactions: Record<string, PceReactionSnapshot>;
};

export type PceHorizonStat = {
  sampleSize: number;
  positiveCount: number;
  positiveRate: number | null;
  averageReturn: number | null;
  medianReturn: number | null;
  minReturn: number | null;
  maxReturn: number | null;
};

export type PceAssetStats = {
  assetKey: string;
  assetName: string;
  close: PceHorizonStat;
  oneDay: PceHorizonStat;
  fiveDay: PceHorizonStat;
};

export type PceSensitivityRow = {
  size: 5 | 10 | 20;
  actualSize: number;
  averageSimilarity: number | null;
  minimumSimilarity: number | null;
  assetStats: PceAssetStats[];
};

export type PceComparisonQuality = {
  grade: "A" | "B" | "C" | "D";
  score: number;
  label: string;
  top5Average: number;
  reactionCoverage: number;
};

export type PceCrossAssetHorizon = {
  horizon: HorizonKey;
  label: string;
  positive: number;
  negative: number;
  neutral: number;
  medians: Array<{ assetKey: string; assetName: string; median: number | null }>;
};

export type PceSimilarityAnalysis = {
  current: PceSimilarityCase;
  matches: PceSimilarityCase[];
  sensitivity: PceSensitivityRow[];
  top10AssetStats: PceAssetStats[];
  quality: PceComparisonQuality;
  crossAsset: PceCrossAssetHorizon[];
  insights: string[];
};

export type PceRegimeSnapshot = {
  twoYear: number | null;
  tenYear: number | null;
  curve10y2y: number | null;
  vix: number | null;
  fedFunds: number | null;
  dxy: number | null;
  nq20d: number | null;
  nq60d: number | null;
  coverage: number;
  asOfDate: string | null;
};

export type PceRegimeMatch = PceSimilarityCase & {
  pceScore: number;
  regimeScore: number | null;
  combinedScore: number;
  regime: PceRegimeSnapshot;
};

export type PceRegimeSensitivity = {
  size: 5 | 10 | 20;
  actualSize: number;
  averageCombined: number | null;
  minimumCombined: number | null;
  nq1dPositiveRate: number | null;
  nq1dAverage: number | null;
  nq1dMedian: number | null;
  nq5dPositiveRate: number | null;
  nq5dAverage: number | null;
  nq5dMedian: number | null;
};

export type PcePathPoint = {
  day: number;
  label: string;
  median: number | null;
  q25: number | null;
  q75: number | null;
  current: number | null;
  sampleSize: number;
};

export type PceRegimeAnalysis = {
  current: PceSimilarityCase & { regime: PceRegimeSnapshot };
  matches: PceRegimeMatch[];
  sensitivity: PceRegimeSensitivity[];
  path: PcePathPoint[];
  quality: PceComparisonQuality;
  insights: string[];
  methodology: {
    pceWeight: number;
    regimeWeight: number;
    regimeInputs: string[];
  };
};

export type PcePatternKey =
  | "easing_risk_on"
  | "rate_pressure_risk_off"
  | "growth_slowdown"
  | "reflation"
  | "stagflation_pressure"
  | "mixed";

export type PcePatternClassification = {
  key: PcePatternKey;
  label: string;
  description: string;
  confidence: number;
  signals: string[];
};

export type PcePatternHorizon = {
  horizon: HorizonKey;
  label: string;
  historical: PcePatternClassification;
  current: PcePatternClassification | null;
  medians: Array<{ assetKey: string; assetName: string; value: number | null }>;
};

export type PcePatternAnalysis = {
  baseQuality: PceComparisonQuality;
  horizons: PcePatternHorizon[];
  persistence: {
    level: "높음" | "보통" | "낮음";
    label: string;
  };
  insights: string[];
};

type DatePoint = { date: string; value: number };
type YahooPoint = DatePoint & { timestamp: number };

type FredResponse = {
  observations?: Array<{ date?: string; value?: string }>;
  error_message?: string;
};

type YahooResponse = {
  chart?: {
    result?: Array<{
      timestamp?: number[];
      indicators?: { quote?: Array<{ close?: Array<number | null> }> };
    }>;
  };
};

function safeNumber(value: number | string | null | undefined): number | null {
  if (value === null || value === undefined || value === "") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function round(value: number, digits = 1) {
  const factor = 10 ** digits;
  return Math.round((value + Number.EPSILON) * factor) / factor;
}

function blankMetrics(): PceMetricSnapshot {
  return {
    headline_yoy: { actual: null, previous: null, forecast: null, surprise: null },
    headline_mom: { actual: null, previous: null, forecast: null, surprise: null },
    core_yoy: { actual: null, previous: null, forecast: null, surprise: null },
    core_mom: { actual: null, previous: null, forecast: null, surprise: null },
  };
}

function median(values: number[]): number | null {
  if (!values.length) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? (sorted[middle - 1] + sorted[middle]) / 2
    : sorted[middle];
}

function quantile(values: number[], q: number): number | null {
  if (!values.length) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const position = (sorted.length - 1) * q;
  const base = Math.floor(position);
  const rest = position - base;
  return sorted[base + 1] !== undefined
    ? sorted[base] + rest * (sorted[base + 1] - sorted[base])
    : sorted[base];
}

function direction(value: number | null): -1 | 0 | 1 | null {
  if (value === null) return null;
  if (Math.abs(value) < 0.025) return 0;
  return value > 0 ? 1 : -1;
}

function continuousSimilarity(left: number | null, right: number | null, scale: number): number | null {
  if (left === null || right === null) return null;
  return Math.exp(-Math.abs(left - right) / scale);
}

function trendSimilarity(current: MetricPoint, candidate: MetricPoint): number | null {
  if (
    current.actual === null ||
    current.previous === null ||
    candidate.actual === null ||
    candidate.previous === null
  ) return null;
  const left = direction(current.actual - current.previous);
  const right = direction(candidate.actual - candidate.previous);
  if (left === null || right === null) return null;
  if (left === right) return 1;
  if (left === 0 || right === 0) return 0.5;
  return 0;
}

function pceSimilarity(current: PceMetricSnapshot, candidate: PceMetricSnapshot) {
  // Core PCE에 조금 더 높은 가중치를 둔다.
  const levels: Array<[PceMetricKey, number, number]> = [
    ["headline_yoy", 14, 1.3],
    ["headline_mom", 12, 0.4],
    ["core_yoy", 22, 1.3],
    ["core_mom", 18, 0.4],
  ];
  const trends: Array<[PceMetricKey, number]> = [
    ["headline_yoy", 5],
    ["headline_mom", 4],
    ["core_yoy", 8],
    ["core_mom", 7],
  ];
  const surprises: Array<[PceMetricKey, number, number]> = [
    ["headline_yoy", 4, 0.3],
    ["core_yoy", 6, 0.3],
  ];

  let weighted = 0;
  let weight = 0;
  let levelWeighted = 0;
  let levelWeight = 0;
  let trendWeighted = 0;
  let trendWeight = 0;
  let surpriseWeighted = 0;
  let surpriseWeight = 0;

  for (const [key, w, scale] of levels) {
    const score = continuousSimilarity(current[key].actual, candidate[key].actual, scale);
    if (score === null) continue;
    weighted += score * w;
    weight += w;
    levelWeighted += score * w;
    levelWeight += w;
  }
  for (const [key, w] of trends) {
    const score = trendSimilarity(current[key], candidate[key]);
    if (score === null) continue;
    weighted += score * w;
    weight += w;
    trendWeighted += score * w;
    trendWeight += w;
  }
  for (const [key, w, scale] of surprises) {
    const score = continuousSimilarity(current[key].surprise, candidate[key].surprise, scale);
    if (score === null) continue;
    weighted += score * w;
    weight += w;
    surpriseWeighted += score * w;
    surpriseWeight += w;
  }

  return {
    total: weight ? round((weighted / weight) * 100, 1) : 0,
    level: levelWeight ? round((levelWeighted / levelWeight) * 100, 1) : 0,
    trend: trendWeight ? round((trendWeighted / trendWeight) * 100, 1) : null,
    surprise: surpriseWeight ? round((surpriseWeighted / surpriseWeight) * 100, 1) : null,
    surpriseUsed: surpriseWeight > 0,
  };
}

function horizonStat(values: Array<number | null>): PceHorizonStat {
  const valid = values.filter((value): value is number => value !== null && Number.isFinite(value));
  const positiveCount = valid.filter((value) => value > 0).length;
  return {
    sampleSize: valid.length,
    positiveCount,
    positiveRate: valid.length ? round((positiveCount / valid.length) * 100, 1) : null,
    averageReturn: valid.length ? round(valid.reduce((sum, value) => sum + value, 0) / valid.length, 2) : null,
    medianReturn: valid.length ? round(median(valid) ?? 0, 2) : null,
    minReturn: valid.length ? round(Math.min(...valid), 2) : null,
    maxReturn: valid.length ? round(Math.max(...valid), 2) : null,
  };
}

function assetStats(cases: PceSimilarityCase[]): PceAssetStats[] {
  return PCE_ASSETS.map((asset) => {
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

function sensitivity(matches: PceSimilarityCase[], size: 5 | 10 | 20): PceSensitivityRow {
  const slice = matches.slice(0, size);
  const scores = slice.map((item) => item.similarityScore);
  return {
    size,
    actualSize: slice.length,
    averageSimilarity: scores.length ? round(scores.reduce((sum, value) => sum + value, 0) / scores.length, 1) : null,
    minimumSimilarity: scores.length ? round(Math.min(...scores), 1) : null,
    assetStats: assetStats(slice),
  };
}

function comparisonQuality(matches: PceSimilarityCase[]): PceComparisonQuality {
  const top5 = matches.slice(0, 5);
  const top5Average = top5.length
    ? round(top5.reduce((sum, item) => sum + item.similarityScore, 0) / top5.length, 1)
    : 0;
  const reactionValues = top5.flatMap((item) =>
    PCE_ASSETS.flatMap((asset) => {
      const row = item.reactions[asset.key];
      return row ? [row.close, row.oneDay, row.fiveDay] : [null, null, null];
    }),
  );
  const reactionCoverage = reactionValues.length
    ? round((reactionValues.filter((value) => value !== null).length / reactionValues.length) * 100, 1)
    : 0;
  const score = round(top5Average * 0.75 + reactionCoverage * 0.25, 1);
  const grade: PceComparisonQuality["grade"] = score >= 82 ? "A" : score >= 72 ? "B" : score >= 60 ? "C" : "D";
  const label = grade === "A" ? "비교 품질 높음" : grade === "B" ? "비교 품질 양호" : grade === "C" ? "비교 품질 보통" : "비교 품질 낮음";
  return { grade, score, label, top5Average, reactionCoverage };
}

function crossAsset(matches: PceSimilarityCase[]): PceCrossAssetHorizon[] {
  const top10 = matches.slice(0, 10);
  const horizons: Array<[HorizonKey, string]> = [
    ["close", "당일"],
    ["oneDay", "+1D"],
    ["fiveDay", "+5D"],
  ];
  return horizons.map(([horizon, label]) => {
    const medians = PCE_ASSETS.map((asset) => {
      const values = top10
        .map((item) => item.reactions[asset.key]?.[horizon] ?? null)
        .filter((value): value is number => value !== null);
      return { assetKey: asset.key, assetName: asset.name, median: values.length ? round(median(values) ?? 0, 2) : null };
    });
    return {
      horizon,
      label,
      positive: medians.filter((item) => item.median !== null && item.median > 0.05).length,
      negative: medians.filter((item) => item.median !== null && item.median < -0.05).length,
      neutral: medians.filter((item) => item.median !== null && Math.abs(item.median) <= 0.05).length,
      medians,
    };
  });
}

function buildSimilarityInsights(
  matches: PceSimilarityCase[],
  rows: PceSensitivityRow[],
  quality: PceComparisonQuality,
  cross: PceCrossAssetHorizon[],
) {
  const insights: string[] = [
    `현재 PCE 비교 품질은 ${quality.grade}등급(${quality.score.toFixed(1)}점)입니다.`,
  ];
  if (matches[0]) {
    insights.push(`가장 비슷한 과거 PCE는 유사도 ${matches[0].similarityScore.toFixed(1)}점입니다.`);
  }
  const nqRates = rows
    .map((row) => row.assetStats.find((asset) => asset.assetKey === "NQ")?.oneDay.positiveRate ?? null)
    .filter((value): value is number => value !== null);
  if (nqRates.length >= 2) {
    const spread = Math.max(...nqRates) - Math.min(...nqRates);
    insights.push(spread <= 15
      ? `NQ +1D 상승확률은 TOP5·10·20 사이 차이가 ${spread.toFixed(1)}%p로 비교적 안정적입니다.`
      : `NQ +1D 상승확률은 TOP5·10·20 사이 차이가 ${spread.toFixed(1)}%p라 표본 선택에 민감합니다.`);
  }
  const day5 = cross.find((item) => item.horizon === "fiveDay");
  if (day5) {
    insights.push(`유사 TOP10의 +5D 중앙값 방향은 7개 자산 중 상승 ${day5.positive}, 하락 ${day5.negative}, 중립 ${day5.neutral}개입니다.`);
  }
  const top10Nq = assetStats(matches.slice(0, 10)).find((item) => item.assetKey === "NQ");
  if (top10Nq?.fiveDay.medianReturn !== null) {
    insights.push(`NQ +5D 중앙값은 ${top10Nq?.fiveDay.medianReturn !== null ? `${top10Nq.fiveDay.medianReturn > 0 ? "+" : ""}${top10Nq.fiveDay.medianReturn.toFixed(2)}%` : "—"}입니다.`);
  }
  return insights.slice(0, 5);
}

async function loadPceCases(): Promise<{ current: PceSimilarityCase; cases: PceSimilarityCase[] } | null> {
  const supabase = getJhSupabaseAdmin();
  const nowIso = new Date().toISOString();
  const { data: eventData, error: eventError } = await supabase
    .from("economic_events")
    .select("id,release_at,reference_period")
    .eq("event_key", EVENT_KEY)
    .gte("release_at", `${HISTORY_START}T00:00:00Z`)
    .lte("release_at", nowIso)
    .order("release_at", { ascending: false })
    .limit(140);

  if (eventError) throw new Error(`PCE 분석 이벤트 조회 실패: ${eventError.message}`);
  const events = (eventData ?? []) as EventRow[];
  if (!events.length) return null;

  const ids = events.map((event) => event.id);
  const [{ data: metricData, error: metricError }, { data: reactionData, error: reactionError }] = await Promise.all([
    supabase
      .from("economic_event_metrics")
      .select("event_id,metric_key,actual_value,previous_value,forecast_value,surprise_value")
      .in("event_id", ids),
    supabase
      .from("economic_event_reactions")
      .select("event_id,asset_key,asset_name,return_close_pct,return_1d_pct,return_5d_pct")
      .in("event_id", ids),
  ]);
  if (metricError) throw new Error(`PCE 분석 지표 조회 실패: ${metricError.message}`);
  if (reactionError) throw new Error(`PCE 분석 시장반응 조회 실패: ${reactionError.message}`);

  const metricByEvent = new Map<string, PceMetricSnapshot>();
  for (const event of events) metricByEvent.set(event.id, blankMetrics());
  for (const row of (metricData ?? []) as MetricRow[]) {
    if (!METRIC_KEYS.includes(row.metric_key as PceMetricKey)) continue;
    const target = metricByEvent.get(row.event_id);
    if (!target) continue;
    target[row.metric_key as PceMetricKey] = {
      actual: safeNumber(row.actual_value),
      previous: safeNumber(row.previous_value),
      forecast: safeNumber(row.forecast_value),
      surprise: safeNumber(row.surprise_value),
    };
  }

  const reactions = new Map<string, Record<string, PceReactionSnapshot>>();
  for (const row of (reactionData ?? []) as ReactionRow[]) {
    const target = reactions.get(row.event_id) ?? {};
    target[row.asset_key] = {
      assetKey: row.asset_key,
      assetName: row.asset_name,
      close: safeNumber(row.return_close_pct),
      oneDay: safeNumber(row.return_1d_pct),
      fiveDay: safeNumber(row.return_5d_pct),
    };
    reactions.set(row.event_id, target);
  }

  const currentEvent = events.find((event) => {
    const metrics = metricByEvent.get(event.id);
    return metrics && Object.values(metrics).some((metric) => metric.actual !== null);
  });
  if (!currentEvent) return null;
  const currentMetrics = metricByEvent.get(currentEvent.id) ?? blankMetrics();

  const baseCurrent: PceSimilarityCase = {
    id: currentEvent.id,
    releaseAt: currentEvent.release_at,
    referencePeriod: currentEvent.reference_period,
    similarityScore: 100,
    levelScore: 100,
    trendScore: 100,
    surpriseScore: null,
    surpriseUsed: false,
    metrics: currentMetrics,
    reactions: reactions.get(currentEvent.id) ?? {},
  };

  const cases = events
    .filter((event) => event.id !== currentEvent.id)
    .map((event) => {
      const metrics = metricByEvent.get(event.id) ?? blankMetrics();
      const score = pceSimilarity(currentMetrics, metrics);
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
        reactions: reactions.get(event.id) ?? {},
      } satisfies PceSimilarityCase;
    })
    .filter((item) => Object.values(item.metrics).some((metric) => metric.actual !== null))
    .sort((a, b) => b.similarityScore - a.similarityScore);

  return { current: baseCurrent, cases };
}

export async function getPceSimilarityAnalysis(): Promise<PceSimilarityAnalysis | null> {
  const dataset = await loadPceCases();
  if (!dataset) return null;
  const matches = dataset.cases.slice(0, 20);
  const rows = ([5, 10, 20] as const).map((size) => sensitivity(matches, size));
  const quality = comparisonQuality(matches);
  const cross = crossAsset(matches);
  return {
    current: dataset.current,
    matches: matches.slice(0, 10),
    sensitivity: rows,
    top10AssetStats: assetStats(matches.slice(0, 10)),
    quality,
    crossAsset: cross,
    insights: buildSimilarityInsights(matches, rows, quality, cross),
  };
}

function newYorkDate(timestampMs: number) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/New_York",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date(timestampMs));
  const map = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${map.year}-${map.month}-${map.day}`;
}

async function fetchFredSeries(seriesId: string): Promise<DatePoint[]> {
  const apiKey = process.env.FRED_API_KEY;
  if (!apiKey) return [];
  const query = new URLSearchParams({
    api_key: apiKey,
    file_type: "json",
    series_id: seriesId,
    observation_start: MARKET_START,
    sort_order: "asc",
    limit: "100000",
  });
  try {
    const response = await fetch(`${FRED_BASE}/series/observations?${query.toString()}`, {
      next: { revalidate: 21_600 },
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    });
    if (!response.ok) return [];
    const payload = (await response.json()) as FredResponse;
    if (payload.error_message) return [];
    return (payload.observations ?? [])
      .map((item) => ({ date: item.date ?? "", value: Number(item.value) }))
      .filter((item) => /^\d{4}-\d{2}-\d{2}$/.test(item.date) && Number.isFinite(item.value));
  } catch {
    return [];
  }
}

async function fetchYahooDaily(symbol: string): Promise<YahooPoint[]> {
  const period1 = Math.floor(Date.parse(`${MARKET_START}T00:00:00Z`) / 1000);
  const period2 = Math.floor((Date.now() + 7 * 86_400_000) / 1000);
  const query = new URLSearchParams({
    period1: String(period1),
    period2: String(period2),
    interval: "1d",
    includePrePost: "false",
    events: "div,splits",
  });
  for (const host of ["query1.finance.yahoo.com", "query2.finance.yahoo.com"]) {
    try {
      const response = await fetch(`https://${host}/v8/finance/chart/${encodeURIComponent(symbol)}?${query.toString()}`, {
        next: { revalidate: 21_600 },
        headers: { "User-Agent": "Mozilla/5.0 (compatible; HOHAENG-OS/1.0; +https://hohaeng.vercel.app)" },
        signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
      });
      if (!response.ok) continue;
      const payload = (await response.json()) as YahooResponse;
      const result = payload.chart?.result?.[0];
      if (!result) continue;
      const timestamps = result.timestamp ?? [];
      const closes = result.indicators?.quote?.[0]?.close ?? [];
      return timestamps
        .map((timestamp, index) => {
          const value = closes[index];
          return typeof value === "number" && Number.isFinite(value)
            ? { timestamp, value, date: newYorkDate(timestamp * 1000) }
            : null;
        })
        .filter((item): item is YahooPoint => item !== null)
        .sort((a, b) => a.date.localeCompare(b.date));
    } catch {
      // try backup host
    }
  }
  return [];
}

function latestBefore(points: DatePoint[], date: string): DatePoint | null {
  let best: DatePoint | null = null;
  for (const point of points) {
    if (point.date >= date) break;
    best = point;
  }
  return best;
}

function latestYahooIndexBefore(points: YahooPoint[], date: string) {
  let index = -1;
  for (let i = 0; i < points.length; i += 1) {
    if (points[i].date >= date) break;
    index = i;
  }
  return index;
}

function pctChange(value: number | null, base: number | null) {
  if (value === null || base === null || base === 0) return null;
  return ((value / base) - 1) * 100;
}

function regimeSnapshot(
  releaseAt: string,
  data: {
    dgs2: DatePoint[];
    dgs10: DatePoint[];
    vix: DatePoint[];
    dff: DatePoint[];
    dxy: YahooPoint[];
    nq: YahooPoint[];
  },
): PceRegimeSnapshot {
  const date = newYorkDate(Date.parse(releaseAt));
  const twoYear = latestBefore(data.dgs2, date)?.value ?? null;
  const tenYear = latestBefore(data.dgs10, date)?.value ?? null;
  const vix = latestBefore(data.vix, date)?.value ?? null;
  const fedFunds = latestBefore(data.dff, date)?.value ?? null;
  const dxy = latestBefore(data.dxy, date)?.value ?? null;
  const nqIndex = latestYahooIndexBefore(data.nq, date);
  const nqNow = nqIndex >= 0 ? data.nq[nqIndex]?.value ?? null : null;
  const nq20d = nqIndex >= 20 ? pctChange(nqNow, data.nq[nqIndex - 20]?.value ?? null) : null;
  const nq60d = nqIndex >= 60 ? pctChange(nqNow, data.nq[nqIndex - 60]?.value ?? null) : null;
  const curve10y2y = twoYear !== null && tenYear !== null ? tenYear - twoYear : null;
  const values = [twoYear, tenYear, curve10y2y, vix, fedFunds, dxy, nq20d, nq60d];
  return {
    twoYear,
    tenYear,
    curve10y2y,
    vix,
    fedFunds,
    dxy,
    nq20d,
    nq60d,
    coverage: round((values.filter((value) => value !== null).length / values.length) * 100, 1),
    asOfDate: nqIndex >= 0 ? data.nq[nqIndex]?.date ?? null : null,
  };
}

function regimeSimilarity(current: PceRegimeSnapshot, candidate: PceRegimeSnapshot): number | null {
  const definitions: Array<[keyof PceRegimeSnapshot, number, number]> = [
    ["twoYear", 18, 1.5],
    ["tenYear", 10, 1.5],
    ["curve10y2y", 12, 0.8],
    ["vix", 18, 8],
    ["fedFunds", 12, 1.5],
    ["dxy", 10, 10],
    ["nq20d", 10, 10],
    ["nq60d", 10, 20],
  ];
  let weighted = 0;
  let weight = 0;
  for (const [key, w, scale] of definitions) {
    const left = typeof current[key] === "number" ? (current[key] as number) : null;
    const right = typeof candidate[key] === "number" ? (candidate[key] as number) : null;
    const score = continuousSimilarity(left, right, scale);
    if (score === null) continue;
    weighted += score * w;
    weight += w;
  }
  return weight ? round((weighted / weight) * 100, 1) : null;
}

function returnStat(values: Array<number | null>) {
  const valid = values.filter((value): value is number => value !== null && Number.isFinite(value));
  const positive = valid.filter((value) => value > 0).length;
  return {
    positiveRate: valid.length ? round((positive / valid.length) * 100, 1) : null,
    average: valid.length ? round(valid.reduce((sum, value) => sum + value, 0) / valid.length, 2) : null,
    median: valid.length ? round(median(valid) ?? 0, 2) : null,
  };
}

function regimeSensitivity(matches: PceRegimeMatch[], size: 5 | 10 | 20): PceRegimeSensitivity {
  const slice = matches.slice(0, size);
  const combined = slice.map((item) => item.combinedScore);
  const nq1d = returnStat(slice.map((item) => item.reactions.NQ?.oneDay ?? null));
  const nq5d = returnStat(slice.map((item) => item.reactions.NQ?.fiveDay ?? null));
  return {
    size,
    actualSize: slice.length,
    averageCombined: combined.length ? round(combined.reduce((sum, value) => sum + value, 0) / combined.length, 1) : null,
    minimumCombined: combined.length ? round(Math.min(...combined), 1) : null,
    nq1dPositiveRate: nq1d.positiveRate,
    nq1dAverage: nq1d.average,
    nq1dMedian: nq1d.median,
    nq5dPositiveRate: nq5d.positiveRate,
    nq5dAverage: nq5d.average,
    nq5dMedian: nq5d.median,
  };
}

function pathForEvent(releaseAt: string, nq: YahooPoint[]): Array<number | null> {
  const date = newYorkDate(Date.parse(releaseAt));
  const previousIndex = latestYahooIndexBefore(nq, date);
  if (previousIndex < 0) return Array(12).fill(null);
  const base = nq[previousIndex]?.value ?? null;
  if (base === null || base === 0) return Array(12).fill(null);
  const result: Array<number | null> = [100];
  for (let offset = 1; offset <= 11; offset += 1) {
    const point = nq[previousIndex + offset];
    result.push(point ? (point.value / base) * 100 : null);
  }
  return result;
}

function pathSummary(currentReleaseAt: string, matches: PceRegimeMatch[], nq: YahooPoint[]): PcePathPoint[] {
  const currentPath = pathForEvent(currentReleaseAt, nq);
  const paths = matches.slice(0, 10).map((item) => pathForEvent(item.releaseAt, nq));
  return Array.from({ length: 12 }, (_, index) => {
    const values = paths.map((path) => path[index]).filter((value): value is number => value !== null);
    const day = index - 1;
    return {
      day,
      label: day === -1 ? "발표전" : day === 0 ? "당일" : `+${day}D`,
      median: values.length ? round(median(values) ?? 0, 2) : null,
      q25: values.length ? round(quantile(values, 0.25) ?? 0, 2) : null,
      q75: values.length ? round(quantile(values, 0.75) ?? 0, 2) : null,
      current: currentPath[index] === null ? null : round(currentPath[index] as number, 2),
      sampleSize: values.length,
    };
  });
}

function regimeQuality(current: PceRegimeSnapshot, matches: PceRegimeMatch[]): PceComparisonQuality {
  const top5 = matches.slice(0, 5);
  const top5Average = top5.length ? round(top5.reduce((sum, item) => sum + item.combinedScore, 0) / top5.length, 1) : 0;
  const score = round(top5Average * 0.75 + current.coverage * 0.25, 1);
  const grade: PceComparisonQuality["grade"] = score >= 82 ? "A" : score >= 72 ? "B" : score >= 60 ? "C" : "D";
  const label = grade === "A" ? "비교 품질 높음" : grade === "B" ? "비교 품질 양호" : grade === "C" ? "비교 품질 보통" : "비교 품질 낮음";
  return { grade, score, label, top5Average, reactionCoverage: current.coverage };
}

export async function getPceRegimeAnalysis(): Promise<PceRegimeAnalysis | null> {
  const dataset = await loadPceCases();
  if (!dataset) return null;
  const [dgs2, dgs10, vix, dff, dxy, nq] = await Promise.all([
    fetchFredSeries("DGS2"),
    fetchFredSeries("DGS10"),
    fetchFredSeries("VIXCLS"),
    fetchFredSeries("DFF"),
    fetchYahooDaily("DX-Y.NYB"),
    fetchYahooDaily("NQ=F"),
  ]);
  const marketData = { dgs2, dgs10, vix, dff, dxy, nq };
  const currentRegime = regimeSnapshot(dataset.current.releaseAt, marketData);
  const matches: PceRegimeMatch[] = dataset.cases
    .map((item) => {
      const regime = regimeSnapshot(item.releaseAt, marketData);
      const regimeScore = regimeSimilarity(currentRegime, regime);
      const combinedScore = regimeScore === null
        ? item.similarityScore
        : round(item.similarityScore * 0.6 + regimeScore * 0.4, 1);
      return {
        ...item,
        pceScore: item.similarityScore,
        regimeScore,
        combinedScore,
        regime,
      };
    })
    .sort((a, b) => b.combinedScore - a.combinedScore)
    .slice(0, 20);

  const sensitivityRows = ([5, 10, 20] as const).map((size) => regimeSensitivity(matches, size));
  const path = pathSummary(dataset.current.releaseAt, matches, nq);
  const quality = regimeQuality(currentRegime, matches);
  const insights: string[] = [
    `현재 PCE+시장환경 비교 품질은 ${quality.grade}등급(${quality.score.toFixed(1)}점)입니다.`,
  ];
  if (matches[0]) {
    insights.push(`가장 비슷한 과거는 종합 ${matches[0].combinedScore.toFixed(1)}점으로 PCE ${matches[0].pceScore.toFixed(1)}점, 시장환경 ${matches[0].regimeScore?.toFixed(1) ?? "—"}점을 반영했습니다.`);
  }
  const rates = sensitivityRows.map((row) => row.nq1dPositiveRate).filter((value): value is number => value !== null);
  if (rates.length >= 2) {
    const spread = Math.max(...rates) - Math.min(...rates);
    insights.push(spread <= 15
      ? `NQ +1D 상승확률은 TOP5·10·20 사이 차이가 ${spread.toFixed(1)}%p로 안정적인 편입니다.`
      : `NQ +1D 상승확률은 TOP5·10·20 사이 차이가 ${spread.toFixed(1)}%p라 표본 선택에 민감합니다.`);
  }
  const day5 = path.find((item) => item.day === 5)?.median ?? null;
  const day10 = path.find((item) => item.day === 10)?.median ?? null;
  if (day5 !== null && day10 !== null) {
    insights.push(`유사 사례 NQ 중앙 경로는 발표 전 100 기준 +5D ${day5.toFixed(2)}, +10D ${day10.toFixed(2)}였습니다.`);
  }
  insights.push(`발표 전 환경은 VIX ${currentRegime.vix?.toFixed(1) ?? "—"}, 2Y ${currentRegime.twoYear?.toFixed(2) ?? "—"}%, NQ 20D ${currentRegime.nq20d === null ? "—" : `${currentRegime.nq20d > 0 ? "+" : ""}${currentRegime.nq20d.toFixed(1)}%`}입니다.`);

  return {
    current: { ...dataset.current, regime: currentRegime },
    matches,
    sensitivity: sensitivityRows,
    path,
    quality,
    insights: insights.slice(0, 5),
    methodology: {
      pceWeight: 60,
      regimeWeight: 40,
      regimeInputs: ["2Y 금리", "10Y 금리", "10Y-2Y", "VIX", "Fed Funds", "DXY", "NQ 20D", "NQ 60D"],
    },
  };
}

function average(values: Array<number | null>) {
  const valid = values.filter((value): value is number => value !== null && Number.isFinite(value));
  return valid.length ? valid.reduce((sum, value) => sum + value, 0) / valid.length : null;
}

function classifyPattern(values: Record<string, number | null>): PcePatternClassification {
  const equities = average([values.NQ ?? null, values.RTY ?? null]);
  const bonds = average([values.ZT ?? null, values.ZN ?? null]);
  const dxy = values.DXY ?? null;
  const oil = values.CL ?? null;
  const gold = values.GC ?? null;
  const signals: string[] = [];

  if (equities !== null) signals.push(`주식 ${equities > 0 ? "↑" : equities < 0 ? "↓" : "→"}`);
  if (bonds !== null) signals.push(`국채선물 ${bonds > 0 ? "↑" : bonds < 0 ? "↓" : "→"}`);
  if (dxy !== null) signals.push(`달러 ${dxy > 0 ? "↑" : dxy < 0 ? "↓" : "→"}`);
  if (oil !== null) signals.push(`WTI ${oil > 0 ? "↑" : oil < 0 ? "↓" : "→"}`);
  if (gold !== null) signals.push(`금 ${gold > 0 ? "↑" : gold < 0 ? "↓" : "→"}`);

  const available = [equities, bonds, dxy, oil, gold].filter((value) => value !== null).length;
  const confidence = round(Math.min(100, 45 + available * 8), 0);

  if (equities !== null && equities > 0.12 && bonds !== null && bonds > 0.03 && dxy !== null && dxy < -0.03) {
    return { key: "easing_risk_on", label: "인플레 완화형 Risk-On", description: "주식 강세·채권 강세·달러 약세가 함께 나타나는 금리부담 완화형 반응입니다.", confidence, signals };
  }
  if (equities !== null && equities < -0.12 && bonds !== null && bonds < -0.03 && dxy !== null && dxy > 0.03) {
    return { key: "rate_pressure_risk_off", label: "금리부담형 Risk-Off", description: "주식과 채권이 함께 약하고 달러가 강한 금리상승 부담형 반응입니다.", confidence, signals };
  }
  if (equities !== null && equities < -0.12 && bonds !== null && bonds > 0.03 && oil !== null && oil < -0.05) {
    return { key: "growth_slowdown", label: "성장둔화형 Risk-Off", description: "주식·원유 약세와 채권 강세가 겹치는 성장 우려형 반응입니다.", confidence, signals };
  }
  if (equities !== null && equities > 0.12 && oil !== null && oil > 0.08 && (bonds === null || bonds < 0.05)) {
    return { key: "reflation", label: "리플레이션형 Risk-On", description: "주식과 원유가 함께 강하고 채권은 상대적으로 약한 성장·물가 재가속형 반응입니다.", confidence, signals };
  }
  if (equities !== null && equities < -0.12 && oil !== null && oil > 0.08 && bonds !== null && bonds < -0.03) {
    return { key: "stagflation_pressure", label: "스태그플레이션 압박형", description: "주식·채권 약세 속 원유가 강한 물가 부담과 성장 우려가 겹친 반응입니다.", confidence, signals };
  }
  return { key: "mixed", label: "혼조 / 전환", description: "주요 자산이 한 가지 거시 해석으로 모이지 않아 방향성이 분산된 반응입니다.", confidence: Math.max(35, confidence - 15), signals };
}

export async function getPcePatternAnalysis(): Promise<PcePatternAnalysis | null> {
  const regime = await getPceRegimeAnalysis();
  if (!regime) return null;
  const top10 = regime.matches.slice(0, 10);
  const horizons: Array<[HorizonKey, string]> = [
    ["close", "당일"],
    ["oneDay", "+1D"],
    ["fiveDay", "+5D"],
  ];

  const horizonRows: PcePatternHorizon[] = horizons.map(([horizon, label]) => {
    const medians = PCE_ASSETS.map((asset) => {
      const values = top10
        .map((item) => item.reactions[asset.key]?.[horizon] ?? null)
        .filter((value): value is number => value !== null);
      return { assetKey: asset.key, assetName: asset.name, value: values.length ? round(median(values) ?? 0, 2) : null };
    });
    const historicalValues = Object.fromEntries(medians.map((item) => [item.assetKey, item.value])) as Record<string, number | null>;
    const currentValues = Object.fromEntries(PCE_ASSETS.map((asset) => [asset.key, regime.current.reactions[asset.key]?.[horizon] ?? null])) as Record<string, number | null>;
    const hasCurrent = Object.values(currentValues).some((value) => value !== null);
    return {
      horizon,
      label,
      historical: classifyPattern(historicalValues),
      current: hasCurrent ? classifyPattern(currentValues) : null,
      medians,
    };
  });

  const historicalKeys = horizonRows.map((item) => item.historical.key);
  const unique = new Set(historicalKeys);
  const counts = historicalKeys.reduce<Record<string, number>>((acc, key) => {
    acc[key] = (acc[key] ?? 0) + 1;
    return acc;
  }, {});
  const maxCount = Math.max(...Object.values(counts));
  const persistence = unique.size === 1
    ? { level: "높음" as const, label: "당일 → +1D → +5D까지 같은 반응 유형이 유지됩니다." }
    : maxCount >= 2
      ? { level: "보통" as const, label: "세 구간 중 두 구간에서 같은 유형이 나타납니다." }
      : { level: "낮음" as const, label: "시간이 지나면서 반응 유형이 자주 바뀝니다." };

  const insights: string[] = [
    `유사 PCE TOP10의 반응 유형 지속성은 ${persistence.level}입니다.`,
  ];
  for (const row of horizonRows) {
    insights.push(`${row.label}의 과거 전형은 '${row.historical.label}'${row.current ? `, 이번 실제 반응은 '${row.current.label}'` : "이며 이번 실제 반응은 아직 충분히 쌓이지 않았습니다"}.`);
  }
  const agreement = horizonRows.filter((row) => row.current && row.current.key === row.historical.key).length;
  if (horizonRows.some((row) => row.current)) {
    insights.push(`현재까지 과거 전형과 같은 유형은 ${agreement}/3개 시간구간에서 확인됩니다.`);
  }

  return {
    baseQuality: regime.quality,
    horizons: horizonRows,
    persistence,
    insights: insights.slice(0, 5),
  };
}
