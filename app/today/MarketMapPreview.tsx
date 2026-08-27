import Link from "next/link";

import MarketTreemap from "@/app/components/MarketTreemap";
import { getMarketMapSnapshot } from "@/app/lib/marketMap";

function signedPercent(value: number) {
  return `${value > 0 ? "+" : ""}${value.toFixed(2)}%`;
}

export default async function MarketMapPreview() {
  try {
    const snapshot = await getMarketMapSnapshot("nasdaq100");
    const previewStocks = snapshot.stocks.slice(0, 36);

    return (
      <div className="mt-5 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-[11px] font-black uppercase tracking-[0.16em] text-blue-600">TODAY MARKET MAP</p>
            <h3 className="mt-1 text-lg font-black text-slate-950">NASDAQ 100 종목 확산도</h3>
            <p className="mt-1 text-[11px] font-semibold text-slate-400">
              {snapshot.marketDate ? `${snapshot.marketDate.replaceAll("-", ".")} 장마감` : "최근 장마감"}
            </p>
          </div>
          <Link href="/data/market-map" className="shrink-0 text-sm font-black text-blue-600 hover:text-blue-700">
            전체 지도 →
          </Link>
        </div>

        <div className="mt-4 grid grid-cols-4 gap-2">
          <div className="rounded-xl bg-emerald-50 px-3 py-2.5">
            <p className="text-[9px] font-bold text-emerald-600">상승</p>
            <p className="mt-0.5 text-lg font-black text-emerald-700">{snapshot.advancers}</p>
          </div>
          <div className="rounded-xl bg-rose-50 px-3 py-2.5">
            <p className="text-[9px] font-bold text-rose-600">하락</p>
            <p className="mt-0.5 text-lg font-black text-rose-700">{snapshot.decliners}</p>
          </div>
          <div className="rounded-xl bg-slate-50 px-3 py-2.5">
            <p className="text-[9px] font-bold text-slate-400">상승비율</p>
            <p className="mt-0.5 text-lg font-black text-slate-800">{snapshot.advanceRatio.toFixed(0)}%</p>
          </div>
          <div className="rounded-xl bg-slate-50 px-3 py-2.5">
            <p className="text-[9px] font-bold text-slate-400">시총가중</p>
            <p className={`mt-0.5 text-lg font-black ${snapshot.marketCapWeightedChange >= 0 ? "text-emerald-600" : "text-rose-600"}`}>
              {signedPercent(snapshot.marketCapWeightedChange)}
            </p>
          </div>
        </div>

        <div className="mt-4">
          <MarketTreemap stocks={previewStocks} compact showDetail={false} />
        </div>

        <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-[10px] font-semibold text-slate-400">
          <span>상위 시가총액 36개 미리보기 · 박스 크기=시총 · 색=등락률</span>
          <span className="font-black text-slate-600">시장 확산도 {snapshot.breadthLabel}</span>
        </div>
      </div>
    );
  } catch {
    return (
      <Link
        href="/data/market-map"
        className="mt-5 block rounded-2xl border border-slate-200 bg-white p-4 text-sm font-black text-blue-600 shadow-sm"
      >
        NASDAQ100 · S&amp;P500 MARKET MAP 보기 →
      </Link>
    );
  }
}
