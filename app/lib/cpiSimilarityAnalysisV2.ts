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
export type CpiTrendFilter = "any" | "headline_cooling" | "headline_heating" | "core_cooling" | "core_heating";

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

type EventRow = { id: string; release_at: string; reference_period: string | null };
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

type MetricPoint = { actual: number | null; previous: number | null; forecast: number | null; surprise: number | null };
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
  minReturn: number | null;
  maxReturn: number | null;
};

export type CpiAssetSimilarityStats = {
  assetKey: string;
  assetName: string;
  close: CpiHorizonStat;
  oneDay: CpiHorizonStat;
  fiveDay: CpiHorizonStat;
};

export type CpiSensitivityWindow = {
  size: 5 | 10 | 20;
  actualSize: number;
  averageSimilarity: number | null;
  minimumSimilarity: number | null;
  assetStats: CpiAssetSimilarityStats[];
};

export type CpiCrossAssetSummary = {
  key: "close" | "oneDay" | "fiveDay";
  label: string;
  positiveAssets: number;
  negativeAssets: number;
  neutralAssets: number;
  availableAssets: number;
  majority: "positive" | "negative" | "mixed";
  majorityCount: number;
  agreementRate: number | null;
};

export type CpiAnalysisQuality = {
  grade: "A" | "B" | "C" | "D";
  score: number;
  label: string;
  topSimilarity: number;
  averageTop5Similarity: number;
  reactionCoverageRate: number;
  reasons: string[];
};

export type CpiSimilarityAnalysisV2 = {
  current: CpiSimilarityCase;
  matches: CpiSimilarityCase[];
  sensitivity: CpiSensitivityWindow[];
  crossAsset: CpiCrossAssetSummary[];
  quality: CpiAnalysisQuality;
  insights: string[];
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

function round(value: number, digits = 1) {
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

function median(values: number[]) {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? (sorted[middle - 1] + sorted[middle]) / 2 : sorted[middle];
}

function horizonStat(values: Array<number | null>): CpiHorizonStat {
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

function continuousSimilarity(left: number | null, right: number | null, scale: number) {
  if (left === null || right === null) return null;
  return Math.exp(-Math.abs(left - right) / scale);
}

function direction(value: number | null): -1 | 0 | 1 | null {
  if (value === null) return null;
  if (Math.abs(value) < 0.025) return 0;
  return value > 0 ? 1 : -1;
}

function trendSimilarity(current: MetricPoint, candidate: MetricPoint) {
  if (current.actual === null || current.previous === null || candidate.actual === null || candidate.previous === null) return null;
  const a = direction(current.actual - current.previous);
  const b = direction(candidate.actual - candidate.previous);
  if (a === null || b === null) return null;
  if (a === b) return 1;
  if (a === 0 || b === 0) return 0.5;
  return 0;
}

function similarityScore(current: CpiMetricSnapshot, candidate: CpiMetricSnapshot) {
  const levels: Array<[MetricKey, number, number]> = [
    ["headline_yoy", 18, 1.5], ["headline_mom", 12, 0.45], ["core_yoy", 18, 1.5], ["core_mom", 12, 0.45],
  ];
  const trends: Array<[MetricKey, number]> = [
    ["headline_yoy", 7], ["headline_mom", 5], ["core_yoy", 7], ["core_mom", 5],
  ];
  const surprises: Array<[MetricKey, number, number]> = [
    ["headline_yoy", 10, 0.35], ["core_yoy", 6, 0.35],
  ];

  let weighted = 0;
  let totalWeight = 0;
  let levelWeighted = 0;
  let levelWeight = 0;
  let trendWeighted = 0;
  let trendWeight = 0;
  let surpriseWeighted = 0;
  let surpriseWeight = 0;

  for (const [key, weight, scale] of levels) {
    const score = continuousSimilarity(current[key].actual, candidate[key].actual, scale);
    if (score === null) continue;
    weighted += score * weight; totalWeight += weight; levelWeighted += score * weight; levelWeight += weight;
  }
  for (const [key, weight] of trends) {
    const score = trendSimilarity(current[key], candidate[key]);
    if (score === null) continue;
    weighted += score * weight; totalWeight += weight; trendWeighted += score * weight; trendWeight += weight;
  }
  for (const [key, weight, scale] of surprises) {
    const score = continuousSimilarity(current[key].surprise, candidate[key].surprise, scale);
    if (score === null) continue;
    weighted += score * weight; totalWeight += weight; surpriseWeighted += score * weight; surpriseWeight += weight;
  }

  return {
    total: totalWeight ? round((weighted / totalWeight) * 100, 1) : 0,
    level: levelWeight ? round((levelWeighted / levelWeight) * 100, 1) : 0,
    trend: trendWeight ? round((trendWeighted / trendWeight) * 100, 1) : null,
    surprise: surpriseWeight ? round((surpriseWeighted / surpriseWeight) * 100, 1) : null,
    surpriseUsed: surpriseWeight > 0,
  };
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

function inRange(value: number | null, min?: number, max?: number) {
  if (value === null) return false;
  if (min !== undefined && value < min) return false;
  if (max !== undefined && value > max) return false;
  return true;
}

function hasNumericFilter(filters: CpiSimilarityFilters) {
  return [filters.headlineYoyMin, filters.headlineYoyMax, filters.headlineMomMin, filters.headlineMomMax,
    filters.coreYoyMin, filters.coreYoyMax, filters.coreMomMin, filters.coreMomMax].some((value) => value !== undefined);
}

function matchesFilters(item: CpiSimilarityCase, filters: CpiSimilarityFilters) {
  const m = item.metrics;
  if ((filters.headlineYoyMin !== undefined || filters.headlineYoyMax !== undefined) && !inRange(m.headline_yoy.actual, filters.headlineYoyMin, filters.headlineYoyMax)) return false;
  if ((filters.headlineMomMin !== undefined || filters.headlineMomMax !== undefined) && !inRange(m.headline_mom.actual, filters.headlineMomMin, filters.headlineMomMax)) return false;
  if ((filters.coreYoyMin !== undefined || filters.coreYoyMax !== undefined) && !inRange(m.core_yoy.actual, filters.coreYoyMin, filters.coreYoyMax)) return false;
  if ((filters.coreMomMin !== undefined || filters.coreMomMax !== undefined) && !inRange(m.core_mom.actual, filters.coreMomMin, filters.coreMomMax)) return false;

  const trend = filters.trend ?? "any";
  if (trend !== "any") {
    const metric = trend.startsWith("headline") ? m.headline_yoy : m.core_yoy;
    if (metric.actual === null || metric.previous === null) return false;
    const delta = metric.actual - metric.previous;
    if (trend.endsWith("cooling") && delta >= 0) return false;
    if (trend.endsWith("heating") && delta <= 0) return false;
  }
  return true;
}

function sensitivityWindow(cases: CpiSimilarityCase[], size: 5 | 10 | 20): CpiSensitivityWindow {
  const slice = cases.slice(0, size);
  const scores = slice.map((item) => item.similarityScore);
  return {
    size,
    actualSize: slice.length,
    averageSimilarity: scores.length ? round(scores.reduce((sum, value) => sum + value, 0) / scores.length, 1) : null,
    minimumSimilarity: scores.length ? round(Math.min(...scores), 1) : null,
    assetStats: assetStats(slice),
  };
}

function crossAssetSummary(top10Stats: CpiAssetSimilarityStats[]): CpiCrossAssetSummary[] {
  const horizons: Array<[CpiCrossAssetSummary["key"], string]> = [
    ["close", "당일"], ["oneDay", "+1거래일"], ["fiveDay", "+5거래일"],
  ];
  return horizons.map(([key, label]) => {
    const averages = top10Stats.map((item) => item[key].averageReturn).filter((value): value is number => value !== null);
    const positiveAssets = averages.filter((value) => value > 0.05).length;
    const negativeAssets = averages.filter((value) => value < -0.05).length;
    const neutralAssets = averages.length - positiveAssets - negativeAssets;
    const majorityCount = Math.max(positiveAssets, negativeAssets);
    const majority: CpiCrossAssetSummary["majority"] = positiveAssets === negativeAssets ? "mixed" : positiveAssets > negativeAssets ? "positive" : "negative";
    return {
      key, label, positiveAssets, negativeAssets, neutralAssets, availableAssets: averages.length,
      majority, majorityCount,
      agreementRate: averages.length ? round((majorityCount / averages.length) * 100, 1) : null,
    };
  });
}

function analysisQuality(ranked: CpiSimilarityCase[]): CpiAnalysisQuality {
  const top10 = ranked.slice(0, 10);
  const top5 = ranked.slice(0, 5);
  const topSimilarity = top10[0]?.similarityScore ?? 0;
  const averageTop5Similarity = top5.length ? round(top5.reduce((sum, item) => sum + item.similarityScore, 0) / top5.length, 1) : 0;

  let available = 0;
  let possible = 0;
  for (const item of top10) {
    for (const asset of ASSETS) {
      const reaction = item.reactions[asset.key];
      for (const value of [reaction?.close ?? null, reaction?.oneDay ?? null, reaction?.fiveDay ?? null]) {
        possible += 1;
        if (value !== null) available += 1;
      }
    }
  }
  const reactionCoverageRate = possible ? round((available / possible) * 100, 1) : 0;
  const sampleScore = Math.min(ranked.length / 20, 1) * 100;
  const score = round(averageTop5Similarity * 0.65 + reactionCoverageRate * 0.2 + sampleScore * 0.15, 1);
  const grade: CpiAnalysisQuality["grade"] = score >= 80 ? "A" : score >= 70 ? "B" : score >= 60 ? "C" : "D";
  const label = grade === "A" ? "비교 품질 높음" : grade === "B" ? "비교 품질 양호" : grade === "C" ? "비교 품질 보통" : "비교 품질 낮음";
  const reasons = [
    `가장 유사한 사례 ${topSimilarity.toFixed(1)}점`,
    `TOP5 평균 유사도 ${averageTop5Similarity.toFixed(1)}점`,
    `TOP10 시장반응 데이터 커버리지 ${reactionCoverageRate.toFixed(1)}%`,
  ];
  return { grade, score, label, topSimilarity, averageTop5Similarity, reactionCoverageRate, reasons };
}

function buildInsights(
  selectedAsset: CpiSimilarityAssetKey,
  sensitivity: CpiSensitivityWindow[],
  crossAsset: CpiCrossAssetSummary[],
  quality: CpiAnalysisQuality,
) {
  const assetName = ASSETS.find((asset) => asset.key === selectedAsset)?.name ?? selectedAsset;
  const bySize = new Map(sensitivity.map((item) => [item.size, item]));
  const selected = (size: 5 | 10 | 20) => bySize.get(size)?.assetStats.find((item) => item.assetKey === selectedAsset);
  const top5 = selected(5);
  const top10 = selected(10);
  const top20 = selected(20);
  const insights: string[] = [`현재 유사 사례 비교 품질은 ${quality.grade}등급(${quality.score.toFixed(1)}점)입니다.`];

  const rates = [top5?.oneDay.positiveRate, top10?.oneDay.positiveRate, top20?.oneDay.positiveRate].filter((value): value is number => value !== null && value !== undefined);
  if (rates.length >= 2) {
    const spread = Math.max(...rates) - Math.min(...rates);
    if (spread <= 15) insights.push(`${assetName} +1D 상승률은 TOP5·10·20로 표본을 넓혀도 차이가 ${spread.toFixed(1)}%p로 비교적 안정적입니다.`);
    else if (spread >= 25) insights.push(`${assetName} +1D 상승률은 TOP5·10·20 사이 차이가 ${spread.toFixed(1)}%p라 표본 선택에 민감합니다.`);
    else insights.push(`${assetName} +1D 상승률은 표본 범위에 따라 ${spread.toFixed(1)}%p 차이가 있어 중간 수준의 민감도가 있습니다.`);
  }

  if (top10?.oneDay.averageReturn !== null && top10?.oneDay.medianReturn !== null) {
    const gap = top10.oneDay.averageReturn - top10.oneDay.medianReturn;
    if (Math.abs(gap) >= 0.5) insights.push(`${assetName} +1D 평균과 중앙값 차이가 ${Math.abs(gap).toFixed(2)}%p라 일부 큰 변동 사례의 영향이 큽니다.`);
    else insights.push(`${assetName} +1D 평균과 중앙값 차이가 크지 않아 특정 한두 번의 극단값 영향은 상대적으로 제한적입니다.`);
  }

  if (top10?.oneDay.positiveRate !== null && top10?.fiveDay.positiveRate !== null) {
    const delta = top10.fiveDay.positiveRate - top10.oneDay.positiveRate;
    if (delta >= 10) insights.push(`${assetName}은 +1D보다 +5D 상승 비율이 ${delta.toFixed(1)}%p 높아 시간이 지나며 반응이 강화된 사례가 많았습니다.`);
    else if (delta <= -10) insights.push(`${assetName}은 +5D 상승 비율이 +1D보다 ${Math.abs(delta).toFixed(1)}%p 낮아 초기 반응의 지속성은 약했습니다.`);
    else insights.push(`${assetName}의 +1D와 +5D 상승 비율 차이가 크지 않아 방향 지속성은 대체로 비슷했습니다.`);
  }

  const strongest = [...crossAsset].filter((item) => item.agreementRate !== null).sort((a, b) => (b.agreementRate ?? 0) - (a.agreementRate ?? 0))[0];
  if (strongest?.agreementRate !== null) {
    const dir = strongest.majority === "positive" ? "상승" : strongest.majority === "negative" ? "하락" : "혼조";
    insights.push(`${strongest.label} 기준 7개 자산 중 ${strongest.majorityCount}/${strongest.availableAssets}개가 ${dir} 쪽으로 모여 원시 방향 일치도는 ${strongest.agreementRate.toFixed(1)}%입니다.`);
  }

  return insights.slice(0, 5);
}

export async function getCpiSimilarityAnalysisV2(input?: { assetKey?: string; filters?: CpiSimilarityFilters }): Promise<CpiSimilarityAnalysisV2 | null> {
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
  if (!events.length) return null;

  const ids = events.map((event) => event.id);
  const [{ data: metricData, error: metricError }, { data: reactionData, error: reactionError }] = await Promise.all([
    supabase.from("economic_event_metrics").select("event_id,metric_key,actual_value,previous_value,forecast_value,surprise_value").in("event_id", ids),
    supabase.from("economic_event_reactions").select("event_id,asset_key,asset_name,return_30m_pct,return_close_pct,return_1d_pct,return_5d_pct").in("event_id", ids),
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
      actual: safeNumber(row.actual_value), previous: safeNumber(row.previous_value),
      forecast: safeNumber(row.forecast_value), surprise: safeNumber(row.surprise_value),
    };
  }

  const reactionByEvent = new Map<string, Record<string, CpiReactionSnapshot>>();
  for (const row of (reactionData ?? []) as ReactionRow[]) {
    const target = reactionByEvent.get(row.event_id) ?? {};
    target[row.asset_key] = {
      assetKey: row.asset_key, assetName: row.asset_name,
      thirtyMinute: safeNumber(row.return_30m_pct), close: safeNumber(row.return_close_pct),
      oneDay: safeNumber(row.return_1d_pct), fiveDay: safeNumber(row.return_5d_pct),
    };
    reactionByEvent.set(row.event_id, target);
  }

  const latest = events.find((event) => {
    const snapshot = metricByEvent.get(event.id);
    return snapshot && METRIC_KEYS.every((key) => snapshot[key].actual !== null);
  });
  if (!latest) return null;

  const currentMetrics = metricByEvent.get(latest.id) ?? blankMetricSnapshot();
  const current: CpiSimilarityCase = {
    id: latest.id, releaseAt: latest.release_at, referencePeriod: latest.reference_period,
    similarityScore: 100, levelScore: 100, trendScore: 100,
    surpriseScore: currentMetrics.headline_yoy.surprise !== null ? 100 : null,
    surpriseUsed: currentMetrics.headline_yoy.surprise !== null,
    metrics: currentMetrics, reactions: reactionByEvent.get(latest.id) ?? {},
  };

  const ranked = events
    .filter((event) => event.id !== latest.id)
    .map((event) => {
      const metrics = metricByEvent.get(event.id) ?? blankMetricSnapshot();
      const score = similarityScore(currentMetrics, metrics);
      return {
        id: event.id, releaseAt: event.release_at, referencePeriod: event.reference_period,
        similarityScore: score.total, levelScore: score.level, trendScore: score.trend,
        surpriseScore: score.surprise, surpriseUsed: score.surpriseUsed,
        metrics, reactions: reactionByEvent.get(event.id) ?? {},
      } satisfies CpiSimilarityCase;
    })
    .filter((item) => METRIC_KEYS.every((key) => item.metrics[key].actual !== null))
    .sort((a, b) => b.similarityScore - a.similarityScore || b.releaseAt.localeCompare(a.releaseAt));

  const sensitivity = ([5, 10, 20] as const).map((size) => sensitivityWindow(ranked, size));
  const top10Stats = sensitivity.find((item) => item.size === 10)?.assetStats ?? assetStats(ranked.slice(0, 10));
  const crossAsset = crossAssetSummary(top10Stats);
  const quality = analysisQuality(ranked);
  const selectedAsset = normalizeAssetKey(input?.assetKey);
  const insights = buildInsights(selectedAsset, sensitivity, crossAsset, quality);

  const filters = input?.filters ?? {};
  const filterActive = hasNumericFilter(filters) || (filters.trend ?? "any") !== "any";
  const filteredCases = filterActive
    ? ranked.filter((item) => matchesFilters(item, filters)).sort((a, b) => b.releaseAt.localeCompare(a.releaseAt)).slice(0, 80)
    : [];

  return {
    current,
    matches: ranked.slice(0, 10),
    sensitivity,
    crossAsset,
    quality,
    insights,
    filteredCases,
    filteredAssetStats: assetStats(filteredCases),
    selectedAsset,
    filters,
    assets: ASSETS.map((asset) => ({ key: asset.key, name: asset.name })),
  };
}
