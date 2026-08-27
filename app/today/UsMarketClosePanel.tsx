import Link from "next/link";
import { Suspense } from "react";

import { getMajorFuturesSnapshot } from "@/app/lib/majorFutures";
import { getUsMarketCloseDashboard, type UsMarketCloseQuote } from "@/app/lib/usMarketClose";
import FearGreedPanel, { FearGreedSkeleton } from "@/app/today/FearGreedPanel";
import IndexTradingCheckPanel from "@/app/today/IndexTradingCheckPanel";
import MajorFuturesPanel, { MajorFuturesSkeleton } from "@/app/today/MajorFuturesPanel";
import MarketMapPreview from "@/app/today/MarketMapPreview";

const PAIRS = [
  { cash: "NASDAQ", future: "NQ", label: "나스닥 ↔ NQ" },
  { cash: "SP500", future: "ES", label: "S&P500 ↔ ES" },
  { cash: "DOW", future: "YM", label: "다우 ↔ YM" },
  { cash: "RUT", future: "RTY", label: "러셀2000 ↔ RTY" },
] as const;

function tone(value: number | null) {
  if (value === null || value === 0) return "text-slate-500";
  return value > 0 ? "text-emerald-600" : "text-rose-600";
}

function formatPercent(value: number | null) {
  if (value === null) return "—";
  const sign = value > 0 ? "+" : "";
  return `${sign}${value.toFixed(2)}%`;
}

function formatPoint(value: number | null) {
  if (value === null) return "—";
  const sign = value > 0 ? "+" : "";
  return `${sign}${value.toFixed(2)}%p`;
}

function formatValue(quote: UsMarketCloseQuote) {
  const digits = quote.current >= 10_000 ? 1 : quote.current >= 1_000 ? 2 : 3;
  return new Intl.NumberFormat("ko-KR", {
    maximumFractionDigits: digits,
  }).format(quote.current);
}

function formatLevel(value: number | null) {
  if (value === null) return "—";
  const digits = value >= 10_000 ? 1 : value >= 1_000 ? 2 : 3;
  return new Intl.NumberFormat("ko-KR", { maximumFractionDigits: digits }).format(value);
}

function formatDate(date: string) {
  return date.replaceAll("-", ".");
}

function CashCard({ quote }: { quote: UsMarketCloseQuote }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-xs font-bold uppercase tracking-wide text-slate-400">
            {quote.symbol}
          </p>
          <p className="mt-1 truncate text-sm font-black text-slate-900">
            {quote.name}
          </p>
        </div>
        <p className={`shrink-0 text-sm font-black tabular-nums ${tone(quote.changePercent)}`}>
          {formatPercent(quote.changePercent)}
        </p>
      </div>
      <p className="mt-4 text-xl font-black tracking-tight tabular-nums text-slate-950">
        {formatValue(quote)}
      </p>
      <p className="mt-1 text-[11px] leading-4 text-slate-400">
        {formatDate(quote.date)} · 미국 정규장 마감
      </p>
      {(quote.sessionHigh !== null || quote.sessionLow !== null) && (
        <div className="mt-3 border-t border-slate-100 pt-2 text-[10px] text-slate-500">
          <div className="flex items-center justify-between gap-2">
            <span>고가 {formatLevel(quote.sessionHigh)}</span>
            <span>저가 {formatLevel(quote.sessionLow)}</span>
          </div>
          {quote.rangePercent !== null && (
            <p className="mt-1 font-bold text-slate-600">장중 범위 {quote.rangePercent.toFixed(2)}%</p>
          )}
        </div>
      )}
    </div>
  );
}

function directionMeta(cash: number | null, future: number | null) {
  if (cash === null || future === null) {
    return { label: "비교 대기", tone: "bg-slate-100 text-slate-600", delta: null };
  }

  const delta = future - cash;
  const cashSign = cash > 0.03 ? 1 : cash < -0.03 ? -1 : 0;
  const futureSign = future > 0.03 ? 1 : future < -0.03 ? -1 : 0;

  if (cashSign === 0 && futureSign === 0) {
    return { label: "중립 동행 →", tone: "bg-slate-100 text-slate-700", delta };
  }
  if (cashSign !== futureSign) {
    if (futureSign > cashSign) {
      return { label: "선물 상대강세 ↗", tone: "bg-violet-50 text-violet-700", delta };
    }
    return { label: "선물 상대약세 ↘", tone: "bg-amber-50 text-amber-700", delta };
  }
  if (cashSign > 0) {
    return {
      label: delta >= 0.15 ? "상승 동행 · 선물 우위 ↑" : delta <= -0.15 ? "상승 동행 · 현물 우위 ↑" : "상승 동행 ↑",
      tone: "bg-emerald-50 text-emerald-700",
      delta,
    };
  }
  return {
    label: delta >= 0.15 ? "하락 동행 · 선물 덜 약함 ↓" : delta <= -0.15 ? "하락 동행 · 선물 더 약함 ↓" : "하락 동행 ↓",
    tone: "bg-rose-50 text-rose-700",
    delta,
  };
}

export default async function UsMarketClosePanel() {
  const [market, majorFutures] = await Promise.all([
    getUsMarketCloseDashboard(),
    getMajorFuturesSnapshot(),
  ]);

  if (market.cash.length === 0 && majorFutures.length === 0) {
    return (
      <p className="mt-5 rounded-2xl bg-slate-50 p-4 text-sm text-slate-500">
        최근 미국시장 마감 데이터를 불러오지 못했습니다.
      </p>
    );
  }

  const latestDate = [...market.cash, ...majorFutures]
    .map((item) => item.date)
    .sort((a, b) => b.localeCompare(a))[0];
  const cashMap = new Map(market.cash.map((item) => [item.symbol, item]));
  const futureMap = new Map(
    majorFutures
      .filter((item) => item.group === "index")
      .map((item) => [item.symbol, item]),
  );
  const paired = PAIRS.map((pair) => ({
    ...pair,
    cashQuote: cashMap.get(pair.cash),
    futureQuote: futureMap.get(pair.future),
  })).filter((pair) => pair.cashQuote && pair.futureQuote);

  return (
    <>
      <div className="mt-5 flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs font-bold text-slate-500">현물 정규장 종가</p>
        {latestDate && (
          <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-[10px] font-black text-emerald-700">
            최근 마감 {formatDate(latestDate)}
          </span>
        )}
      </div>

      {market.cash.length > 0 && (
        <div className="mt-3 grid grid-cols-2 gap-3 md:grid-cols-4">
          {market.cash.map((quote) => (
            <CashCard key={quote.symbol} quote={quote} />
          ))}
        </div>
      )}

      <Suspense fallback={<MajorFuturesSkeleton />}>
        <MajorFuturesPanel />
      </Suspense>

      {paired.length > 0 && (
        <div className="mt-5 rounded-2xl border border-slate-200 bg-slate-950 p-4 text-white">
          <div className="flex flex-wrap items-end justify-between gap-2">
            <div>
              <p className="text-xs font-black uppercase tracking-wider text-cyan-300">
                DIRECTION MAP
              </p>
              <h3 className="mt-1 text-base font-black">현물 ↔ 선물 방향 비교</h3>
            </div>
            <span className="text-[10px] font-bold text-slate-400">전 거래일 동일 기준 대비</span>
          </div>

          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            {paired.map((pair) => {
              const cashChange = pair.cashQuote?.changePercent ?? null;
              const futureChange = pair.futureQuote?.changePercent ?? null;
              const meta = directionMeta(cashChange, futureChange);
              return (
                <div key={pair.future} className="rounded-xl border border-white/10 bg-white/[0.05] p-3">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="text-sm font-black">{pair.label}</p>
                      <p className="mt-1 text-[10px] text-slate-400">
                        현물 {formatPercent(cashChange)} · 선물 {formatPercent(futureChange)}
                      </p>
                    </div>
                    <span className={`rounded-full px-2.5 py-1 text-[10px] font-black ${meta.tone}`}>
                      {meta.label}
                    </span>
                  </div>
                  <p className="mt-2 text-xs font-bold text-slate-300">
                    상대 변화차 {formatPoint(meta.delta)}
                  </p>
                </div>
              );
            })}
          </div>

          <p className="mt-3 text-[10px] leading-4 text-slate-500">
            상대 변화차는 현물과 선물의 등락률 차이일 뿐 공정가치 베이시스가 아닙니다. 특히 NQ는 나스닥100 선물이고 현물 카드는 나스닥 종합지수라 방향·상대강도 참고용으로만 봅니다.
          </p>
        </div>
      )}

      <Suspense
        fallback={
          <div className="mt-5 h-[430px] animate-pulse rounded-2xl border border-slate-200 bg-slate-100" />
        }
      >
        <MarketMapPreview />
      </Suspense>

      <Link
        href="/data/regime"
        className="mt-5 block rounded-2xl border border-blue-200 bg-gradient-to-r from-blue-50 to-white p-4 transition hover:border-blue-300 hover:shadow-sm"
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-[11px] font-black uppercase tracking-wider text-blue-600">HOHAENG MARKET REGIME</p>
            <h3 className="mt-1 text-lg font-black text-slate-950">지금 시장환경을 7개 축으로 보기</h3>
            <p className="mt-2 text-xs leading-5 text-slate-500">추세·물가·금리·유동성·VIX·달러·경기를 한 번에 보고, 과거 비슷했던 국면과 이후 1D·5D·20D 자산 반응까지 비교합니다.</p>
          </div>
          <span className="shrink-0 text-xl font-black text-blue-600">→</span>
        </div>
      </Link>

      <Suspense fallback={<FearGreedSkeleton />}>
        <FearGreedPanel />
      </Suspense>

      <IndexTradingCheckPanel />
    </>
  );
}
