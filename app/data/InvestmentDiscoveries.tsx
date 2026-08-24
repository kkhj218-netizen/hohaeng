import Link from "next/link";

import {
  getInvestmentDiscoveryDashboard,
  type InvestmentDiscovery,
  type InvestmentDiscoveryType,
} from "@/app/lib/dartInvestmentDiscoveries";

function typeLabel(type: InvestmentDiscoveryType) {
  if (type === "turnaround") return "흑자전환";
  if (type === "earnings-growth") return "실적 급증";
  if (type === "insider-increase") return "보유 증가";
  if (type === "insider-decrease") return "보유 감소";
  return "대량보유 변화";
}

function typeTone(type: InvestmentDiscoveryType) {
  if (type === "turnaround") return "border-emerald-200 bg-emerald-50 text-emerald-700";
  if (type === "earnings-growth") return "border-blue-200 bg-blue-50 text-blue-700";
  if (type === "insider-increase") return "border-cyan-200 bg-cyan-50 text-cyan-700";
  if (type === "insider-decrease") return "border-amber-200 bg-amber-50 text-amber-700";
  return "border-violet-200 bg-violet-50 text-violet-700";
}

function formatDate(value: string | null) {
  return value ? value.replaceAll("-", ".") : "확인 중";
}

function DiscoveryCard({ item }: { item: InvestmentDiscovery }) {
  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition hover:border-blue-200 sm:p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className={`rounded-full border px-2 py-0.5 text-[9px] font-black ${typeTone(item.type)}`}>
              {typeLabel(item.type)}
            </span>
            <span className="rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-[9px] font-black text-slate-500">
              DART
            </span>
          </div>
          <div className="mt-3 flex flex-wrap items-baseline gap-x-2 gap-y-1">
            <h3 className="text-base font-black text-slate-950 sm:text-lg">{item.company}</h3>
            <span className="text-xs font-black text-blue-600">{item.stockCode}</span>
          </div>
          <p className="mt-1 text-sm font-bold text-slate-700">{item.title}</p>
        </div>
        <div className="shrink-0 text-right">
          <p className="text-[10px] font-bold text-slate-400">{item.metricLabel}</p>
          <p className="mt-1 text-base font-black tabular-nums text-slate-950">{item.metricValue}</p>
        </div>
      </div>

      <p className="mt-3 text-xs leading-5 text-slate-500">{item.summary}</p>
      <div className="mt-4 flex items-center justify-between gap-3 border-t border-slate-100 pt-3">
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

export default async function InvestmentDiscoveries() {
  const dashboard = await getInvestmentDiscoveryDashboard();

  if (!dashboard.configured) {
    return (
      <section className="rounded-3xl border border-blue-200 bg-blue-50 p-5 sm:p-6">
        <p className="text-xs font-black uppercase tracking-[0.16em] text-blue-700">COMPANY DISCOVERY</p>
        <h2 className="mt-2 text-xl font-black text-blue-950">기업 변화 탐지</h2>
        <p className="mt-2 text-sm leading-6 text-blue-700">
          DART_API_KEY가 연결되면 최근 완료 영업일 공시에서 실적 급증, 흑자전환, 임원·주요주주 지분변화를 제한적으로 분석합니다.
        </p>
      </section>
    );
  }

  const stats = [
    ["중요 공시", dashboard.stats.importantFilings, "전체 중요도 70+"],
    ["공급계약", dashboard.stats.supplyContracts, "단일판매·공급계약"],
    ["주주환원", dashboard.stats.shareholderReturns, "자사주·소각·배당"],
    ["실적 급증", dashboard.stats.earningsSurge, "매출 +30% / 이익 +50%"],
    ["흑자전환", dashboard.stats.turnarounds, "영업이익 기준"],
    ["지분 변화", dashboard.stats.ownershipChanges, "임원·주요주주·5% 보고"],
  ] as const;

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
        <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-emerald-700">
          AI 비용 0원
        </span>
      </div>

      <div className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
        {stats.map(([label, value, note]) => (
          <div key={label} className="rounded-2xl border border-slate-100 bg-slate-50 p-3.5">
            <p className="text-[10px] font-black text-slate-400">{label}</p>
            <p className="mt-1 text-2xl font-black tabular-nums text-slate-950">{value}</p>
            <p className="mt-1 text-[9px] leading-4 text-slate-400">{note}</p>
          </div>
        ))}
      </div>

      {dashboard.items.length > 0 ? (
        <div className="mt-5 grid gap-3 md:grid-cols-2">
          {dashboard.items.map((item) => (
            <DiscoveryCard key={item.id} item={item} />
          ))}
        </div>
      ) : (
        <div className="mt-5 rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-6 text-center">
          <p className="text-sm font-black text-slate-700">이번 기준일에는 설정한 탐지 조건을 통과한 기업이 없습니다.</p>
          <p className="mt-1 text-xs text-slate-400">중요 공시가 없다는 뜻은 아니므로 전체 공시 목록도 함께 확인할 수 있습니다.</p>
        </div>
      )}

      <div className="mt-5 rounded-2xl border border-blue-100 bg-blue-50 px-4 py-3">
        <p className="text-[11px] font-black text-blue-800">무료 운영 보호장치</p>
        <p className="mt-1 text-[10px] leading-5 text-blue-700">{dashboard.costNote}</p>
      </div>
    </section>
  );
}
