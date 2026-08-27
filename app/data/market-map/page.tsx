import type { Metadata } from "next";
import Link from "next/link";

import MarketMapExplorer from "@/app/data/market-map/MarketMapExplorer";
import { getMarketMapSnapshot } from "@/app/lib/marketMap";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "미국 주식 시장 히트맵 | NASDAQ100·S&P500 MARKET MAP | 호행처럼",
  description:
    "NASDAQ100과 S&P500 구성종목을 시가총액 크기와 전일 등락률 색상으로 한눈에 확인하고, 상승·하락 종목 수와 섹터별 시장 확산도를 비교합니다.",
  alternates: { canonical: "/data/market-map" },
  openGraph: {
    title: "HOHAENG MARKET MAP | 미국장 종목 히트맵",
    description: "NASDAQ100·S&P500 장마감 흐름을 종목·시총·섹터 단위로 한눈에 확인합니다.",
    url: "/data/market-map",
    type: "website",
  },
};

export default async function MarketMapPage() {
  let nasdaq100;
  let sp500;

  try {
    [nasdaq100, sp500] = await Promise.all([
      getMarketMapSnapshot("nasdaq100"),
      getMarketMapSnapshot("sp500"),
    ]);
  } catch (error) {
    const message = error instanceof Error ? error.message : "시장 지도를 불러오지 못했습니다.";
    return (
      <main className="min-h-screen bg-[#f6f7f9] px-4 py-10 text-slate-900">
        <div className="mx-auto max-w-5xl rounded-3xl border border-rose-200 bg-white p-6 shadow-sm">
          <p className="text-xs font-black uppercase tracking-[0.16em] text-rose-600">MARKET MAP</p>
          <h1 className="mt-2 text-2xl font-black">시장 지도를 잠시 불러오지 못했습니다.</h1>
          <p className="mt-3 text-sm leading-6 text-slate-500">{message}</p>
          <Link href="/data" className="mt-5 inline-flex rounded-full bg-slate-950 px-4 py-2 text-sm font-black text-white">
            투자 데이터 홈으로 →
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#f6f7f9] pb-20 text-slate-900">
      <section className="border-b border-slate-200 bg-slate-950 text-white">
        <div className="mx-auto max-w-6xl px-4 py-9 sm:px-6 sm:py-11">
          <div className="flex flex-wrap items-end justify-between gap-5">
            <div className="max-w-3xl">
              <p className="text-xs font-black uppercase tracking-[0.22em] text-blue-300">HOHAENG MARKET MAP</p>
              <h1 className="mt-2 text-3xl font-black tracking-tight sm:text-4xl">오늘 미국장은 어디가 움직였을까?</h1>
              <p className="mt-3 text-sm leading-6 text-slate-300 sm:text-base">
                NASDAQ100과 S&amp;P500 구성종목을 장마감 기준으로 묶어 봅니다. 박스 크기는 시가총액,
                색은 전일 등락률이며, 지수 숫자만으로는 보이지 않는 상승·하락 확산도를 함께 확인합니다.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Link href="/today" className="rounded-full bg-white px-4 py-2 text-sm font-black text-slate-950">
                TODAY →
              </Link>
              <Link href="/data/regime" className="rounded-full border border-white/20 px-4 py-2 text-sm font-black text-white hover:bg-white/10">
                MARKET REGIME →
              </Link>
            </div>
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-8">
        <MarketMapExplorer nasdaq100={nasdaq100} sp500={sp500} />
      </div>
    </main>
  );
}
