import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";

import GlobalPolicyRatesSection, { GlobalPolicyRatesSkeleton } from "@/app/data/GlobalPolicyRatesSection";
import InvestmentDiscoveries from "@/app/data/InvestmentDiscoveries";
import MarketDataSection from "@/app/data/MarketDataSection";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "투자 데이터 | 공시·EVENT DB·글로벌 기준금리·거시 데이터 | 호행처럼",
  description:
    "기업 공시·실적 변화, CPI·PCE EVENT DB와 시장 반응, 주요국 기준금리 추이, 물가·고용·경기·금리구조·유동성·환율·원자재 장기 데이터를 한곳에서 확인합니다.",
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
          <div className="mt-2 flex flex-wrap items-end justify-between gap-4">
            <div>
              <h1 className="text-3xl font-black tracking-tight sm:text-4xl">투자 데이터</h1>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600">
                TODAY의 현물·선물 마감 숫자를 반복하지 않습니다. 먼저 기업 공시에서 실제로 달라진 사실을 찾고,
                그 아래에서 CPI·PCE EVENT DB와 글로벌 기준금리, 물가·고용·경기·금리구조·유동성 등 투자 판단의 원자료를 확인합니다.
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
                href="/data/events"
                className="rounded-full bg-blue-600 px-4 py-2 text-sm font-bold text-white hover:bg-blue-500"
              >
                EVENT DB →
              </Link>
              <Link
                href="/data/calendar"
                className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-bold text-blue-600 hover:border-blue-300"
              >
                발표 일정 →
              </Link>
            </div>
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-5xl px-4 py-7 sm:px-6">
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
          <h2 className="text-xl font-black">Data → Analysis → Opinion</h2>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-300">
            투자 데이터에서는 공시와 공식 숫자를 먼저 확인하고, “왜 시장이 움직였는가” 같은 해석은 시황 및 시장에서 분리합니다.
            EVENT DB가 쌓일수록 같은 경제지표가 과거 비슷한 환경에서 어떤 반응을 만들었는지 바로 비교할 수 있습니다.
          </p>
          <div className="mt-5 flex flex-wrap gap-2">
            <Link
              href="/data/disclosures"
              className="rounded-full bg-white px-4 py-2 text-sm font-bold text-slate-950"
            >
              공시·실적 데이터 →
            </Link>
            <Link
              href="/data/events"
              className="rounded-full bg-blue-600 px-4 py-2 text-sm font-bold text-white hover:bg-blue-500"
            >
              경제지표 EVENT DB →
            </Link>
            <Link
              href="/blog?category=market"
              className="rounded-full bg-slate-800 px-4 py-2 text-sm font-bold hover:bg-slate-700"
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
