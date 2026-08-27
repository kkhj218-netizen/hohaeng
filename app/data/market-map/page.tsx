import type { Metadata } from "next";
import Link from "next/link";

import MarketMapExplorer from "@/app/data/market-map/MarketMapExplorer";
import { loadMarketMapSnapshot } from "@/app/lib/marketMapSnapshotStore";

export const revalidate = 120;

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

function PreparingState() {
  return (
    <main className="min-h-screen bg-[#f6f7f9] px-4 py-10 text-slate-900">
      <div className="mx-auto max-w-5xl rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
        <p className="text-xs font-black uppercase tracking-[0.16em] text-blue-600">HOHAENG MARKET MAP</p>
        <h1 className="mt-2 text-2xl font-black">시장지도 데이터를 준비하고 있습니다.</h1>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-500">
          공개 화면에서는 외부 시세 API를 직접 기다리지 않습니다. 미국장 마감 후 자동 수집된 저장 스냅샷이 준비되면 NASDAQ100과 S&amp;P500 지도가 바로 표시됩니다.
        </p>
        <div className="mt-5 flex flex-wrap gap-2">
          <Link href="/today" className="rounded-full bg-blue-600 px-4 py-2 text-sm font-black text-white">
            TODAY로 돌아가기 →
          </Link>
          <Link href="/data" className="rounded-full border border-slate-200 px-4 py-2 text-sm font-black text-slate-700">
            투자 데이터 홈 →
          </Link>
        </div>
      </div>
    </main>
  );
}

export default async function MarketMapPage() {
  const [nasdaq100, sp500] = await Promise.all([
    loadMarketMapSnapshot("nasdaq100"),
    loadMarketMapSnapshot("sp500"),
  ]);

  if (!nasdaq100 || !sp500) {
    return <PreparingState />;
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
