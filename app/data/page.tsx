import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";

import InvestmentDiscoveries from "@/app/data/InvestmentDiscoveries";
import MarketDataSection from "@/app/data/MarketDataSection";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "투자 데이터 | 기업 공시·실적 변화 분석 | 호행처럼",
  description:
    "DART 공시에서 실적 급증, 흑자전환, 공급계약, 주주환원, 지분변화를 탐지하고 공식 시장·경제 데이터까지 함께 확인합니다.",
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
