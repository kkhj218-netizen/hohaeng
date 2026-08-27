import Link from "next/link";
import { Suspense } from "react";

import EarningsRiskTodayCard from "@/app/today/EarningsRiskTodayCard";

export default function MarketMapPreview() {
  return (
    <>
      <Link
        href="/data/market-map"
        className="mt-5 block rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition hover:border-blue-200 hover:shadow-md sm:p-5"
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-[11px] font-black uppercase tracking-[0.16em] text-blue-600">
              TODAY MARKET MAP
            </p>
            <h3 className="mt-1 text-lg font-black text-slate-950">
              NASDAQ100 · S&amp;P500 시장지도
            </h3>
            <p className="mt-2 text-xs leading-5 text-slate-500">
              장마감 종목 확산도와 섹터 흐름은 별도 화면에서 확인합니다. TODAY는 시장지도 데이터를 기다리지 않습니다.
            </p>
          </div>
          <span className="shrink-0 text-xl font-black text-blue-600">→</span>
        </div>
        <div className="mt-3 flex flex-wrap gap-2 text-[10px] font-bold text-slate-500">
          <span className="rounded-full bg-slate-100 px-2.5 py-1">NASDAQ 100</span>
          <span className="rounded-full bg-slate-100 px-2.5 py-1">S&amp;P 500</span>
          <span className="rounded-full bg-slate-100 px-2.5 py-1">Breadth</span>
          <span className="rounded-full bg-slate-100 px-2.5 py-1">Sector</span>
        </div>
      </Link>

      <Suspense fallback={null}>
        <div className="mt-5">
          <EarningsRiskTodayCard />
        </div>
      </Suspense>
    </>
  );
}
