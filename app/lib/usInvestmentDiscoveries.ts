import "server-only";

import { unstable_cache } from "next/cache";

import {
  getDailyDisclosureFeed,
  type DisclosureItem,
} from "@/app/lib/disclosureHub";
import { getSecFilingDetail } from "@/app/lib/secFilingDetail";

export type UsInvestmentDiscoveryType =
  | "earnings-growth"
  | "turnaround"
  | "major-contract"
  | "shareholder-return";

export type UsInvestmentDiscovery = {
  id: string;
  type: UsInvestmentDiscoveryType;
  company: string;
  stockCode: string;
  title: string;
  summary: string;
  metricLabel: string;
  metricValue: string;
  filingDate: string;
  sourceUrl: string;
  importance: number;
};

export type UsInvestmentDiscoveryDashboard = {
  configured: boolean;
  sourceDate: string | null;
  generatedAt: string;
  stats: {
    importantFilings: number;
    majorContracts: number;
    shareholderReturns: number;
    earningsSurge: number;
    turnarounds: number;
    ownershipChanges: number;
  };
  items: UsInvestmentDiscovery[];
  analyzed: {
    earningsCandidates: number;
    eventCandidates: number;
  };
  costNote: string;
  error: string | null;
};

type FactValue = {
  start?: string;
  end?: string;
  val?: number;
  accn?: string;
  form?: string;
  filed?: string;
};

type FactConcept = {
  units?: Record<string, FactValue[]>;
};

type CompanyFacts = {
  facts?: {
    "us-gaap"?: Record<string, FactConcept>;
  };
};

type MetricDefinition = {
  label: string;
  unit: "USD" | "USD/shares";
  concepts: string[];
};

type MetricSnapshot = {
  label: string;
  current: number | null;
  previousYear: number | null;
  yoy: number | null;
};

const SEC_USER_AGENT =
  process.env.SEC_USER_AGENT?.trim() ||
  "HOHAENG OS/1.0 https://hohaeng.vercel.app";
const SEC_CONTACT_EMAIL = process.env.SEC_CONTACT_EMAIL?.trim() || "";
const FETCH_TIMEOUT_MS = 12_000;
const DASHBOARD_CACHE_SECONDS = 6 * 60 * 60;
const DETAIL_CACHE_SECONDS = 7 * 24 * 60 * 60;
const MAX_EARNINGS_CANDIDATES = 10;
const MAX_EVENT_CANDIDATES = 12;
const MAX_DOCUMENT_CHARS = 450_000;

const REVENUE: MetricDefinition = {
  label: "매출",
  unit: "USD",
  concepts: [
    "RevenueFromContractWithCustomerExcludingAssessedTax",
    "Revenues",
    "SalesRevenueNet",
  ],
};
const OPERATING_INCOME: MetricDefinition = {
  label: "영업이익",
  unit: "USD",
  concepts: ["OperatingIncomeLoss"],
};
const NET_INCOME: MetricDefinition = {
  label: "순이익",
  unit: "USD",
  concepts: ["NetIncomeLoss", "ProfitLoss"],
};

function paddedCik(value: string): string {
  return value.replace(/\D/g, "").padStart(10, "0").slice(-10);
}

function cikFromItem(item: DisclosureItem): string | null {
  const match = item.detailUrl?.match(/\/data\/disclosures\/us\/([^/]+)\//i);
  return match?.[1] ? decodeURIComponent(match[1]) : null;
}

function normalizeForm(value: string | undefined): string {
  return (value ?? "").trim().toUpperCase().replace(/\/A$/, "");
}

function durationDays(value: FactValue): number | null {
  if (!value.start || !value.end) return null;
  const start = Date.parse(`${value.start}T12:00:00Z`);
  const end = Date.parse(`${value.end}T12:00:00Z`);
  if (!Number.isFinite(start) || !Number.isFinite(end)) return null;
  return Math.round((end - start) / 86_400_000);
}

function dayDistance(left: string, right: string): number | null {
  const leftMs = Date.parse(`${left}T12:00:00Z`);
  const rightMs = Date.parse(`${right}T12:00:00Z`);
  if (!Number.isFinite(leftMs) || !Number.isFinite(rightMs)) return null;
  return Math.round(Math.abs(leftMs - rightMs) / 86_400_000);
}

function chooseCurrent(values: FactValue[], accession: string, form: string): FactValue | null {
  const normalizedForm = normalizeForm(form);
  let candidates = values.filter(
    (item) =>
      item.accn === accession &&
      typeof item.val === "number" &&
      Number.isFinite(item.val),
  );
  if (candidates.length === 0) return null;

  if (normalizedForm === "10-Q") {
    const quarterOnly = candidates.filter((item) => {
      const days = durationDays(item);
      return days !== null && days >= 55 && days <= 125;
    });
    if (quarterOnly.length > 0) candidates = quarterOnly;
  } else if (["10-K", "20-F", "40-F"].includes(normalizedForm)) {
    const annualOnly = candidates.filter((item) => {
      const days = durationDays(item);
      return days !== null && days >= 280 && days <= 410;
    });
    if (annualOnly.length > 0) candidates = annualOnly;
  }

  return candidates.sort((left, right) => {
    const endOrder = (right.end ?? "").localeCompare(left.end ?? "");
    if (endOrder !== 0) return endOrder;
    return (right.start ?? "").localeCompare(left.start ?? "");
  })[0] ?? null;
}

function choosePriorYear(values: FactValue[], current: FactValue, form: string): FactValue | null {
  if (!current.end) return null;
  const normalizedForm = normalizeForm(form);
  const currentDuration = durationDays(current);

  const candidates = values
    .filter((item) => {
      if (typeof item.val !== "number" || !Number.isFinite(item.val) || !item.end) return false;
      if (item.end >= current.end!) return false;
      if (item.form && normalizeForm(item.form) !== normalizedForm) return false;

      const distance = dayDistance(item.end, current.end!);
      if (distance === null || distance < 300 || distance > 430) return false;

      const candidateDuration = durationDays(item);
      if (
        currentDuration !== null &&
        candidateDuration !== null &&
        Math.abs(currentDuration - candidateDuration) > 35
      ) {
        return false;
      }
      return true;
    })
    .sort((left, right) => {
      const leftDistance = left.end ? Math.abs((dayDistance(left.end, current.end!) ?? 999) - 365) : 999;
      const rightDistance = right.end ? Math.abs((dayDistance(right.end, current.end!) ?? 999) - 365) : 999;
      if (leftDistance !== rightDistance) return leftDistance - rightDistance;

      const sameAccessionLeft = left.accn === current.accn ? 0 : 1;
      const sameAccessionRight = right.accn === current.accn ? 0 : 1;
      if (sameAccessionLeft !== sameAccessionRight) return sameAccessionLeft - sameAccessionRight;
      return (right.filed ?? "").localeCompare(left.filed ?? "");
    });

  return candidates[0] ?? null;
}

function extractMetric(
  facts: CompanyFacts,
  accession: string,
  form: string,
  definition: MetricDefinition,
): MetricSnapshot {
  const usGaap = facts.facts?.["us-gaap"] ?? {};

  for (const conceptName of definition.concepts) {
    const values = usGaap[conceptName]?.units?.[definition.unit] ?? [];
    const current = chooseCurrent(values, accession, form);
    if (!current || typeof current.val !== "number") continue;

    const prior = choosePriorYear(values, current, form);
    const previousYear = typeof prior?.val === "number" ? prior.val : null;
    const yoy =
      previousYear !== null && previousYear !== 0
        ? ((current.val - previousYear) / Math.abs(previousYear)) * 100
        : null;

    return {
      label: definition.label,
      current: current.val,
      previousYear,
      yoy,
    };
  }

  return { label: definition.label, current: null, previousYear: null, yoy: null };
}

function secHeaders(accept: string): HeadersInit {
  return {
    Accept: accept,
    "User-Agent": SEC_USER_AGENT,
    ...(SEC_CONTACT_EMAIL ? { From: SEC_CONTACT_EMAIL } : {}),
  };
}

const loadCompanyFacts = unstable_cache(
  async (cik: string): Promise<CompanyFacts> => {
    const response = await fetch(
      `https://data.sec.gov/api/xbrl/companyfacts/CIK${paddedCik(cik)}.json`,
      {
        cache: "no-store",
        headers: secHeaders("application/json"),
        signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
      },
    );
    if (!response.ok) throw new Error(`SEC companyfacts 요청 실패 (${response.status})`);
    return (await response.json()) as CompanyFacts;
  },
  ["hohaeng-us-discovery-companyfacts-v1"],
  { revalidate: DETAIL_CACHE_SECONDS },
);

function normalizeDocumentText(value: string): string {
  return value
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, " ")
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replaceAll("&nbsp;", " ")
    .replaceAll("&amp;", "&")
    .replaceAll("&quot;", '"')
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, MAX_DOCUMENT_CHARS);
}

const loadSecDocumentText = unstable_cache(
  async (url: string): Promise<string> => {
    const response = await fetch(url, {
      cache: "no-store",
      headers: secHeaders("text/html,text/plain,*/*;q=0.8"),
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    });
    if (!response.ok) throw new Error(`SEC 원문 요청 실패 (${response.status})`);
    return normalizeDocumentText(await response.text());
  },
  ["hohaeng-us-discovery-document-v1"],
  { revalidate: DETAIL_CACHE_SECONDS },
);

function formatPercent(value: number | null): string {
  if (value === null) return "확인되지 않음";
  const sign = value > 0 ? "+" : "";
  return `${sign}${value.toLocaleString("ko-KR", { maximumFractionDigits: 1 })}%`;
}

function formatUsd(value: number | null): string {
  if (value === null) return "확인되지 않음";
  const absolute = Math.abs(value);
  const sign = value < 0 ? "-" : "";
  if (absolute >= 1_000_000_000) {
    return `${sign}$${(absolute / 1_000_000_000).toLocaleString("en-US", { maximumFractionDigits: 2 })}B`;
  }
  if (absolute >= 1_000_000) {
    return `${sign}$${(absolute / 1_000_000).toLocaleString("en-US", { maximumFractionDigits: 1 })}M`;
  }
  if (absolute >= 1_000) {
    return `${sign}$${(absolute / 1_000).toLocaleString("en-US", { maximumFractionDigits: 1 })}K`;
  }
  return `${sign}$${absolute.toLocaleString("en-US", { maximumFractionDigits: 0 })}`;
}

async function analyzeEarningsCandidate(item: DisclosureItem): Promise<UsInvestmentDiscovery | null> {
  const cik = cikFromItem(item);
  if (!cik || !item.ticker) return null;

  const facts = await loadCompanyFacts(cik);
  const revenue = extractMetric(facts, item.sourceId, item.form, REVENUE);
  const operating = extractMetric(facts, item.sourceId, item.form, OPERATING_INCOME);
  const netIncome = extractMetric(facts, item.sourceId, item.form, NET_INCOME);

  const turnaround =
    operating.current !== null &&
    operating.previousYear !== null &&
    operating.current > 0 &&
    operating.previousYear <= 0;
  const operatingSurge =
    operating.current !== null &&
    operating.current > 0 &&
    operating.previousYear !== null &&
    operating.previousYear > 0 &&
    (operating.yoy ?? -Infinity) >= 50;
  const revenueSurge =
    revenue.current !== null &&
    revenue.current > 0 &&
    revenue.previousYear !== null &&
    revenue.previousYear > 0 &&
    (revenue.yoy ?? -Infinity) >= 30;
  const netSurge =
    netIncome.current !== null &&
    netIncome.current > 0 &&
    netIncome.previousYear !== null &&
    netIncome.previousYear > 0 &&
    (netIncome.yoy ?? -Infinity) >= 50;

  if (!turnaround && !operatingSurge && !revenueSurge && !netSurge) return null;

  if (turnaround) {
    return {
      id: `us-turnaround-${item.sourceId}`,
      type: "turnaround",
      company: item.company,
      stockCode: item.ticker,
      title: "영업이익 흑자전환 감지",
      summary: `전년 동기 ${formatUsd(operating.previousYear)} → 현재 ${formatUsd(operating.current)}`,
      metricLabel: "영업이익",
      metricValue: "적자 → 흑자",
      filingDate: item.filingDate,
      sourceUrl: item.sourceUrl,
      importance: 100,
    };
  }

  const candidates = [
    { label: "영업이익", value: operating.yoy, importance: 94 },
    { label: "매출", value: revenue.yoy, importance: 88 },
    { label: "순이익", value: netIncome.yoy, importance: 86 },
  ].filter((entry) => entry.value !== null);
  candidates.sort((left, right) => (right.value ?? 0) - (left.value ?? 0));
  const top = candidates[0];
  if (!top || top.value === null) return null;

  const summary = [
    revenue.yoy !== null ? `매출 ${formatPercent(revenue.yoy)}` : null,
    operating.yoy !== null ? `영업이익 ${formatPercent(operating.yoy)}` : null,
    netIncome.yoy !== null ? `순이익 ${formatPercent(netIncome.yoy)}` : null,
  ]
    .filter((value): value is string => Boolean(value))
    .join(" · ");

  return {
    id: `us-earnings-growth-${item.sourceId}`,
    type: "earnings-growth",
    company: item.company,
    stockCode: item.ticker,
    title: "실적 급증 감지",
    summary: summary || `${item.form} 재무 수치 비교`,
    metricLabel: `${top.label} 전년 동기 대비`,
    metricValue: formatPercent(top.value),
    filingDate: item.filingDate,
    sourceUrl: item.sourceUrl,
    importance: top.importance + Math.min(5, Math.floor(Math.max(0, top.value - 50) / 50)),
  };
}

function hasItem(items: string[], itemNumber: string): boolean {
  return items.some((item) => item.trim().startsWith(itemNumber));
}

function detectsShareholderReturn(text: string): "repurchase" | "dividend" | null {
  const normalized = text.toLowerCase();
  if (
    /share repurchase (?:program|authorization|plan)/i.test(normalized) ||
    /stock repurchase (?:program|authorization|plan)/i.test(normalized) ||
    /authorized.{0,80}(?:share|stock) repurchase/i.test(normalized) ||
    /(?:share|stock) buyback/i.test(normalized)
  ) {
    return "repurchase";
  }
  if (
    /quarterly cash dividend/i.test(normalized) ||
    /special cash dividend/i.test(normalized) ||
    /declared.{0,80}(?:cash )?dividend/i.test(normalized) ||
    /cash dividend of/i.test(normalized)
  ) {
    return "dividend";
  }
  return null;
}

async function analyzeEventCandidate(item: DisclosureItem): Promise<UsInvestmentDiscovery[]> {
  const cik = cikFromItem(item);
  if (!cik || !item.ticker) return [];

  const detail = await getSecFilingDetail(cik, item.sourceId);
  if (!detail) return [];

  let text = "";
  if (detail.sourceUrl) {
    text = await loadSecDocumentText(detail.sourceUrl).catch(() => "");
  }

  const discoveries: UsInvestmentDiscovery[] = [];
  const contractDetected =
    hasItem(detail.items, "1.01") ||
    (normalizeForm(item.form) === "6-K" && /material definitive agreement/i.test(text));

  if (contractDetected) {
    discoveries.push({
      id: `us-major-contract-${item.sourceId}`,
      type: "major-contract",
      company: item.company,
      stockCode: item.ticker,
      title: "중요 계약 공시 감지",
      summary: hasItem(detail.items, "1.01")
        ? `${item.form} Item 1.01 · Material Definitive Agreement`
        : `${item.form} · 중요 계약 관련 문구 감지`,
      metricLabel: "SEC 양식",
      metricValue: item.form,
      filingDate: item.filingDate,
      sourceUrl: item.sourceUrl,
      importance: 92,
    });
  }

  const shareholderReturn = detectsShareholderReturn(text);
  if (shareholderReturn) {
    const repurchase = shareholderReturn === "repurchase";
    discoveries.push({
      id: `us-shareholder-return-${item.sourceId}`,
      type: "shareholder-return",
      company: item.company,
      stockCode: item.ticker,
      title: repurchase ? "자사주 매입 공시 감지" : "배당 공시 감지",
      summary: repurchase
        ? `${item.form} 원문에서 자사주 매입·승인 관련 문구를 확인했습니다.`
        : `${item.form} 원문에서 현금배당 발표 관련 문구를 확인했습니다.`,
      metricLabel: "주주환원",
      metricValue: repurchase ? "자사주" : "배당",
      filingDate: item.filingDate,
      sourceUrl: item.sourceUrl,
      importance: 90,
    });
  }

  return discoveries;
}

const loadUsInvestmentDiscoveries = unstable_cache(
  async (): Promise<UsInvestmentDiscoveryDashboard> => {
    const feed = await getDailyDisclosureFeed();
    const usItems = feed.us.items;

    if (!feed.us.configured) {
      return {
        configured: false,
        sourceDate: null,
        generatedAt: new Date().toISOString(),
        stats: {
          importantFilings: 0,
          majorContracts: 0,
          shareholderReturns: 0,
          earningsSurge: 0,
          turnarounds: 0,
          ownershipChanges: 0,
        },
        items: [],
        analyzed: { earningsCandidates: 0, eventCandidates: 0 },
        costNote: "SEC EDGAR 연결 후 최근 완료 미국 영업일 후보만 제한적으로 분석합니다.",
        error: feed.us.error,
      };
    }

    const earningsCandidates = usItems
      .filter(
        (item) =>
          Boolean(item.ticker && item.detailUrl) &&
          item.category === "earnings" &&
          ["10-Q", "10-K", "20-F", "40-F"].includes(normalizeForm(item.form)),
      )
      .slice(0, MAX_EARNINGS_CANDIDATES);
    const eventCandidates = usItems
      .filter(
        (item) =>
          Boolean(item.ticker && item.detailUrl) &&
          item.category === "major" &&
          ["8-K", "6-K"].includes(normalizeForm(item.form)),
      )
      .slice(0, MAX_EVENT_CANDIDATES);

    const [earningsSettled, eventsSettled] = await Promise.all([
      Promise.allSettled(earningsCandidates.map((item) => analyzeEarningsCandidate(item))),
      Promise.allSettled(eventCandidates.map((item) => analyzeEventCandidate(item))),
    ]);

    const earningsItems = earningsSettled
      .filter((result): result is PromiseFulfilledResult<UsInvestmentDiscovery | null> => result.status === "fulfilled")
      .map((result) => result.value)
      .filter((item): item is UsInvestmentDiscovery => item !== null);
    const eventItems = eventsSettled
      .filter((result): result is PromiseFulfilledResult<UsInvestmentDiscovery[]> => result.status === "fulfilled")
      .flatMap((result) => result.value);

    const items = [...earningsItems, ...eventItems].sort((left, right) => {
      if (right.importance !== left.importance) return right.importance - left.importance;
      return left.company.localeCompare(right.company, "en");
    });

    return {
      configured: true,
      sourceDate: feed.us.sourceDate,
      generatedAt: new Date().toISOString(),
      stats: {
        importantFilings: usItems.filter((item) => item.importance >= 70).length,
        majorContracts: eventItems.filter((item) => item.type === "major-contract").length,
        shareholderReturns: eventItems.filter((item) => item.type === "shareholder-return").length,
        earningsSurge: earningsItems.filter((item) => item.type === "earnings-growth").length,
        turnarounds: earningsItems.filter((item) => item.type === "turnaround").length,
        ownershipChanges: usItems.filter((item) => item.category === "ownership").length,
      },
      items,
      analyzed: {
        earningsCandidates: earningsCandidates.length,
        eventCandidates: eventCandidates.length,
      },
      costNote:
        `완료 미국 영업일 공시 중 실적 최대 ${MAX_EARNINGS_CANDIDATES}건, 8-K·6-K 이벤트 최대 ${MAX_EVENT_CANDIDATES}건만 후보로 분석하고 결과를 6시간 캐시합니다. SEC 원문 파일은 저장하지 않습니다.`,
      error: feed.us.error,
    };
  },
  ["hohaeng-us-investment-discoveries-v1"],
  { revalidate: DASHBOARD_CACHE_SECONDS },
);

export async function getUsInvestmentDiscoveryDashboard() {
  return loadUsInvestmentDiscoveries();
}
