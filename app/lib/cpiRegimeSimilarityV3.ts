import "server-only";

import { getJhSupabaseAdmin } from "@/app/lib/jhDataSupabase";

const CPI_EVENT_KEY = "US_CPI";
const HISTORY_START = "2016-01-01";
const MARKET_START = "2015-01-01";
const FRED_API_BASE_URL = "https://api.stlouisfed.org/fred";
const FETCH_TIMEOUT_MS = 15_000;

const METRIC_KEYS = ["headline_yoy", "headline_mom", "core_yoy", "core_mom"] as const;
type MetricKey = (typeof METRIC_KEYS)[number];

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
  return_1d_pct: number | string | null;
  return_5d_pct: number | string | null;
};

type MetricPoint = { actual: number | null; previous: number | null; forecast: number | null; surprise: number | null };
type MetricSnapshot = Record<MetricKey, MetricPoint>;
type DatePoint = { date: string; value: number };
type YahooPoint = DatePoint & { timestamp: number };

type FredResponse = {
  observations?: Array<{ date?: string; value?: string }>;
  error_message?: string;
};
type YahooChartResponse = {
  chart?: {
    result?: Array<{
      timestamp?: number[];
      indicators?: { quote?: Array<{ close?: Array<number | null> }> };
    }>;
  };
};

export type CpiRegimeSnapshot = {
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

export type CpiRegimeMatch = {
  id: string;
  releaseAt: string;
  referencePeriod: string | null;
  cpiScore: number;
  regimeScore: number | null;
  combinedScore: number;
  regime: CpiRegimeSnapshot;
  nq1d: number | null;
  nq5d: number | null;
};

export type CpiRegimeSensitivity = {
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

export type CpiPathPoint = {
  day: number;
  label: string;
  median: number | null;
  q25: number | null;
  q75: number | null;
  current: number | null;
  sampleSize: number;
};

export type CpiRegimeQuality = {
  grade: "A" | "B" | "C" | "D";
  score: number;
  label: string;
  currentCoverage: number;
  top5AverageCombined: number;
};

export type CpiRegimeAnalysisV3 = {
  current: {
    id: string;
    releaseAt: string;
    referencePeriod: string | null;
    regime: CpiRegimeSnapshot;
  };
  matches: CpiRegimeMatch[];
  sensitivity: CpiRegimeSensitivity[];
  path: CpiPathPoint[];
  quality: CpiRegimeQuality;
  insights: string[];
  methodology: {
    cpiWeight: number;
    regimeWeight: number;
    regimeInputs: string[];
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

function blankMetrics(): MetricSnapshot {
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
  return sorted.length % 2 === 0 ? (sorted[middle - 1] + sorted[middle]) / 2 : sorted[middle];
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

function pctChange(value: number | null, base: number | null) {
  if (value === null || base === null || base === 0) return null;
  return ((value / base) - 1) * 100;
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
  if (current.actual === null || current.previous === null || candidate.actual === null || candidate.previous === null) return null;
  const a = direction(current.actual - current.previous);
  const b = direction(candidate.actual - candidate.previous);
  if (a === null || b === null) return null;
  if (a === b) return 1;
  if (a === 0 || b === 0) return 0.5;
  return 0;
}

function cpiSimilarity(current: MetricSnapshot, candidate: MetricSnapshot) {
  const levels: Array<[MetricKey, number, number]> = [
    ["headline_yoy", 18, 1.5],
    ["headline_mom", 12, 0.45],
    ["core_yoy", 18, 1.5],
    ["core_mom", 12, 0.45],
  ];
  const trends: Array<[MetricKey, number]> = [
    ["headline_yoy", 7],
    ["headline_mom", 5],
    ["core_yoy", 7],
    ["core_mom", 5],
  ];
  const surprises: Array<[MetricKey, number, number]> = [
    ["headline_yoy", 10, 0.35],
    ["core_yoy", 6, 0.35],
  ];

  let weighted = 0;
  let weight = 0;
  for (const [key, w, scale] of levels) {
    const score = continuousSimilarity(current[key].actual, candidate[key].actual, scale);
    if (score === null) continue;
    weighted += score * w;
    weight += w;
  }
  for (const [key, w] of trends) {
    const score = trendSimilarity(current[key], candidate[key]);
    if (score === null) continue;
    weighted += score * w;
    weight += w;
  }
  for (const [key, w, scale] of surprises) {
    const score = continuousSimilarity(current[key].surprise, candidate[key].surprise, scale);
    if (score === null) continue;
    weighted += score * w;
    weight += w;
  }
  return weight ? round((weighted / weight) * 100, 1) : 0;
}

function newYorkDate(timestampMs: number) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/New_York",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date(timestampMs));
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${values.year}-${values.month}-${values.day}`;
}

async function fetchFredSeries(seriesId: string): Promise<DatePoint[]> {
  const apiKey = process.env.FRED_API_KEY;
  if (!apiKey) throw new Error("FRED_API_KEY 환경변수가 없습니다.");
  const query = new URLSearchParams({
    api_key: apiKey,
    file_type: "json",
    series_id: seriesId,
    observation_start: MARKET_START,
    sort_order: "asc",
    limit: "100000",
  });
  const response = await fetch(`${FRED_API_BASE_URL}/series/observations?${query.toString()}`, {
    next: { revalidate: 21_600 },
    signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
  });
  if (!response.ok) throw new Error(`FRED ${seriesId} 요청 실패: ${response.status}`);
  const payload = (await response.json()) as FredResponse;
  if (payload.error_message) throw new Error(`FRED ${seriesId}: ${payload.error_message}`);
  return (payload.observations ?? [])
    .map((item) => ({ date: item.date ?? "", value: Number(item.value) }))
    .filter((item) => /^\d{4}-\d{2}-\d{2}$/.test(item.date) && Number.isFinite(item.value));
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
        headers: {
          Accept: "application/json,text/plain;q=0.9,*/*;q=0.8",
          "User-Agent": "Mozilla/5.0 (compatible; HOHAENG-OS/1.0; +https://hohaeng.vercel.app)",
        },
        signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
      });
      if (!response.ok) continue;
      const payload = (await response.json()) as YahooChartResponse;
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
      // backup host retry
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
): CpiRegimeSnapshot {
  const releaseDate = newYorkDate(Date.parse(releaseAt));
  const twoYear = latestBefore(data.dgs2, releaseDate)?.value ?? null;
  const tenYear = latestBefore(data.dgs10, releaseDate)?.value ?? null;
  const vix = latestBefore(data.vix, releaseDate)?.value ?? null;
  const fedFunds = latestBefore(data.dff, releaseDate)?.value ?? null;
  const dxy = latestBefore(data.dxy, releaseDate)?.value ?? null;
  const nqIndex = latestYahooIndexBefore(data.nq, releaseDate);
  const nqNow = nqIndex >= 0 ? data.nq[nqIndex]?.value ?? null : null;
  const nq20d = nqIndex >= 20 ? pctChange(nqNow, data.nq[nqIndex - 20]?.value ?? null) : null;
  const nq60d = nqIndex >= 60 ? pctChange(nqNow, data.nq[nqIndex - 60]?.value ?? null) : null;
  const curve10y2y = twoYear !== null && tenYear !== null ? tenYear - twoYear : null;
  const values = [twoYear, tenYear, curve10y2y, vix, fedFunds, dxy, nq20d, nq60d];
  const coverage = round((values.filter((value) => value !== null).length / values.length) * 100, 1);
  return {
    twoYear,
    tenYear,
    curve10y2y,
    vix,
    fedFunds,
    dxy,
    nq20d,
    nq60d,
    coverage,
    asOfDate: nqIndex >= 0 ? data.nq[nqIndex]?.date ?? null : null,
  };
}

function regimeSimilarity(current: CpiRegimeSnapshot, candidate: CpiRegimeSnapshot): number | null {
  const definitions: Array<[keyof CpiRegimeSnapshot, number, number]> = [
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

function stat(values: Array<number | null>) {
  const valid = values.filter((value): value is number => value !== null && Number.isFinite(value));
  const positive = valid.filter((value) => value > 0).length;
  return {
    positiveRate: valid.length ? round((positive / valid.length) * 100, 1) : null,
    average: valid.length ? round(valid.reduce((sum, value) => sum + value, 0) / valid.length, 2) : null,
    median: valid.length ? round(median(valid) ?? 0, 2) : null,
  };
}

function sensitivity(matches: CpiRegimeMatch[], size: 5 | 10 | 20): CpiRegimeSensitivity {
  const slice = matches.slice(0, size);
  const combined = slice.map((item) => item.combinedScore);
  const oneDay = stat(slice.map((item) => item.nq1d));
  const fiveDay = stat(slice.map((item) => item.nq5d));
  return {
    size,
    actualSize: slice.length,
    averageCombined: combined.length ? round(combined.reduce((sum, value) => sum + value, 0) / combined.length, 1) : null,
    minimumCombined: combined.length ? round(Math.min(...combined), 1) : null,
    nq1dPositiveRate: oneDay.positiveRate,
    nq1dAverage: oneDay.average,
    nq1dMedian: oneDay.median,
    nq5dPositiveRate: fiveDay.positiveRate,
    nq5dAverage: fiveDay.average,
    nq5dMedian: fiveDay.median,
  };
}

function pathForEvent(releaseAt: string, nq: YahooPoint[]): Array<number | null> {
  const releaseDate = newYorkDate(Date.parse(releaseAt));
  const previousIndex = latestYahooIndexBefore(nq, releaseDate);
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

function pathSummary(currentReleaseAt: string, matches: CpiRegimeMatch[], nq: YahooPoint[]): CpiPathPoint[] {
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

function quality(current: CpiRegimeSnapshot, matches: CpiRegimeMatch[]): CpiRegimeQuality {
  const top5 = matches.slice(0, 5);
  const top5AverageCombined = top5.length
    ? round(top5.reduce((sum, item) => sum + item.combinedScore, 0) / top5.length, 1)
    : 0;
  const score = round(top5AverageCombined * 0.7 + current.coverage * 0.3, 1);
  const grade: CpiRegimeQuality["grade"] = score >= 82 ? "A" : score >= 72 ? "B" : score >= 60 ? "C" : "D";
  const label = grade === "A" ? "비교 품질 높음" : grade === "B" ? "비교 품질 양호" : grade === "C" ? "비교 품질 보통" : "비교 품질 낮음";
  return { grade, score, label, currentCoverage: current.coverage, top5AverageCombined };
}

function buildInsights(
  current: CpiRegimeSnapshot,
  matches: CpiRegimeMatch[],
  sensitivityRows: CpiRegimeSensitivity[],
  path: CpiPathPoint[],
  qualityRow: CpiRegimeQuality,
) {
  const insights: string[] = [
    `현재 CPI+시장환경 비교 품질은 ${qualityRow.grade}등급(${qualityRow.score.toFixed(1)}점)입니다.`,
  ];
  const best = matches[0];
  if (best) {
    insights.push(`가장 비슷한 과거는 종합 ${best.combinedScore.toFixed(1)}점으로, CPI 유사도 ${best.cpiScore.toFixed(1)}점과 시장환경 유사도 ${best.regimeScore?.toFixed(1) ?? "—"}점을 함께 반영했습니다.`);
  }
  const rates = sensitivityRows.map((row) => row.nq1dPositiveRate).filter((value): value is number => value !== null);
  if (rates.length >= 2) {
    const spread = Math.max(...rates) - Math.min(...rates);
    insights.push(spread <= 15
      ? `NQ +1D 상승률은 TOP5·10·20 사이 차이가 ${spread.toFixed(1)}%p로 비교적 안정적입니다.`
      : `NQ +1D 상승률은 TOP5·10·20 사이 차이가 ${spread.toFixed(1)}%p라 표본 선택에 민감합니다.`);
  }
  const day5 = path.find((item) => item.day === 5)?.median ?? null;
  const day10 = path.find((item) => item.day === 10)?.median ?? null;
  if (day5 !== null && day10 !== null) {
    insights.push(`유사 사례의 NQ 중앙 경로는 발표 전 100 기준 +5D ${day5.toFixed(2)}, +10D ${day10.toFixed(2)}였습니다.`);
  }
  const curveText = current.curve10y2y === null ? "금리차 미확보" : current.curve10y2y < 0 ? "2Y-10Y 역전 환경" : "정상 금리곡선 환경";
  const vixText = current.vix === null ? "VIX 미확보" : current.vix >= 25 ? `VIX ${current.vix.toFixed(1)} 고변동성` : current.vix >= 18 ? `VIX ${current.vix.toFixed(1)} 경계 구간` : `VIX ${current.vix.toFixed(1)} 저변동성`;
  insights.push(`발표 전 시장환경은 ${curveText}, ${vixText}, NQ 20거래일 추세 ${current.nq20d === null ? "—" : `${current.nq20d > 0 ? "+" : ""}${current.nq20d.toFixed(1)}%`}였습니다.`);
  return insights.slice(0, 5);
}

export async function getCpiRegimeAnalysisV3(): Promise<CpiRegimeAnalysisV3 | null> {
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
  if (eventError) throw new Error(`CPI V3 이벤트 조회 실패: ${eventError.message}`);
  const events = (eventData ?? []) as EventRow[];
  if (!events.length) return null;

  const ids = events.map((event) => event.id);
  const [{ data: metricData, error: metricError }, { data: reactionData, error: reactionError }] = await Promise.all([
    supabase.from("economic_event_metrics").select("event_id,metric_key,actual_value,previous_value,forecast_value,surprise_value").in("event_id", ids),
    supabase.from("economic_event_reactions").select("event_id,asset_key,return_1d_pct,return_5d_pct").in("event_id", ids).eq("asset_key", "NQ"),
  ]);
  if (metricError) throw new Error(`CPI V3 지표 조회 실패: ${metricError.message}`);
  if (reactionError) throw new Error(`CPI V3 시장반응 조회 실패: ${reactionError.message}`);

  const metricByEvent = new Map<string, MetricSnapshot>();
  for (const event of events) metricByEvent.set(event.id, blankMetrics());
  for (const row of (metricData ?? []) as MetricRow[]) {
    if (!METRIC_KEYS.includes(row.metric_key as MetricKey)) continue;
    const target = metricByEvent.get(row.event_id);
    if (!target) continue;
    target[row.metric_key as MetricKey] = {
      actual: safeNumber(row.actual_value),
      previous: safeNumber(row.previous_value),
      forecast: safeNumber(row.forecast_value),
      surprise: safeNumber(row.surprise_value),
    };
  }

  const reactionByEvent = new Map<string, { nq1d: number | null; nq5d: number | null }>();
  for (const row of (reactionData ?? []) as ReactionRow[]) {
    reactionByEvent.set(row.event_id, {
      nq1d: safeNumber(row.return_1d_pct),
      nq5d: safeNumber(row.return_5d_pct),
    });
  }

  const latest = events.find((event) => {
    const metrics = metricByEvent.get(event.id);
    return metrics && METRIC_KEYS.every((key) => metrics[key].actual !== null);
  });
  if (!latest) return null;

  const [dgs2, dgs10, vix, dff, dxy, nq] = await Promise.all([
    fetchFredSeries("DGS2").catch(() => []),
    fetchFredSeries("DGS10").catch(() => []),
    fetchFredSeries("VIXCLS").catch(() => []),
    fetchFredSeries("DFF").catch(() => []),
    fetchYahooDaily("DX-Y.NYB").catch(() => []),
    fetchYahooDaily("NQ=F").catch(() => []),
  ]);
  const marketData = { dgs2, dgs10, vix, dff, dxy, nq };

  const currentMetrics = metricByEvent.get(latest.id) ?? blankMetrics();
  const currentRegime = regimeSnapshot(latest.release_at, marketData);

  const ranked = events
    .filter((event) => event.id !== latest.id)
    .map((event) => {
      const metrics = metricByEvent.get(event.id) ?? blankMetrics();
      if (!METRIC_KEYS.every((key) => metrics[key].actual !== null)) return null;
      const cpiScore = cpiSimilarity(currentMetrics, metrics);
      const regime = regimeSnapshot(event.release_at, marketData);
      const regimeScore = regimeSimilarity(currentRegime, regime);
      const combinedScore = regimeScore === null ? cpiScore : round(cpiScore * 0.6 + regimeScore * 0.4, 1);
      const reaction = reactionByEvent.get(event.id);
      return {
        id: event.id,
        releaseAt: event.release_at,
        referencePeriod: event.reference_period,
        cpiScore,
        regimeScore,
        combinedScore,
        regime,
        nq1d: reaction?.nq1d ?? null,
        nq5d: reaction?.nq5d ?? null,
      } satisfies CpiRegimeMatch;
    })
    .filter((item): item is CpiRegimeMatch => item !== null)
    .sort((a, b) => b.combinedScore - a.combinedScore || b.releaseAt.localeCompare(a.releaseAt));

  const sensitivityRows = ([5, 10, 20] as const).map((size) => sensitivity(ranked, size));
  const path = pathSummary(latest.release_at, ranked, nq);
  const qualityRow = quality(currentRegime, ranked);
  const insights = buildInsights(currentRegime, ranked, sensitivityRows, path, qualityRow);

  return {
    current: {
      id: latest.id,
      releaseAt: latest.release_at,
      referencePeriod: latest.reference_period,
      regime: currentRegime,
    },
    matches: ranked.slice(0, 20),
    sensitivity: sensitivityRows,
    path,
    quality: qualityRow,
    insights,
    methodology: {
      cpiWeight: 60,
      regimeWeight: 40,
      regimeInputs: ["미국 2년물 금리", "미국 10년물 금리", "10Y-2Y 금리차", "VIX", "Effective Fed Funds", "DXY", "NQ 20D 추세", "NQ 60D 추세"],
    },
  };
}
