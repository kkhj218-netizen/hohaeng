import Link from "next/link";

import InvestmentDiscoveryExplorer, {
  type DiscoveryCompanyGroup,
  type DiscoveryDetectedItem,
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

function groupCompanies(items: DisclosureItem[]): DiscoveryCompanyGroup[] {
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
    return left.company.localeCompare(right.company, "ko");
  });
}

export default async function InvestmentDiscoveries() {
  const [dashboard, feed] = await Promise.all([
    getInvestmentDiscoveryDashboard(),
    getDailyDisclosureFeed(),
  ]);

  if (!dashboard.configured) {
    return (
      <section className="rounded-3xl border border-blue-200 bg-blue-50 p-5 sm:p-6">
        <p className="text-xs font-black uppercase tracking-[0.16em] text-blue-700">COMPANY DISCOVERY</p>
        <h2 className="mt-2 text-xl font-black text-blue-950">기업 변화 탐지</h2>
        <p className="mt-2 text-sm leading-6 text-blue-700">
          OpenDART 연결 상태를 확인하고 있습니다. 연결이 완료되면 최근 완료 영업일 공시에서 실적 급증, 흑자전환,
          공급계약, 주주환원, 임원·주요주주 지분변화를 분석합니다.
        </p>
      </section>
    );
  }

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

  const stats = [
    { key: "important", label: "중요 공시", value: dashboard.stats.importantFilings, note: "전체 중요도 70+" },
    { key: "supply", label: "공급계약", value: dashboard.stats.supplyContracts, note: "단일판매·공급계약" },
    { key: "shareholder", label: "주주환원", value: dashboard.stats.shareholderReturns, note: "자사주·소각·배당" },
    { key: "earnings", label: "실적 급증", value: dashboard.stats.earningsSurge, note: "매출 +30% / 이익 +50%" },
    { key: "turnaround", label: "흑자전환", value: dashboard.stats.turnarounds, note: "영업이익 기준" },
    { key: "ownership", label: "지분 변화", value: dashboard.stats.ownershipChanges, note: "임원·주요주주·5% 보고" },
  ] as const;

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

  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.16em] text-blue-600">TODAY&apos;S DISCOVERIES</p>
          <h2 className="mt-2 text-2xl font-black tracking-tight">오늘 발견된 투자 데이터</h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
            최근 완료 영업일 공시에서 투자자가 다시 확인할 만한 숫자 변화를 규칙 기반으로 골라냅니다.
            주가 전망이 아니라 공시된 사실과 계산값을 보여줍니다.
          </p>
        </div>
        <Link
          href="/data/disclosures?market=kr"
          className="rounded-full bg-slate-950 px-4 py-2 text-sm font-black text-white hover:bg-slate-800"
        >
          전체 공시 보기 →
        </Link>
      </div>

      <div className="mt-5 flex flex-wrap items-center gap-2 text-[10px] font-bold text-slate-400">
        <span className="rounded-full bg-slate-100 px-2.5 py-1">기준 {formatDate(dashboard.sourceDate)}</span>
        <span className="rounded-full bg-slate-100 px-2.5 py-1">
          실적 후보 {dashboard.analyzed.earningsCandidates}건만 분석
        </span>
        <span className="rounded-full bg-slate-100 px-2.5 py-1">
          지분 후보 {dashboard.analyzed.ownershipCandidates}건만 분석
        </span>
      </div>

      <InvestmentDiscoveryExplorer
        stats={stats.map((item) => ({ ...item }))}
        companyLists={{
          important: groupCompanies(importantItems),
          supply: groupCompanies(supplyItems),
          shareholder: groupCompanies(shareholderItems),
        }}
        detectedItems={detectedItems}
      />

      <div className="mt-5 rounded-2xl border border-blue-100 bg-blue-50 px-4 py-3">
        <p className="text-[11px] font-black text-blue-800">운영 보호장치</p>
        <p className="mt-1 text-[10px] leading-5 text-blue-700">{dashboard.costNote}</p>
      </div>
    </section>
  );
}
