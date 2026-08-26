import "server-only";

import { getJhSupabaseAdmin } from "@/app/lib/jhDataSupabase";
import { getCpiRegimeAnalysisV3 } from "@/app/lib/cpiRegimeSimilarityV3";

const ASSETS = [
  { key: "NQ", name: "나스닥100", weight: 2, threshold: 0.1 },
  { key: "RTY", name: "러셀2000", weight: 1.5, threshold: 0.1 },
  { key: "GC", name: "금", weight: 1, threshold: 0.1 },
  { key: "CL", name: "WTI", weight: 1, threshold: 0.1 },
  { key: "DXY", name: "달러인덱스", weight: 1.5, threshold: 0.08 },
  { key: "ZT", name: "미국 2년물 국채선물", weight: 1, threshold: 0.05 },
  { key: "ZN", name: "미국 10년물 국채선물", weight: 1.5, threshold: 0.05 },
] as const;

type AssetKey = (typeof ASSETS)[number]["key"];
type HorizonKey = "close" | "oneDay" | "fiveDay";
type Direction = -1 | 0 | 1 | null;

const HORIZONS: Array<{ key: HorizonKey; label: string; field: keyof ReactionRow }> = [
  { key: "close", label: "당일", field: "return_close_pct" },
  { key: "oneDay", label: "+1거래일", field: "return_1d_pct" },
  { key: "fiveDay", label: "+5거래일", field: "return_5d_pct" },
];

type ReactionRow = {
  event_id: string;
  asset_key: string;
  return_close_pct: number | string | null;
  return_1d_pct: number | string | null;
  return_5d_pct: number | string | null;
};

export type CpiReactionPatternKey =
  | "disinflation_risk_on"
  | "rate_pressure_risk_off"
  | "growth_scare"
  | "reflation_risk_on"
  | "stagflation_pressure"
  | "mixed";

export type CpiReactionAssetStat = {
  assetKey: AssetKey;
  assetName: string;
  sampleSize: number;
  positiveRate: number | null;
  averageReturn: number | null;
  medianReturn: number | null;
  direction: Direction;
};

export type CpiReactionPattern = {
  horizon: HorizonKey;
  label: string;
  patternKey: CpiReactionPatternKey;
  title: string;
  fitScore: number;
  runnerUpTitle: string | null;
  runnerUpScore: number | null;
  coverageRate: number;
  assetStats: CpiReactionAssetStat[];
  explanation: string;
};

export type CpiReactionPatternV4 = {
  sampleSize: number;
  sourceQuality: {
    grade: "A" | "B" | "C" | "D";
    score: number;
  };
  historical: CpiReactionPattern[];
  currentObserved: CpiReactionPattern[];
  persistence: {
    status: "strong" | "medium" | "partial" | "transition" | "insufficient";
    label: string;
    description: string;
  };
  summary: string[];
  patternGuide: Array<{
    key: Exclude<CpiReactionPatternKey, "mixed">;
    title: string;
    description: string;
  }>;
};

type Prototype = {
  key: Exclude<CpiReactionPatternKey, "mixed">;
  title: string;
  expectations: Partial<Record<AssetKey, -1 | 1>>;
  description: string;
};

const PROTOTYPES: Prototype[] = [
  {
    key: "disinflation_risk_on",
    title: "인플레 완화형 Risk-On",
    expectations: { NQ: 1, RTY: 1, GC: 1, DXY: -1, ZT: 1, ZN: 1 },
    description: "주식 강세와 함께 달러가 약하고 채권선물이 강한, 금리 부담 완화형 반응입니다.",
  },
  {
    key: "rate_pressure_risk_off",
    title: "금리부담형 Risk-Off",
    expectations: { NQ: -1, RTY: -1, DXY: 1, ZT: -1, ZN: -1 },
    description: "주식이 약하고 달러가 강하며 채권선물이 하락하는, 금리 상승 부담형 반응입니다.",
  },
  {
    key: "growth_scare",
    title: "성장둔화형 Risk-Off",
    expectations: { NQ: -1, RTY: -1, GC: 1, CL: -1, ZT: 1, ZN: 1 },
    description: "주식·원유가 약한 반면 금·채권선물이 강한, 성장 둔화 우려형 반응입니다.",
  },
  {
    key: "reflation_risk_on",
    title: "리플레이션형 Risk-On",
    expectations: { NQ: 1, RTY: 1, CL: 1, ZT: -1, ZN: -1 },
    description: "주식과 원유가 강한 반면 채권선물이 약한, 성장·물가 기대 동반 회복형 반응입니다.",
  },
  {
    key: "stagflation_pressure",
    title: "스태그플레이션 압박형",
    expectations: { NQ: -1, RTY: -1, GC: 1, CL: 1, ZT: -1, ZN: -1 },
    description: "주식·채권이 함께 약한 가운데 원유·금이 강한, 물가 압박과 성장 부담이 겹친 반응입니다.",
  },
];

function safeNumber(value: number | string | null | undefined): number | null {
  if (value === null || value === undefined || value === "") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function round(value: number, digits = 1) {
  const factor = 10 ** digits;
  return Math.round((value + Number.EPSILON) * factor) / factor;
}

function median(values: number[]): number | null {
  if (!values.length) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
}

function assetDirection(assetKey: AssetKey, value: number | null): Direction {
  if (value === null) return null;
  const asset = ASSETS.find((item) => item.key === assetKey);
  const threshold = asset?.threshold ?? 0.1;
  if (Math.abs(value) < threshold) return 0;
  return value > 0 ? 1 : -1;
}

function buildAssetStats(
  rows: ReactionRow[],
  eventIds: string[],
  horizon: (typeof HORIZONS)[number],
): CpiReactionAssetStat[] {
  const allowed = new Set(eventIds);
  return ASSETS.map((asset) => {
    const values = rows
      .filter((row) => allowed.has(row.event_id) && row.asset_key === asset.key)
      .map((row) => safeNumber(row[horizon.field]))
      .filter((value): value is number => value !== null);
    const positive = values.filter((value) => value > 0).length;
    const average = values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : null;
    const med = median(values);
    return {
      assetKey: asset.key,
      assetName: asset.name,
      sampleSize: values.length,
      positiveRate: values.length ? round((positive / values.length) * 100, 1) : null,
      averageReturn: average === null ? null : round(average, 2),
      medianReturn: med === null ? null : round(med, 2),
      direction: assetDirection(asset.key, med),
    };
  });
}

function prototypeScore(stats: CpiReactionAssetStat[], prototype: Prototype) {
  let earned = 0;
  let availableWeight = 0;
  let totalExpectedWeight = 0;

  for (const [assetKey, expected] of Object.entries(prototype.expectations) as Array<[AssetKey, -1 | 1]>) {
    const meta = ASSETS.find((asset) => asset.key === assetKey);
    const weight = meta?.weight ?? 1;
    totalExpectedWeight += weight;
    const stat = stats.find((item) => item.assetKey === assetKey);
    if (!stat || stat.direction === null) continue;
    availableWeight += weight;
    if (stat.direction === expected) earned += weight;
    else if (stat.direction === 0) earned += weight * 0.45;
  }

  return {
    fit: availableWeight ? round((earned / availableWeight) * 100, 1) : 0,
    expectedCoverage: totalExpectedWeight ? round((availableWeight / totalExpectedWeight) * 100, 1) : 0,
  };
}

function signalText(stat: CpiReactionAssetStat) {
  if (stat.direction === null) return `${stat.assetName} 데이터 없음`;
  if (stat.direction === 0) return `${stat.assetName} 보합`;
  return `${stat.assetName} ${stat.direction > 0 ? "↑" : "↓"}`;
}

function mixedExplanation(stats: CpiReactionAssetStat[]) {
  const available = stats.filter((item) => item.direction !== null);
  if (!available.length) return "시장반응 데이터가 아직 충분하지 않아 유형을 분류하지 않았습니다.";
  return `자산 방향이 한 가지 경제 패턴으로 충분히 모이지 않았습니다. ${available.slice(0, 5).map(signalText).join(" · ")}`;
}

function classifyPattern(
  rows: ReactionRow[],
  eventIds: string[],
  horizon: (typeof HORIZONS)[number],
): CpiReactionPattern {
  const assetStats = buildAssetStats(rows, eventIds, horizon);
  const availableAssets = assetStats.filter((item) => item.direction !== null).length;
  const coverageRate = round((availableAssets / ASSETS.length) * 100, 1);
  const scored = PROTOTYPES
    .map((prototype) => ({ prototype, ...prototypeScore(assetStats, prototype) }))
    .sort((a, b) => b.fit - a.fit || b.expectedCoverage - a.expectedCoverage);

  const best = scored[0];
  const runnerUp = scored[1];
  const margin = best && runnerUp ? best.fit - runnerUp.fit : 0;
  const classifiable = Boolean(
    best &&
    coverageRate >= 57 &&
    best.expectedCoverage >= 55 &&
    best.fit >= 68 &&
    margin >= 4,
  );

  if (!classifiable || !best) {
    return {
      horizon: horizon.key,
      label: horizon.label,
      patternKey: "mixed",
      title: "혼조 / 전환 구간",
      fitScore: best?.fit ?? 0,
      runnerUpTitle: runnerUp?.prototype.title ?? null,
      runnerUpScore: runnerUp?.fit ?? null,
      coverageRate,
      assetStats,
      explanation: mixedExplanation(assetStats),
    };
  }

  const evidence = assetStats
    .filter((item) => best.prototype.expectations[item.assetKey] !== undefined && item.direction !== null)
    .sort((a, b) => {
      const aw = ASSETS.find((asset) => asset.key === a.assetKey)?.weight ?? 1;
      const bw = ASSETS.find((asset) => asset.key === b.assetKey)?.weight ?? 1;
      return bw - aw;
    })
    .slice(0, 5)
    .map(signalText)
    .join(" · ");

  return {
    horizon: horizon.key,
    label: horizon.label,
    patternKey: best.prototype.key,
    title: best.prototype.title,
    fitScore: best.fit,
    runnerUpTitle: runnerUp?.prototype.title ?? null,
    runnerUpScore: runnerUp?.fit ?? null,
    coverageRate,
    assetStats,
    explanation: `${best.prototype.description} ${evidence ? `주요 근거: ${evidence}.` : ""}`,
  };
}

function persistence(patterns: CpiReactionPattern[]): CpiReactionPatternV4["persistence"] {
  const usable = patterns.filter((item) => item.patternKey !== "mixed");
  if (usable.length < 2) {
    return {
      status: "insufficient",
      label: "판단 보류",
      description: "분류 가능한 기간이 충분하지 않아 유형 지속성을 판단하지 않았습니다.",
    };
  }

  const close = patterns.find((item) => item.horizon === "close");
  const oneDay = patterns.find((item) => item.horizon === "oneDay");
  const fiveDay = patterns.find((item) => item.horizon === "fiveDay");

  if (close?.patternKey !== "mixed" && close?.patternKey === oneDay?.patternKey && oneDay?.patternKey === fiveDay?.patternKey) {
    return {
      status: "strong",
      label: "유형 지속성 높음",
      description: `${close.title} 패턴이 당일 → +1D → +5D까지 동일하게 유지됐습니다.`,
    };
  }
  if (oneDay?.patternKey !== "mixed" && oneDay?.patternKey === fiveDay?.patternKey) {
    return {
      status: "medium",
      label: "중기 유형 유지",
      description: `${oneDay.title} 패턴이 +1D와 +5D에서 이어졌습니다. 발표 당일보다 이후 해석이 더 일관됐습니다.`,
    };
  }
  if (
    (close?.patternKey !== "mixed" && close?.patternKey === oneDay?.patternKey) ||
    (close?.patternKey !== "mixed" && close?.patternKey === fiveDay?.patternKey)
  ) {
    return {
      status: "partial",
      label: "부분적 유형 유지",
      description: "일부 기간에서는 같은 반응 유형이 이어졌지만 전체 구간에서 일관되지는 않았습니다.",
    };
  }
  return {
    status: "transition",
    label: "유형 전환",
    description: "당일·+1D·+5D의 대표 반응 유형이 서로 달라 시간이 지나며 시장 해석이 바뀐 사례가 많았습니다.",
  };
}

function buildSummary(
  historical: CpiReactionPattern[],
  currentObserved: CpiReactionPattern[],
  persistenceRow: CpiReactionPatternV4["persistence"],
) {
  const summary = historical.map((item) =>
    `${item.label} 유사 사례의 대표 유형은 ${item.title}(적합도 ${item.fitScore.toFixed(1)}점, 데이터 커버리지 ${item.coverageRate.toFixed(1)}%)입니다.`,
  );
  summary.push(persistenceRow.description);

  for (const current of currentObserved) {
    const past = historical.find((item) => item.horizon === current.horizon);
    if (!past || current.patternKey === "mixed" || current.coverageRate < 57) continue;
    summary.push(
      current.patternKey === past.patternKey
        ? `현재 ${current.label} 실제 반응도 과거 유사 사례의 ${past.title} 패턴과 같은 유형으로 나타났습니다.`
        : `현재 ${current.label} 실제 반응은 ${current.title}으로, 과거 유사 사례의 ${past.title} 패턴과 달랐습니다.`,
    );
  }

  return summary.slice(0, 6);
}

export async function getCpiReactionPatternV4(): Promise<CpiReactionPatternV4 | null> {
  const regime = await getCpiRegimeAnalysisV3();
  if (!regime) return null;

  const top10 = regime.matches.slice(0, 10);
  if (!top10.length) return null;
  const historicalIds = top10.map((item) => item.id);
  const allIds = [regime.current.id, ...historicalIds];

  const { data, error } = await getJhSupabaseAdmin()
    .from("economic_event_reactions")
    .select("event_id,asset_key,return_close_pct,return_1d_pct,return_5d_pct")
    .in("event_id", allIds);
  if (error) throw new Error(`CPI 반응 유형 조회 실패: ${error.message}`);
  const rows = (data ?? []) as ReactionRow[];

  const historical = HORIZONS.map((horizon) => classifyPattern(rows, historicalIds, horizon));
  const currentObserved = HORIZONS.map((horizon) => classifyPattern(rows, [regime.current.id], horizon));
  const persistenceRow = persistence(historical);

  return {
    sampleSize: top10.length,
    sourceQuality: {
      grade: regime.quality.grade,
      score: regime.quality.score,
    },
    historical,
    currentObserved,
    persistence: persistenceRow,
    summary: buildSummary(historical, currentObserved, persistenceRow),
    patternGuide: PROTOTYPES.map((item) => ({ key: item.key, title: item.title, description: item.description })),
  };
}
