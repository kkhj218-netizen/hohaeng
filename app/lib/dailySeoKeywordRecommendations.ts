import "server-only";

import {
  analyzeGoogleRank,
  type GoogleRankAnalysis,
} from "@/app/lib/googleRankPredictor";
import {
  getSearchConsoleKeywordUniverse,
  type SearchConsoleKeywordSnapshot,
} from "@/app/lib/googleSearchConsole";
import { getJhSupabaseAdmin } from "@/app/lib/jhDataSupabase";

export type DailySeoKeywordRecommendation = {
  id: string | null;
  recommendationDate: string;
  rank: number;
  keyword: string;
  recommendedTitle: string;
  sourceType: string;
  strategy: string;
  reason: string;
  candidateScore: number;
  analysis: GoogleRankAnalysis;
  createdAt: string | null;
};

type Candidate = {
  keyword: string;
  sourceType: "gsc-quick-win" | "google-suggest" | "gsc-opportunity" | "fallback-expansion";
  baseScore: number;
  support: SearchConsoleKeywordSnapshot | null;
  seed: string | null;
};

type RecommendationRow = {
  id: string;
  recommendation_date: string;
  rank: number;
  keyword: string;
  recommended_title: string;
  source_type: string;
  strategy: string;
  reason: string;
  candidate_score: number;
  analysis: GoogleRankAnalysis;
  created_at: string;
};

const DAY_MS = 86_400_000;

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function round(value: number) {
  return Math.round(value);
}

function kstDateString(date = new Date()) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const value = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((part) => part.type === type)?.value ?? "";
  return `${value("year")}-${value("month")}-${value("day")}`;
}

function normalizeKeyword(value: string) {
  return value
    .normalize("NFKC")
    .trim()
    .replace(/\s+/g, " ")
    .replace(/^[\-–—|｜:：,，·•/]+|[\-–—|｜:：,，·•/]+$/g, "");
}

function keywordTokens(value: string) {
  return normalizeKeyword(value)
    .toLowerCase()
    .replace(/[^0-9a-z가-힣%]+/g, " ")
    .split(/\s+/)
    .filter((token) => token.length >= 2 || /\d/.test(token));
}

function keywordSimilarity(a: string, b: string) {
  const left = new Set(keywordTokens(a));
  const right = new Set(keywordTokens(b));
  if (!left.size || !right.size) return 0;
  let overlap = 0;
  for (const token of left) if (right.has(token)) overlap += 1;
  return overlap / Math.max(left.size, right.size);
}

function usableKeyword(value: string) {
  const keyword = normalizeKeyword(value);
  if (keyword.length < 2 || keyword.length > 48) return false;
  if (/https?:\/\/|www\.|호행처럼|검색어 없음/i.test(keyword)) return false;
  if (!/[가-힣a-zA-Z]/.test(keyword)) return false;
  if (/^[0-9.,%\s]+$/.test(keyword)) return false;
  return true;
}

function metricSeedScore(metric: SearchConsoleKeywordSnapshot) {
  const impressions = Math.log10(metric.impressions + 1) * 24;
  const clicks = Math.log10(metric.clicks + 1) * 8;
  let position = 7;
  if (metric.position >= 6 && metric.position <= 20) position = 30;
  else if (metric.position > 20 && metric.position <= 40) position = 24;
  else if (metric.position > 40 && metric.position <= 70) position = 14;
  else if (metric.position > 3 && metric.position < 6) position = 16;
  else if (metric.position <= 3) position = 5;
  const ctrGap = metric.impressions >= 5 && metric.ctr < 0.03 ? 8 : 0;
  return impressions + clicks + position + ctrGap;
}

function candidateBaseScore(
  keyword: string,
  metric: SearchConsoleKeywordSnapshot | null,
  sourceType: Candidate["sourceType"],
) {
  let score = sourceType === "google-suggest" ? 44 : 40;
  if (sourceType === "gsc-quick-win") score += 12;
  if (sourceType === "fallback-expansion") score -= 5;

  const tokenCount = keywordTokens(keyword).length;
  if (tokenCount >= 2 && tokenCount <= 5) score += 9;
  else if (tokenCount === 1) score -= 5;

  if (metric) {
    score += Math.min(18, Math.log10(metric.impressions + 1) * 9);
    if (metric.position >= 7 && metric.position <= 20) score += 18;
    else if (metric.position > 20 && metric.position <= 40) score += 13;
    else if (metric.position > 3 && metric.position < 7) score += 8;
    else if (metric.position <= 3) score -= 8;
    if (metric.impressions >= 5 && metric.ctr < 0.03) score += 6;
  }

  if (/계산|실수령|조회|신청|차이|비교|뜻|이란|전망|조건|방법|세금|수익률/u.test(keyword)) {
    score += 7;
  }

  return clamp(round(score), 0, 100);
}

function pickDiverseRows(rows: SearchConsoleKeywordSnapshot[], limit: number) {
  const picked: SearchConsoleKeywordSnapshot[] = [];
  for (const row of rows) {
    if (picked.some((item) => keywordSimilarity(item.query, row.query) >= 0.82)) continue;
    picked.push(row);
    if (picked.length >= limit) break;
  }
  return picked;
}

async function fetchGoogleSuggestions(seed: string) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 5_000);
  try {
    const endpoint = `https://suggestqueries.google.com/complete/search?client=firefox&hl=ko&gl=kr&q=${encodeURIComponent(seed)}`;
    const response = await fetch(endpoint, {
      headers: { "User-Agent": "Mozilla/5.0 HOHAENG-SEO/1.0" },
      signal: controller.signal,
      cache: "no-store",
    });
    if (!response.ok) return [];
    const payload = (await response.json()) as unknown;
    if (!Array.isArray(payload) || !Array.isArray(payload[1])) return [];
    return payload[1]
      .filter((item): item is string => typeof item === "string")
      .map(normalizeKeyword)
      .filter(usableKeyword)
      .slice(0, 10);
  } catch {
    return [];
  } finally {
    clearTimeout(timeout);
  }
}

function buildRecommendedTitle(keyword: string) {
  if (/연봉|월급|실수령|세후|세전|퇴직금/u.test(keyword)) {
    return `${keyword} 계산 가이드｜세전·세후·실수령액까지 한 번에`;
  }
  if (/조회|신청|환급|지원금|실비|보험|청구/u.test(keyword)) {
    return `${keyword} 총정리｜대상·조회·신청 방법과 놓치기 쉬운 조건`;
  }
  if (/차이|비교|vs/i.test(keyword)) {
    return `${keyword}｜헷갈리는 차이와 선택 기준 한 번에 정리`;
  }
  if (/PCE|CPI|금리|국채|나스닥|주식|ETF|배당|투자|환율|유가|고용|소비자심리/i.test(keyword)) {
    return `${keyword} 완벽 가이드｜뜻부터 투자자가 꼭 볼 핵심까지`;
  }
  if (/뜻|이란|왜/u.test(keyword)) {
    return `${keyword} 쉽게 이해하기｜처음 검색한 사람이 꼭 알아야 할 핵심`;
  }
  if (/계산|수익률|복리|평단/u.test(keyword)) {
    return `${keyword} 계산법｜공식보다 쉬운 실제 예시로 정리`;
  }
  return `${keyword} 완벽 가이드｜처음 검색한 사람이 꼭 알아야 할 핵심 정리`;
}

function fallbackExpansions(seed: string) {
  const root = normalizeKeyword(seed);
  const suffixes = /연봉|월급|퇴직금|급여/u.test(root)
    ? ["실수령액", "세후 계산", "세금", "계산기"]
    : /지원금|환급|실비|보험|청구/u.test(root)
      ? ["조회", "신청 방법", "조건", "필요 서류"]
      : /금리|주식|ETF|배당|투자|국채|환율|PCE|CPI/i.test(root)
        ? ["뜻", "주식 영향", "전망", "투자 전략"]
        : ["뜻", "방법", "차이", "실제 예시"];
  return suffixes.map((suffix) => `${root} ${suffix}`);
}

async function recentRecommendationKeywords(days = 21) {
  const supabase = getJhSupabaseAdmin();
  const cutoff = new Date(Date.now() - days * DAY_MS).toISOString().slice(0, 10);
  const { data, error } = await supabase
    .from("seo_daily_keyword_recommendations")
    .select("keyword")
    .gte("recommendation_date", cutoff);
  if (error) return new Set<string>();
  return new Set((data ?? []).map((row) => normalizeKeyword(String(row.keyword)).toLowerCase()));
}

function addCandidate(map: Map<string, Candidate>, candidate: Candidate) {
  const keyword = normalizeKeyword(candidate.keyword);
  if (!usableKeyword(keyword)) return;
  const key = keyword.toLowerCase();
  const existing = map.get(key);
  const next = { ...candidate, keyword };
  if (!existing || next.baseScore > existing.baseScore) map.set(key, next);
}

function makeReason(candidate: Candidate, analysis: GoogleRankAnalysis) {
  const parts: string[] = [];
  if (candidate.sourceType === "google-suggest") {
    parts.push("Google 자동완성에서 실제 확장 검색어로 확인");
  } else if (candidate.sourceType === "gsc-quick-win") {
    parts.push("Search Console에서 이미 1~2페이지 근처 신호가 있는 빠른 공략 후보");
  } else if (candidate.sourceType === "gsc-opportunity") {
    parts.push("Search Console 노출은 있지만 아직 상위권을 충분히 먹지 못한 키워드");
  } else {
    parts.push("기존 호행처럼 검색 주제에서 확장한 롱테일 후보");
  }

  if (analysis.gsc.averagePosition !== null) {
    parts.push(`연관 GSC ${analysis.gsc.relatedCount}개 · 평균 ${analysis.gsc.averagePosition.toFixed(1)}위`);
  } else if (candidate.support) {
    parts.push(`기준 검색어 노출 ${Math.round(candidate.support.impressions)}회 · 평균 ${candidate.support.position.toFixed(1)}위`);
  }
  parts.push(`예상 ${analysis.prediction.min}~${analysis.prediction.max}위 · TOP10 ${analysis.prediction.top10Probability}%`);
  return parts.join(" · ");
}

function strategyFor(candidate: Candidate, analysis: GoogleRankAnalysis) {
  if (analysis.quickWin || (analysis.gsc.averagePosition !== null && analysis.gsc.averagePosition >= 8 && analysis.gsc.averagePosition <= 22)) {
    return "빠른 상위진입";
  }
  if (analysis.keyword.contentRole === "pillar") return "Pillar 선점";
  if (candidate.sourceType === "google-suggest") return "연관 키워드 확장";
  return "Cluster 확장";
}

function toRecommendation(row: RecommendationRow): DailySeoKeywordRecommendation {
  return {
    id: row.id,
    recommendationDate: row.recommendation_date,
    rank: row.rank,
    keyword: row.keyword,
    recommendedTitle: row.recommended_title,
    sourceType: row.source_type,
    strategy: row.strategy,
    reason: row.reason,
    candidateScore: row.candidate_score,
    analysis: row.analysis,
    createdAt: row.created_at,
  };
}

export async function listDailySeoKeywordRecommendations(date = kstDateString()) {
  const supabase = getJhSupabaseAdmin();
  const { data, error } = await supabase
    .from("seo_daily_keyword_recommendations")
    .select("id,recommendation_date,rank,keyword,recommended_title,source_type,strategy,reason,candidate_score,analysis,created_at")
    .eq("recommendation_date", date)
    .order("rank", { ascending: true });
  if (error) throw new Error(`오늘 SEO 키워드 조회 실패: ${error.message}`);
  return ((data ?? []) as RecommendationRow[]).map(toRecommendation);
}

export async function generateDailySeoKeywordRecommendations(force = false) {
  const recommendationDate = kstDateString();
  if (!force) {
    const existing = await listDailySeoKeywordRecommendations(recommendationDate);
    if (existing.length >= 5) return existing;
  }

  const [universe, recentKeywords] = await Promise.all([
    getSearchConsoleKeywordUniverse(90, 5000),
    recentRecommendationKeywords(21),
  ]);

  const validUniverse = universe
    .filter((row) => usableKeyword(row.query) && row.impressions >= 1 && row.position > 0)
    .sort((a, b) => metricSeedScore(b) - metricSeedScore(a));
  const seeds = pickDiverseRows(validUniverse, 10);
  const exactByKeyword = new Map(
    universe.map((row) => [normalizeKeyword(row.query).toLowerCase(), row]),
  );
  const candidates = new Map<string, Candidate>();

  for (const row of validUniverse.slice(0, 180)) {
    if (row.position <= 3 || row.position > 45) continue;
    const sourceType: Candidate["sourceType"] =
      row.position >= 7 && row.position <= 22 ? "gsc-quick-win" : "gsc-opportunity";
    addCandidate(candidates, {
      keyword: row.query,
      sourceType,
      baseScore: candidateBaseScore(row.query, row, sourceType),
      support: row,
      seed: null,
    });
  }

  const suggestionGroups = await Promise.all(
    seeds.slice(0, 8).map(async (seed) => ({
      seed,
      suggestions: await fetchGoogleSuggestions(seed.query),
    })),
  );

  for (const group of suggestionGroups) {
    for (const suggestion of group.suggestions) {
      const exact = exactByKeyword.get(suggestion.toLowerCase()) ?? null;
      addCandidate(candidates, {
        keyword: suggestion,
        sourceType: "google-suggest",
        baseScore: candidateBaseScore(suggestion, exact ?? group.seed, "google-suggest"),
        support: exact ?? group.seed,
        seed: group.seed.query,
      });
    }
  }

  if (candidates.size < 20) {
    for (const seed of seeds.slice(0, 6)) {
      for (const expansion of fallbackExpansions(seed.query)) {
        addCandidate(candidates, {
          keyword: expansion,
          sourceType: "fallback-expansion",
          baseScore: candidateBaseScore(expansion, seed, "fallback-expansion"),
          support: seed,
          seed: seed.query,
        });
      }
    }
  }

  const pool = [...candidates.values()]
    .filter((candidate) => !recentKeywords.has(candidate.keyword.toLowerCase()))
    .sort((a, b) => b.baseScore - a.baseScore);

  const diversePool: Candidate[] = [];
  for (const candidate of pool) {
    if (diversePool.some((item) => keywordSimilarity(item.keyword, candidate.keyword) >= 0.8)) continue;
    diversePool.push(candidate);
    if (diversePool.length >= 8) break;
  }
  if (diversePool.length < 5) {
    for (const candidate of pool) {
      if (diversePool.some((item) => item.keyword.toLowerCase() === candidate.keyword.toLowerCase())) continue;
      diversePool.push(candidate);
      if (diversePool.length >= 8) break;
    }
  }

  const analyzed: Array<{
    candidate: Candidate;
    title: string;
    analysis: GoogleRankAnalysis;
    finalScore: number;
  }> = [];

  for (let index = 0; index < Math.min(8, diversePool.length); index += 2) {
    const batch = diversePool.slice(index, index + 2);
    const results = await Promise.allSettled(
      batch.map(async (candidate) => {
        const title = buildRecommendedTitle(candidate.keyword);
        const analysis = await analyzeGoogleRank(title);
        const finalScore = clamp(
          round(
            candidate.baseScore * 0.35 +
              analysis.scores.opportunity * 0.4 +
              analysis.prediction.top10Probability * 0.25,
          ),
          0,
          100,
        );
        return { candidate, title, analysis, finalScore };
      }),
    );
    for (const result of results) {
      if (result.status === "fulfilled") analyzed.push(result.value);
    }
  }

  analyzed.sort(
    (a, b) =>
      b.finalScore - a.finalScore ||
      b.analysis.prediction.top10Probability - a.analysis.prediction.top10Probability,
  );

  const selected: typeof analyzed = [];
  for (const item of analyzed) {
    if (selected.some((picked) => keywordSimilarity(picked.candidate.keyword, item.candidate.keyword) >= 0.72)) continue;
    selected.push(item);
    if (selected.length >= 5) break;
  }
  if (selected.length < 5) {
    for (const item of analyzed) {
      if (selected.includes(item)) continue;
      selected.push(item);
      if (selected.length >= 5) break;
    }
  }

  if (!selected.length) {
    throw new Error("오늘 추천할 SEO 키워드를 만들지 못했습니다. Search Console 연결 상태를 확인해 주세요.");
  }

  const supabase = getJhSupabaseAdmin();
  const { error: deleteError } = await supabase
    .from("seo_daily_keyword_recommendations")
    .delete()
    .eq("recommendation_date", recommendationDate);
  if (deleteError) throw new Error(`기존 오늘 추천 삭제 실패: ${deleteError.message}`);

  const rows = selected.slice(0, 5).map((item, index) => ({
    recommendation_date: recommendationDate,
    rank: index + 1,
    keyword: item.candidate.keyword,
    recommended_title: item.title,
    source_type: item.candidate.sourceType,
    strategy: strategyFor(item.candidate, item.analysis),
    reason: makeReason(item.candidate, item.analysis),
    candidate_score: item.finalScore,
    analysis: item.analysis,
    updated_at: new Date().toISOString(),
  }));

  const { data, error } = await supabase
    .from("seo_daily_keyword_recommendations")
    .insert(rows)
    .select("id,recommendation_date,rank,keyword,recommended_title,source_type,strategy,reason,candidate_score,analysis,created_at")
    .order("rank", { ascending: true });
  if (error) throw new Error(`오늘 SEO 키워드 저장 실패: ${error.message}`);

  return ((data ?? []) as RecommendationRow[]).map(toRecommendation);
}

export async function getOrGenerateDailySeoKeywordRecommendations() {
  const existing = await listDailySeoKeywordRecommendations();
  if (existing.length >= 5) return existing;
  return generateDailySeoKeywordRecommendations(false);
}
