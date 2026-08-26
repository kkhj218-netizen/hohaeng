import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";

import GlobalPolicyRatesSection, { GlobalPolicyRatesSkeleton } from "@/app/data/GlobalPolicyRatesSection";
import InvestmentDiscoveries from "@/app/data/InvestmentDiscoveries";
import MarketDataSection from "@/app/data/MarketDataSection";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "투자 데이터 | 시장국면·공시·EVENT DB·거시 데이터 | 호행처럼",
  description:
    "현재 시장국면, 기업 공시·실적 변화, CPI·PCE·고용·FOMC EVENT DB, 주요국 기준금리와 물가·고용·경기·유동성 장기 데이터를 한곳에서 확인합니다.",
  alternates: {
    canonical: "/data",
  },
};

export default function DataHubPage() {
  return (
    <main className="min-h-screen bg-[#f6f7f9] pb-16 text-slate-900">
      <section className="border-b border-slate-200 bg-white">
        <div className="mx-auto max-w-5xl px-4 py-9 sm:px-6">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-blue-600">
            HOHAENG INVEST DATA
          </p>
          <div className="mt-2 flex flex-wrap items-end justify-between gap-5">
            <div className="max-w-2xl">
              <h1 className="text-3xl font-black tracking-tight sm:text-4xl">투자 데이터</h1>
              <p className="mt-3 text-sm leading-6 text-slate-600">
                처음이라면 오늘 시장부터 확인하세요. 그다음 궁금한 경제지표의 과거 반응이나 기업 공시·실적,
                이번 주 주요 발표 일정으로 더 깊게 들어갈 수 있습니다.
              </p>
            </div>

            <div className="w-full sm:w-auto sm:min-w-[360px]">
              <Link
                href="/today"
                className="group flex w-full items-center justify-between rounded-2xl bg-blue-600 px-5 py-4 text-white shadow-sm transition hover:bg-blue-500"
              >
                <span>
                  <span className="block text-base font-black">오늘 시장 한눈에</span>
                  <span className="mt-0.5 block text-[11px] font-semibold text-blue-100">
                    지수 · 금리 · VIX · 시장환경
                  </span>
                </span>
                <span className="text-xl font-black transition group-hover:translate-x-0.5">→</span>
              </Link>

              <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-3">
                <Link
                  href="/data/events"
                  className="rounded-xl border border-blue-200 bg-blue-50 px-3 py-3 text-center text-xs font-black text-blue-700 transition hover:border-blue-300 hover:bg-blue-100"
                >
                  경제지표 과거반응
                </Link>
                <Link
                  href="/data/disclosures"
                  className="rounded-xl border border-slate-200 bg-white px-3 py-3 text-center text-xs font-black text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
                >
                  기업 공시·실적
                </Link>
                <Link
                  href="/data/calendar"
                  className="col-span-2 rounded-xl border border-slate-200 bg-white px-3 py-3 text-center text-xs font-black text-slate-600 transition hover:border-slate-300 hover:bg-slate-50 sm:col-span-1"
                >
                  이번 주 경제일정
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-5xl px-4 py-7 sm:px-6">
        <section className="mb-7 rounded-3xl bg-slate-950 p-6 text-white shadow-sm sm:p-7">
          <div className="flex flex-wrap items-end justify-between gap-5">
            <div className="max-w-3xl">
              <p className="text-xs font-black uppercase tracking-[0.18em] text-blue-300">HOHAENG MARKET REGIME</p>
              <h2 className="mt-2 text-2xl font-black sm:text-3xl">지금 시장은 어떤 환경인가?</h2>
              <p className="mt-3 text-sm leading-6 text-slate-300">
                Trend·Inflation·Rates·Liquidity·Volatility·Dollar·Growth 7개 축으로 현재 환경을 정리하고,
                2016년 이후 비슷했던 국면과 그 뒤 NQ·RTY·금·WTI·달러·국채선물의 1D·5D·20D 반응을 비교합니다.
              </p>
            </div>
            <Link href="/data/regime" className="rounded-full bg-white px-5 py-2.5 text-sm font-black text-slate-950">
              현재 시장국면 보기 →
            </Link>
          </div>
        </section>

        <Suspense
          fallback={
            <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
              <div className="h-3 w-36 animate-pulse rounded bg-slate-100" />
              <div className="mt-4 h-8 w-64 max-w-full animate-pulse rounded bg-slate-100" />
              <div className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
                {Array.from({ length: 6 }).map((_, index) => (
                  <div key={index} className="h-24 animate-pulse rounded-2xl bg-slate-100" />
                ))}
              </div>
              <p className="mt-4 text-xs font-bold text-slate-400">기업 공시 데이터를 빠르게 불러오는 중입니다.</p>
            </section>
          }
        >
          <InvestmentDiscoveries />
        </Suspense>

        <Suspense fallback={<GlobalPolicyRatesSkeleton />}>
          <GlobalPolicyRatesSection />
        </Suspense>

        <Suspense
          fallback={
            <section className="mt-8">
              <div className="h-3 w-40 animate-pulse rounded bg-slate-200" />
              <div className="mt-3 h-8 w-52 animate-pulse rounded bg-slate-200" />
              <div className="mt-5 space-y-3">
                {Array.from({ length: 3 }).map((_, index) => (
                  <div key={index} className="h-24 animate-pulse rounded-3xl bg-white shadow-sm" />
                ))}
              </div>
            </section>
          }
        >
          <MarketDataSection />
        </Suspense>

        <section className="mt-7 rounded-3xl bg-slate-950 p-6 text-white">
          <h2 className="text-xl font-black">Data → Regime → Analysis → Opinion</h2>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-300">
            원자료를 먼저 확인하고 현재 시장환경을 같은 기준으로 정리한 뒤, EVENT DB의 과거 사례와 연결합니다.
            “왜 시장이 움직였는가” 같은 해석과 개인 판단은 그 다음 단계로 분리합니다.
          </p>
          <div className="mt-5 flex flex-wrap gap-2">
            <Link
              href="/data/regime"
              className="rounded-full bg-blue-600 px-4 py-2 text-sm font-bold text-white hover:bg-blue-500"
            >
              MARKET REGIME →
            </Link>
            <Link
              href="/data/disclosures"
              className="rounded-full bg-white px-4 py-2 text-sm font-bold text-slate-950"
            >
              공시·실적 데이터 →
            </Link>
            <Link
              href="/data/events"
              className="rounded-full bg-slate-800 px-4 py-2 text-sm font-bold text-white hover:bg-slate-700"
            >
              경제지표 EVENT DB →
            </Link>
            <Link
              href="/blog?category=market"
              className="rounded-full border border-white/15 px-4 py-2 text-sm font-bold text-slate-200 hover:bg-white/10"
            >
              시황 및 시장 →
            </Link>
          </div>
        </section>
      </div>
    </main>
  );
}
