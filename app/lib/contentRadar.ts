import "server-only";

import { getPublicMarketDashboard } from "@/app/lib/publicMarket";
import type { JhBiggestChange, JhDashboardData, JhMarketMetric, JhMarketSignal } from "@/app/lib/jhMarketTypes";

export const CONTENT_RADAR_THRESHOLD = 70;
const SITE = "https://hohaeng.vercel.app";

type ScoreBreakdown = {
  extremity: number;
  divergence: number;
  rarity: number;
  timeliness: number;
  importance: number;
};

type ChannelDrafts = {
  x: string;
  threads: string;
  instagramSlides: string[];
  instagramCaption: string;
};

export type ContentRadarCandidate = {
  id: string;
  rank: number;
  type: "anomaly" | "big_change" | "extreme";
  title: string;
  hook: string;
  hookVariants: string[];
  summary: string;
  score: number;
  recommended: boolean;
  grade: "S" | "A" | "B" | "C";
  breakdown: ScoreBreakdown;
  reasons: string[];
  symbols: string[];
  sourceHref: string;
  drafts: ChannelDrafts | null;
};

export type ContentRadarResult = {
  asOfDate: string;
  generatedAt: string;
  threshold: number;
  regime: string;
  regimeScore: number;
  recommendedCount: number;
  candidates: ContentRadarCandidate[];
  rule: string;
};

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function round(value: number) {
  return Math.round(value);
}

function safeSlug(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9가-힣]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 48) || "market";
}

function extremityScore(metric: JhMarketMetric | null): number {
  if (!metric || metric.percentile === null) return 0;
  const distance = Math.abs(metric.percentile - 50);
  if (distance <= 25) return 0;
  return round(clamp(((distance - 25) / 25) * 25, 0, 25));
}

function rarityScore(metric: JhMarketMetric | null, fallback?: number | null): number {
  const percentile = metric?.surprisePercentile ?? fallback ?? null;
  if (percentile === null || percentile < 70) return 0;
  return round(clamp(((percentile - 70) / 30) * 20, 0, 20));
}

function importanceScore(metric: JhMarketMetric | null, fallback = 50): number {
  const value = metric?.importanceScore ?? fallback;
  return round(clamp((value / 100) * 15, 0, 15));
}

function timelinessScore(metric: JhMarketMetric | null): number {
  if (!metric) return 12;
  if (metric.stale) return 2;
  if (metric.freshnessStatus === "unavailable" || metric.error) return 0;
  return 15;
}

function severityFactor(signal: JhMarketSignal) {
  if (signal.severity === "critical") return 1;
  if (signal.severity === "high") return 0.9;
  if (signal.severity === "medium") return 0.65;
  return 0.4;
}

function divergenceScore(signal: JhMarketSignal | null): number {
  if (!signal) return 0;
  const base = signal.type === "divergence"
    ? 25
    : signal.type === "surprise"
      ? 21
      : signal.type === "extreme"
        ? 18
        : signal.type === "trend"
          ? 11
          : 8;
  return round(base * severityFactor(signal));
}

function metricMap(dashboard: JhDashboardData) {
  return new Map(dashboard.metrics.map((metric) => [metric.symbol.toUpperCase(), metric]));
}

function primaryMetric(dashboard: JhDashboardData, symbols: string[]): JhMarketMetric | null {
  const map = metricMap(dashboard);
  return symbols.map((symbol) => map.get(symbol.toUpperCase()) ?? null).find(Boolean) ?? null;
}

function strongestMetric(dashboard: JhDashboardData, symbols: string[]) {
  const map = metricMap(dashboard);
  return symbols
    .map((symbol) => map.get(symbol.toUpperCase()))
    .filter((metric): metric is JhMarketMetric => Boolean(metric))
    .sort((a, b) => extremityScore(b) + rarityScore(b) - extremityScore(a) - rarityScore(a))[0] ?? null;
}

function linkedSignal(dashboard: JhDashboardData, symbols: string[]) {
  return dashboard.anomalies
    .filter((signal) => signal.relatedSymbols.some((symbol) => symbols.includes(symbol)))
    .sort((a, b) => divergenceScore(b) - divergenceScore(a))[0] ?? null;
}

function scoreCandidate(input: {
  metric: JhMarketMetric | null;
  signal?: JhMarketSignal | null;
  rarityFallback?: number | null;
  importanceFallback?: number;
}): { score: number; breakdown: ScoreBreakdown; reasons: string[] } {
  const breakdown: ScoreBreakdown = {
    extremity: extremityScore(input.metric),
    divergence: divergenceScore(input.signal ?? null),
    rarity: rarityScore(input.metric, input.rarityFallback),
    timeliness: timelinessScore(input.metric),
    importance: importanceScore(input.metric, input.importanceFallback),
  };
  const score = Object.values(breakdown).reduce((sum, value) => sum + value, 0);
  const reasons: string[] = [];

  if (breakdown.extremity >= 15 && input.metric?.percentile !== null) {
    const side = (input.metric?.percentile ?? 50) >= 50 ? "상위" : "하위";
    const pct = side === "상위" ? Math.max(1, round(100 - (input.metric?.percentile ?? 50))) : Math.max(1, round(input.metric?.percentile ?? 50));
    reasons.push(`${input.metric?.nameKo ?? "지표"}가 비교구간 ${side} ${pct}% 수준`);
  }
  if (breakdown.divergence >= 15 && input.signal) reasons.push(`시장 조합 신호: ${input.signal.title}`);
  if (breakdown.rarity >= 12) reasons.push("최근 변화폭/서프라이즈가 역사적으로 드문 편");
  if (breakdown.timeliness >= 12) reasons.push("최신 데이터 기준으로 바로 설명 가능한 소재");
  if (breakdown.importance >= 10) reasons.push("투자자 관심도가 높은 핵심 지표");

  return { score: round(score), breakdown, reasons };
}

function grade(score: number): ContentRadarCandidate["grade"] {
  if (score >= 88) return "S";
  if (score >= 78) return "A";
  if (score >= 70) return "B";
  return "C";
}

function valueText(metric: JhMarketMetric | null) {
  if (!metric || metric.currentValue === null) return "";
  const unit = metric.currentUnit || metric.unit || "";
  return `${metric.nameKo} ${metric.currentValue.toLocaleString("ko-KR", { maximumFractionDigits: 2 })}${unit ? ` ${unit}` : ""}`;
}

function makeHook(type: ContentRadarCandidate["type"], title: string, metric: JhMarketMetric | null, signal: JhMarketSignal | null, rarity: number) {
  if (signal?.type === "divergence") return `${title}. 오늘은 보통 같이 움직이던 시장 신호가 엇갈렸다.`;
  if (signal?.type === "surprise") return `${title}. 시장이 익숙한 범위를 벗어난 움직임이 나왔다.`;
  if (type === "extreme" && metric?.percentile !== null) {
    const side = metric.percentile >= 50 ? "상단" : "하단";
    return `${title}. 지금 위치는 비교구간 ${side} 극단권에 가깝다.`;
  }
  if (rarity >= 12) return `${title}. 오늘 변화폭은 그냥 넘기기엔 드문 편이다.`;
  return `${title}. 숫자보다 같이 움직인 시장을 봐야 한다.`;
}

function hookVariants(baseHook: string, title: string, reasons: string[]) {
  const rare = reasons.some((reason) => reason.includes("드문") || reason.includes("상위") || reason.includes("하위"));
  return [
    baseHook,
    `${title}, 평소 같으면 그냥 넘길 숫자일까?`,
    `오늘 시장에서 눈에 걸린 장면 하나. ${title}`,
    rare ? `과거와 비교하면 지금 ${title}은 평범한 구간이 아니다.` : `${title}. 방향보다 반응의 조합이 더 흥미롭다.`,
    `${title}. 이 숫자 하나만 보면 놓치는 게 있다.`,
  ];
}

function addUtm(href: string, source: "x" | "threads" | "instagram", id: string) {
  const separator = href.includes("?") ? "&" : "?";
  return `${SITE}${href}${separator}utm_source=${source}&utm_medium=social&utm_campaign=content_radar&utm_content=${encodeURIComponent(id)}`;
}

function buildDrafts(candidate: Omit<ContentRadarCandidate, "rank" | "drafts">, metric: JhMarketMetric | null): ChannelDrafts {
  const data = valueText(metric);
  const xLink = addUtm(candidate.sourceHref, "x", candidate.id);
  const threadsLink = addUtm(candidate.sourceHref, "threads", candidate.id);
  const instaLink = addUtm(candidate.sourceHref, "instagram", candidate.id);
  const evidence = candidate.reasons.slice(0, 2).join(" · ");

  return {
    x: `${candidate.hook}\n\n${data ? `${data}.\n` : ""}${candidate.summary}\n${evidence ? `\n근거: ${evidence}` : ""}\n\n원본 데이터·세부 비교 ↓\n${xLink}`,
    threads: `${candidate.hook}\n\n처음 숫자만 보면 단순해 보이는데, 같이 움직인 지표를 보면 이야기가 달라진다.\n${candidate.summary}\n${evidence ? `\n내가 지금 보는 근거는 ${evidence}.` : ""}\n\n이런 날엔 여러분은 가장 먼저 어떤 지표를 보나요?\n\n원본은 여기에서 직접 확인할 수 있어요.\n${threadsLink}`,
    instagramSlides: [
      candidate.hook,
      data || candidate.title,
      candidate.reasons[0] ?? candidate.summary,
      candidate.reasons[1] ?? "한 숫자보다 시장의 조합을 같이 봐야 한다.",
      `결론보다 원본을 직접 확인.\n호행처럼 → ${instaLink}`,
    ],
    instagramCaption: `${candidate.hook}\n\n${candidate.summary}\n\n${evidence ? `오늘 체크한 근거는 ${evidence}.\n\n` : ""}매수·매도 결론보다 왜 이 장면이 눈에 걸리는지 데이터를 남깁니다. 전체 데이터는 프로필 링크의 호행처럼에서 확인할 수 있어요.`,
  };
}

function anomalyCandidates(dashboard: JhDashboardData) {
  return dashboard.anomalies.map((signal) => {
    const metric = strongestMetric(dashboard, signal.relatedSymbols);
    const scored = scoreCandidate({ metric, signal, importanceFallback: signal.importanceScore });
    const id = `anomaly-${safeSlug(signal.id || signal.title)}`;
    const sourceHref = signal.relatedSymbols.length === 1 ? `/data/${encodeURIComponent(signal.relatedSymbols[0])}` : "/today";
    const hook = makeHook("anomaly", signal.title, metric, signal, scored.breakdown.rarity);
    const base = {
      id,
      type: "anomaly" as const,
      title: signal.title,
      hook,
      hookVariants: hookVariants(hook, signal.title, scored.reasons),
      summary: signal.description,
      score: scored.score,
      recommended: scored.score >= CONTENT_RADAR_THRESHOLD,
      grade: grade(scored.score),
      breakdown: scored.breakdown,
      reasons: scored.reasons,
      symbols: signal.relatedSymbols,
      sourceHref,
    };
    return { ...base, drafts: base.recommended ? buildDrafts({ ...base, rank: 0 } as never, metric) : null };
  });
}

function changeCandidates(dashboard: JhDashboardData) {
  return dashboard.biggestChanges.map((change: JhBiggestChange) => {
    const symbols = [change.symbol];
    const metric = primaryMetric(dashboard, symbols);
    const signal = linkedSignal(dashboard, symbols);
    const scored = scoreCandidate({ metric, signal, rarityFallback: change.surprisePercentile, importanceFallback: change.importanceScore });
    const id = `change-${safeSlug(change.symbol)}`;
    const title = `${change.name} ${change.changeLabel} 변화`;
    const hook = makeHook("big_change", title, metric, signal, scored.breakdown.rarity);
    const base = {
      id,
      type: "big_change" as const,
      title,
      hook,
      hookVariants: hookVariants(hook, title, scored.reasons),
      summary: change.explanation,
      score: scored.score,
      recommended: scored.score >= CONTENT_RADAR_THRESHOLD,
      grade: grade(scored.score),
      breakdown: scored.breakdown,
      reasons: scored.reasons,
      symbols,
      sourceHref: `/data/${encodeURIComponent(change.symbol)}`,
    };
    return { ...base, drafts: base.recommended ? buildDrafts({ ...base, rank: 0 } as never, metric) : null };
  });
}

function extremeCandidates(dashboard: JhDashboardData) {
  return dashboard.metrics
    .filter((metric) => !metric.stale && metric.currentValue !== null && metric.percentile !== null && (metric.percentile <= 10 || metric.percentile >= 90))
    .map((metric) => {
      const symbols = [metric.symbol];
      const signal = linkedSignal(dashboard, symbols);
      const scored = scoreCandidate({ metric, signal });
      const id = `extreme-${safeSlug(metric.symbol)}`;
      const side = (metric.percentile ?? 50) >= 50 ? "고점권" : "저점권";
      const title = `${metric.nameKo} ${side}`;
      const hook = makeHook("extreme", title, metric, signal, scored.breakdown.rarity);
      const base = {
        id,
        type: "extreme" as const,
        title,
        hook,
        hookVariants: hookVariants(hook, title, scored.reasons),
        summary: `${metric.nameKo}가 현재 비교구간 ${Math.round(metric.percentile ?? 50)}백분위에 있습니다. 방향 예측보다 왜 이 위치에 왔는지 함께 보는 소재입니다.`,
        score: scored.score,
        recommended: scored.score >= CONTENT_RADAR_THRESHOLD,
        grade: grade(scored.score),
        breakdown: scored.breakdown,
        reasons: scored.reasons,
        symbols,
        sourceHref: `/data/${encodeURIComponent(metric.symbol)}`,
      };
      return { ...base, drafts: base.recommended ? buildDrafts({ ...base, rank: 0 } as never, metric) : null };
    });
}

function dedupe(candidates: Array<Omit<ContentRadarCandidate, "rank">>) {
  const seen = new Set<string>();
  return [...candidates]
    .sort((a, b) => b.score - a.score)
    .filter((candidate) => {
      const key = candidate.symbols.sort().join("|") || candidate.title;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
}

export async function getContentRadar(): Promise<ContentRadarResult | null> {
  const dashboard = await getPublicMarketDashboard();
  if (!dashboard) return null;

  const candidates = dedupe([
    ...anomalyCandidates(dashboard),
    ...changeCandidates(dashboard),
    ...extremeCandidates(dashboard),
  ])
    .slice(0, 5)
    .map((candidate, index) => ({ ...candidate, rank: index + 1 }));

  return {
    asOfDate: dashboard.asOfDate,
    generatedAt: new Date().toISOString(),
    threshold: CONTENT_RADAR_THRESHOLD,
    regime: dashboard.regime,
    regimeScore: dashboard.regimeScore,
    recommendedCount: candidates.filter((candidate) => candidate.recommended).length,
    candidates,
    rule: "극단성 25 + 이상조합 25 + 희귀도 20 + 현재성 15 + 중요도 15 = 100점. 70점 이상만 SNS 초안 생성 대상.",
  };
}
