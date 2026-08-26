import "server-only";

import { getJhSupabaseAdmin } from "@/app/lib/jhDataSupabase";

const EVENT_KEY = "US_NFP";
const HISTORY_START = "2016-01-01";
const REGIME_START = "2015-01-01";
const FRED_BASE = "https://api.stlouisfed.org/fred";
const TIMEOUT_MS = 15_000;

const METRIC_KEYS = ["payroll_change", "unemployment_rate", "ahe_mom", "ahe_yoy"] as const;
type MetricKey = (typeof METRIC_KEYS)[number];

const ASSETS = [
  { key: "NQ", name: "나스닥100 선물", neutral: 0.10, weight: 2 },
  { key: "RTY", name: "러셀2000 선물", neutral: 0.10, weight: 1.5 },
  { key: "GC", name: "금 선물", neutral: 0.10, weight: 1 },
  { key: "CL", name: "WTI 원유 선물", neutral: 0.10, weight: 1 },
  { key: "DXY", name: "달러인덱스", neutral: 0.08, weight: 1.5 },
  { key: "ZT", name: "미국 2년물 국채선물", neutral: 0.05, weight: 1 },
  { key: "ZN", name: "미국 10년물 국채선물", neutral: 0.05, weight: 1.5 },
] as const;

export type NfpAssetKey = (typeof ASSETS)[number]["key"];

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

export type NfpMetricSnapshot = Record<MetricKey, MetricPoint>;

export type NfpReactionSnapshot = {
  assetKey: string;
  assetName: string;
  close: number | null;
  oneDay: number | null;
  fiveDay: number | null;
};

export type NfpSimilarityCase = {
  id: string;
  releaseAt: string;
  referencePeriod: string | null;
  similarityScore: number;
  levelScore: number;
  trendScore: number | null;
  surpriseScore: number | null;
  surpriseUsed: boolean;
  metrics: NfpMetricSnapshot;
  reactions: Record<string, NfpReactionSnapshot>;
};

export type NfpHorizonStat = {
  sampleSize: number;
  positiveCount: number;
  positiveRate: number | null;
  averageReturn: number | null;
  medianReturn: number | null;
  minReturn: number | null;
  maxReturn: number | null;
};

export type NfpAssetStats = {
  assetKey: string;
  assetName: string;
  close: NfpHorizonStat;
  oneDay: NfpHorizonStat;
  fiveDay: NfpHorizonStat;
};

export type NfpSensitivityWindow = {
  size: 5 | 10 | 20;
  actualSize: number;
  averageSimilarity: number | null;
  minimumSimilarity: number | null;
  assetStats: NfpAssetStats[];
};

export type NfpCrossAssetSummary = {
  key: "close" | "oneDay" | "fiveDay";
  label: string;
  positiveAssets: number;
  negativeAssets: number;
  neutralAssets: number;
  availableAssets: number;
  majority: "positive" | "negative" | "mixed";
  agreementRate: number | null;
};

export type NfpAnalysisQuality = {
  grade: "A" | "B" | "C" | "D";
  score: number;
  label: string;
  topSimilarity: number;
  averageTop5Similarity: number;
  reactionCoverageRate: number;
  reasons: string[];
};

export type NfpRegimeSnapshot = {
  asOfDate: string | null;
  twoYear: number | null;
  tenYear: number | null;
  curve10y2y: number | null;
  vix: number | null;
  fedFunds: number | null;
  dxy: number | null;
  nq20d: number | null;
  nq60d: number | null;
  coverageRate: number;
};

export type NfpRegimeMatch = NfpSimilarityCase & {
  regime: NfpRegimeSnapshot;
  regimeScore: number | null;
  combinedScore: number;
};

export type NfpRegimeAnalysis = {
  current: NfpRegimeSnapshot;
  matches: NfpRegimeMatch[];
  quality: NfpAnalysisQuality;
  insights: string[];
};

export type NfpPatternKey =
  | "cooling_risk_on"
  | "hot_jobs_rate_pressure"
  | "growth_scare"
  | "reflation_growth"
  | "stagflation_pressure"
  | "mixed";

export type NfpPatternResult = {
  key: NfpPatternKey;
  label: string;
  description: string;
  fitScore: number;
  margin: number;
  horizon: "close" | "oneDay" | "fiveDay";
  assetMedians: Array<{ assetKey: string; assetName: string; medianReturn: number | null }>;
};

export type NfpPatternAnalysis = {
  primary: NfpPatternResult;
  close: NfpPatternResult;
  oneDay: NfpPatternResult;
  fiveDay: NfpPatternResult;
  persistenceLabel: string;
  note: string;
};

export type NfpFullAnalysis = {
  current: NfpSimilarityCase;
  matches: NfpSimilarityCase[];
  sensitivity: NfpSensitivityWindow[];
  crossAsset: NfpCrossAssetSummary[];
  quality: NfpAnalysisQuality;
  insights: string[];
  regime: NfpRegimeAnalysis;
  pattern: NfpPatternAnalysis;
  assets: Array<{ key: NfpAssetKey; name: string }>;
};

type DatePoint = { date: string; value: number };
type FredResponse = { observations?: Array<{ date?: string; value?: string }>; error_message?: string };
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

function blankMetrics(): NfpMetricSnapshot {
  return {
    payroll_change: { actual: null, previous: null, forecast: null, surprise: null },
    unemployment_rate: { actual: null, previous: null, forecast: null, surprise: null },
    ahe_mom: { actual: null, previous: null, forecast: null, surprise: null },
    ahe_yoy: { actual: null, previous: null, forecast: null, surprise: null },
  };
}

function median(values: number[]) {
  if (!values.length) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? (sorted[middle - 1] + sorted[middle]) / 2 : sorted[middle];
}

function horizonStat(values: Array<number | null>): NfpHorizonStat {
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

function direction(value: number | null, threshold: number): -1 | 0 | 1 | null {
  if (value === null) return null;
  if (Math.abs(value) < threshold) return 0;
  return value > 0 ? 1 : -1;
}

function trendSimilarity(current: MetricPoint, candidate: MetricPoint, threshold: number) {
  if (current.actual === null || current.previous === null || candidate.actual === null || candidate.previous === null) return null;
  const currentDirection = direction(current.actual - current.previous, threshold);
  const candidateDirection = direction(candidate.actual - candidate.previous, threshold);
  if (currentDirection === null || candidateDirection === null) return null;
  if (currentDirection === candidateDirection) return 1;
  if (currentDirection === 0 || candidateDirection === 0) return 0.5;
  return 0;
}

function similarityScore(current: NfpMetricSnapshot, candidate: NfpMetricSnapshot) {
  const levels: Array<[MetricKey, number, number]> = [
    ["payroll_change", 28, 180],
    ["unemployment_rate", 22, 0.6],
    ["ahe_mom", 15, 0.25],
    ["ahe_yoy", 15, 0.8],
  ];
  const trends: Array<[MetricKey, number, number]> = [
    ["payroll_change", 6, 30],
    ["unemployment_rate", 5, 0.05],
    ["ahe_mom", 4, 0.03],
    ["ahe_yoy", 5, 0.08],
  ];
  const surprises: Array<[MetricKey, number, number]> = [
    ["payroll_change", 12, 120],
    ["unemployment_rate", 8, 0.25],
    ["ahe_mom", 6, 0.15],
    ["ahe_yoy", 4, 0.4],
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
    weighted += score * weight;
    totalWeight += weight;
    levelWeighted += score * weight;
    levelWeight += weight;
  }

  for (const [key, weight, threshold] of trends) {
    const score = trendSimilarity(current[key], candidate[key], threshold);
    if (score === null) continue;
    weighted += score * weight;
    totalWeight += weight;
    trendWeighted += score * weight;
    trendWeight += weight;
  }

  for (const [key, weight, scale] of surprises) {
    const score = continuousSimilarity(current[key].surprise, candidate[key].surprise, scale);
    if (score === null) continue;
    weighted += score * weight;
    totalWeight += weight;
    surpriseWeighted += score * weight;
    surpriseWeight += weight;
  }

  return {
    total: totalWeight ? round((weighted / totalWeight) * 100, 1) : 0,
    level: levelWeight ? round((levelWeighted / levelWeight) * 100, 1) : 0,
    trend: trendWeight ? round((trendWeighted / trendWeight) * 100, 1) : null,
    surprise: surpriseWeight ? round((surpriseWeighted / surpriseWeight) * 100, 1) : null,
    surpriseUsed: surpriseWeight > 0,
  };
}

function assetStats(cases: NfpSimilarityCase[]): NfpAssetStats[] {
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

function sensitivityWindow(cases: NfpSimilarityCase[], size: 5 | 10 | 20): NfpSensitivityWindow {
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

function crossAssetSummary(top10Stats: NfpAssetStats[]): NfpCrossAssetSummary[] {
  const horizons: Array<[NfpCrossAssetSummary["key"], string]> = [
    ["close", "당일"],
    ["oneDay", "+1거래일"],
    ["fiveDay", "+5거래일"],
  ];
  return horizons.map(([key, label]) => {
    const averages = top10Stats.map((item) => item[key].averageReturn).filter((value): value is number => value !== null);
    const positiveAssets = averages.filter((value) => value > 0.05).length;
    const negativeAssets = averages.filter((value) => value < -0.05).length;
    const neutralAssets = averages.length - positiveAssets - negativeAssets;
    const majorityCount = Math.max(positiveAssets, negativeAssets);
    const majority: NfpCrossAssetSummary["majority"] =
      positiveAssets === negativeAssets ? "mixed" : positiveAssets > negativeAssets ? "positive" : "negative";
    return {
      key,
      label,
      positiveAssets,
      negativeAssets,
      neutralAssets,
      availableAssets: averages.length,
      majority,
      agreementRate: averages.length ? round((majorityCount / averages.length) * 100, 1) : null,
    };
  });
}

function analysisQuality(ranked: NfpSimilarityCase[]): NfpAnalysisQuality {
  const top10 = ranked.slice(0, 10);
  const top5 = ranked.slice(0, 5);
  const topSimilarity = top10[0]?.similarityScore ?? 0;
  const averageTop5Similarity = top5.length
    ? round(top5.reduce((sum, item) => sum + item.similarityScore, 0) / top5.length, 1)
    : 0;
  const possibleReactionPoints = top10.length * ASSETS.length * 3;
  const actualReactionPoints = top10.reduce((count, item) => {
    return count + ASSETS.reduce((assetCount, asset) => {
      const reaction = item.reactions[asset.key];
      return assetCount + [reaction?.close, reaction?.oneDay, reaction?.fiveDay].filter((value) => value !== null && value !== undefined).length;
    }, 0);
  }, 0);
  const reactionCoverageRate = possibleReactionPoints ? round((actualReactionPoints / possibleReactionPoints) * 100, 1) : 0;
  const score = round(averageTop5Similarity * 0.7 + reactionCoverageRate * 0.3, 1);
  const grade: NfpAnalysisQuality["grade"] = score >= 82 ? "A" : score >= 70 ? "B" : score >= 58 ? "C" : "D";
  const reasons = [
    `TOP5 평균 유사도 ${averageTop5Similarity.toFixed(1)}점`,
    `TOP10 시장반응 커버리지 ${reactionCoverageRate.toFixed(1)}%`,
  ];
  return {
    grade,
    score,
    label: grade === "A" ? "비교 품질 높음" : grade === "B" ? "비교 품질 양호" : grade === "C" ? "참고용" : "표본 주의",
    topSimilarity,
    averageTop5Similarity,
    reactionCoverageRate,
    reasons,
  };
}

function buildInsights(matches: NfpSimilarityCase[], sensitivity: NfpSensitivityWindow[], crossAsset: NfpCrossAssetSummary[]) {
  const insights: string[] = [];
  const top = matches[0];
  if (top) insights.push(`가장 비슷한 과거 고용보고서는 ${top.releaseAt.slice(0, 10)} 발표이며 유사도는 ${top.similarityScore.toFixed(1)}점입니다.`);

  const top5Nq = sensitivity.find((item) => item.size === 5)?.assetStats.find((item) => item.assetKey === "NQ");
  const top20Nq = sensitivity.find((item) => item.size === 20)?.assetStats.find((item) => item.assetKey === "NQ");
  if (top5Nq?.oneDay.positiveRate !== null && top20Nq?.oneDay.positiveRate !== null) {
    const gap = Math.abs((top5Nq?.oneDay.positiveRate ?? 0) - (top20Nq?.oneDay.positiveRate ?? 0));
    insights.push(gap >= 20
      ? `NQ +1D 상승률은 TOP5와 TOP20 사이에 ${gap.toFixed(0)}%p 차이가 있어 표본 선택에 민감합니다.`
      : `NQ +1D 방향성은 TOP5와 TOP20에서 비교적 비슷하게 유지됩니다.`);
  }

  const strongest = [...crossAsset]
    .filter((item) => item.agreementRate !== null)
    .sort((a, b) => (b.agreementRate ?? 0) - (a.agreementRate ?? 0))[0];
  if (strongest) insights.push(`${strongest.label} Cross Asset 방향 일치도가 ${strongest.agreementRate?.toFixed(1)}%로 가장 높습니다.`);
  return insights;
}

function fredKey() {
  const key = process.env.FRED_API_KEY;
  if (!key) throw new Error("FRED_API_KEY 환경변수가 없습니다.");
  return key;
}

async function fetchFredSeries(seriesId: string): Promise<DatePoint[]> {
  const query = new URLSearchParams({
    series_id: seriesId,
    observation_start: REGIME_START,
    sort_order: "asc",
    limit: "100000",
    api_key: fredKey(),
    file_type: "json",
  });
  const response = await fetch(`${FRED_BASE}/series/observations?${query.toString()}`, {
    next: { revalidate: 21600 },
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
  if (!response.ok) throw new Error(`FRED ${seriesId} 요청 실패 (${response.status})`);
  const payload = (await response.json()) as FredResponse;
  if (payload.error_message) throw new Error(payload.error_message);
  return (payload.observations ?? [])
    .map((item) => ({ date: item.date ?? "", value: Number(item.value) }))
    .filter((item) => /^\d{4}-\d{2}-\d{2}$/.test(item.date) && Number.isFinite(item.value));
}

function nyDate(timestampMs: number) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/New_York",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date(timestampMs));
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${values.year}-${values.month}-${values.day}`;
}

async function fetchYahooDaily(symbol: string): Promise<DatePoint[]> {
  const period1 = Math.floor(Date.parse(`${REGIME_START}T00:00:00Z`) / 1000);
  const period2 = Math.floor((Date.now() + 7 * 86_400_000) / 1000);
  const query = new URLSearchParams({
    period1: String(period1),
    period2: String(period2),
    interval: "1d",
    events: "div,splits",
  });

  for (const host of ["query1.finance.yahoo.com", "query2.finance.yahoo.com"]) {
    try {
      const response = await fetch(`https://${host}/v8/finance/chart/${encodeURIComponent(symbol)}?${query.toString()}`, {
        next: { revalidate: 21600 },
        headers: { "User-Agent": "Mozilla/5.0 (compatible; HOHAENG-OS/1.0; +https://hohaeng.vercel.app)" },
        signal: AbortSignal.timeout(TIMEOUT_MS),
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
            ? { date: nyDate(timestamp * 1000), value }
            : null;
        })
        .filter((item): item is DatePoint => item !== null)
        .sort((a, b) => a.date.localeCompare(b.date));
    } catch {
      // fallback host
    }
  }
  return [];
}

function latestBefore(points: DatePoint[], date: string) {
  for (let index = points.length - 1; index >= 0; index -= 1) {
    if (points[index].date < date) return points[index];
  }
  return null;
}

function trendBefore(points: DatePoint[], date: string, lookback: number) {
  const eligible = points.filter((point) => point.date < date);
  if (eligible.length <= lookback) return null;
  const last = eligible[eligible.length - 1];
  const base = eligible[eligible.length - 1 - lookback];
  if (!last || !base || base.value === 0) return null;
  return round(((last.value / base.value) - 1) * 100, 2);
}

function regimeSnapshot(
  releaseAt: string,
  twoYear: DatePoint[],
  tenYear: DatePoint[],
  vix: DatePoint[],
  fedFunds: DatePoint[],
  dxy: DatePoint[],
  nq: DatePoint[],
): NfpRegimeSnapshot {
  const date = releaseAt.slice(0, 10);
  const y2 = latestBefore(twoYear, date);
  const y10 = latestBefore(tenYear, date);
  const vx = latestBefore(vix, date);
  const ff = latestBefore(fedFunds, date);
  const dx = latestBefore(dxy, date);
  const nqPoint = latestBefore(nq, date);
  const values = [
    y2?.value ?? null,
    y10?.value ?? null,
    y2 && y10 ? y10.value - y2.value : null,
    vx?.value ?? null,
    ff?.value ?? null,
    dx?.value ?? null,
    trendBefore(nq, date, 20),
    trendBefore(nq, date, 60),
  ];
  const valid = values.filter((value) => value !== null && Number.isFinite(value)).length;
  const asOfCandidates = [y2?.date, y10?.date, vx?.date, ff?.date, dx?.date, nqPoint?.date].filter((value): value is string => Boolean(value));
  return {
    asOfDate: asOfCandidates.sort().at(-1) ?? null,
    twoYear: y2?.value ?? null,
    tenYear: y10?.value ?? null,
    curve10y2y: y2 && y10 ? round(y10.value - y2.value, 3) : null,
    vix: vx?.value ?? null,
    fedFunds: ff?.value ?? null,
    dxy: dx?.value ?? null,
    nq20d: trendBefore(nq, date, 20),
    nq60d: trendBefore(nq, date, 60),
    coverageRate: round((valid / 8) * 100, 1),
  };
}

function regimeSimilarity(current: NfpRegimeSnapshot, candidate: NfpRegimeSnapshot) {
  const fields: Array<[keyof NfpRegimeSnapshot, number, number]> = [
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
  let total = 0;
  for (const [key, weight, scale] of fields) {
    const left = current[key];
    const right = candidate[key];
    if (typeof left !== "number" || typeof right !== "number") continue;
    const score = Math.exp(-Math.abs(left - right) / scale);
    weighted += score * weight;
    total += weight;
  }
  return total ? round((weighted / total) * 100, 1) : null;
}

async function buildRegimeAnalysis(current: NfpSimilarityCase, matches: NfpSimilarityCase[]): Promise<NfpRegimeAnalysis> {
  let series: [DatePoint[], DatePoint[], DatePoint[], DatePoint[], DatePoint[], DatePoint[]];
  try {
    series = await Promise.all([
      fetchFredSeries("DGS2"),
      fetchFredSeries("DGS10"),
      fetchFredSeries("VIXCLS"),
      fetchFredSeries("DFF"),
      fetchYahooDaily("DX-Y.NYB"),
      fetchYahooDaily("NQ=F"),
    ]);
  } catch {
    series = [[], [], [], [], [], []];
  }

  const [twoYear, tenYear, vix, fedFunds, dxy, nq] = series;
  const currentRegime = regimeSnapshot(current.releaseAt, twoYear, tenYear, vix, fedFunds, dxy, nq);
  const ranked: NfpRegimeMatch[] = matches.map((item) => {
    const regime = regimeSnapshot(item.releaseAt, twoYear, tenYear, vix, fedFunds, dxy, nq);
    const regimeScore = regimeSimilarity(currentRegime, regime);
    return {
      ...item,
      regime,
      regimeScore,
      combinedScore: regimeScore === null ? item.similarityScore : round(item.similarityScore * 0.6 + regimeScore * 0.4, 1),
    };
  }).sort((a, b) => b.combinedScore - a.combinedScore);

  const top5 = ranked.slice(0, 5);
  const averageCombined = top5.length ? round(top5.reduce((sum, item) => sum + item.combinedScore, 0) / top5.length, 1) : 0;
  const qualityScore = round(averageCombined * 0.7 + currentRegime.coverageRate * 0.3, 1);
  const grade: NfpAnalysisQuality["grade"] = qualityScore >= 82 ? "A" : qualityScore >= 70 ? "B" : qualityScore >= 58 ? "C" : "D";
  const quality: NfpAnalysisQuality = {
    grade,
    score: qualityScore,
    label: grade === "A" ? "비교 품질 높음" : grade === "B" ? "비교 품질 양호" : grade === "C" ? "참고용" : "표본 주의",
    topSimilarity: ranked[0]?.combinedScore ?? 0,
    averageTop5Similarity: averageCombined,
    reactionCoverageRate: currentRegime.coverageRate,
    reasons: [
      `TOP5 평균 종합유사도 ${averageCombined.toFixed(1)}점`,
      `현재 시장환경 데이터 커버리지 ${currentRegime.coverageRate.toFixed(1)}%`,
    ],
  };

  const insights: string[] = [];
  if (ranked[0]) insights.push(`고용지표와 시장환경을 함께 보면 ${ranked[0].releaseAt.slice(0, 10)} 발표가 가장 비슷하며 종합유사도는 ${ranked[0].combinedScore.toFixed(1)}점입니다.`);
  if (currentRegime.twoYear !== null && currentRegime.vix !== null) insights.push(`발표 직전 환경은 2년물 ${currentRegime.twoYear.toFixed(2)}%, VIX ${currentRegime.vix.toFixed(1)} 수준이었습니다.`);
  if (currentRegime.coverageRate < 75) insights.push("일부 시장환경 원천이 비어 있어 종합유사도는 참고용으로 보는 편이 좋습니다.");

  return { current: currentRegime, matches: ranked.slice(0, 20), quality, insights };
}

const PATTERNS: Array<{
  key: Exclude<NfpPatternKey, "mixed">;
  label: string;
  description: string;
  expected: Partial<Record<NfpAssetKey, -1 | 1>>;
}> = [
  {
    key: "cooling_risk_on",
    label: "고용둔화형 Risk-On",
    description: "고용·임금 압력이 완화되며 금리 부담이 낮아지고 주식·채권이 함께 우호적으로 반응하는 유형입니다.",
    expected: { NQ: 1, RTY: 1, GC: 1, DXY: -1, ZT: 1, ZN: 1 },
  },
  {
    key: "hot_jobs_rate_pressure",
    label: "고용과열·금리부담형",
    description: "고용과 임금이 강해 금리 상승 압력이 커지고 성장주와 채권 가격이 함께 부담을 받는 유형입니다.",
    expected: { NQ: -1, RTY: -1, GC: -1, CL: 1, DXY: 1, ZT: -1, ZN: -1 },
  },
  {
    key: "growth_scare",
    label: "고용쇼크·성장둔화형",
    description: "고용 약화가 금리 완화 기대보다 경기둔화 우려로 해석되어 주식과 원유가 약하고 채권이 강한 유형입니다.",
    expected: { NQ: -1, RTY: -1, GC: 1, CL: -1, DXY: -1, ZT: 1, ZN: 1 },
  },
  {
    key: "reflation_growth",
    label: "강한 성장 Risk-On",
    description: "고용 강세가 물가 충격보다 성장 자신감으로 해석되어 주식과 원유가 강한 유형입니다.",
    expected: { NQ: 1, RTY: 1, GC: -1, CL: 1, DXY: 1, ZT: -1, ZN: -1 },
  },
  {
    key: "stagflation_pressure",
    label: "임금압력·스태그플레이션형",
    description: "성장 부담과 임금·물가 압력이 겹치며 주식·채권이 약하고 금·원유·달러가 상대적으로 강한 유형입니다.",
    expected: { NQ: -1, RTY: -1, GC: 1, CL: 1, DXY: 1, ZT: -1, ZN: -1 },
  },
];

function assetDirection(value: number | null, threshold: number): -1 | 0 | 1 | null {
  if (value === null) return null;
  if (value > threshold) return 1;
  if (value < -threshold) return -1;
  return 0;
}

function classifyPattern(matches: NfpRegimeMatch[], horizon: "close" | "oneDay" | "fiveDay"): NfpPatternResult {
  const top10 = matches.slice(0, 10);
  const medians = ASSETS.map((asset) => {
    const values = top10
      .map((item) => item.reactions[asset.key]?.[horizon])
      .filter((value): value is number => value !== null && value !== undefined && Number.isFinite(value));
    return { asset, median: values.length ? round(median(values) ?? 0, 2) : null };
  });

  const fits = PATTERNS.map((pattern) => {
    let earned = 0;
    let possible = 0;
    for (const row of medians) {
      const expected = pattern.expected[row.asset.key];
      if (expected === undefined || row.median === null) continue;
      const observed = assetDirection(row.median, row.asset.neutral);
      if (observed === null) continue;
      possible += row.asset.weight;
      earned += observed === expected ? row.asset.weight : observed === 0 ? row.asset.weight * 0.45 : 0;
    }
    return { pattern, score: possible ? round((earned / possible) * 100, 1) : 0, coverage: possible };
  }).sort((a, b) => b.score - a.score);

  const best = fits[0];
  const second = fits[1];
  const margin = round((best?.score ?? 0) - (second?.score ?? 0), 1);
  const available = medians.filter((row) => row.median !== null).length;
  const isMixed = available < 4 || !best || best.score < 68 || margin < 4;

  return {
    key: isMixed ? "mixed" : best.pattern.key,
    label: isMixed ? "혼조 / 전환 구간" : best.pattern.label,
    description: isMixed ? "유사사례의 Cross Asset 반응이 한 가지 전형으로 충분히 모이지 않았습니다." : best.pattern.description,
    fitScore: best?.score ?? 0,
    margin,
    horizon,
    assetMedians: medians.map((row) => ({ assetKey: row.asset.key, assetName: row.asset.name, medianReturn: row.median })),
  };
}

function buildPatternAnalysis(regimeMatches: NfpRegimeMatch[]): NfpPatternAnalysis {
  const close = classifyPattern(regimeMatches, "close");
  const oneDay = classifyPattern(regimeMatches, "oneDay");
  const fiveDay = classifyPattern(regimeMatches, "fiveDay");
  const labels = [close.key, oneDay.key, fiveDay.key];
  const same = labels.every((key) => key === labels[0]);
  const persistenceLabel = same && labels[0] !== "mixed"
    ? `당일 → +1D → +5D까지 '${oneDay.label}' 유형이 유지됐습니다.`
    : close.key === oneDay.key && close.key !== "mixed"
      ? `당일과 +1D는 '${oneDay.label}' 유형이지만 +5D에서는 달라졌습니다.`
      : `시간이 지나며 반응 유형이 바뀌어 단일 패턴으로 보기 어렵습니다.`;
  return {
    primary: oneDay,
    close,
    oneDay,
    fiveDay,
    persistenceLabel,
    note: "유형 점수는 확률이 아니라 상위 유사사례의 자산 방향이 사전 정의한 전형과 얼마나 닮았는지 보여주는 휴리스틱 점수입니다.",
  };
}

async function loadSimilarityCases(): Promise<{ current: NfpSimilarityCase; matches: NfpSimilarityCase[] } | null> {
  const supabase = getJhSupabaseAdmin();
  const nowIso = new Date().toISOString();
  const { data: events, error } = await supabase
    .from("economic_events")
    .select("id,release_at,reference_period")
    .eq("event_key", EVENT_KEY)
    .gte("release_at", `${HISTORY_START}T00:00:00Z`)
    .lte("release_at", nowIso)
    .order("release_at", { ascending: false })
    .limit(140);
  if (error) throw new Error(`고용보고서 분석 이벤트 조회 실패: ${error.message}`);

  const rows = (events ?? []) as EventRow[];
  if (rows.length < 2) return null;
  const ids = rows.map((row) => row.id);
  const [{ data: metricRows, error: metricError }, { data: reactionRows, error: reactionError }] = await Promise.all([
    supabase
      .from("economic_event_metrics")
      .select("event_id,metric_key,actual_value,previous_value,forecast_value,surprise_value")
      .in("event_id", ids),
    supabase
      .from("economic_event_reactions")
      .select("event_id,asset_key,asset_name,return_close_pct,return_1d_pct,return_5d_pct")
      .in("event_id", ids),
  ]);
  if (metricError) throw new Error(`고용보고서 분석 지표 조회 실패: ${metricError.message}`);
  if (reactionError) throw new Error(`고용보고서 분석 반응 조회 실패: ${reactionError.message}`);

  const metricList = (metricRows ?? []) as MetricRow[];
  const reactionList = (reactionRows ?? []) as ReactionRow[];
  const rawCases = rows.map((event) => {
    const metrics = blankMetrics();
    for (const row of metricList.filter((item) => item.event_id === event.id)) {
      if (!METRIC_KEYS.includes(row.metric_key as MetricKey)) continue;
      metrics[row.metric_key as MetricKey] = {
        actual: safeNumber(row.actual_value),
        previous: safeNumber(row.previous_value),
        forecast: safeNumber(row.forecast_value),
        surprise: safeNumber(row.surprise_value),
      };
    }
    const reactions: Record<string, NfpReactionSnapshot> = {};
    for (const row of reactionList.filter((item) => item.event_id === event.id)) {
      reactions[row.asset_key] = {
        assetKey: row.asset_key,
        assetName: row.asset_name,
        close: safeNumber(row.return_close_pct),
        oneDay: safeNumber(row.return_1d_pct),
        fiveDay: safeNumber(row.return_5d_pct),
      };
    }
    return { event, metrics, reactions };
  }).filter((item) => METRIC_KEYS.every((key) => item.metrics[key].actual !== null));

  if (rawCases.length < 2) return null;
  const currentRaw = rawCases[0];
  const current: NfpSimilarityCase = {
    id: currentRaw.event.id,
    releaseAt: currentRaw.event.release_at,
    referencePeriod: currentRaw.event.reference_period,
    similarityScore: 100,
    levelScore: 100,
    trendScore: 100,
    surpriseScore: currentRaw.metrics.payroll_change.surprise !== null ? 100 : null,
    surpriseUsed: currentRaw.metrics.payroll_change.surprise !== null,
    metrics: currentRaw.metrics,
    reactions: currentRaw.reactions,
  };

  const matches = rawCases.slice(1).map((item) => {
    const score = similarityScore(current.metrics, item.metrics);
    return {
      id: item.event.id,
      releaseAt: item.event.release_at,
      referencePeriod: item.event.reference_period,
      similarityScore: score.total,
      levelScore: score.level,
      trendScore: score.trend,
      surpriseScore: score.surprise,
      surpriseUsed: score.surpriseUsed,
      metrics: item.metrics,
      reactions: item.reactions,
    } satisfies NfpSimilarityCase;
  }).sort((a, b) => b.similarityScore - a.similarityScore);

  return { current, matches };
}

export async function getNfpFullAnalysis(): Promise<NfpFullAnalysis | null> {
  const loaded = await loadSimilarityCases();
  if (!loaded) return null;
  const { current, matches } = loaded;
  const sensitivity = ([5, 10, 20] as const).map((size) => sensitivityWindow(matches, size));
  const top10Stats = assetStats(matches.slice(0, 10));
  const crossAsset = crossAssetSummary(top10Stats);
  const quality = analysisQuality(matches);
  const insights = buildInsights(matches, sensitivity, crossAsset);
  const regime = await buildRegimeAnalysis(current, matches);
  const pattern = buildPatternAnalysis(regime.matches);
  return {
    current,
    matches: matches.slice(0, 20),
    sensitivity,
    crossAsset,
    quality,
    insights,
    regime,
    pattern,
    assets: ASSETS.map((asset) => ({ key: asset.key, name: asset.name })),
  };
}
