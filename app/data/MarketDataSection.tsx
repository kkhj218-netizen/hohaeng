import Link from "next/link";

import MarketDataBadge from "@/app/components/MarketDataBadge";
import type { JhMarketMetric } from "@/app/lib/jhMarketTypes";
import {
  changeTone,
  firstChange,
  formatChange,
  formatMetricValue,
  formatObservedDate,
  getPublicMarketDashboard,
} from "@/app/lib/publicMarket";

type Group = {
  id: string;
  kicker: string;
  title: string;
  description: string;
  categories: string[];
  filter?: (metric: JhMarketMetric) => boolean;
};

const DIRECT_NOMINAL_RATE_SYMBOLS = new Set([
  "DGS1MO",
  "DGS3MO",
  "DGS6MO",
  "DGS1",
  "DGS2",
  "DGS3",
  "DGS5",
  "DGS7",
  "DGS10",
  "DGS20",
  "DGS30",
  "DFF",
  "EFFR",
  "FEDFUNDS",
]);

const GROUPS: Group[] = [
  {
    id: "inflation",
    kicker: "03 · INFLATION",
    title: "물가",
    description: "CPI·Core CPI·PCE 등 통화정책을 움직이는 물가 데이터를 모아봅니다.",
    categories: ["inflation"],
  },
  {
    id: "labor-growth",
    kicker: "04 · LABOR & GROWTH",
    title: "고용·경기",
    description: "고용·실업·산업생산·소매판매·GDP 등 경기 방향을 보여주는 공식 지표입니다.",
    categories: ["labor", "growth"],
  },
  {
    id: "rates-structure",
    kicker: "05 · RATES STRUCTURE",
    title: "금리 구조·신용",
    description: "TODAY의 단순 2년·10년 금리값 대신 장단기 금리차·실질금리·기대인플레이션·신용스프레드를 봅니다.",
    categories: ["rates", "credit"],
    filter: (metric) => !DIRECT_NOMINAL_RATE_SYMBOLS.has(metric.symbol.toUpperCase()),
  },
  {
    id: "liquidity",
    kicker: "06 · LIQUIDITY",
    title: "유동성",
    description: "Fed 대차대조표·M2·유동성 관련 지표를 통해 금융환경의 배경을 확인합니다.",
    categories: ["liquidity"],
  },
  {
    id: "fx-commodities",
    kicker: "07 · LONG-TERM MARKET DATA",
    title: "환율·원자재 장기 데이터",
    description: "TODAY의 장마감 숫자를 반복하지 않고 1년 위치·추세와 함께 환율·원자재의 장기 맥락을 확인합니다.",
    categories: ["fx", "commodities"],
  },
];

function percentileLabel(metric: JhMarketMetric) {
  if (metric.percentile === null) return "1년 위치 —";
  return `1년 위치 ${Math.round(metric.percentile)}%`;
}

function groupMetrics(metrics: JhMarketMetric[], group: Group) {
  return metrics.filter((metric) => {
    if (!group.categories.includes(metric.category)) return false;
    if (metric.currentValue === null) return false;
    return group.filter ? group.filter(metric) : true;
  });
}

function MetricRow({ metric }: { metric: JhMarketMetric }) {
  const change = firstChange(metric);

  return (
    <Link
      href={`/data/${encodeURIComponent(metric.symbol)}`}
      className="grid grid-cols-[1fr_auto] gap-4 rounded-xl px-2 py-4 transition hover:bg-slate-50 sm:grid-cols-[1.25fr_0.75fr_0.65fr]"
    >
      <div className="min-w-0">
        <div className="flex min-w-0 items-center gap-2">
          <p className="truncate font-bold text-slate-900">{metric.nameKo}</p>
          <MarketDataBadge metric={metric} compact />
        </div>
        <p className="mt-1 text-xs text-slate-400">
          {metric.symbol} · {formatObservedDate(metric.observedAt)}
        </p>
      </div>

      <div className="text-right">
        <p className="font-black tabular-nums text-slate-950">{formatMetricValue(metric)}</p>
        <p className="mt-1 text-[10px] font-bold text-blue-600 sm:hidden">{percentileLabel(metric)}</p>
      </div>

      <div className="hidden text-right sm:block">
        <p className="text-xs font-black text-blue-600">{percentileLabel(metric)}</p>
        <p className={`mt-1 text-[10px] font-bold ${changeTone(change)}`}>
          {change?.label ?? "변화"} {formatChange(change)}
        </p>
      </div>
    </Link>
  );
}

export default async function MarketDataSection() {
  const dashboard = await getPublicMarketDashboard();

  return (
    <section className="mt-8">
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.16em] text-slate-400">INVESTMENT DATA LIBRARY</p>
          <h2 className="mt-1 text-2xl font-black">거시·장기 데이터 라이브러리</h2>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-500">
            현물지수·선물·VIX처럼 TODAY에서 이미 보는 값은 제외했습니다. 여기서는 물가·고용·경기·금리구조·유동성과
            장기 환율·원자재 데이터를 다시 찾아볼 수 있게 정리합니다.
          </p>
        </div>
        <Link href="/today" className="text-sm font-black text-blue-600 hover:text-blue-500">
          오늘 시장은 TODAY →
        </Link>
      </div>

      {!dashboard ? (
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-xl font-black">거시 데이터를 불러올 수 없습니다.</h2>
          <p className="mt-2 text-sm leading-6 text-slate-500">
            데이터 원천을 다시 확인 중입니다. 공시·기준금리 섹션과 기존 콘텐츠에는 영향을 주지 않습니다.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {GROUPS.map((group, groupIndex) => {
            const metrics = groupMetrics(dashboard.metrics, group);
            if (metrics.length === 0) return null;

            return (
              <details
                key={group.id}
                open={groupIndex < 2}
                className="group rounded-3xl border border-slate-200 bg-white shadow-sm"
              >
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 px-5 py-5 sm:px-6">
                  <div>
                    <p className="text-xs font-black uppercase tracking-[0.14em] text-blue-600">{group.kicker}</p>
                    <h3 className="mt-1 text-xl font-black text-slate-950">{group.title}</h3>
                    <p className="mt-2 max-w-3xl text-xs leading-5 text-slate-500">{group.description}</p>
                  </div>
                  <div className="flex shrink-0 items-center gap-3">
                    <span className="text-xs font-semibold text-slate-400">{metrics.length}개</span>
                    <span className="text-xl text-slate-400 transition group-open:rotate-180" aria-hidden="true">⌄</span>
                  </div>
                </summary>

                <div className="border-t border-slate-100 px-3 pb-3 sm:px-4 sm:pb-4">
                  <div className="divide-y divide-slate-100">
                    {metrics.map((metric) => (
                      <MetricRow key={metric.symbol} metric={metric} />
                    ))}
                  </div>
                </div>
              </details>
            );
          })}
        </div>
      )}
    </section>
  );
}
