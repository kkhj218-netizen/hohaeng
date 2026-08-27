"use client";

import { useMemo, useState } from "react";

import MarketTreemap from "@/app/components/MarketTreemap";
import type { MarketMapIndexKey, MarketMapSnapshot } from "@/app/lib/marketMapTypes";

type Props = {
  nasdaq100: MarketMapSnapshot;
  sp500: MarketMapSnapshot;
};

function signedPercent(value: number) {
  return `${value > 0 ? "+" : ""}${value.toFixed(2)}%`;
}

function tone(value: number) {
  if (value > 0.01) return "text-emerald-600";
  if (value < -0.01) return "text-rose-600";
  return "text-slate-500";
}

function dateLabel(value: string | null) {
  if (!value) return "최근 장마감";
  return `${value.replaceAll("-", ".")} 장마감`;
}

export default function MarketMapExplorer({ nasdaq100, sp500 }: Props) {
  const [indexKey, setIndexKey] = useState<MarketMapIndexKey>("nasdaq100");
  const [sector, setSector] = useState("ALL");

  const snapshot = indexKey === "nasdaq100" ? nasdaq100 : sp500;
  const sectorNames = useMemo(
    () => snapshot.sectors.map((item) => item.name),
    [snapshot.sectors],
  );
  const filteredStocks = useMemo(
    () => sector === "ALL" ? snapshot.stocks : snapshot.stocks.filter((stock) => stock.sector === sector),
    [sector, snapshot.stocks],
  );
  const gainers = [...snapshot.stocks].sort((a, b) => b.changePercent - a.changePercent).slice(0, 8);
  const losers = [...snapshot.stocks].sort((a, b) => a.changePercent - b.changePercent).slice(0, 8);

  const switchIndex = (next: MarketMapIndexKey) => {
    setIndexKey(next);
    setSector("ALL");
  };

  return (
    <div className="space-y-5">
      <div className="flex rounded-2xl bg-slate-100 p-1">
        <button
          type="button"
          onClick={() => switchIndex("nasdaq100")}
          className={`flex-1 rounded-xl px-4 py-3 text-sm font-black transition ${
            indexKey === "nasdaq100" ? "bg-slate-950 text-white shadow-sm" : "text-slate-500 hover:text-slate-900"
          }`}
        >
          NASDAQ 100
        </button>
        <button
          type="button"
          onClick={() => switchIndex("sp500")}
          className={`flex-1 rounded-xl px-4 py-3 text-sm font-black transition ${
            indexKey === "sp500" ? "bg-slate-950 text-white shadow-sm" : "text-slate-500 hover:text-slate-900"
          }`}
        >
          S&amp;P 500
        </button>
      </div>

      <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.16em] text-blue-600">MARKET BREADTH</p>
            <h2 className="mt-1 text-2xl font-black text-slate-950">{snapshot.indexName} 장마감 지도</h2>
            <p className="mt-1 text-xs font-semibold text-slate-400">{dateLabel(snapshot.marketDate)}</p>
          </div>
          <span className={`rounded-full px-3 py-1.5 text-xs font-black ${
            snapshot.breadthLabel === "강한 확산"
              ? "bg-emerald-50 text-emerald-700"
              : snapshot.breadthLabel === "약한 확산"
                ? "bg-rose-50 text-rose-700"
                : "bg-slate-100 text-slate-600"
          }`}>
            시장 확산도 · {snapshot.breadthLabel}
          </span>
        </div>

        <div className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
          <div className="rounded-2xl bg-slate-50 p-3.5">
            <p className="text-[11px] font-bold text-slate-400">상승 종목</p>
            <p className="mt-1 text-xl font-black text-emerald-600">{snapshot.advancers}</p>
            <p className="text-[10px] text-slate-400">전체 {snapshot.totalCount}</p>
          </div>
          <div className="rounded-2xl bg-slate-50 p-3.5">
            <p className="text-[11px] font-bold text-slate-400">하락 종목</p>
            <p className="mt-1 text-xl font-black text-rose-600">{snapshot.decliners}</p>
            <p className="text-[10px] text-slate-400">보합 {snapshot.unchanged}</p>
          </div>
          <div className="rounded-2xl bg-slate-50 p-3.5">
            <p className="text-[11px] font-bold text-slate-400">상승 종목 비율</p>
            <p className="mt-1 text-xl font-black text-slate-950">{snapshot.advanceRatio.toFixed(1)}%</p>
            <p className="text-[10px] text-slate-400">Breadth</p>
          </div>
          <div className="rounded-2xl bg-slate-50 p-3.5">
            <p className="text-[11px] font-bold text-slate-400">상승 시총 비중</p>
            <p className="mt-1 text-xl font-black text-slate-950">{snapshot.advanceMarketCapShare.toFixed(1)}%</p>
            <p className="text-[10px] text-slate-400">시총 기준</p>
          </div>
          <div className="rounded-2xl bg-slate-50 p-3.5">
            <p className="text-[11px] font-bold text-slate-400">시총가중 평균</p>
            <p className={`mt-1 text-xl font-black ${tone(snapshot.marketCapWeightedChange)}`}>
              {signedPercent(snapshot.marketCapWeightedChange)}
            </p>
            <p className="text-[10px] text-slate-400">실제 지수 수익률과 다름</p>
          </div>
          <div className="rounded-2xl bg-slate-50 p-3.5">
            <p className="text-[11px] font-bold text-slate-400">강한 섹터</p>
            <p className="mt-1 truncate text-sm font-black text-slate-950">{snapshot.strongestSector?.name ?? "—"}</p>
            <p className={`mt-1 text-[11px] font-black ${tone(snapshot.strongestSector?.weightedChange ?? 0)}`}>
              {snapshot.strongestSector ? signedPercent(snapshot.strongestSector.weightedChange) : "—"}
            </p>
          </div>
        </div>
      </section>

      <section className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.16em] text-blue-600">HEATMAP</p>
            <h2 className="mt-1 text-xl font-black text-slate-950">시가총액 크기 × 전일 등락률</h2>
          </div>
          <p className="text-[11px] font-semibold text-slate-400">종목을 누르면 상세 숫자를 확인할 수 있습니다.</p>
        </div>

        <div className="mt-4 flex gap-1.5 overflow-x-auto pb-2 pr-5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <button
            type="button"
            onClick={() => setSector("ALL")}
            className={`shrink-0 rounded-full px-3 py-2 text-xs font-black ${sector === "ALL" ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-600"}`}
          >
            전체 {snapshot.totalCount}
          </button>
          {sectorNames.map((name) => {
            const summary = snapshot.sectors.find((item) => item.name === name);
            return (
              <button
                type="button"
                key={name}
                onClick={() => setSector(name)}
                className={`shrink-0 rounded-full px-2.5 py-2 text-xs font-black ${sector === name ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-600"}`}
              >
                {name} {summary?.stockCount ?? 0}
              </button>
            );
          })}
        </div>

        <MarketTreemap stocks={filteredStocks} />

        <div className="mt-4 flex items-center justify-center gap-1 text-[10px] font-bold text-white">
          {[
            ["-3%", "#7f1d2d"],
            ["-2%", "#ad2836"],
            ["-1%", "#c53e49"],
            ["0", "#475569"],
            ["+1%", "#18a957"],
            ["+2%", "#0f9842"],
            ["+3%", "#087a35"],
          ].map(([label, color]) => (
            <span key={label} className="min-w-10 rounded px-2 py-1 text-center" style={{ backgroundColor: color }}>
              {label}
            </span>
          ))}
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-black uppercase tracking-[0.14em] text-emerald-600">TOP GAINERS</p>
          <h2 className="mt-1 text-lg font-black text-slate-950">오늘 가장 강했던 종목</h2>
          <div className="mt-4 space-y-2">
            {gainers.map((stock, index) => (
              <div key={stock.symbol} className="flex items-center justify-between rounded-xl bg-slate-50 px-3 py-2.5">
                <div className="min-w-0">
                  <p className="text-sm font-black text-slate-900">{index + 1}. {stock.displaySymbol}</p>
                  <p className="truncate text-[10px] text-slate-400">{stock.name} · {stock.sector}</p>
                </div>
                <p className="shrink-0 text-sm font-black text-emerald-600">{signedPercent(stock.changePercent)}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-black uppercase tracking-[0.14em] text-rose-600">TOP LOSERS</p>
          <h2 className="mt-1 text-lg font-black text-slate-950">오늘 가장 약했던 종목</h2>
          <div className="mt-4 space-y-2">
            {losers.map((stock, index) => (
              <div key={stock.symbol} className="flex items-center justify-between rounded-xl bg-slate-50 px-3 py-2.5">
                <div className="min-w-0">
                  <p className="text-sm font-black text-slate-900">{index + 1}. {stock.displaySymbol}</p>
                  <p className="truncate text-[10px] text-slate-400">{stock.name} · {stock.sector}</p>
                </div>
                <p className="shrink-0 text-sm font-black text-rose-600">{signedPercent(stock.changePercent)}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex items-end justify-between gap-3">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.14em] text-blue-600">SECTOR BREADTH</p>
            <h2 className="mt-1 text-lg font-black text-slate-950">섹터별 장마감 흐름</h2>
          </div>
          {snapshot.weakestSector && (
            <p className="text-right text-[10px] font-semibold text-slate-400">
              가장 약한 섹터<br />
              <strong className="text-rose-600">{snapshot.weakestSector.name} {signedPercent(snapshot.weakestSector.weightedChange)}</strong>
            </p>
          )}
        </div>
        <div className="mt-3 flex items-center justify-end text-[10px] font-bold text-slate-400 sm:hidden">
          ← 좌우로 밀어 전체 보기 →
        </div>
        <div className="mt-2 -mr-2 overflow-x-auto pr-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden sm:mt-4 sm:mr-0 sm:pr-0">
          <table className="w-full min-w-[540px] text-left text-xs sm:min-w-[620px]">
            <thead className="border-b border-slate-200 text-[10px] uppercase tracking-wider text-slate-400">
              <tr>
                <th className="w-[180px] px-1.5 py-2 sm:px-2">섹터</th>
                <th className="w-[72px] px-1.5 py-2 text-right sm:px-2">종목수</th>
                <th className="w-[64px] px-1.5 py-2 text-right sm:px-2">상승</th>
                <th className="w-[64px] px-1.5 py-2 text-right sm:px-2">하락</th>
                <th className="w-[110px] px-1.5 py-2 text-right sm:px-2">시총가중 평균</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {[...snapshot.sectors].sort((a, b) => b.weightedChange - a.weightedChange).map((item) => (
                <tr key={item.name}>
                  <td className="max-w-[180px] truncate px-1.5 py-3 font-black text-slate-800 sm:px-2" title={item.name}>{item.name}</td>
                  <td className="px-1.5 py-3 text-right font-semibold text-slate-500 sm:px-2">{item.stockCount}</td>
                  <td className="px-1.5 py-3 text-right font-bold text-emerald-600 sm:px-2">{item.advancers}</td>
                  <td className="px-1.5 py-3 text-right font-bold text-rose-600 sm:px-2">{item.decliners}</td>
                  <td className={`px-1.5 py-3 text-right font-black sm:px-2 ${tone(item.weightedChange)}`}>{signedPercent(item.weightedChange)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <p className="px-1 text-[10px] leading-5 text-slate-400">{snapshot.sourceNote}</p>
    </div>
  );
}
