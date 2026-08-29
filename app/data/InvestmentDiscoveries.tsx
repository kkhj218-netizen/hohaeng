import InvestmentDiscoveryMarketTabs, {
  type InvestmentDiscoveryPanel,
} from "@/app/data/InvestmentDiscoveryMarketTabs";
import {
  type DiscoveryCompanyGroup,
  type DiscoveryDetectedItem,
  type DiscoveryStatItem,
} from "@/app/data/InvestmentDiscoveryExplorer";
import {
  getInvestmentDiscoveryDashboard,
} from "@/app/lib/dartInvestmentDiscoveries";
import {
  getDailyDisclosureFeed,
  type DisclosureItem,
} from "@/app/lib/disclosureHub";
import { getUsInvestmentDiscoveryDashboard } from "@/app/lib/usInvestmentDiscoveries";

function formatDate(value: string | null) {
  return value ? value.replaceAll("-", ".") : "확인 중";
}

function normalizeTitle(value: string) {
  return value.replace(/\s+/g, "");
}

function groupCompanies(
  items: DisclosureItem[],
  locale: "ko" | "en" = "ko",
): DiscoveryCompanyGroup[] {
  const groups = new Map<string, DiscoveryCompanyGroup>();

  for (const item of items) {
    const key = item.ticker || item.company;
    const current = groups.get(key);

    if (!current) {
      groups.set(key, {
        id: key,
        company: item.company,
        stockCode: item.ticker,
        filingCount: 1,
        latestTitle: item.title,
        filingDate: item.filingDate,
        sourceUrl: item.sourceUrl,
      });
      continue;
    }

    current.filingCount += 1;
    if (item.filingDate > current.filingDate) {
      current.latestTitle = item.title;
      current.filingDate = item.filingDate;
      current.sourceUrl = item.sourceUrl;
    }
  }

  return [...groups.values()].sort((left, right) => {
    const countOrder = right.filingCount - left.filingCount;
    if (countOrder !== 0) return countOrder;
    const dateOrder = right.filingDate.localeCompare(left.filingDate);
    if (dateOrder !== 0) return dateOrder;
    return left.company.localeCompare(right.company, locale);
  });
}

export default async function InvestmentDiscoveries() {
  const [dashboard, usDashboard] = await Promise.all([
    getInvestmentDiscoveryDashboard(),
    getUsInvestmentDiscoveryDashboard(),
  ]);
  const feed = await getDailyDisclosureFeed();

  const koreaItems = feed.korea.items;
  const importantItems = koreaItems.filter((item) => item.importance >= 70);
  const supplyItems = koreaItems.filter((item) => {
    const title = normalizeTitle(item.title);
    return title.includes("단일판매") && title.includes("공급계약");
  });
  const shareholderItems = koreaItems.filter((item) => {
    const title = normalizeTitle(item.title);
    return (
      item.category === "shareholder" ||
      title.includes("주식소각") ||
      title.includes("자기주식취득") ||
      title.includes("배당")
    );
  });

  const koreaStats: DiscoveryStatItem[] = [
    { key: "important", label: "중요 공시", value: dashboard.stats.importantFilings, note: "전체 중요도 70+" },
    { key: "supply", label: "공급계약", value: dashboard.stats.supplyContracts, note: "단일판매·공급계약" },
    { key: "shareholder", label: "주주환원", value: dashboard.stats.shareholderReturns, note: "자사주·소각·배당" },
    { key: "earnings", label: "실적 급증", value: dashboard.stats.earningsSurge, note: "매출 +30% / 이익 +50%" },
    { key: "turnaround", label: "흑자전환", value: dashboard.stats.turnarounds, note: "영업이익 기준" },
    { key: "ownership", label: "지분 변화", value: dashboard.stats.ownershipChanges, note: "임원·주요주주·5% 보고" },
  ];

  const detectedItems: DiscoveryDetectedItem[] = dashboard.items.map((item) => ({
    id: item.id,
    type: item.type,
    company: item.company,
    stockCode: item.stockCode,
    title: item.title,
    summary: item.summary,
    metricLabel: item.metricLabel,
    metricValue: item.metricValue,
    filingDate: item.filingDate,
    sourceUrl: item.sourceUrl,
  }));

  const usItems = feed.us.items;
  const usImportant = usItems.filter((item) => item.importance >= 70);
  const usOwnership = usItems.filter((item) => item.category === "ownership");
  const usDetectedItems: DiscoveryDetectedItem[] = usDashboard.items.map((item) => ({
    id: item.id,
    type: item.type,
    company: item.company,
    stockCode: item.stockCode,
    title: item.title,
    summary: item.summary,
    metricLabel: item.metricLabel,
    metricValue: item.metricValue,
    filingDate: item.filingDate,
    sourceUrl: item.sourceUrl,
  }));

  const usStats: DiscoveryStatItem[] = [
    { key: "usImportant", label: "중요 공시", value: usDashboard.stats.importantFilings, note: "전체 중요도 70+" },
    { key: "usContract", label: "중요 계약", value: usDashboard.stats.majorContracts, note: "8-K Item 1.01 등" },
    { key: "usShareholder", label: "주주환원", value: usDashboard.stats.shareholderReturns, note: "배당·자사주 매입" },
    { key: "usEarnings", label: "실적 급증", value: usDashboard.stats.earningsSurge, note: "매출 +30% / 이익 +50%" },
    { key: "usTurnaround", label: "흑자전환", value: usDashboard.stats.turnarounds, note: "영업이익 기준" },
    { key: "usOwnership", label: "지분 변화", value: usDashboard.stats.ownershipChanges, note: "13D·13G 보고" },
  ];

  const koreaPanel: InvestmentDiscoveryPanel = {
    market: "kr",
    tabLabel: "🇰🇷 국내 DART",
    tabNote: "한국 상장사 공시",
    description:
      "최근 완료 영업일 공시에서 투자자가 다시 확인할 만한 숫자 변화를 규칙 기반으로 골라냅니다. 주가 전망이 아니라 공시된 사실과 계산값을 보여줍니다.",
    detailHref: "/data/disclosures?market=kr",
    detailLabel: "국내 전체 공시 보기",
    badges: [
      `기준 ${formatDate(dashboard.sourceDate)}`,
      `실적 후보 ${dashboard.analyzed.earningsCandidates}건만 분석`,
      `지분 후보 ${dashboard.analyzed.ownershipCandidates}건만 분석`,
    ],
    stats: koreaStats,
    companyLists: {
      important: groupCompanies(importantItems),
      supply: groupCompanies(supplyItems),
      shareholder: groupCompanies(shareholderItems),
    },
    detectedItems,
    sourceLabel: "DART",
    idleTitle: "이번 기준일에는 설정한 탐지 조건을 통과한 기업이 없습니다.",
    idleHint: "위 숫자 카드를 누르면 중요 공시·공급계약·주주환원에 포함된 회사는 따로 확인할 수 있습니다.",
    available: dashboard.configured && feed.korea.configured,
    error: feed.korea.error,
    footnote: dashboard.costNote,
  };

  const usPanel: InvestmentDiscoveryPanel = {
    market: "us",
    tabLabel: "🇺🇸 미국 SEC",
    tabNote: "미국 상장사 EDGAR 공시",
    description:
      "최근 완료 미국 영업일 SEC 공시에서 투자자가 다시 확인할 만한 실적·계약·주주환원·지분 변화를 규칙 기반으로 골라냅니다. 주가 전망이 아니라 SEC에 제출된 사실과 계산값을 보여줍니다.",
    detailHref: "/data/disclosures?market=us",
    detailLabel: "미국 전체 공시 보기",
    badges: [
      `기준 ${formatDate(usDashboard.sourceDate)}`,
      `실적 후보 ${usDashboard.analyzed.earningsCandidates}건만 분석`,
      `이벤트 후보 ${usDashboard.analyzed.eventCandidates}건만 분석`,
    ],
    stats: usStats,
    companyLists: {
      usImportant: groupCompanies(usImportant, "en"),
      usOwnership: groupCompanies(usOwnership, "en"),
    },
    detectedItems: usDetectedItems,
    sourceLabel: "SEC",
    idleTitle: "이번 기준일에는 설정한 미국 탐지 조건을 통과한 기업이 없습니다.",
    idleHint: "위 숫자 카드를 누르면 중요 공시와 13D·13G 지분 변화 기업은 따로 확인할 수 있습니다.",
    available: usDashboard.configured && feed.us.configured && !usDashboard.error,
    error: usDashboard.error,
    footnote: usDashboard.costNote,
  };

  return <InvestmentDiscoveryMarketTabs korea={koreaPanel} us={usPanel} />;
}
