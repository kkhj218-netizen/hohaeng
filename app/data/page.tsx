import type { Metadata } from "next";
import Link from "next/link";

import {
  changeTone,
  firstChange,
  formatChange,
  formatMetricValue,
  formatObservedDate,
  getPublicMarketDashboard,
} from "@/app/lib/publicMarket";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "투자 데이터 | 호행처럼",
  description:
    "주식시장, 변동성, 금리·채권, 유동성, 물가, 고용, 경기, 원자재, 환율 등 공식 데이터 기반 투자 지표를 한곳에서 확인합니다.",
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
            HOHAENG DATA
          </p>
          <div className="mt-2 flex flex-wrap items-end justify-between gap-4">
            <div>
              <h1 className="text-3xl font-black tracking-tight sm:text-4xl">
                투자 데이터
              </h1>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600">
                실시간 매매 시세가 아니라 FRED 등 공식 원천의 최근 관측값과
                변화·추세를 정리한 투자 데이터 허브입니다. 각 지표를 누르면
                관측일, 변화 구간, 다음 발표일과 출처를 확인할 수 있습니다.
              </p>
            </div>

            <div className="flex gap-2">
              <Link
                href="/today"
                className="rounded-full bg-slate-950 px-4 py-2 text-sm font-bold text-white hover:bg-slate-800"
              >
                TODAY →
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
                총 {dashboard.coverage.totalSeries}개 지표
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
        {!dashboard ? (
          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-xl font-black">데이터를 불러올 수 없습니다.</h2>
            <p className="mt-2 text-sm leading-6 text-slate-500">
              JH 데이터팩 연결 상태를 확인해주세요. 기존 블로그와 계산기 기능에는
              영향을 주지 않습니다.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {dashboard.categoryOrder.map((category, categoryIndex) => {
              const metrics = dashboard.metrics.filter(
                (metric) => metric.category === category,
              );

              return (
                <details
                  key={category}
                  open={categoryIndex < 4}
                  className="group rounded-3xl border border-slate-200 bg-white shadow-sm"
                >
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-4 px-5 py-5 sm:px-6">
                    <div>
                      <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
                        {category}
                      </p>
                      <h2 className="mt-1 text-xl font-black">
                        {dashboard.categoryLabels[category] ?? category}
                      </h2>
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
                              <p className="truncate font-bold text-slate-900">
                                {metric.nameKo}
                              </p>
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
                  </div>
                </details>
              );
            })}
          </div>
        )}

        <section className="mt-7 rounded-3xl bg-slate-950 p-6 text-white">
          <h2 className="text-xl font-black">데이터를 글과 같이 보는 이유</h2>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-300">
            숫자만 보면 시장 맥락을 놓치기 쉽습니다. 호행처럼은 데이터 상세
            페이지에서 시황 및 시장 글, 투자 데이터 글로 이어지도록 구성해
            “무슨 숫자인가 → 지금 어떻게 변했나 → 시장에서는 어떻게 볼까”를
            함께 확인할 수 있게 확장합니다.
          </p>
          <div className="mt-5 flex flex-wrap gap-2">
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
