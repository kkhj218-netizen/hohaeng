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

function uniqueCompanyCount(items: DisclosureItem[]) {
  return new Set(items.map((item) => item.ticker || item.company)).size;
}

export default async function InvestmentDiscoveries() {
  // 국내 탐지 대시보드가 내부에서 공시 피드를 먼저 사용하므로 완료 후 공통 피드를 읽는다.
  // 같은 요청 안에서 OpenDART 수집이 불필요하게 중복되는 상황을 피한다.
  const dashboard = await getInvestmentDiscoveryDashboard();
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
  const usEarnings = usItems.filter((item) => item.category === "earnings");
  const usMajor = usItems.filter((item) => item.category === "major");
  const usCapital = usItems.filter((item) => item.category === "capital");
  const usOwnership = usItems.filter((item) => item.category === "ownership");
  const usProxy = usItems.filter((item) => item.category === "proxy");

  const usStats: DiscoveryStatItem[] = [
    { key: "usImportant", label: "핵심 공시", value: usImportant.length, note: "중요도 70+" },
    { key: "usEarnings", label: "실적·정기", value: usEarnings.length, note: "10-Q·10-K·20-F" },
    { key: "usMajor", label: "주요 이벤트", value: usMajor.length, note: "8-K·6-K" },
    { key: "usCapital", label: "자금조달", value: usCapital.length, note: "S-1·S-3·424B" },
    { key: "usOwnership", label: "지분 변화", value: usOwnership.length, note: "13D·13G" },
    { key: "usProxy", label: "주주총회", value: usProxy.length, note: "DEF 14A" },
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
      "최근 완료 미국 영업일 SEC 공시에서 10-Q·10-K·8-K·6-K·증권신고·대량보유 보고를 유형별로 정리합니다. 주가 전망이 아니라 SEC에 실제 제출된 공시 사실을 보여줍니다.",
    detailHref: "/data/disclosures?market=us",
    detailLabel: "미국 전체 공시 보기",
    badges: [
      `기준 ${formatDate(feed.us.sourceDate)}`,
      `SEC 공시 ${usItems.length}건`,
      `기업 ${uniqueCompanyCount(usItems)}곳`,
    ],
    stats: usStats,
    companyLists: {
      usImportant: groupCompanies(usImportant, "en"),
      usEarnings: groupCompanies(usEarnings, "en"),
      usMajor: groupCompanies(usMajor, "en"),
      usCapital: groupCompanies(usCapital, "en"),
      usOwnership: groupCompanies(usOwnership, "en"),
      usProxy: groupCompanies(usProxy, "en"),
    },
    detectedItems: [],
    sourceLabel: "SEC",
    idleTitle: "미국 SEC 공시는 유형별로 정리했습니다.",
    idleHint: "위 숫자 카드를 누르면 해당 공시를 제출한 기업과 SEC 원문을 바로 확인할 수 있습니다.",
    available: feed.us.configured && !feed.us.error,
    error: feed.us.error,
    footnote:
      "SEC EDGAR 공개 공시를 완료 영업일 기준으로 수집합니다. 10-Q·10-K·20-F·40-F·8-K·6-K·증권신고·13D/13G·DEF 14A처럼 투자자가 다시 확인할 만한 양식만 정리합니다.",
  };

  return <InvestmentDiscoveryMarketTabs korea={koreaPanel} us={usPanel} />;
}
