import type { Metadata } from "next";
import Link from "next/link";

import { getKoreaDisclosures } from "@/app/lib/koreaDart";
import {
  getKoreaFullMarketSnapshot,
  type KoreaFullMarketStock,
} from "@/app/lib/koreaFullMarket";
import {
  getKoreaMarketDashboard,
  type KoreaMarketQuote,
} from "@/app/lib/koreaMarket";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "오늘의 국내주식 대시보드 | 코스피·코스닥·거래대금 | 호행처럼",
  description:
    "코스피·코스닥, 원달러 환율, 전체시장 거래대금·등락률·거래량 순위, 주요 종목 52주 위치, 국내 경제 일정과 DART 공시를 한 화면에서 확인합니다.",
  alternates: { canonical: "/today/korea" },
};

const KOREA_EVENTS = [
  {
    date: "2026-08-27",
    time: null,
    title: "한국은행 통화정책방향 결정회의",
    importance: 3,
    source: "한국은행",
    url: "https://www.bok.or.kr/portal/singl/crncyPolicyDrcMtg/listYear.do?menuNo=200755&mtgSe=A",
  },
  {
    date: "2026-08-31",
    time: "08:00",
    title: "2026년 7월 산업활동동향",
    importance: 3,
    source: "국가데이터처",
    url: "https://mods.go.kr/newsPln.es?mid=a10305000000&oa_mm=08",
  },
  {
    date: "2026-09-02",
    time: "08:00",
    title: "2026년 8월 소비자물가동향",
    importance: 3,
    source: "국가데이터처",
    url: "https://www.kostat.go.kr/",
  },
  {
    date: "2026-10-22",
    time: null,
    title: "한국은행 통화정책방향 결정회의",
    importance: 3,
    source: "한국은행",
    url: "https://www.bok.or.kr/portal/singl/crncyPolicyDrcMtg/listYear.do?menuNo=200755&mtgSe=A",
  },
] as const;

function koreaToday(): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${values.year}-${values.month}-${values.day}`;
}

function displayToday(): string {
  return new Intl.DateTimeFormat("ko-KR", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "long",
    day: "numeric",
    weekday: "short",
  }).format(new Date());
}

function formatObservedDate(date: string | null): string {
  if (!date) return "기준일 없음";
  return date.replaceAll("-", ".");
}

function formatValue(quote: KoreaMarketQuote): string {
  const digits = quote.current >= 10_000 ? 0 : quote.current >= 100 ? 2 : 3;
  const value = new Intl.NumberFormat("ko-KR", {
    maximumFractionDigits: digits,
  }).format(quote.current);
  return quote.market === "FX" ? `${value}원` : value;
}

function percentTone(value: number | null): string {
  if (value === null || value === 0) return "text-slate-500";
  return value > 0 ? "text-rose-600" : "text-blue-600";
}

function formatPercent(value: number | null): string {
  if (value === null) return "—";
  const sign = value > 0 ? "+" : "";
  return `${sign}${value.toFixed(2)}%`;
}

function formatTurnover(value: number | null): string {
  if (value === null || !Number.isFinite(value)) return "—";
  const eok = value / 100_000_000;
  if (eok >= 10_000) return `${(eok / 10_000).toFixed(2)}조원`;
  return `${Math.round(eok).toLocaleString("ko-KR")}억원`;
}

function formatVolume(value: number): string {
  if (value >= 100_000_000) return `${(value / 100_000_000).toFixed(1)}억주`;
  if (value >= 10_000) return `${Math.round(value / 10_000).toLocaleString("ko-KR")}만주`;
  return `${value.toLocaleString("ko-KR")}주`;
}

function formatStockPrice(value: number): string {
  return `${Math.round(value).toLocaleString("ko-KR")}원`;
}

function positionLabel(percentile: number | null) {
  if (percentile === null) return { label: "위치 계산 중", tone: "text-slate-400" };
  if (percentile >= 90)
    return {
      label: `상위 ${Math.max(1, Math.round(100 - percentile))}%`,
      tone: "text-rose-600",
    };
  if (percentile >= 75) return { label: "높은 구간", tone: "text-amber-600" };
  if (percentile <= 10)
    return {
      label: `하위 ${Math.max(1, Math.round(percentile))}%`,
      tone: "text-blue-600",
    };
  if (percentile <= 25) return { label: "낮은 구간", tone: "text-sky-600" };
  return { label: "중립 구간", tone: "text-slate-600" };
}

function PositionCard({ quote }: { quote: KoreaMarketQuote }) {
  const percentile = Math.max(0, Math.min(100, quote.percentile52w ?? 50));
  const position = positionLabel(quote.percentile52w);

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="truncate font-black text-slate-950">{quote.name}</h3>
            <span className="rounded-md bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-500">
              {quote.symbol}
            </span>
          </div>
          <p className="mt-1 text-[11px] text-slate-400">
            {quote.market} · {formatObservedDate(quote.date)}
          </p>
        </div>
        <div className="shrink-0 text-right">
          <p className="font-black tabular-nums text-slate-950">{formatValue(quote)}</p>
          <p className={`mt-1 text-xs font-black ${percentTone(quote.changePercent)}`}>
            {formatPercent(quote.changePercent)}
          </p>
        </div>
      </div>

      <div className="mt-4 flex items-end justify-between gap-3">
        <div>
          <p className={`text-sm font-black ${position.tone}`}>
            {quote.percentile52w === null
              ? "—"
              : `${Math.round(quote.percentile52w)}백분위 · ${position.label}`}
          </p>
          <p className="mt-1 text-[11px] text-slate-500">
            52주 종가 고점 대비{" "}
            {quote.distanceFromHigh52w === null
              ? "—"
              : `${quote.distanceFromHigh52w.toFixed(1)}%`}
          </p>
        </div>
        {quote.volumeRatio20d !== null && (
          <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-bold text-slate-600">
            거래량 {quote.volumeRatio20d.toFixed(1)}배
          </span>
        )}
      </div>

      <div className="mt-3">
        <div className="relative h-2 rounded-full bg-gradient-to-r from-blue-500 via-slate-300 to-rose-500">
          <span
            className="absolute top-1/2 h-4 w-1.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-slate-950 shadow"
            style={{ left: `${percentile}%` }}
          />
        </div>
        <div className="mt-1 flex justify-between text-[10px] text-slate-400">
          <span>52주 저점권</span>
          <span>52주 고점권</span>
        </div>
      </div>
    </div>
  );
}

function RankList({
  title,
  rows,
  value,
}: {
  title: string;
  rows: KoreaFullMarketStock[];
  value: "turnover" | "volume" | "change" | "marketCap";
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4">
      <h3 className="font-black text-slate-950">{title}</h3>
      <div className="mt-3 divide-y divide-slate-100">
        {rows.slice(0, 5).map((stock, index) => (
          <div
            key={`${title}-${stock.code}`}
            className="grid grid-cols-[24px_1fr_auto] items-center gap-2 py-3 first:pt-0 last:pb-0"
          >
            <span className="text-xs font-black text-slate-400">{index + 1}</span>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <p className="truncate text-sm font-black text-slate-900">{stock.name}</p>
                <span className="shrink-0 text-[9px] font-bold text-slate-400">
                  {stock.market}
                </span>
              </div>
              <p className="mt-0.5 text-[10px] text-slate-400">
                {stock.code} · {formatStockPrice(stock.close)}
              </p>
            </div>
            <div className="text-right">
              {value === "turnover" && (
                <p className="text-xs font-black text-slate-900">
                  {formatTurnover(stock.tradingValue)}
                </p>
              )}
              {value === "volume" && (
                <p className="text-xs font-black text-slate-900">
                  {formatVolume(stock.volume)}
                </p>
              )}
              {value === "marketCap" && (
                <p className="text-xs font-black text-slate-900">
                  {formatTurnover(stock.marketCap)}
                </p>
              )}
              {value === "change" && (
                <p className={`text-xs font-black ${percentTone(stock.changePercent)}`}>
                  {formatPercent(stock.changePercent)}
                </p>
              )}
              {value !== "change" && (
                <p className={`mt-0.5 text-[10px] font-bold ${percentTone(stock.changePercent)}`}>
                  {formatPercent(stock.changePercent)}
                </p>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default async function KoreaTodayPage() {
  const [dashboard, fullMarket, disclosureFeed] = await Promise.all([
    getKoreaMarketDashboard(),
    getKoreaFullMarketSnapshot(),
    getKoreaDisclosures(8),
  ]);

  const marketCards = [...dashboard.indices, ...(dashboard.fx ? [dashboard.fx] : [])];
  const positionStocks = [...dashboard.stocks]
    .filter((quote) => quote.percentile52w !== null)
    .sort(
      (left, right) =>
        Math.abs((right.percentile52w ?? 50) - 50) -
        Math.abs((left.percentile52w ?? 50) - 50),
    )
    .slice(0, 6);
  const representativeTurnover = [...dashboard.stocks]
    .filter((quote) => quote.estimatedTurnover !== null)
    .sort((left, right) => (right.estimatedTurnover ?? 0) - (left.estimatedTurnover ?? 0))
    .slice(0, 6);
  const today = koreaToday();
  const events = KOREA_EVENTS.filter((event) => event.date >= today).slice(0, 4);

  return (
    <main className="min-h-screen bg-[#f6f7f9] pb-24 text-slate-900 md:pb-12">
      <section className="border-b border-slate-200 bg-gradient-to-b from-slate-950 to-slate-900 text-white">
        <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 sm:py-10">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-blue-300">
            HOHAENG KOREA
          </p>
          <h1 className="mt-2 text-3xl font-black tracking-tight sm:text-4xl">
            오늘의 국내주식 대시보드
          </h1>
          <p className="mt-2 text-sm text-slate-300">{displayToday()}</p>
          <p className="mt-5 max-w-2xl text-sm leading-6 text-slate-300">
            코스피·코스닥부터 전체시장 거래대금과 등락률, 주요 종목의 52주 위치,
            경제 일정과 공시까지 한 화면에서 확인합니다.
          </p>

          <div className="mt-5 flex flex-wrap gap-2 text-[11px] font-bold">
            <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-slate-300">
              시장지수 · 대표종목 최근시세
            </span>
            <span
              className={`rounded-full border px-3 py-1.5 ${
                fullMarket.available
                  ? "border-emerald-400/20 bg-emerald-400/10 text-emerald-200"
                  : "border-amber-400/20 bg-amber-400/10 text-amber-200"
              }`}
            >
              전체시장 {fullMarket.available ? "공식 데이터 연결" : "연결 대기"}
            </span>
            <span
              className={`rounded-full border px-3 py-1.5 ${
                disclosureFeed.configured
                  ? "border-blue-400/20 bg-blue-400/10 text-blue-200"
                  : "border-white/10 bg-white/5 text-slate-300"
              }`}
            >
              공시 {disclosureFeed.configured ? "OpenDART" : "DART 연결 대기"}
            </span>
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-5xl space-y-6 px-4 py-6 sm:px-6 sm:py-8">
        <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <div className="flex items-end justify-between gap-3">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-blue-600">
                01 · KOREA MARKET
              </p>
              <h2 className="mt-1 text-xl font-black">국내시장 한눈에 보기</h2>
            </div>
            <span className="rounded-full bg-emerald-50 px-3 py-1 text-[11px] font-black text-emerald-700">
              최근 시장값
            </span>
          </div>

          {marketCards.length > 0 ? (
            <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3">
              {marketCards.map((quote) => (
                <div key={quote.symbol} className="rounded-2xl bg-slate-50 p-4">
                  <p className="text-xs font-bold text-slate-500">{quote.name}</p>
                  <p className="mt-2 text-xl font-black tabular-nums text-slate-950">
                    {formatValue(quote)}
                  </p>
                  <p className={`mt-1 text-sm font-black ${percentTone(quote.changePercent)}`}>
                    {formatPercent(quote.changePercent)}
                  </p>
                  <p className="mt-2 text-[10px] text-slate-400">
                    {formatObservedDate(quote.date)} 기준
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <p className="mt-5 rounded-2xl bg-slate-50 p-4 text-sm text-slate-500">
              국내 시장 데이터를 불러오지 못했습니다. 잠시 후 다시 확인해주세요.
            </p>
          )}
        </section>

        <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-violet-600">
                02 · FULL MARKET SCANNER
              </p>
              <h2 className="mt-1 text-xl font-black">코스피·코스닥 전체시장 스캐너</h2>
              <p className="mt-2 text-xs leading-5 text-slate-500">
                금융위원회가 개방한 한국거래소 일별 주식시세를 기준으로 계산합니다.
                데이터는 기준 영업일 다음 영업일 오후에 반영될 수 있습니다.
              </p>
            </div>
            {fullMarket.date && (
              <span className="rounded-full bg-violet-50 px-3 py-1.5 text-[11px] font-black text-violet-700">
                {formatObservedDate(fullMarket.date)} 기준
              </span>
            )}
          </div>

          {fullMarket.available && fullMarket.breadth ? (
            <>
              <div className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-5">
                {[
                  ["상승", fullMarket.breadth.rising, "text-rose-600"],
                  ["하락", fullMarket.breadth.falling, "text-blue-600"],
                  ["보합", fullMarket.breadth.flat, "text-slate-600"],
                  ["상한가권", fullMarket.breadth.upperLimit, "text-rose-700"],
                  ["하한가권", fullMarket.breadth.lowerLimit, "text-blue-700"],
                ].map(([label, count, tone]) => (
                  <div key={String(label)} className="rounded-2xl bg-slate-50 p-4 text-center">
                    <p className="text-xs font-bold text-slate-400">{label}</p>
                    <p className={`mt-1 text-2xl font-black ${tone}`}>{count}</p>
                  </div>
                ))}
              </div>

              <div className="mt-5 grid gap-3 md:grid-cols-2">
                <RankList title="거래대금 TOP" rows={fullMarket.turnoverTop} value="turnover" />
                <RankList title="거래량 TOP" rows={fullMarket.volumeTop} value="volume" />
                <RankList title="상승률 TOP" rows={fullMarket.gainers} value="change" />
                <RankList title="하락률 TOP" rows={fullMarket.losers} value="change" />
              </div>

              <div className="mt-4 flex flex-wrap items-center justify-between gap-2 rounded-2xl bg-slate-50 px-4 py-3 text-xs text-slate-500">
                <span>
                  KOSPI·KOSDAQ {fullMarket.totalStocks.toLocaleString("ko-KR")}개 종목 분석
                </span>
                <span className="font-bold text-slate-700">Source · {fullMarket.source}</span>
              </div>
            </>
          ) : (
            <div className="mt-5 rounded-2xl border border-amber-200 bg-amber-50 p-5">
              <p className="font-black text-amber-900">전체시장 스캐너 코드 연결은 완료됐습니다.</p>
              <p className="mt-2 text-sm leading-6 text-amber-800">
                무료 공공데이터 인증키가 연결되면 거래대금·거래량·상승률·하락률과
                상승/하락 종목 수가 자동으로 표시됩니다. 현재는 대표 종목 데이터가 아래에서
                계속 제공됩니다.
              </p>
              {fullMarket.error && (
                <p className="mt-2 text-xs text-amber-700">상태: {fullMarket.error}</p>
              )}
              <a
                href="https://www.data.go.kr/data/15094808/openapi.do"
                target="_blank"
                rel="noreferrer"
                className="mt-4 inline-flex rounded-full bg-amber-900 px-4 py-2 text-xs font-black text-white"
              >
                금융위원회 주식시세정보 →
              </a>
            </div>
          )}
        </section>

        <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-rose-600">
              03 · MARKET POSITION
            </p>
            <h2 className="mt-1 text-xl font-black">주요 종목 52주 위치</h2>
            <p className="mt-2 text-xs leading-5 text-slate-500">
              국내 주요 종목의 최근 1년 일별 종가 범위에서 현재 위치를 비교합니다.
              장중 최고가가 아니라 종가 기준 위치입니다.
            </p>
          </div>

          <div className="mt-5 grid gap-3 md:grid-cols-2">
            {positionStocks.length > 0 ? (
              positionStocks.map((quote) => <PositionCard key={quote.symbol} quote={quote} />)
            ) : (
              <p className="text-sm text-slate-500">위치를 계산할 수 있는 데이터가 없습니다.</p>
            )}
          </div>
        </section>

        {!fullMarket.available && representativeTurnover.length > 0 && (
          <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-amber-600">
                04 · TRADING FOCUS
              </p>
              <h2 className="mt-1 text-xl font-black">대표 종목 거래 집중도</h2>
              <p className="mt-2 text-xs leading-5 text-slate-500">
                공식 전체시장 스캐너가 연결되기 전에는 현재 추적 중인 대표 종목 안에서
                가격×거래량으로 비교합니다.
              </p>
            </div>

            <div className="mt-5 divide-y divide-slate-100">
              {representativeTurnover.map((quote, index) => (
                <div
                  key={quote.symbol}
                  className="grid grid-cols-[36px_1fr_auto] items-center gap-3 py-4 first:pt-0 last:pb-0"
                >
                  <span className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-950 text-xs font-black text-white">
                    {index + 1}
                  </span>
                  <div className="min-w-0">
                    <p className="truncate font-black text-slate-950">{quote.name}</p>
                    <p className="mt-1 text-xs text-slate-400">
                      추정 거래대금 {formatTurnover(quote.estimatedTurnover)}
                      {quote.volumeRatio20d !== null
                        ? ` · 20일 평균 거래량의 ${quote.volumeRatio20d.toFixed(1)}배`
                        : ""}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-black tabular-nums">{formatValue(quote)}</p>
                    <p className={`mt-1 text-xs font-black ${percentTone(quote.changePercent)}`}>
                      {formatPercent(quote.changePercent)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        <section className="grid gap-6 lg:grid-cols-2">
          <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
            <div className="flex items-end justify-between gap-3">
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-blue-600">
                  05 · DISCLOSURE
                </p>
                <h2 className="mt-1 text-xl font-black">오늘 볼 주요 공시</h2>
              </div>
              <a
                href="https://dart.fss.or.kr/"
                target="_blank"
                rel="noreferrer"
                className="text-xs font-bold text-blue-600"
              >
                DART →
              </a>
            </div>

            {disclosureFeed.disclosures.length > 0 ? (
              <div className="mt-5 divide-y divide-slate-100">
                {disclosureFeed.disclosures.map((item) => (
                  <a
                    key={item.receiptNo}
                    href={item.url}
                    target="_blank"
                    rel="noreferrer"
                    className="block py-4 first:pt-0 last:pb-0"
                  >
                    <div className="flex items-center gap-2">
                      <p className="font-black text-slate-950">{item.corpName}</p>
                      <span className="rounded bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-500">
                        {item.market}
                      </span>
                    </div>
                    <p className="mt-1 text-sm leading-5 text-slate-600">{item.reportName}</p>
                    <p className="mt-1 text-[10px] text-slate-400">{item.receiptDate}</p>
                  </a>
                ))}
              </div>
            ) : (
              <div className="mt-5 rounded-2xl bg-slate-50 p-4 text-sm leading-6 text-slate-500">
                {disclosureFeed.configured
                  ? disclosureFeed.error || "최근 주요 공시가 없습니다."
                  : "OpenDART 무료 인증키를 연결하면 공급계약·증자·CB·자사주·배당·실적 등 주요 공시가 자동으로 표시됩니다."}
              </div>
            )}
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
            <p className="text-xs font-bold uppercase tracking-wider text-emerald-600">
              06 · KOREA CALENDAR
            </p>
            <h2 className="mt-1 text-xl font-black">다가오는 국내 주요 일정</h2>

            <div className="mt-5 divide-y divide-slate-100">
              {events.map((event) => (
                <a
                  key={`${event.date}-${event.title}`}
                  href={event.url}
                  target="_blank"
                  rel="noreferrer"
                  className="grid grid-cols-[82px_1fr] gap-3 py-4 first:pt-0 last:pb-0"
                >
                  <div>
                    <p className="text-sm font-black text-slate-950">
                      {event.date.slice(5).replace("-", "/")}
                    </p>
                    {event.time && (
                      <p className="mt-1 text-xs font-bold text-blue-600">{event.time}</p>
                    )}
                  </div>
                  <div>
                    <p className="font-black leading-5 text-slate-950">{event.title}</p>
                    <p className="mt-1 text-xs text-slate-400">
                      {"★".repeat(event.importance)} · {event.source}
                    </p>
                  </div>
                </a>
              ))}
            </div>
          </div>
        </section>

        <section className="rounded-3xl bg-slate-950 p-5 text-white sm:p-6">
          <p className="text-xs font-bold uppercase tracking-wider text-blue-300">
            INVESTOR FLOW
          </p>
          <h2 className="mt-1 text-xl font-black">외국인·기관 수급은 원본과 연결</h2>
          <p className="mt-3 text-sm leading-6 text-slate-300">
            외국인·기관 순매수는 무료 공공 주식시세 API에 포함되지 않는 항목이라 값을
            임의 수집해 재배포하지 않습니다. 대신 한국거래소 투자자별 거래실적 원본으로
            바로 이동할 수 있게 연결합니다. 향후 재배포가 허용되는 공식 소스가 확보되면
            이 영역을 자동 랭킹으로 전환합니다.
          </p>
          <div className="mt-5 flex flex-wrap gap-2">
            <a
              href="https://data.krx.co.kr/"
              target="_blank"
              rel="noreferrer"
              className="rounded-full bg-blue-600 px-4 py-2 text-sm font-bold text-white"
            >
              KRX 투자자별 거래실적 →
            </a>
            <Link
              href="/blog?category=market"
              className="rounded-full border border-white/15 px-4 py-2 text-sm font-bold text-slate-200"
            >
              국내 시황 글 →
            </Link>
          </div>
        </section>
      </div>
    </main>
  );
}
