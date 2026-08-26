import "server-only";

const MARKET_START = "2015-01-01";
const ANALYSIS_START = "2016-01-01";
const FRED_BASE = "https://api.stlouisfed.org/fred";
const REVALIDATE_SECONDS = 21_600;
const TIMEOUT_MS = 18_000;

const ASSETS = [
  { key: "NQ", name: "나스닥100 선물", symbol: "NQ=F" },
  { key: "RTY", name: "러셀2000 선물", symbol: "RTY=F" },
  { key: "GC", name: "금 선물", symbol: "GC=F" },
  { key: "CL", name: "WTI 원유 선물", symbol: "CL=F" },
  { key: "DXY", name: "달러인덱스", symbol: "DX-Y.NYB" },
  { key: "ZT", name: "미국 2년물 국채선물", symbol: "ZT=F" },
  { key: "ZN", name: "미국 10년물 국채선물", symbol: "ZN=F" },
] as const;

export type MarketRegimeAssetKey = (typeof ASSETS)[number]["key"];
export type MarketRegimeType = "Risk-On" | "Neutral" | "Risk-Off";
export type MarketRegimeFactorKey =
  | "trend"
  | "inflation"
  | "rates"
  | "liquidity"
  | "volatility"
  | "dollar"
  | "growth";

type DatePoint = { date: string; value: number };
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

type MarketInputs = {
  dgs2: DatePoint[];
  dgs10: DatePoint[];
  vix: DatePoint[];
  breakeven5y: DatePoint[];
  walcl: DatePoint[];
  rrp: DatePoint[];
  claims: DatePoint[];
  unemployment: DatePoint[];
  assets: Record<MarketRegimeAssetKey, DatePoint[]>;
};

export type MarketRegimeMetric = {
  label: string;
  value: string;
};

export type MarketRegimeFactor = {
  key: MarketRegimeFactorKey;
  name: string;
  score: number | null;
  weight: number;
  tone: "supportive" | "neutral" | "defensive" | "unavailable";
  summary: string;
  metrics: MarketRegimeMetric[];
};

export type MarketRegimeSnapshot = {
  asOfDate: string;
  score: number;
  regime: MarketRegimeType;
  label: string;
  coverage: number;
  confidence: number;
  factors: MarketRegimeFactor[];
};

export type MarketRegimeMatch = {
  date: string;
  similarity: number;
  score: number;
  regime: MarketRegimeType;
  label: string;
  factors: Partial<Record<MarketRegimeFactorKey, number>>;
  returns: Record<MarketRegimeAssetKey, {
    oneDay: number | null;
    fiveDay: number | null;
    twentyDay: number | null;
  }>;
};

export type MarketRegimeHorizonStat = {
  sampleSize: number;
  positiveRate: number | null;
  averageReturn: number | null;
  medianReturn: number | null;
};

export type MarketRegimeAssetStat = {
  assetKey: MarketRegimeAssetKey;
  assetName: string;
  oneDay: MarketRegimeHorizonStat;
  fiveDay: MarketRegimeHorizonStat;
  twentyDay: MarketRegimeHorizonStat;
};

export type MarketRegimeAnalysisV1 = {
  current: MarketRegimeSnapshot;
  previous20d: MarketRegimeSnapshot | null;
  transition: {
    delta: number | null;
    direction: "improving" | "stable" | "worsening" | "unknown";
    label: string;
  };
  matches: MarketRegimeMatch[];
  assetStats: MarketRegimeAssetStat[];
  insights: string[];
  sources: string[];
};

const FACTOR_WEIGHTS: Record<MarketRegimeFactorKey, number> = {
  trend: 20,
  inflation: 15,
  rates: 15,
  liquidity: 10,
  volatility: 15,
  dollar: 10,
  growth: 15,
};

function round(value: number, digits = 1) {
  const factor = 10 ** digits;
  return Math.round((value + Number.EPSILON) * factor) / factor;
}

function clamp(value: number, min = 0, max = 100) {
  return Math.min(max, Math.max(min, value));
}

function pct(value: number | null, base: number | null) {
  if (value === null || base === null || base === 0) return null;
  return ((value / base) - 1) * 100;
}

function signed(value: number | null, digits = 1, suffix = "%") {
  if (value === null) return "—";
  return `${value > 0 ? "+" : ""}${value.toFixed(digits)}${suffix}`;
}

function fmt(value: number | null, digits = 2, suffix = "") {
  return value === null ? "—" : `${value.toFixed(digits)}${suffix}`;
}

function median(values: number[]) {
  if (!values.length) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? (sorted[middle - 1] + sorted[middle]) / 2
    : sorted[middle];
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

function dateShift(date: string, days: number) {
  const instant = new Date(`${date}T12:00:00Z`);
  instant.setUTCDate(instant.getUTCDate() + days);
  return instant.toISOString().slice(0, 10);
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
  const response = await fetch(`${FRED_BASE}/series/observations?${query.toString()}`, {
    next: { revalidate: REVALIDATE_SECONDS },
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
  if (!response.ok) throw new Error(`FRED ${seriesId} 요청 실패 (${response.status})`);
  const payload = (await response.json()) as FredResponse;
  if (payload.error_message) throw new Error(`FRED ${seriesId}: ${payload.error_message}`);
  return (payload.observations ?? [])
    .map((item) => ({ date: item.date ?? "", value: Number(item.value) }))
    .filter((item) => /^\d{4}-\d{2}-\d{2}$/.test(item.date) && Number.isFinite(item.value));
}

async function safeFredSeries(seriesId: string) {
  try {
    return await fetchFredSeries(seriesId);
  } catch (error) {
    console.error(`MARKET REGIME FRED ${seriesId} 오류:`, error);
    return [];
  }
}

async function fetchYahooDaily(symbol: string): Promise<DatePoint[]> {
  const period1 = Math.floor(Date.parse(`${MARKET_START}T00:00:00Z`) / 1000);
  const period2 = Math.floor((Date.now() + 10 * 86_400_000) / 1000);
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
        next: { revalidate: REVALIDATE_SECONDS },
        headers: {
          Accept: "application/json,text/plain;q=0.9,*/*;q=0.8",
          "User-Agent": "Mozilla/5.0 (compatible; HOHAENG-OS/1.0; +https://hohaeng.vercel.app)",
        },
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
          const close = closes[index];
          return typeof close === "number" && Number.isFinite(close)
            ? { date: newYorkDate(timestamp * 1000), value: close }
            : null;
        })
        .filter((item): item is DatePoint => item !== null)
        .sort((a, b) => a.date.localeCompare(b.date));
    } catch {
      // backup host retry
    }
  }
  return [];
}

function indexOnOrBefore(points: DatePoint[], date: string) {
  let low = 0;
  let high = points.length - 1;
  let answer = -1;
  while (low <= high) {
    const mid = Math.floor((low + high) / 2);
    if (points[mid].date <= date) {
      answer = mid;
      low = mid + 1;
    } else {
      high = mid - 1;
    }
  }
  return answer;
}

function pointOnOrBefore(points: DatePoint[], date: string) {
  const index = indexOnOrBefore(points, date);
  return index >= 0 ? points[index] : null;
}

function lagValue(points: DatePoint[], date: string, observations: number) {
  const index = indexOnOrBefore(points, date);
  if (index < observations) return null;
  return points[index - observations]?.value ?? null;
}

function calendarLagValue(points: DatePoint[], date: string, days: number) {
  return pointOnOrBefore(points, dateShift(date, -days))?.value ?? null;
}

function rangeMean(points: DatePoint[], date: string, days: number) {
  const start = dateShift(date, -days);
  const values = points
    .filter((point) => point.date >= start && point.date <= date)
    .map((point) => point.value);
  if (!values.length) return null;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function toneForScore(score: number | null): MarketRegimeFactor["tone"] {
  if (score === null) return "unavailable";
  if (score >= 60) return "supportive";
  if (score <= 40) return "defensive";
  return "neutral";
}

function factor(
  key: MarketRegimeFactorKey,
  score: number | null,
  summary: string,
  metrics: MarketRegimeMetric[],
): MarketRegimeFactor {
  return {
    key,
    name: {
      trend: "Trend",
      inflation: "Inflation",
      rates: "Rates",
      liquidity: "Liquidity",
      volatility: "Volatility",
      dollar: "Dollar",
      growth: "Growth",
    }[key],
    score: score === null ? null : round(clamp(score), 0),
    weight: FACTOR_WEIGHTS[key],
    tone: toneForScore(score),
    summary,
    metrics,
  };
}

function snapshotAt(date: string, data: MarketInputs): MarketRegimeSnapshot | null {
  const nq = data.assets.NQ;
  const nqIndex = indexOnOrBefore(nq, date);
  if (nqIndex < 60) return null;
  const actualDate = nq[nqIndex]?.date;
  if (!actualDate) return null;

  const nqNow = nq[nqIndex]?.value ?? null;
  const nq20 = pct(nqNow, nq[nqIndex - 20]?.value ?? null);
  const nq60 = pct(nqNow, nq[nqIndex - 60]?.value ?? null);
  const trendScore = nq20 === null || nq60 === null
    ? null
    : 50 + clamp(nq20 / 10, -1, 1) * 22 + clamp(nq60 / 20, -1, 1) * 28;

  const breakeven = pointOnOrBefore(data.breakeven5y, actualDate)?.value ?? null;
  const breakevenLag = lagValue(data.breakeven5y, actualDate, 20);
  const breakevenChangeBp = breakeven !== null && breakevenLag !== null
    ? (breakeven - breakevenLag) * 100
    : null;
  let inflationScore: number | null = null;
  if (breakeven !== null) {
    const levelScore = clamp(100 - Math.abs(breakeven - 2.2) * 55, 10, 95);
    const trendScoreInflation = breakevenChangeBp === null
      ? 50
      : 50 - clamp(breakevenChangeBp / 30, -1, 1) * 25;
    inflationScore = levelScore * 0.65 + trendScoreInflation * 0.35;
  }

  const twoYear = pointOnOrBefore(data.dgs2, actualDate)?.value ?? null;
  const tenYear = pointOnOrBefore(data.dgs10, actualDate)?.value ?? null;
  const twoYearLag = lagValue(data.dgs2, actualDate, 20);
  const twoYearChangeBp = twoYear !== null && twoYearLag !== null ? (twoYear - twoYearLag) * 100 : null;
  const curve = twoYear !== null && tenYear !== null ? tenYear - twoYear : null;
  let ratesScore: number | null = null;
  if (twoYear !== null) {
    const changeScore = twoYearChangeBp === null
      ? 50
      : 50 - clamp(twoYearChangeBp / 50, -1, 1) * 30;
    const curveScore = curve === null ? 50 : 50 + clamp(curve / 1, -1, 1) * 20;
    const levelScore = clamp(70 - Math.max(0, twoYear - 3) * 12, 20, 80);
    ratesScore = changeScore * 0.5 + curveScore * 0.3 + levelScore * 0.2;
  }

  const walcl = pointOnOrBefore(data.walcl, actualDate)?.value ?? null;
  const walcl4w = calendarLagValue(data.walcl, actualDate, 28);
  const walclChange = pct(walcl, walcl4w);
  const rrp = pointOnOrBefore(data.rrp, actualDate)?.value ?? null;
  const rrpLag = lagValue(data.rrp, actualDate, 20);
  const rrpChange = pct(rrp, rrpLag);
  const liquidityParts: Array<{ score: number; weight: number }> = [];
  if (walclChange !== null) liquidityParts.push({ score: 50 + clamp(walclChange / 2, -1, 1) * 25, weight: 0.7 });
  if (rrpChange !== null) liquidityParts.push({ score: 50 - clamp(rrpChange / 50, -1, 1) * 20, weight: 0.3 });
  const liquidityWeight = liquidityParts.reduce((sum, item) => sum + item.weight, 0);
  const liquidityScore = liquidityWeight
    ? liquidityParts.reduce((sum, item) => sum + item.score * item.weight, 0) / liquidityWeight
    : null;

  const vix = pointOnOrBefore(data.vix, actualDate)?.value ?? null;
  const vixLag = lagValue(data.vix, actualDate, 20);
  const vixChange = pct(vix, vixLag);
  let volatilityScore: number | null = null;
  if (vix !== null) {
    const levelScore = clamp(100 - (vix - 10) * 3.33, 5, 95);
    const changeScore = vixChange === null ? 50 : 50 - clamp(vixChange / 30, -1, 1) * 25;
    volatilityScore = levelScore * 0.7 + changeScore * 0.3;
  }

  const dxy = data.assets.DXY;
  const dxyIndex = indexOnOrBefore(dxy, actualDate);
  const dxyNow = dxyIndex >= 0 ? dxy[dxyIndex]?.value ?? null : null;
  const dxy20 = dxyIndex >= 20 ? pct(dxyNow, dxy[dxyIndex - 20]?.value ?? null) : null;
  const dxy60 = dxyIndex >= 60 ? pct(dxyNow, dxy[dxyIndex - 60]?.value ?? null) : null;
  const dollarScore = dxy20 === null || dxy60 === null
    ? null
    : 50 - clamp(dxy20 / 5, -1, 1) * 25 - clamp(dxy60 / 10, -1, 1) * 25;

  const claims = pointOnOrBefore(data.claims, actualDate)?.value ?? null;
  const claims13wMean = rangeMean(data.claims, actualDate, 91);
  const claimsGap = pct(claims, claims13wMean);
  const unemployment = pointOnOrBefore(data.unemployment, actualDate)?.value ?? null;
  const unemployment3m = calendarLagValue(data.unemployment, actualDate, 92);
  const unemploymentChange = unemployment !== null && unemployment3m !== null
    ? unemployment - unemployment3m
    : null;
  let growthScore: number | null = null;
  if (claimsGap !== null || unemploymentChange !== null) {
    const claimsScore = claimsGap === null ? 50 : 50 - clamp(claimsGap / 15, -1, 1) * 25;
    const unemploymentScore = unemploymentChange === null
      ? 50
      : 50 - clamp(unemploymentChange / 0.5, -1, 1) * 25;
    growthScore = claimsScore * 0.55 + unemploymentScore * 0.45;
  }

  const factors: MarketRegimeFactor[] = [
    factor("trend", trendScore, nq20 !== null && nq60 !== null
      ? `NQ 20일 ${signed(nq20)} · 60일 ${signed(nq60)}`
      : "나스닥 추세 데이터 부족", [
      { label: "NQ 20D", value: signed(nq20) },
      { label: "NQ 60D", value: signed(nq60) },
    ]),
    factor("inflation", inflationScore, breakeven !== null
      ? `5Y 기대인플레 ${fmt(breakeven, 2, "%")} · 20일 ${signed(breakevenChangeBp, 0, "bp")}`
      : "기대인플레이션 데이터 부족", [
      { label: "5Y BEI", value: fmt(breakeven, 2, "%") },
      { label: "20D", value: signed(breakevenChangeBp, 0, "bp") },
    ]),
    factor("rates", ratesScore, twoYear !== null
      ? `2Y ${fmt(twoYear, 2, "%")} · 20일 ${signed(twoYearChangeBp, 0, "bp")} · 10Y-2Y ${fmt(curve, 2, "%p")}`
      : "금리 데이터 부족", [
      { label: "2Y", value: fmt(twoYear, 2, "%") },
      { label: "2Y 20D", value: signed(twoYearChangeBp, 0, "bp") },
      { label: "10Y-2Y", value: fmt(curve, 2, "%p") },
    ]),
    factor("liquidity", liquidityScore, walclChange !== null || rrpChange !== null
      ? `Fed 자산 4주 ${signed(walclChange)} · RRP 20일 ${signed(rrpChange)}`
      : "유동성 데이터 부족", [
      { label: "Fed assets 4W", value: signed(walclChange) },
      { label: "RRP 20D", value: signed(rrpChange) },
    ]),
    factor("volatility", volatilityScore, vix !== null
      ? `VIX ${fmt(vix, 1)} · 20일 ${signed(vixChange)}`
      : "VIX 데이터 부족", [
      { label: "VIX", value: fmt(vix, 1) },
      { label: "20D", value: signed(vixChange) },
    ]),
    factor("dollar", dollarScore, dxy20 !== null && dxy60 !== null
      ? `DXY 20일 ${signed(dxy20)} · 60일 ${signed(dxy60)}`
      : "달러 추세 데이터 부족", [
      { label: "DXY 20D", value: signed(dxy20) },
      { label: "DXY 60D", value: signed(dxy60) },
    ]),
    factor("growth", growthScore, claimsGap !== null || unemploymentChange !== null
      ? `실업청구 13주 평균 대비 ${signed(claimsGap)} · 실업률 3개월 ${signed(unemploymentChange, 2, "%p")}`
      : "고용 기반 경기 데이터 부족", [
      { label: "Claims vs 13W", value: signed(claimsGap) },
      { label: "UNRATE 3M", value: signed(unemploymentChange, 2, "%p") },
    ]),
  ];

  const available = factors.filter((item) => item.score !== null);
  const availableWeight = available.reduce((sum, item) => sum + item.weight, 0);
  if (!availableWeight) return null;
  const score = round(
    available.reduce((sum, item) => sum + (item.score ?? 50) * item.weight, 0) / availableWeight,
    0,
  );
  const coverage = round(availableWeight, 0);
  const positive = available.filter((item) => (item.score ?? 50) >= 55).length;
  const negative = available.filter((item) => (item.score ?? 50) <= 45).length;
  const neutral = available.length - positive - negative;
  const agreement = available.length ? Math.max(positive, negative, neutral) / available.length * 100 : 0;
  const confidence = round(clamp(coverage * 0.7 + agreement * 0.3), 0);
  const regime: MarketRegimeType = score >= 60 ? "Risk-On" : score <= 40 ? "Risk-Off" : "Neutral";
  const label = score >= 70
    ? "강한 위험선호"
    : score >= 60
      ? "위험선호 우위"
      : score >= 55
        ? "완만한 위험선호"
        : score >= 45
          ? "중립"
          : score >= 40
            ? "완만한 방어"
            : "위험회피 우위";

  return { asOfDate: actualDate, score, regime, label, coverage, confidence, factors };
}

function factorScoreMap(snapshot: MarketRegimeSnapshot) {
  return Object.fromEntries(
    snapshot.factors
      .filter((item) => item.score !== null)
      .map((item) => [item.key, item.score as number]),
  ) as Partial<Record<MarketRegimeFactorKey, number>>;
}

function similarity(current: MarketRegimeSnapshot, candidate: MarketRegimeSnapshot) {
  const currentMap = factorScoreMap(current);
  const candidateMap = factorScoreMap(candidate);
  let weighted = 0;
  let totalWeight = 0;
  for (const key of Object.keys(FACTOR_WEIGHTS) as MarketRegimeFactorKey[]) {
    const left = currentMap[key];
    const right = candidateMap[key];
    if (left === undefined || right === undefined) continue;
    const local = Math.exp(-Math.abs(left - right) / 18);
    const weight = FACTOR_WEIGHTS[key];
    weighted += local * weight;
    totalWeight += weight;
  }
  return totalWeight ? round(weighted / totalWeight * 100, 1) : 0;
}

function returnAfter(points: DatePoint[], date: string, sessions: number) {
  const baseIndex = indexOnOrBefore(points, date);
  if (baseIndex < 0 || baseIndex + sessions >= points.length) return null;
  return pct(points[baseIndex + sessions]?.value ?? null, points[baseIndex]?.value ?? null);
}

function horizonStat(values: Array<number | null>): MarketRegimeHorizonStat {
  const valid = values.filter((value): value is number => value !== null && Number.isFinite(value));
  return {
    sampleSize: valid.length,
    positiveRate: valid.length ? round(valid.filter((value) => value > 0).length / valid.length * 100, 1) : null,
    averageReturn: valid.length ? round(valid.reduce((sum, value) => sum + value, 0) / valid.length, 2) : null,
    medianReturn: valid.length ? round(median(valid) ?? 0, 2) : null,
  };
}

function buildInsights(current: MarketRegimeSnapshot, previous: MarketRegimeSnapshot | null, matches: MarketRegimeMatch[]) {
  const insights: string[] = [];
  const sorted = [...current.factors]
    .filter((item): item is MarketRegimeFactor & { score: number } => item.score !== null)
    .sort((a, b) => b.score - a.score);
  if (sorted[0]) insights.push(`현재 가장 우호적인 축은 ${sorted[0].name} ${sorted[0].score}점입니다. ${sorted[0].summary}`);
  if (sorted.at(-1)) {
    const item = sorted.at(-1)!;
    insights.push(`가장 부담이 큰 축은 ${item.name} ${item.score}점입니다. ${item.summary}`);
  }
  if (previous) {
    const delta = current.score - previous.score;
    insights.push(`20거래일 전 ${previous.score}점에서 현재 ${current.score}점으로 ${Math.abs(delta)}점 ${delta > 0 ? "개선" : delta < 0 ? "약화" : "변화 없음"}됐습니다.`);
  }
  if (matches.length) {
    const average = round(matches.reduce((sum, item) => sum + item.similarity, 0) / matches.length, 1);
    insights.push(`서로 겹치지 않게 고른 과거 유사국면 ${matches.length}개의 평균 유사도는 ${average}점입니다. 이후 수익률은 예측값이 아니라 과거 관측치입니다.`);
  }
  return insights;
}

export async function getMarketRegimeAnalysisV1(): Promise<MarketRegimeAnalysisV1 | null> {
  const fredIds = ["DGS2", "DGS10", "VIXCLS", "T5YIE", "WALCL", "RRPONTSYD", "ICSA", "UNRATE"] as const;
  const [fredRows, assetRows] = await Promise.all([
    Promise.all(fredIds.map((id) => safeFredSeries(id))),
    Promise.all(ASSETS.map(async (asset) => [asset.key, await fetchYahooDaily(asset.symbol)] as const)),
  ]);

  const assets = Object.fromEntries(assetRows) as Record<MarketRegimeAssetKey, DatePoint[]>;
  if (!assets.NQ.length) return null;
  const data: MarketInputs = {
    dgs2: fredRows[0],
    dgs10: fredRows[1],
    vix: fredRows[2],
    breakeven5y: fredRows[3],
    walcl: fredRows[4],
    rrp: fredRows[5],
    claims: fredRows[6],
    unemployment: fredRows[7],
    assets,
  };

  const currentDate = assets.NQ.at(-1)?.date;
  if (!currentDate) return null;
  const current = snapshotAt(currentDate, data);
  if (!current) return null;

  const currentIndex = indexOnOrBefore(assets.NQ, current.asOfDate);
  const previousDate = currentIndex >= 20 ? assets.NQ[currentIndex - 20]?.date ?? null : null;
  const previous20d = previousDate ? snapshotAt(previousDate, data) : null;
  const delta = previous20d ? round(current.score - previous20d.score, 0) : null;
  const transition = {
    delta,
    direction: delta === null ? "unknown" as const : delta >= 5 ? "improving" as const : delta <= -5 ? "worsening" as const : "stable" as const,
    label: delta === null ? "비교 데이터 부족" : delta >= 5 ? "위험자산 환경 개선" : delta <= -5 ? "위험자산 환경 약화" : "시장환경 큰 변화 없음",
  };

  const candidates: Array<{ index: number; snapshot: MarketRegimeSnapshot; similarity: number }> = [];
  const startIndex = Math.max(80, indexOnOrBefore(assets.NQ, ANALYSIS_START));
  for (let index = startIndex; index <= currentIndex - 30; index += 5) {
    const date = assets.NQ[index]?.date;
    if (!date) continue;
    const snapshot = snapshotAt(date, data);
    if (!snapshot || snapshot.coverage < 70) continue;
    candidates.push({ index, snapshot, similarity: similarity(current, snapshot) });
  }
  candidates.sort((a, b) => b.similarity - a.similarity);

  const selected: typeof candidates = [];
  for (const candidate of candidates) {
    if (selected.some((item) => Math.abs(item.index - candidate.index) < 20)) continue;
    selected.push(candidate);
    if (selected.length >= 10) break;
  }

  const matches: MarketRegimeMatch[] = selected.map((item) => ({
    date: item.snapshot.asOfDate,
    similarity: item.similarity,
    score: item.snapshot.score,
    regime: item.snapshot.regime,
    label: item.snapshot.label,
    factors: factorScoreMap(item.snapshot),
    returns: Object.fromEntries(ASSETS.map((asset) => [asset.key, {
      oneDay: returnAfter(assets[asset.key], item.snapshot.asOfDate, 1),
      fiveDay: returnAfter(assets[asset.key], item.snapshot.asOfDate, 5),
      twentyDay: returnAfter(assets[asset.key], item.snapshot.asOfDate, 20),
    }])) as MarketRegimeMatch["returns"],
  }));

  const assetStats: MarketRegimeAssetStat[] = ASSETS.map((asset) => ({
    assetKey: asset.key,
    assetName: asset.name,
    oneDay: horizonStat(matches.map((item) => item.returns[asset.key].oneDay)),
    fiveDay: horizonStat(matches.map((item) => item.returns[asset.key].fiveDay)),
    twentyDay: horizonStat(matches.map((item) => item.returns[asset.key].twentyDay)),
  }));

  return {
    current,
    previous20d,
    transition,
    matches,
    assetStats,
    insights: buildInsights(current, previous20d, matches),
    sources: [
      "FRED: DGS2, DGS10, VIXCLS, T5YIE, WALCL, RRPONTSYD, ICSA, UNRATE",
      "Yahoo Finance: NQ/RTY/GC/CL/ZT/ZN 연속선물 및 DXY 일봉",
    ],
  };
}
