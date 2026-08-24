import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";

import MarketDataBadge from "@/app/components/MarketDataBadge";
import {
  changeTone,
  firstChange,
  formatChange,
  formatMetricValue,
  formatObservedDate,
  getPublicMarketDashboard,
} from "@/app/lib/publicMarket";
import InvestmentDiscoveries from "@/app/data/InvestmentDiscoveries";
import MajorFuturesSection from "@/app/data/MajorFuturesSection";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "투자 데이터 | 기업 공시·실적 변화 분석 | 호행처럼",
  description:
    "DART 공시에서 실적 급증, 흑자전환, 공급계약, 주주환원, 지분변화를 탐지하고 공식 시장·경제 데이터까지 함께 확인합니다.",
  alternates: {
    canonical: "/data",
  },
};

export default async function DataHubPage() {
  const dashboard = await getPublicMarketDashboard();

  return (
    <main className="min-h-screen bg-[#f6f7f9] pb-16 text-slate-900">
      <section className="border-b border-slate-200 bg-white">
        <div className="mx-auto max-w-5xl px-4 py-9 sm:px-6">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-blue-600">
            HOHAENG INVEST DATA
          </p>
          <div className="mt-2 flex flex-wrap items-end justify-between gap-4">
            <div>
              <h1 className="text-3xl font-black tracking-tight sm:text-4xl">
                투자 데이터
              </h1>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600">
                시장 이야기를 반복하기보다 공시와 숫자에서 실제로 달라진 기업을 찾습니다.
                실적 급증·흑자전환·공급계약·주주환원·지분변화를 먼저 보여주고,
                아래에서 공식 거시·시장 데이터도 함께 확인할 수 있습니다.
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <Link
                href="/data/disclosures"
                className="rounded-full bg-slate-950 px-4 py-2 text-sm font-bold text-white hover:bg-slate-800"
              >
                공시 데이터 →
              </Link>
              <Link
                href="/data/calendar"
                className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-bold text-blue-600 hover:border-blue-300"
              >
                발표 일정 →
              </Link>
            </div>
          </div>

          {dashboard && (
            <div className="mt-6 flex flex-wrap gap-2 text-xs text-slate-500">
              <span className="rounded-full bg-slate-100 px-3 py-1.5">
                공식 시장지표 {dashboard.coverage.totalSeries}개
              </span>
              <span className="rounded-full bg-slate-100 px-3 py-1.5">
                데이터 보유 {dashboard.coverage.seriesWithData}개
              </span>
              <span className="rounded-full bg-slate-100 px-3 py-1.5">
                {dashboard.marketStatus}
              </span>
            </div>
          )}
        </div>
      </section>

      <div className="mx-auto max-w-5xl px-4 py-7 sm:px-6">
        <Suspense
          fallback={
            <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <p className="text-sm font-black text-slate-700">기업 변화 데이터를 정리하는 중입니다.</p>
            </section>
          }
        >
          <InvestmentDiscoveries />
        </Suspense>

        <section className="mt-8">
          <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.16em] text-slate-400">MACRO & MARKET DATA</p>
              <h2 className="mt-1 text-2xl font-black">거시·시장 데이터</h2>
              <p className="mt-2 text-sm leading-6 text-slate-500">
                기업 공시 분석과 별도로 금리·변동성·유동성·물가·고용·원자재 등 공식 관측값을 확인합니다.
              </p>
            </div>
            <Link href="/today" className="text-sm font-black text-blue-600 hover:text-blue-500">
              TODAY 시황 →
            </Link>
          </div>

          {!dashboard ? (
            <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="text-xl font-black">시장 데이터를 불러올 수 없습니다.</h2>
              <p className="mt-2 text-sm leading-6 text-slate-500">
                JH 데이터팩 연결 상태를 확인해주세요. 기업 공시 분석과 기존 블로그·계산기 기능에는 영향을 주지 않습니다.
              </p>
            </div>
          ) : (
            <>
              <div className="mb-4 flex flex-wrap items-center gap-x-4 gap-y-2 text-[11px] text-slate-500">
                <span className="font-bold text-slate-600">데이터 상태</span>
                <span className="inline-flex items-center gap-1.5">
                  <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 font-black text-emerald-700">LIVE</span>
                  최근 시장시세
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <span className="rounded-full border border-blue-200 bg-blue-50 px-2 py-0.5 font-black text-blue-700">FRED</span>
                  공식 최신 관측값
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <span className="rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 font-black text-amber-700">발표 대기</span>
                  다음 공식 발표 대기
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <span className="rounded-full border border-rose-200 bg-rose-50 px-2 py-0.5 font-black text-rose-700">확인 필요</span>
                  갱신 상태 확인
                </span>
              </div>

              <div className="space-y-4">
                {dashboard.categoryOrder.map((category, categoryIndex) => {
                  const metrics = dashboard.metrics.filter(
                    (metric) => metric.category === category,
                  );

                  return (
                    <details
                      key={category}
                      open={categoryIndex < 3}
                      className="group rounded-3xl border border-slate-200 bg-white shadow-sm"
                    >
                      <summary className="flex cursor-pointer list-none items-center justify-between gap-4 px-5 py-5 sm:px-6">
                        <div>
                          <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
                            {category}
                          </p>
                          <h3 className="mt-1 text-xl font-black">
                            {dashboard.categoryLabels[category] ?? category}
                          </h3>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="text-xs font-semibold text-slate-400">
                            {metrics.length}개
                          </span>
                          <span
                            className="text-xl text-slate-400 transition group-open:rotate-180"
                            aria-hidden="true"
                          >
                            ⌄
                          </span>
                        </div>
                      </summary>

                      <div className="border-t border-slate-100 px-3 pb-3 sm:px-4 sm:pb-4">
                        <div className="divide-y divide-slate-100">
                          {metrics.map((metric) => {
                            const change = firstChange(metric);
                            return (
                              <Link
                                key={metric.symbol}
                                href={`/data/${encodeURIComponent(metric.symbol)}`}
                                className="grid grid-cols-[1fr_auto] gap-4 rounded-xl px-2 py-4 transition hover:bg-slate-50 sm:grid-cols-[1.3fr_0.7fr_0.5fr]"
                              >
                                <div className="min-w-0">
                                  <div className="flex min-w-0 items-center gap-2">
                                    <p className="truncate font-bold text-slate-900">
                                      {metric.nameKo}
                                    </p>
                                    <MarketDataBadge metric={metric} compact />
                                  </div>
                                  <p className="mt-1 text-xs text-slate-400">
                                    {metric.symbol} · {formatObservedDate(metric.observedAt)}
                                  </p>
                                </div>
                                <div className="text-right">
                                  <p className="font-black tabular-nums text-slate-950">
                                    {formatMetricValue(metric)}
                                  </p>
                                  <p
                                    className={`mt-1 text-xs font-bold sm:hidden ${changeTone(change)}`}
                                  >
                                    {change?.label ?? "변화"} {formatChange(change)}
                                  </p>
                                </div>
                                <div className="hidden text-right sm:block">
                                  <p className={`font-black ${changeTone(change)}`}>
                                    {formatChange(change)}
                                  </p>
                                  <p className="mt-1 text-xs text-slate-400">
                                    {change?.label ?? "변화"}
                                  </p>
                                </div>
                              </Link>
                            );
                          })}
                        </div>

                        {category === "equities" && (
                          <Suspense
                            fallback={
                              <div className="mt-3 rounded-2xl bg-slate-50 p-4 text-xs font-bold text-slate-400">
                                주요 선물 장마감 데이터를 불러오는 중입니다.
                              </div>
                            }
                          >
                            <MajorFuturesSection />
                          </Suspense>
                        )}
                      </div>
                    </details>
                  );
                })}
              </div>
            </>
          )}
        </section>

        <section className="mt-7 rounded-3xl bg-slate-950 p-6 text-white">
          <h2 className="text-xl font-black">데이터와 시황을 분리해서 봅니다.</h2>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-300">
            투자 데이터에서는 공시·실적·지분의 객관적인 변화와 계산값을 먼저 확인하고,
            “왜 시장이 움직였는가” 같은 해석은 시황 및 시장 콘텐츠에서 별도로 다룹니다.
          </p>
          <div className="mt-5 flex flex-wrap gap-2">
            <Link
              href="/data/disclosures"
              className="rounded-full bg-white px-4 py-2 text-sm font-bold text-slate-950"
            >
              공시·실적 데이터 →
            </Link>
            <Link
              href="/blog?category=market"
              className="rounded-full bg-blue-600 px-4 py-2 text-sm font-bold hover:bg-blue-500"
            >
              시황 및 시장 →
            </Link>
            <Link
              href="/blog?category=investment-data"
              className="rounded-full border border-white/15 px-4 py-2 text-sm font-bold text-slate-200 hover:bg-white/10"
            >
              투자 데이터 글 →
            </Link>
          </div>
        </section>
      </div>
    </main>
  );
}
