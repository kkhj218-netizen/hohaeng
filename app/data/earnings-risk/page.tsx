import type { Metadata } from "next";
import Link from "next/link";

import { getEarningsRiskSnapshot } from "@/app/lib/earningsRisk";
import type { EarningsRiskEvent } from "@/app/lib/earningsRiskTypes";

export const revalidate = 120;

export const metadata: Metadata = {
  title: "대형주 실적 위험 레이더 | NASDAQ100·S&P500 | 호행처럼",
  description:
    "향후 7일 NASDAQ100·S&P500 대형주 실적 발표를 시가총액과 지수 영향도로 선별해 D-7·D-3·D-1 위험 구간을 확인합니다.",
  alternates: { canonical: "/data/earnings-risk" },
};

function dDay(event: EarningsRiskEvent) {
  if (event.daysAway <= 0) return "오늘";
  if (event.daysAway === 1) return "D-1";
  return `D-${event.daysAway}`;
}

function dateLabel(value: string) {
  return new Intl.DateTimeFormat("ko-KR", {
    timeZone: "America/New_York",
    month: "numeric",
    day: "numeric",
    weekday: "short",
  }).format(new Date(`${value}T12:00:00Z`));
}

function formatMarketCap(value: number) {
  if (value >= 1_000_000_000_000) return `$${(value / 1_000_000_000_000).toFixed(2)}T`;
  return `$${(value / 1_000_000_000).toFixed(0)}B`;
}

function levelClass(event: EarningsRiskEvent) {
  if (event.riskLevel === "high") return "border-rose-200 bg-rose-50";
  if (event.riskLevel === "important") return "border-amber-200 bg-amber-50";
  return "border-slate-200 bg-white";
}

export default async function EarningsRiskPage() {
  const snapshot = await getEarningsRiskSnapshot();

  return (
    <main className="min-h-screen bg-[#f6f7f9] pb-20 text-slate-900">
      <section className="border-b border-slate-800 bg-slate-950 text-white">
        <div className="mx-auto max-w-5xl px-4 py-9 sm:px-6 sm:py-11">
          <p className="text-xs font-black uppercase tracking-[0.22em] text-rose-300">HOHAENG EARNINGS RISK RADAR</p>
          <h1 className="mt-2 text-3xl font-black tracking-tight sm:text-4xl">앞으로 7일, 지수를 흔들 수 있는 실적</h1>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-300 sm:text-base">
            모든 실적 일정을 나열하지 않습니다. MARKET MAP의 시가총액과 지수 내 위치를 이용해 NASDAQ100·S&amp;P500 포지션에
            영향을 줄 가능성이 큰 기업만 먼저 보여줍니다.
          </p>
          <div className="mt-5 flex flex-wrap gap-2">
            <Link href="/today" className="rounded-full bg-white px-4 py-2 text-sm font-black text-slate-950">TODAY →</Link>
            <Link href="/data/market-map" className="rounded-full border border-white/20 px-4 py-2 text-sm font-black text-white">MARKET MAP →</Link>
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-5xl space-y-5 px-4 py-6 sm:px-6 sm:py-8">
        {!snapshot ? (
          <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <p className="text-xs font-black uppercase tracking-wider text-rose-600">PREPARING</p>
            <h2 className="mt-2 text-xl font-black">첫 실적 위험 스냅샷을 준비하고 있습니다.</h2>
            <p className="mt-2 text-sm leading-6 text-slate-500">매일 MARKET MAP 수집 뒤 자동으로 향후 7일 대형주 실적을 갱신합니다.</p>
          </section>
        ) : (
          <>
            <section className="grid grid-cols-3 gap-2">
              <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                <p className="text-[10px] font-bold text-slate-400">7일 내 주요 실적</p>
                <p className="mt-1 text-2xl font-black">{snapshot.events.length}</p>
              </div>
              <div className="rounded-2xl border border-rose-100 bg-rose-50 p-4 shadow-sm">
                <p className="text-[10px] font-bold text-rose-400">HIGH RISK</p>
                <p className="mt-1 text-2xl font-black text-rose-700">{snapshot.highRiskCount}</p>
              </div>
              <div className="rounded-2xl border border-amber-100 bg-amber-50 p-4 shadow-sm">
                <p className="text-[10px] font-bold text-amber-500">IMPORTANT</p>
                <p className="mt-1 text-2xl font-black text-amber-700">{snapshot.importantCount}</p>
              </div>
            </section>

            <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
              <div className="flex items-end justify-between gap-3">
                <div>
                  <p className="text-xs font-black uppercase tracking-wider text-rose-600">UPCOMING 7 DAYS</p>
                  <h2 className="mt-1 text-xl font-black">대형주 실적 경고</h2>
                </div>
                <p className="text-right text-[10px] font-bold text-slate-400">기준 {snapshot.asOfDate}</p>
              </div>

              {snapshot.events.length === 0 ? (
                <p className="mt-5 rounded-2xl bg-slate-50 p-4 text-sm text-slate-500">향후 7일 내 선별 기준을 넘는 대형주 실적이 없습니다.</p>
              ) : (
                <div className="mt-5 space-y-3">
                  {snapshot.events.map((event) => (
                    <article key={`${event.reportDate}-${event.symbol}`} className={`rounded-2xl border p-4 ${levelClass(event)}`}>
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="rounded-full bg-slate-950 px-2.5 py-1 text-[10px] font-black text-white">{dDay(event)}</span>
                            <strong className="text-lg font-black text-slate-950">{event.symbol}</strong>
                            <span className="rounded-full bg-white/70 px-2 py-0.5 text-[10px] font-black text-slate-500">{event.confidenceLabel}</span>
                          </div>
                          <p className="mt-1 text-sm font-bold text-slate-700">{event.name}</p>
                          <p className="mt-1 text-xs font-semibold text-slate-500">{dateLabel(event.reportDate)} · {event.sessionLabel} · {event.sector}</p>
                        </div>
                        <div className="shrink-0 text-right">
                          <p className="text-2xl font-black text-rose-600">{event.impactScore}</p>
                          <p className="text-[10px] font-black text-slate-500">지수 영향도 · {event.impactLabel}</p>
                        </div>
                      </div>

                      <div className="mt-3 flex flex-wrap gap-2 text-[10px] font-bold text-slate-500">
                        <span className="rounded-full bg-white/80 px-2.5 py-1">시총 {formatMarketCap(event.marketCap)}</span>
                        {event.indices.map((index) => (
                          <span key={index.indexKey} className="rounded-full bg-white/80 px-2.5 py-1">
                            {index.indexName} 시총순위 #{index.rank} · 시총비중 {index.marketCapShare.toFixed(2)}%
                          </span>
                        ))}
                      </div>
                    </article>
                  ))}
                </div>
              )}
            </section>

            <section className="rounded-3xl bg-slate-950 p-5 text-white sm:p-6">
              <p className="text-xs font-black uppercase tracking-wider text-amber-300">HOW TO USE</p>
              <h2 className="mt-1 text-xl font-black">방향을 맞히는 기능이 아니라, 진입 전에 확인하는 경고판</h2>
              <p className="mt-3 text-sm leading-6 text-slate-300">
                D-1·당일에 영향도 높은 대형주가 있으면 신규 지수 포지션의 이벤트 리스크를 한 번 더 확인하는 용도입니다.
                점수는 시가총액·지수 내 순위·시총 비중을 합친 휴리스틱이며 상승·하락 확률을 뜻하지 않습니다.
              </p>
              <p className="mt-3 text-xs leading-5 text-slate-400">{snapshot.sourceNote}</p>
            </section>
          </>
        )}
      </div>
    </main>
  );
}
