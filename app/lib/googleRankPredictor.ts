import "server-only";

import {
  getSearchConsoleKeywordUniverse,
  type SearchConsoleKeywordSnapshot,
} from "@/app/lib/googleSearchConsole";
import { absoluteUrl } from "@/app/lib/site";

export const GOOGLE_RANK_MODEL_VERSION = "v3.0.0";

type ContentRole = "pillar" | "cluster";
type Confidence = "낮음" | "중간" | "높음";

type RelatedQuery = SearchConsoleKeywordSnapshot & {
  relevance: number;
};

type SerpOrganicItem = {
  position: number;
  title: string;
  link: string;
  domain: string;
  snippet: string;
  authorityLike: boolean;
  titleMatch: number;
};

type ScoreBreakdown = {
  titleFit: number;
  intentFit: number;
  siteAuthority: number;
  gscStrength: number;
  serpAccessibility: number;
  specificity: number;
};

export type RankRecommendation = {
  title: string;
  detail: string;
  impact: number;
};

export type GoogleRankAnalysis = {
  modelVersion: string;
  generatedAt: string;
  title: string;
  url: string | null;
  keyword: {
    primary: string;
    secondary: string[];
    intent: string;
    contentRole: ContentRole;
    contentType: string;
  };
  scores: {
    opportunity: number;
    serpDifficulty: number;
    siteAuthority: number;
    titleSeo: number;
    intentFit: number;
    gscStrength: number;
    serpAccessibility: number;
    specificity: number;
    breakdown: ScoreBreakdown;
  };
  prediction: {
    min: number;
    max: number;
    optimizedMin: number;
    optimizedMax: number;
    clusterMin: number;
    clusterMax: number;
    top10Probability: number;
    confidence: Confidence;
    confidenceReasons: string[];
  };
  gsc: {
    connected: boolean;
    error: string | null;
    relatedCount: number;
    totalImpressions: number;
    totalClicks: number;
    averagePosition: number | null;
    bestPosition: number | null;
    top20Count: number;
    relatedQueries: RelatedQuery[];
  };
  serp: {
    connected: boolean;
    provider: "serper" | "fallback";
    error: string | null;
    resultCount: number;
    authorityResultCount: number;
    exactIntentResultCount: number;
    hasAnswerFeature: boolean;
    organic: SerpOrganicItem[];
  };
  recommendations: RankRecommendation[];
  cluster: {
    pillarTopic: string;
    suggestedClusters: string[];
    internalLinkSentence: string;
  };
  quickWin: boolean;
};

const TITLE_FILLERS = new Set([
  "완벽",
  "가이드",
  "완벽가이드",
  "총정리",
  "정리",
  "한눈에",
  "쉽게",
  "초보자",
  "초보",
  "알아보기",
  "알아보자",
  "알아야",
  "직접",
  "해보니",
  "얼마일까",
  "얼마",
  "무엇일까",
  "무엇",
  "왜",
  "방법",
  "추천",
  "최신",
  "2026",
  "2025",
  "2024",
  "vs",
  "VS",
]);

const AUTHORITY_DOMAINS = [
  "google.com",
  "youtube.com",
  "wikipedia.org",
  "naver.com",
  "daum.net",
  "gov.kr",
  "go.kr",
  "korea.kr",
  "nts.go.kr",
  "moel.go.kr",
  "fss.or.kr",
  "bok.or.kr",
  "kostat.go.kr",
  "investing.com",
  "reuters.com",
  "bloomberg.com",
  "forbes.com",
  "chosun.com",
  "joongang.co.kr",
  "hankyung.com",
  "mk.co.kr",
  "sedaily.com",
  "jobkorea.co.kr",
  "saramin.co.kr",
  "wanted.co.kr",
];

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function round(value: number, digits = 0) {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

function cleanToken(value: string) {
  let token = value
    .trim()
    .replace(/^[^0-9A-Za-z가-힣]+|[^0-9A-Za-z가-힣%]+$/g, "")
    .replace(/(까지|부터)$/u, "");

  if (token.length >= 4) {
    token = token.replace(/(으로|에서|에게)$/u, "");
  }

  return token;
}

function tokenize(value: string) {
  return value
    .replace(/[|｜:：?!？！,，·•/()\[\]{}<>“”"'–—_-]+/g, " ")
    .split(/\s+/)
    .map(cleanToken)
    .filter(Boolean);
}

function unique<T>(items: T[]) {
  return [...new Set(items)];
}

function extractKeywordSignals(title: string) {
  const firstSegment = title.split(/[|｜:：?!？！,，·•/()\[\]{}<>–—]/)[0] || title;
  const firstTokens = tokenize(firstSegment).filter(
    (token) => !TITLE_FILLERS.has(token),
  );
  const allTokens = tokenize(title).filter((token) => !TITLE_FILLERS.has(token));

  const primaryTokens = (firstTokens.length ? firstTokens : allTokens).slice(0, 4);
  let primary = primaryTokens.join(" ").trim();
  if (!primary) primary = title.trim().slice(0, 40);

  const primarySet = new Set(primaryTokens.map((token) => token.toLowerCase()));
  const secondary = unique(
    allTokens
      .filter((token) => !primarySet.has(token.toLowerCase()))
      .filter((token) => token.length > 1 || /\d/.test(token)),
  ).slice(0, 8);

  const lower = title.toLowerCase();
  const calculation = /(계산|실수령|세후|수익률|복리|평단|월급|연봉|퇴직금|얼마)/u.test(title);
  const comparison = /(비교|차이|vs|장단점|추천)/i.test(title);
  const action = /(신청|조회|발급|환급|받는법|청구|가입|해지)/u.test(title);
  const explanation = /(뜻|이란|란\?|왜|원리|지수|금리|전망)/u.test(title);

  let intent = "정보 탐색형";
  let contentType = "Guide";
  if (calculation) {
    intent = "계산·문제해결형";
    contentType = "Calculator + Guide";
  } else if (comparison) {
    intent = "비교형";
    contentType = "Comparison Guide";
  } else if (action) {
    intent = "문제해결·행동형";
    contentType = "How-to Guide";
  } else if (explanation) {
    intent = "정보 탐색형";
    contentType = "Explainer";
  }

  const pillarMarker = /(완벽\s*가이드|총정리|A\s*부터\s*Z|모든|한눈에|완전정복)/iu.test(title);
  const specificMarker = /\d|만원|퍼센트|%|조건|대상|후기|사례|vs|비교/u.test(firstSegment);
  const contentRole: ContentRole = pillarMarker || (!specificMarker && secondary.length >= 4)
    ? "pillar"
    : "cluster";

  return {
    primary,
    primaryTokens,
    secondary,
    intent,
    contentRole,
    contentType,
    hasIntentCue: calculation || comparison || action || explanation || /방법/u.test(title),
    lower,
  };
}

function tokenSimilarity(a: string, b: string) {
  const aTokens = unique(tokenize(a).map((token) => token.toLowerCase()));
  const bTokens = unique(tokenize(b).map((token) => token.toLowerCase()));
  if (!aTokens.length || !bTokens.length) return 0;

  const bSet = new Set(bTokens);
  const intersection = aTokens.filter((token) => bSet.has(token)).length;
  const union = new Set([...aTokens, ...bTokens]).size;
  const jaccard = union ? intersection / union : 0;
  const normalizedA = aTokens.join(" ");
  const normalizedB = bTokens.join(" ");
  const contains = normalizedA.includes(normalizedB) || normalizedB.includes(normalizedA);
  return clamp(jaccard + (contains ? 0.25 : 0), 0, 1);
}

function scoreTitle(title: string, primary: string, hasIntentCue: boolean) {
  const normalizedTitle = title.toLowerCase().replace(/\s+/g, " ");
  const normalizedPrimary = primary.toLowerCase().replace(/\s+/g, " ");
  const index = normalizedTitle.indexOf(normalizedPrimary);
  let score = 30;

  if (index === 0) score += 25;
  else if (index > 0 && index <= 15) score += 20;
  else if (index > 15) score += 10;

  if (title.length >= 20 && title.length <= 45) score += 20;
  else if (title.length >= 12 && title.length <= 60) score += 14;
  else score += 6;

  const keywordTokens = tokenize(primary).length;
  if (keywordTokens >= 2 && keywordTokens <= 4) score += 12;
  else score += 7;

  if (hasIntentCue) score += 8;
  if (/[|｜:：?？]/.test(title)) score += 5;

  return clamp(Math.round(score), 0, 100);
}

function relatedGscQueries(universe: SearchConsoleKeywordSnapshot[], primary: string) {
  return universe
    .map((row) => ({
      ...row,
      relevance: tokenSimilarity(row.query, primary),
    }))
    .filter((row) => row.relevance >= 0.34)
    .sort((a, b) => b.impressions - a.impressions || b.relevance - a.relevance)
    .slice(0, 30);
}

function summarizeGsc(related: RelatedQuery[]) {
  const totalImpressions = related.reduce((sum, row) => sum + row.impressions, 0);
  const totalClicks = related.reduce((sum, row) => sum + row.clicks, 0);
  const weighted = related.reduce(
    (acc, row) => {
      const weight = Math.max(1, row.impressions) * (0.5 + row.relevance);
      return {
        weightedPosition: acc.weightedPosition + row.position * weight,
        weight: acc.weight + weight,
      };
    },
    { weightedPosition: 0, weight: 0 },
  );

  const averagePosition = weighted.weight > 0
    ? weighted.weightedPosition / weighted.weight
    : null;
  const bestPosition = related.length
    ? Math.min(...related.map((row) => row.position).filter((value) => value > 0))
    : null;
  const top20Count = related.filter((row) => row.position > 0 && row.position <= 20).length;

  return {
    totalImpressions,
    totalClicks,
    averagePosition,
    bestPosition: Number.isFinite(bestPosition ?? Number.NaN) ? bestPosition : null,
    top20Count,
  };
}

function scoreSiteAuthority(
  relatedCount: number,
  totalImpressions: number,
  totalClicks: number,
  averagePosition: number | null,
) {
  const breadth = clamp(relatedCount * 3, 0, 22);
  const impressions = clamp(Math.log10(totalImpressions + 1) * 8, 0, 25);
  const clicks = clamp(Math.log10(totalClicks + 1) * 7, 0, 15);
  let rank = 8;

  if (averagePosition !== null) {
    if (averagePosition <= 5) rank = 35;
    else if (averagePosition <= 10) rank = 31;
    else if (averagePosition <= 20) rank = 26;
    else if (averagePosition <= 40) rank = 19;
    else if (averagePosition <= 60) rank = 13;
  }

  return clamp(Math.round(breadth + impressions + clicks + rank), 10, 100);
}

function scoreGscStrength(averagePosition: number | null, relatedCount: number) {
  if (!relatedCount || averagePosition === null) return 40;
  if (averagePosition <= 3) return 100;
  if (averagePosition <= 10) return 92;
  if (averagePosition <= 20) return 80;
  if (averagePosition <= 35) return 68;
  if (averagePosition <= 50) return 56;
  if (averagePosition <= 70) return 45;
  return 35;
}

function getDomain(link: string) {
  try {
    return new URL(link).hostname.replace(/^www\./, "");
  } catch {
    return link;
  }
}

function isAuthorityDomain(domain: string) {
  return AUTHORITY_DOMAINS.some(
    (candidate) => domain === candidate || domain.endsWith(`.${candidate}`),
  );
}

type SerperResponse = {
  organic?: Array<{
    position?: number;
    title?: string;
    link?: string;
    snippet?: string;
  }>;
  answerBox?: unknown;
  knowledgeGraph?: unknown;
  peopleAlsoAsk?: unknown[];
};

async function fetchLiveSerp(primary: string) {
  const apiKey = process.env.SERPER_API_KEY;
  if (!apiKey) {
    return {
      connected: false as const,
      error: "SERPER_API_KEY가 없어 규칙 기반 경쟁도 추정을 사용합니다.",
      organic: [] as SerpOrganicItem[],
      hasAnswerFeature: false,
    };
  }

  const response = await fetch("https://google.serper.dev/search", {
    method: "POST",
    headers: {
      "X-API-KEY": apiKey,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ q: primary, gl: "kr", hl: "ko", num: 10 }),
    cache: "no-store",
  });

  const payload = (await response.json()) as SerperResponse & {
    message?: string;
  };

  if (!response.ok) {
    throw new Error(payload.message || `SERP API HTTP ${response.status}`);
  }

  const organic: SerpOrganicItem[] = (payload.organic ?? []).slice(0, 10).map((item, index) => {
    const link = item.link || "";
    const domain = getDomain(link);
    const title = item.title || "제목 없음";
    return {
      position: item.position ?? index + 1,
      title,
      link,
      domain,
      snippet: item.snippet || "",
      authorityLike: isAuthorityDomain(domain),
      titleMatch: round(tokenSimilarity(title, primary), 2),
    };
  });

  return {
    connected: true as const,
    error: null,
    organic,
    hasAnswerFeature: Boolean(
      payload.answerBox || payload.knowledgeGraph || (payload.peopleAlsoAsk?.length ?? 0) > 0,
    ),
  };
}

function fallbackSerpDifficulty(primary: string, contentRole: ContentRole, gscBest: number | null) {
  const tokenCount = tokenize(primary).length;
  let difficulty = tokenCount <= 1 ? 78 : tokenCount === 2 ? 70 : tokenCount === 3 ? 59 : 50;
  if (/\d|만원|%/.test(primary)) difficulty -= 7;
  if (contentRole === "pillar") difficulty += 5;
  if (gscBest !== null && gscBest <= 20) difficulty -= 7;
  return clamp(Math.round(difficulty), 30, 90);
}

function liveSerpDifficulty(
  organic: SerpOrganicItem[],
  primary: string,
  hasAnswerFeature: boolean,
) {
  if (!organic.length) return 60;
  const authorityRatio = organic.filter((item) => item.authorityLike).length / organic.length;
  const exactIntentRatio = organic.filter((item) => item.titleMatch >= 0.7).length / organic.length;
  const averageMatch = organic.reduce((sum, item) => sum + item.titleMatch, 0) / organic.length;
  const broadPenalty = tokenize(primary).length <= 2 ? 8 : 0;

  return clamp(
    Math.round(
      28 + authorityRatio * 26 + exactIntentRatio * 24 + averageMatch * 16 +
        (hasAnswerFeature ? 6 : 0) + broadPenalty,
    ),
    20,
    96,
  );
}

function rankCenterFromOpportunity(opportunity: number) {
  return clamp(75 - opportunity * 0.72, 3, 90);
}

function blendRankCenter(opportunity: number, gscAveragePosition: number | null) {
  const modelCenter = rankCenterFromOpportunity(opportunity);
  if (gscAveragePosition === null) return modelCenter;
  return clamp(modelCenter * 0.58 + gscAveragePosition * 0.42, 2, 95);
}

function rankRange(center: number, confidence: Confidence) {
  const halfWidth = confidence === "높음" ? 4 : confidence === "중간" ? 7 : 11;
  return {
    min: clamp(Math.floor(center - halfWidth), 1, 100),
    max: clamp(Math.ceil(center + halfWidth), 1, 100),
  };
}

function probabilityTop10(center: number, confidence: Confidence) {
  const base = 100 / (1 + Math.exp((center - 14) / 4.5));
  const confidenceAdjustment = confidence === "높음" ? 3 : confidence === "낮음" ? -5 : 0;
  return clamp(Math.round(base + confidenceAdjustment), 3, 97);
}

function makeRecommendations(input: {
  titleScore: number;
  serpDifficulty: number;
  gscAveragePosition: number | null;
  gscRelatedCount: number;
  intent: string;
  contentRole: ContentRole;
  primary: string;
}) {
  const recommendations: RankRecommendation[] = [];

  if (input.titleScore < 85) {
    recommendations.push({
      title: "핵심 키워드를 제목 앞쪽으로 당기기",
      detail: `제목 초반 15자 안에 “${input.primary}”가 자연스럽게 보이도록 다듬습니다.`,
      impact: 4,
    });
  }

  if (input.serpDifficulty >= 68) {
    recommendations.push({
      title: "상위 글과 다른 실용 장치 추가",
      detail: "계산기·원본 데이터·비교표·직접 계산 예시 중 최소 2개를 넣어 단순 설명글과 차이를 만듭니다.",
      impact: 5,
    });
  }

  if (
    input.gscAveragePosition !== null &&
    input.gscAveragePosition > 8 &&
    input.gscAveragePosition <= 22
  ) {
    recommendations.push({
      title: "관련 기존 글에서 내부링크 집중",
      detail: "현재 1~2페이지 경계에 있는 관련 검색어가 있습니다. 기존 상위 관련 글 3~5개에서 새 글로 문맥형 내부링크를 연결합니다.",
      impact: 5,
    });
  }

  if (input.gscRelatedCount < 5) {
    recommendations.push({
      title: "Cluster를 먼저 3개 이상 확보",
      detail: "같은 주제로 Google에 잡힌 검색어 폭이 아직 좁습니다. 롱테일 Cluster를 먼저 쌓아 주제 신호를 넓힙니다.",
      impact: 4,
    });
  }

  if (input.intent.includes("계산")) {
    recommendations.push({
      title: "입력형 계산기 + 실제 숫자 예시",
      detail: "검색자가 답을 바로 얻을 수 있도록 입력형 계산기와 대표 금액별 결과 표를 본문 상단에 배치합니다.",
      impact: 5,
    });
  }

  if (input.contentRole === "pillar") {
    recommendations.push({
      title: "Pillar에서 Cluster 5개 이상 양방향 연결",
      detail: "Pillar 본문에서 세부 Cluster로 보내고, 각 Cluster 첫·중간·하단에서 다시 Pillar로 돌아오는 구조를 만듭니다.",
      impact: 4,
    });
  }

  recommendations.push({
    title: "검색자의 다음 질문까지 FAQ로 마무리",
    detail: "상위 결과를 읽고도 남는 조건·예외·계산 차이를 3~5개의 짧은 FAQ로 해결합니다.",
    impact: 2,
  });

  return recommendations.slice(0, 6);
}

function makeClusters(primary: string, secondary: string[], role: ContentRole) {
  const root = tokenize(primary)[0] || primary;
  const fromSecondary = secondary.slice(0, 5).map((token) => `${root} ${token}`.trim());
  const templates = role === "pillar"
    ? [
        `${primary} 계산 예시`,
        `${primary} 자주 틀리는 부분`,
        `${primary} 세금·공제 체크`,
        `${primary} 조건별 차이`,
        `${primary} FAQ`,
      ]
    : [
        `${root} 완벽 가이드`,
        `${primary} 계산 방법`,
        `${primary} 실제 사례`,
        `${primary} 비교`,
        `${primary} FAQ`,
      ];

  return unique([...fromSecondary, ...templates]).slice(0, 8);
}

function normalizeOptionalUrl(value?: string | null) {
  const input = value?.trim();
  if (!input) return null;
  try {
    return input.startsWith("http://") || input.startsWith("https://")
      ? new URL(input).toString()
      : absoluteUrl(input.startsWith("/") ? input : `/${input}`);
  } catch {
    return null;
  }
}

export async function analyzeGoogleRank(
  titleInput: string,
  urlInput?: string | null,
): Promise<GoogleRankAnalysis> {
  const title = titleInput.trim().replace(/\s+/g, " ");
  if (title.length < 4) throw new Error("제목을 4자 이상 입력해 주세요.");
  if (title.length > 180) throw new Error("제목은 180자 이하로 입력해 주세요.");

  const signals = extractKeywordSignals(title);
  const normalizedUrl = normalizeOptionalUrl(urlInput);
  const titleScore = scoreTitle(title, signals.primary, signals.hasIntentCue);
  const intentFit = signals.hasIntentCue ? 92 : 72;
  const specificity = clamp(
    45 + Math.max(0, tokenize(signals.primary).length - 1) * 13 +
      (/\d|만원|%/.test(signals.primary) ? 10 : 0) -
      (signals.contentRole === "pillar" ? 7 : 0),
    35,
    100,
  );

  let gscConnected = false;
  let gscError: string | null = null;
  let related: RelatedQuery[] = [];

  try {
    const universe = await getSearchConsoleKeywordUniverse(90, 5000);
    related = relatedGscQueries(universe, signals.primary);
    gscConnected = true;
  } catch (error) {
    gscError = error instanceof Error ? error.message : "Search Console 연결 오류";
  }

  const gscSummary = summarizeGsc(related);
  const siteAuthority = gscConnected
    ? scoreSiteAuthority(
        related.length,
        gscSummary.totalImpressions,
        gscSummary.totalClicks,
        gscSummary.averagePosition,
      )
    : 38;
  const gscStrength = gscConnected
    ? scoreGscStrength(gscSummary.averagePosition, related.length)
    : 40;

  let liveSerp: Awaited<ReturnType<typeof fetchLiveSerp>>;
  try {
    liveSerp = await fetchLiveSerp(signals.primary);
  } catch (error) {
    liveSerp = {
      connected: false,
      error: error instanceof Error ? error.message : "SERP API 연결 오류",
      organic: [],
      hasAnswerFeature: false,
    };
  }

  const serpDifficulty = liveSerp.connected
    ? liveSerpDifficulty(liveSerp.organic, signals.primary, liveSerp.hasAnswerFeature)
    : fallbackSerpDifficulty(signals.primary, signals.contentRole, gscSummary.bestPosition);
  const serpAccessibility = 100 - serpDifficulty;

  const breakdown: ScoreBreakdown = {
    titleFit: titleScore,
    intentFit,
    siteAuthority,
    gscStrength,
    serpAccessibility,
    specificity: Math.round(specificity),
  };

  const opportunity = clamp(
    Math.round(
      titleScore * 0.15 +
        intentFit * 0.1 +
        siteAuthority * 0.25 +
        gscStrength * 0.2 +
        serpAccessibility * 0.25 +
        specificity * 0.05,
    ),
    0,
    100,
  );

  const confidenceReasons: string[] = [];
  if (gscConnected) confidenceReasons.push("Search Console 실데이터 반영");
  if (liveSerp.connected) confidenceReasons.push("실시간 Google SERP 상위 10개 반영");
  if (related.length >= 5) confidenceReasons.push(`관련 GSC 검색어 ${related.length}개 확보`);

  let confidence: Confidence = "낮음";
  if (gscConnected && liveSerp.connected && related.length >= 3) confidence = "높음";
  else if (gscConnected || liveSerp.connected) confidence = "중간";
  if (!confidenceReasons.length) confidenceReasons.push("실데이터가 부족해 규칙 기반 추정 비중이 큼");

  const center = blendRankCenter(opportunity, gscSummary.averagePosition);
  const currentRange = rankRange(center, confidence);
  const recommendations = makeRecommendations({
    titleScore,
    serpDifficulty,
    gscAveragePosition: gscSummary.averagePosition,
    gscRelatedCount: related.length,
    intent: signals.intent,
    contentRole: signals.contentRole,
    primary: signals.primary,
  });
  const recommendationLift = clamp(
    recommendations.reduce((sum, item) => sum + item.impact, 0) * 0.45,
    4,
    12,
  );
  const optimizedCenter = blendRankCenter(
    clamp(opportunity + recommendationLift, 0, 100),
    gscSummary.averagePosition,
  );
  const clusterCenter = blendRankCenter(
    clamp(opportunity + recommendationLift + 6, 0, 100),
    gscSummary.averagePosition === null ? null : Math.max(2, gscSummary.averagePosition - 2),
  );
  const optimizedRange = rankRange(optimizedCenter, confidence);
  const clusterRange = rankRange(clusterCenter, confidence);

  const authorityResultCount = liveSerp.organic.filter((item) => item.authorityLike).length;
  const exactIntentResultCount = liveSerp.organic.filter((item) => item.titleMatch >= 0.7).length;
  const pillarTopic = signals.contentRole === "pillar"
    ? signals.primary
    : `${tokenize(signals.primary)[0] || signals.primary} 완벽 가이드`;
  const quickWin = Boolean(
    gscSummary.averagePosition !== null &&
      gscSummary.averagePosition > 8 &&
      gscSummary.averagePosition <= 22 &&
      gscSummary.totalImpressions >= 10,
  );

  return {
    modelVersion: GOOGLE_RANK_MODEL_VERSION,
    generatedAt: new Date().toISOString(),
    title,
    url: normalizedUrl,
    keyword: {
      primary: signals.primary,
      secondary: signals.secondary,
      intent: signals.intent,
      contentRole: signals.contentRole,
      contentType: signals.contentType,
    },
    scores: {
      opportunity,
      serpDifficulty,
      siteAuthority,
      titleSeo: titleScore,
      intentFit,
      gscStrength,
      serpAccessibility,
      specificity: Math.round(specificity),
      breakdown,
    },
    prediction: {
      min: currentRange.min,
      max: currentRange.max,
      optimizedMin: optimizedRange.min,
      optimizedMax: optimizedRange.max,
      clusterMin: clusterRange.min,
      clusterMax: clusterRange.max,
      top10Probability: probabilityTop10(center, confidence),
      confidence,
      confidenceReasons,
    },
    gsc: {
      connected: gscConnected,
      error: gscError,
      relatedCount: related.length,
      totalImpressions: gscSummary.totalImpressions,
      totalClicks: gscSummary.totalClicks,
      averagePosition: gscSummary.averagePosition === null ? null : round(gscSummary.averagePosition, 2),
      bestPosition: gscSummary.bestPosition === null ? null : round(gscSummary.bestPosition, 2),
      top20Count: gscSummary.top20Count,
      relatedQueries: related.slice(0, 10).map((row) => ({
        ...row,
        relevance: round(row.relevance, 2),
      })),
    },
    serp: {
      connected: liveSerp.connected,
      provider: liveSerp.connected ? "serper" : "fallback",
      error: liveSerp.error,
      resultCount: liveSerp.organic.length,
      authorityResultCount,
      exactIntentResultCount,
      hasAnswerFeature: liveSerp.hasAnswerFeature,
      organic: liveSerp.organic,
    },
    recommendations,
    cluster: {
      pillarTopic,
      suggestedClusters: makeClusters(signals.primary, signals.secondary, signals.contentRole),
      internalLinkSentence: `이 글을 읽기 전에 “${pillarTopic}”에서 전체 구조를 먼저 확인하면 세부 내용을 더 쉽게 연결할 수 있습니다.`,
    },
    quickWin,
  };
}
