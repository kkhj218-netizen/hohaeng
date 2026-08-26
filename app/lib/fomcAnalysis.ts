import "server-only";

import { getJhSupabaseAdmin } from "@/app/lib/jhDataSupabase";

const EVENT_KEY = "US_FOMC";

const ASSETS = [
  { key: "NQ", name: "나스닥100 선물" },
  { key: "RTY", name: "러셀2000 선물" },
  { key: "GC", name: "금 선물" },
  { key: "CL", name: "WTI 원유 선물" },
  { key: "DXY", name: "달러인덱스" },
  { key: "ZT", name: "미국 2년물 국채선물" },
  { key: "ZN", name: "미국 10년물 국채선물" },
] as const;

export type FomcDecisionType = "hike" | "hold" | "cut";

type EventRow = { id: string; release_at: string; reference_period: string | null };
type MetricRow = { event_id: string; metric_key: string; actual_value: number | string | null };
type ReactionRow = {
  event_id: string;
  asset_key: string;
  asset_name: string;
  return_close_pct: number | string | null;
  return_1d_pct: number | string | null;
  return_5d_pct: number | string | null;
};

export type FomcReactionSnapshot = {
  assetKey: string;
  assetName: string;
  close: number | null;
  oneDay: number | null;
  fiveDay: number | null;
};

export type FomcMeetingCase = {
  id: string;
  releaseAt: string;
  referencePeriod: string | null;
  lower: number | null;
  upper: number | null;
  midpoint: number | null;
  changeBp: number | null;
  sepLongRun: number | null;
  decisionType: FomcDecisionType;
  reactions: Record<string, FomcReactionSnapshot>;
};

export type FomcHorizonStat = {
  sampleSize: number;
  positiveRate: number | null;
  averageReturn: number | null;
  medianReturn: number | null;
  minReturn: number | null;
  maxReturn: number | null;
};

export type FomcAssetDecisionStats = {
  assetKey: string;
  assetName: string;
  close: FomcHorizonStat;
  oneDay: FomcHorizonStat;
  fiveDay: FomcHorizonStat;
};

export type FomcDecisionBucket = {
  type: FomcDecisionType;
  label: string;
  count: number;
};

export type FomcAnalysisV2 = {
  current: FomcMeetingCase;
  previous: FomcMeetingCase | null;
  previousSep: FomcMeetingCase | null;
  sameDecisionCases: FomcMeetingCase[];
  sameDecisionStats: FomcAssetDecisionStats[];
  buckets: FomcDecisionBucket[];
  deltas: {
    midpointBp: number | null;
    sepLongRunBp: number | null;
  };
  insights: string[];
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

function median(values: number[]) {
  if (!values.length) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? (sorted[middle - 1] + sorted[middle]) / 2 : sorted[middle];
}

function horizonStat(values: Array<number | null>): FomcHorizonStat {
  const valid = values.filter((value): value is number => value !== null && Number.isFinite(value));
  const positive = valid.filter((value) => value > 0).length;
  return {
    sampleSize: valid.length,
    positiveRate: valid.length ? round((positive / valid.length) * 100, 1) : null,
    averageReturn: valid.length ? round(valid.reduce((sum, value) => sum + value, 0) / valid.length, 2) : null,
    medianReturn: valid.length ? round(median(valid) ?? 0, 2) : null,
    minReturn: valid.length ? round(Math.min(...valid), 2) : null,
    maxReturn: valid.length ? round(Math.max(...valid), 2) : null,
  };
}

function decisionType(changeBp: number | null): FomcDecisionType {
  if (changeBp === null || Math.abs(changeBp) < 1) return "hold";
  return changeBp > 0 ? "hike" : "cut";
}

function decisionLabel(type: FomcDecisionType) {
  return type === "hike" ? "금리 인상" : type === "cut" ? "금리 인하" : "금리 동결";
}

function assetStats(cases: FomcMeetingCase[]): FomcAssetDecisionStats[] {
  return ASSETS.map((asset) => {
    const reactions = cases.map((item) => item.reactions[asset.key]).filter(Boolean);
    return {
      assetKey: asset.key,
      assetName: asset.name,
      close: horizonStat(reactions.map((reaction) => reaction.close)),
      oneDay: horizonStat(reactions.map((reaction) => reaction.oneDay)),
      fiveDay: horizonStat(reactions.map((reaction) => reaction.fiveDay)),
    };
  });
}

function buildInsights(
  current: FomcMeetingCase,
  previous: FomcMeetingCase | null,
  previousSep: FomcMeetingCase | null,
  sameType: FomcMeetingCase[],
  stats: FomcAssetDecisionStats[],
) {
  const insights: string[] = [];
  const typeLabel = decisionLabel(current.decisionType);
  insights.push(`이번 회의는 ${typeLabel}${current.changeBp !== null && Math.abs(current.changeBp) >= 1 ? ` (${current.changeBp > 0 ? "+" : ""}${Math.round(current.changeBp)}bp)` : ""}입니다.`);

  if (previous?.midpoint !== null && previous?.midpoint !== undefined && current.midpoint !== null) {
    const delta = round((current.midpoint - previous.midpoint) * 100, 0);
    insights.push(`직전 회의 대비 목표금리 중간값은 ${delta === 0 ? "변화가 없습니다" : `${delta > 0 ? "+" : ""}${delta}bp 변했습니다`}.`);
  }

  if (current.referencePeriod === "SEP") {
    if (current.sepLongRun !== null && previousSep?.sepLongRun !== null && previousSep?.sepLongRun !== undefined) {
      const delta = round((current.sepLongRun - previousSep.sepLongRun) * 100, 0);
      insights.push(`장기 점도표 중앙값은 이전 SEP 대비 ${delta === 0 ? "같은 수준" : `${delta > 0 ? "+" : ""}${delta}bp`}입니다.`);
    } else {
      insights.push("이번 회의는 SEP 회의지만 장기 점도표 비교값이 일부 비어 있습니다.");
    }
  }

  insights.push(`2016년 이후 같은 '${typeLabel}' 결정 사례는 현재 회의를 제외하고 ${sameType.length}건입니다.`);
  const nq = stats.find((item) => item.assetKey === "NQ");
  if (nq?.oneDay.sampleSize) {
    insights.push(`같은 결정 유형에서 NQ +1D 상승률은 ${nq.oneDay.positiveRate?.toFixed(1) ?? "—"}%, 중앙값은 ${nq.oneDay.medianReturn !== null ? `${nq.oneDay.medianReturn > 0 ? "+" : ""}${nq.oneDay.medianReturn.toFixed(2)}%` : "—"}였습니다.`);
  }
  return insights;
}

export async function getFomcAnalysisV2(): Promise<FomcAnalysisV2 | null> {
  const supabase = getJhSupabaseAdmin();
  const nowIso = new Date().toISOString();
  const { data: events, error } = await supabase
    .from("economic_events")
    .select("id,release_at,reference_period")
    .eq("event_key", EVENT_KEY)
    .lte("release_at", nowIso)
    .order("release_at", { ascending: false })
    .limit(120);
  if (error) throw new Error(`FOMC 분석 이벤트 조회 실패: ${error.message}`);

  const rows = (events ?? []) as EventRow[];
  if (!rows.length) return null;
  const ids = rows.map((row) => row.id);
  const [{ data: metricRows, error: metricError }, { data: reactionRows, error: reactionError }] = await Promise.all([
    supabase
      .from("economic_event_metrics")
      .select("event_id,metric_key,actual_value")
      .in("event_id", ids),
    supabase
      .from("economic_event_reactions")
      .select("event_id,asset_key,asset_name,return_close_pct,return_1d_pct,return_5d_pct")
      .in("event_id", ids),
  ]);
  if (metricError) throw new Error(`FOMC 분석 지표 조회 실패: ${metricError.message}`);
  if (reactionError) throw new Error(`FOMC 분석 반응 조회 실패: ${reactionError.message}`);

  const metricList = (metricRows ?? []) as MetricRow[];
  const reactionList = (reactionRows ?? []) as ReactionRow[];

  const meetings: FomcMeetingCase[] = rows.map((event) => {
    const metrics = new Map(
      metricList.filter((item) => item.event_id === event.id).map((item) => [item.metric_key, safeNumber(item.actual_value)]),
    );
    const reactions: Record<string, FomcReactionSnapshot> = {};
    for (const row of reactionList.filter((item) => item.event_id === event.id)) {
      reactions[row.asset_key] = {
        assetKey: row.asset_key,
        assetName: row.asset_name,
        close: safeNumber(row.return_close_pct),
        oneDay: safeNumber(row.return_1d_pct),
        fiveDay: safeNumber(row.return_5d_pct),
      };
    }
    const changeBp = metrics.get("decision_change_bp") ?? null;
    return {
      id: event.id,
      releaseAt: event.release_at,
      referencePeriod: event.reference_period,
      lower: metrics.get("target_lower") ?? null,
      upper: metrics.get("target_upper") ?? null,
      midpoint: metrics.get("target_midpoint") ?? null,
      changeBp,
      sepLongRun: metrics.get("sep_long_run_rate") ?? null,
      decisionType: decisionType(changeBp),
      reactions,
    };
  }).filter((meeting) => meeting.upper !== null);

  if (!meetings.length) return null;
  const current = meetings[0];
  const previous = meetings[1] ?? null;
  const previousSep = meetings.slice(1).find((meeting) => meeting.referencePeriod === "SEP" && meeting.sepLongRun !== null) ?? null;
  const sameDecisionCases = meetings.slice(1).filter((meeting) => meeting.decisionType === current.decisionType);
  const sameDecisionStats = assetStats(sameDecisionCases);
  const buckets: FomcDecisionBucket[] = (["hike", "hold", "cut"] as const).map((type) => ({
    type,
    label: decisionLabel(type),
    count: meetings.filter((meeting) => meeting.decisionType === type).length,
  }));

  const midpointBp = previous?.midpoint !== null && previous?.midpoint !== undefined && current.midpoint !== null
    ? round((current.midpoint - previous.midpoint) * 100, 0)
    : null;
  const sepLongRunBp = current.referencePeriod === "SEP" && current.sepLongRun !== null && previousSep?.sepLongRun !== null && previousSep?.sepLongRun !== undefined
    ? round((current.sepLongRun - previousSep.sepLongRun) * 100, 0)
    : null;

  return {
    current,
    previous,
    previousSep,
    sameDecisionCases,
    sameDecisionStats,
    buckets,
    deltas: { midpointBp, sepLongRunBp },
    insights: buildInsights(current, previous, previousSep, sameDecisionCases, sameDecisionStats),
  };
}
