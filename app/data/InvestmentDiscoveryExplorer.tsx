"use client";

import { useMemo, useState } from "react";

type DiscoveryKey =
  | "important"
  | "supply"
  | "shareholder"
  | "earnings"
  | "turnaround"
  | "ownership";

type StatItem = {
  key: DiscoveryKey;
  label: string;
  value: number;
  note: string;
};

export type DiscoveryCompanyGroup = {
  id: string;
  company: string;
  stockCode: string | null;
  filingCount: number;
  latestTitle: string;
  filingDate: string;
  sourceUrl: string;
};

export type DiscoveryDetectedItem = {
  id: string;
  type:
    | "earnings-growth"
    | "turnaround"
    | "insider-increase"
    | "insider-decrease"
    | "major-holder-change";
  company: string;
  stockCode: string;
  title: string;
  summary: string;
  metricLabel: string;
  metricValue: string;
  filingDate: string;
  sourceUrl: string;
};

type Props = {
  stats: StatItem[];
  companyLists: {
    important: DiscoveryCompanyGroup[];
    supply: DiscoveryCompanyGroup[];
    shareholder: DiscoveryCompanyGroup[];
  };
  detectedItems: DiscoveryDetectedItem[];
};

const INITIAL_VISIBLE = 30;

function formatDate(value: string) {
  return value ? value.replaceAll("-", ".") : "확인 중";
}

function detectedTypeLabel(type: DiscoveryDetectedItem["type"]) {
  if (type === "turnaround") return "흑자전환";
  if (type === "earnings-growth") return "실적 급증";
  if (type === "insider-increase") return "보유 증가";
  if (type === "insider-decrease") return "보유 감소";
  return "대량보유 변화";
}

function detectedTypeTone(type: DiscoveryDetectedItem["type"]) {
  if (type === "turnaround") return "border-emerald-200 bg-emerald-50 text-emerald-700";
  if (type === "earnings-growth") return "border-blue-200 bg-blue-50 text-blue-700";
  if (type === "insider-increase") return "border-cyan-200 bg-cyan-50 text-cyan-700";
  if (type === "insider-decrease") return "border-amber-200 bg-amber-50 text-amber-700";
  return "border-violet-200 bg-violet-50 text-violet-700";
}

function CompanyRow({ item }: { item: DiscoveryCompanyGroup }) {
  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-baseline gap-2">
            <h4 className="text-base font-black text-slate-950">{item.company}</h4>
            {item.stockCode && (
              <span className="text-xs font-black text-blue-600">{item.stockCode}</span>
            )}
          </div>
          <p className="mt-1 line-clamp-2 text-xs font-bold leading-5 text-slate-600">
            {item.latestTitle}
          </p>
        </div>
        {item.filingCount > 1 && (
          <span className="shrink-0 rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-black text-slate-500">
            {item.filingCount}건
          </span>
        )}
      </div>
      <div className="mt-3 flex items-center justify-between border-t border-slate-100 pt-3">
        <span className="text-[10px] font-bold text-slate-400">{formatDate(item.filingDate)}</span>
        <a
          href={item.sourceUrl}
          target="_blank"
          rel="noreferrer"
          className="text-xs font-black text-blue-600 hover:text-blue-500"
        >
          최근 DART 원문 →
        </a>
      </div>
    </article>
  );
}

function DetectedRow({ item }: { item: DiscoveryDetectedItem }) {
  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <span className={`rounded-full border px-2 py-0.5 text-[9px] font-black ${detectedTypeTone(item.type)}`}>
            {detectedTypeLabel(item.type)}
          </span>
          <div className="mt-2 flex flex-wrap items-baseline gap-2">
            <h4 className="text-base font-black text-slate-950">{item.company}</h4>
            <span className="text-xs font-black text-blue-600">{item.stockCode}</span>
          </div>
          <p className="mt-1 text-xs font-bold leading-5 text-slate-600">{item.summary}</p>
        </div>
        <div className="shrink-0 text-right">
          <p className="text-[9px] font-bold text-slate-400">{item.metricLabel}</p>
          <p className="mt-1 text-sm font-black tabular-nums text-slate-950">{item.metricValue}</p>
        </div>
      </div>
      <div className="mt-3 flex items-center justify-between border-t border-slate-100 pt-3">
        <span className="text-[10px] font-bold text-slate-400">{formatDate(item.filingDate)}</span>
        <a
          href={item.sourceUrl}
          target="_blank"
          rel="noreferrer"
          className="text-xs font-black text-blue-600 hover:text-blue-500"
        >
          DART 원문 →
        </a>
      </div>
    </article>
  );
}

export default function InvestmentDiscoveryExplorer({ stats, companyLists, detectedItems }: Props) {
  const [selected, setSelected] = useState<DiscoveryKey | null>(null);
  const [showAll, setShowAll] = useState(false);

  const selectedStat = stats.find((item) => item.key === selected) ?? null;

  const selectedCompanies = useMemo(() => {
    if (selected === "important") return companyLists.important;
    if (selected === "supply") return companyLists.supply;
    if (selected === "shareholder") return companyLists.shareholder;
    return [];
  }, [companyLists, selected]);

  const selectedDetected = useMemo(() => {
    if (selected === "earnings") {
      return detectedItems.filter((item) => item.type === "earnings-growth");
    }
    if (selected === "turnaround") {
      return detectedItems.filter((item) => item.type === "turnaround");
    }
    if (selected === "ownership") {
      return detectedItems.filter((item) =>
        ["insider-increase", "insider-decrease", "major-holder-change"].includes(item.type),
      );
    }
    return [];
  }, [detectedItems, selected]);

  const select = (key: DiscoveryKey) => {
    setSelected((current) => (current === key ? null : key));
    setShowAll(false);
    window.setTimeout(() => {
      document.getElementById("discovery-company-results")?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    }, 0);
  };

  const visibleCompanies = showAll
    ? selectedCompanies
    : selectedCompanies.slice(0, INITIAL_VISIBLE);

  return (
    <>
      <div className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
        {stats.map((stat) => {
          const active = selected === stat.key;
          return (
            <button
              key={stat.key}
              type="button"
              onClick={() => select(stat.key)}
              aria-pressed={active}
              className={`rounded-2xl border p-3.5 text-left transition ${
                active
                  ? "border-blue-500 bg-blue-50 shadow-sm ring-1 ring-blue-100"
                  : "border-slate-100 bg-slate-50 hover:border-blue-200 hover:bg-white"
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <p className={`text-[10px] font-black ${active ? "text-blue-600" : "text-slate-400"}`}>
                  {stat.label}
                </p>
                <span className={`text-xs font-black ${active ? "text-blue-600" : "text-slate-300"}`}>
                  {active ? "▲" : "›"}
                </span>
              </div>
              <p className="mt-1 text-2xl font-black tabular-nums text-slate-950">{stat.value}</p>
              <p className="mt-1 text-[9px] leading-4 text-slate-400">{stat.note}</p>
            </button>
          );
        })}
      </div>

      <div id="discovery-company-results" className="scroll-mt-24">
        {selected && selectedStat ? (
          <section className="mt-5 rounded-2xl border border-blue-100 bg-blue-50/40 p-3 sm:p-4">
            <div className="flex flex-wrap items-end justify-between gap-3 px-1 pb-3">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.14em] text-blue-600">
                  SELECTED DATA
                </p>
                <h3 className="mt-1 text-lg font-black text-slate-950">
                  {selectedStat.label}에 포함된 회사
                </h3>
                <p className="mt-1 text-xs leading-5 text-slate-500">
                  {selectedCompanies.length > 0
                    ? `공시 ${selectedStat.value}건을 회사별로 묶으면 ${selectedCompanies.length}곳입니다.`
                    : `${selectedStat.value}건의 탐지 결과에 해당하는 회사를 보여줍니다.`}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelected(null)}
                className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-[11px] font-black text-slate-500"
              >
                닫기 ×
              </button>
            </div>

            {selectedCompanies.length > 0 ? (
              <>
                <div className="grid gap-2 md:grid-cols-2">
                  {visibleCompanies.map((item) => (
                    <CompanyRow key={item.id} item={item} />
                  ))}
                </div>
                {selectedCompanies.length > INITIAL_VISIBLE && (
                  <div className="mt-3 text-center">
                    <button
                      type="button"
                      onClick={() => setShowAll((value) => !value)}
                      className="rounded-full border border-blue-200 bg-white px-4 py-2 text-xs font-black text-blue-600"
                    >
                      {showAll
                        ? "30곳만 보기"
                        : `전체 ${selectedCompanies.length}곳 보기`}
                    </button>
                  </div>
                )}
              </>
            ) : selectedDetected.length > 0 ? (
              <div className="grid gap-2 md:grid-cols-2">
                {selectedDetected.map((item) => (
                  <DetectedRow key={item.id} item={item} />
                ))}
              </div>
            ) : (
              <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-5 text-center">
                <p className="text-sm font-black text-slate-700">이번 기준일에는 해당 기업이 없습니다.</p>
              </div>
            )}
          </section>
        ) : detectedItems.length > 0 ? (
          <div className="mt-5 grid gap-3 md:grid-cols-2">
            {detectedItems.map((item) => (
              <DetectedRow key={item.id} item={item} />
            ))}
          </div>
        ) : (
          <div className="mt-5 rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-6 text-center">
            <p className="text-sm font-black text-slate-700">이번 기준일에는 설정한 탐지 조건을 통과한 기업이 없습니다.</p>
            <p className="mt-1 text-xs text-slate-400">
              위 숫자 카드를 누르면 중요 공시·공급계약·주주환원에 포함된 회사는 따로 확인할 수 있습니다.
            </p>
          </div>
        )}
      </div>
    </>
  );
}
