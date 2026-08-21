import type { Metadata } from "next";
import Link from "next/link";

import { getKoreaDisclosures } from "@/app/lib/koreaDart";
import {
  getKoreaMarketDashboard,
  type KoreaMarketQuote,
} from "@/app/lib/koreaMarket";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "오늘의 국내주식 대시보드 | 호행처럼",
  description:
    "코스피·코스닥, 원달러 환율, 주요 종목의 52주 위치와 거래 집중도, 국내 주요 경제 일정과 DART 공시를 한 화면에서 확인합니다.",
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

function formatObservedDate(date: string): string {
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
  if (value === null) return "—";
  const eok = value / 100_000_000;
  if (eok >= 10_000) return `${(eok / 10_000).toFixed(2)}조원`;
  return `${Math.round(eok).toLocaleString("ko-KR")}억원`;
}

function positionLabel(percentile: number | null) {
  if (percentile === null) return { label: "위치 계산 중", tone: "text-slate-400" };
  if (percentile >= 90) return { label: `상위 ${Math.max(1, Math.round(100 - percentile))}%`, tone: "text-rose-600" };
  if (percentile >= 75) return { label: "높은 구간", tone: "text-amber-600" };
  if (percentile <= 10) return { label: `하위 ${Math.max(1, Math.round(percentile))}%`, tone: "text-blue-600" };
  if (percentile <= 25) return { label: "낮은 구간", tone: "text-sky-600" };
  return { label: "중립 구간", tone: "text-slate-600" };
}

function PositionCard({ quote }: { quote: KoreaMarketQuote }) {
  const percentile = Math.max(0, Math.min(100, quote.percentile52w ?? 50));
  const position = positionLabel(quote.percentile52w);

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="font-black text-slate-950">{quote.name}</h3>
            <span className="rounded-md bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-500">
              {quote.symbol}
            </span>
          </div>
          <p className="mt-1 text-[11px] text-slate-400">
            {quote.market} · {formatObservedDate(quote.date)}
          </p>
        </div>
        <div className="text-right">
          <p className="font-black tabular-nums text-slate-950">{formatValue(quote)}</p>
          <p className={`mt-1 text-xs font-black ${percentTone(quote.changePercent)}`}>
            {formatPercent(quote.changePercent)}
          </p>
        </div>
      </div>

      <div className="mt-4 flex items-end justify-between gap-3">
        <div>
          <p className={`text-sm font-black ${position.tone}`}>
            {quote.percentile52w === null ? "—" : `${Math.round(quote.percentile52w)}백분위 · ${position.label}`}
          </p>
          <p className="mt-1 text-[11px] text-slate-500">
            52주 종가 고점 대비 {quote.distanceFromHigh52w === null ? "—" : `${quote.distanceFromHigh52w.toFixed(1)}%`}
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

export default async function KoreaTodayPage() {
  const [dashboard, disclosureFeed] = await Promise.all([
    getKoreaMarketDashboard(),
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
  const turnoverStocks = [...dashboard.stocks]
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
            국내 주요 지수와 대표 종목의 현재 위치, 거래 집중도, 주요 경제 일정과 공시를 한 화면에서 정리합니다.
          </p>
        </div>
      </section>

      <div className="mx-auto max-w-5xl space-y-6 px-4 py-6 sm:px-6 sm:py-8">
        <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <div className="flex items-end justify-between gap-3">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-blue-600">01 · KOREA MARKET</p>
              <h2 className="mt-1 text-xl font-black">국내시장 한눈에 보기</h2>
            </div>
            <span className="rounded-full bg-emerald-50 px-3 py-1 text-[11px] font-black text-emerald-700">
              시장시세
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
                    {formatObservedDate(quote.date)} · {quote.source}
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
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-rose-600">02 · MARKET POSITION</p>
            <h2 className="mt-1 text-xl font-black">주요 종목 52주 위치</h2>
            <p className="mt-2 text-xs leading-5 text-slate-500">
              대표 종목의 최근 1년 일별 종가 범위에서 현재 위치를 비교합니다. 장중 고가 기준이 아니라 종가 데이터 기준입니다.
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

        <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-amber-600">03 · TRADING FOCUS</p>
            <h2 className="mt-1 text-xl font-black">거래가 집중된 주요 종목</h2>
            <p className="mt-2 text-xs leading-5 text-slate-500">
              전체 국내시장 순위가 아니라 현재 대시보드가 추적하는 대표 종목 안에서 가격×거래량으로 비교한 참고 순위입니다.
            </p>
          </div>

          <div className="mt-5 divide-y divide-slate-100">
            {turnoverStocks.map((quote, index) => (
              <div key={quote.symbol} className="grid grid-cols-[36px_1fr_auto] items-center gap-3 py-4 first:pt-0 last:pb-0">
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-950 text-xs font-black text-white">
                  {index + 1}
                </span>
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="truncate font-black text-slate-950">{quote.name}</p>
                    <span className="text-[10px] font-bold text-slate-400">{quote.symbol}</span>
                  </div>
                  <p className="mt-1 text-xs text-slate-400">
                    추정 거래대금 {formatTurnover(quote.estimatedTurnover)}
                    {quote.volumeRatio20d !== null ? ` · 20일 평균 거래량의 ${quote.volumeRatio20d.toFixed(1)}배` : ""}
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

        <section className="grid gap-6 lg:grid-cols-2">
          <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
            <p className="text-xs font-bold uppercase tracking-wider text-violet-600">04 · KOREA CALENDAR</p>
            <h2 className="mt-1 text-xl font-black">국내 주요 일정</h2>

            <div className="mt-5 divide-y divide-slate-100">
              {events.map((event) => (
                <a
                  key={`${event.date}-${event.title}`}
                  href={event.url}
                  target="_blank"
                  rel="noreferrer"
                  className="block py-4 first:pt-0 last:pb-0"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-black text-slate-950">{event.title}</p>
                      <p className="mt-1 text-xs text-slate-400">
                        {event.date.replaceAll("-", ".")}{event.time ? ` · ${event.time}` : ""} · {event.source}
                      </p>
                    </div>
                    <span className="shrink-0 text-xs font-black tracking-wider text-amber-500">
                      {"★".repeat(event.importance)}
                    </span>
                  </div>
                </a>
              ))}
            </div>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-emerald-600">05 · DART</p>
                <h2 className="mt-1 text-xl font-black">최근 주요 공시</h2>
              </div>
              <span className="rounded-full bg-emerald-50 px-3 py-1 text-[11px] font-black text-emerald-700">OpenDART</span>
            </div>

            {!disclosureFeed.configured ? (
              <div className="mt-5 rounded-2xl bg-slate-50 p-4">
                <p className="text-sm font-black text-slate-900">DART 연결 준비 완료</p>
                <p className="mt-2 text-xs leading-5 text-slate-500">
                  무료 OpenDART API 키를 Vercel 환경변수 <b>DART_API_KEY</b>로 넣으면 유가증권·코스닥 주요 공시가 자동으로 표시됩니다.
                </p>
              </div>
            ) : disclosureFeed.error ? (
              <p className="mt-5 rounded-2xl bg-rose-50 p-4 text-sm text-rose-700">
                공시 조회 중 오류가 발생했습니다: {disclosureFeed.error}
              </p>
            ) : disclosureFeed.disclosures.length > 0 ? (
              <div className="mt-5 divide-y divide-slate-100">
                {disclosureFeed.disclosures.map((item) => (
                  <a
                    key={item.receiptNo}
                    href={item.url}
                    target="_blank"
                    rel="noreferrer"
                    className="block py-3 first:pt-0 last:pb-0"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="font-black text-slate-950">{item.corpName}</p>
                          <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[9px] font-bold text-slate-500">{item.market}</span>
                        </div>
                        <p className="mt-1 line-clamp-2 text-xs leading-5 text-slate-600">{item.reportName}</p>
                      </div>
                      <span className="shrink-0 text-[10px] text-slate-400">{item.receiptDate}</span>
                    </div>
                  </a>
                ))}
              </div>
            ) : (
              <p className="mt-5 rounded-2xl bg-slate-50 p-4 text-sm text-slate-500">최근 표시할 주요 공시가 없습니다.</p>
            )}
          </div>
        </section>

        <section className="rounded-3xl bg-slate-950 p-5 text-white sm:p-6">
          <p className="text-xs font-bold uppercase tracking-wider text-blue-300">NEXT</p>
          <h2 className="mt-1 text-xl font-black">국내 투자 콘텐츠로 이어보기</h2>
          <p className="mt-3 text-sm leading-6 text-slate-300">
            국내 시장 데이터는 앞으로 외국인·기관 수급, 전체 거래대금 상위, 신고가·신저가, 실적 일정까지 공공데이터 API 연결 범위에 맞춰 확장합니다.
          </p>
          <div className="mt-5 flex flex-wrap gap-2">
            <Link href="/blog?category=market" className="rounded-full bg-blue-600 px-4 py-2 text-sm font-bold hover:bg-blue-500">
              시황 및 시장 →
            </Link>
            <Link href="/data" className="rounded-full border border-white/15 px-4 py-2 text-sm font-bold text-slate-200 hover:bg-white/10">
              투자 데이터 →
            </Link>
          </div>
        </section>
      </div>
    </main>
  );
}
