import Link from "next/link";

import { getMajorFuturesSnapshot, type MajorFutureQuote } from "@/app/lib/majorFutures";

function tone(value: number | null) {
  if (value === null || value === 0) return "text-slate-500";
  return value > 0 ? "text-emerald-600" : "text-rose-600";
}

function formatPercent(value: number | null) {
  if (value === null) return "—";
  const sign = value > 0 ? "+" : "";
  return `${sign}${value.toFixed(2)}%`;
}

function formatValue(value: number) {
  const absolute = Math.abs(value);
  const digits = absolute >= 10_000 ? 1 : absolute >= 1_000 ? 2 : 3;
  return new Intl.NumberFormat("ko-KR", {
    maximumFractionDigits: digits,
  }).format(value);
}

function formatDate(value: string) {
  return value.replaceAll("-", ".");
}

function badgeTone(quote: MajorFutureQuote) {
  if (quote.group === "index") return "border-violet-200 text-violet-700";
  if (quote.group === "commodity") return "border-amber-200 text-amber-700";
  if (quote.group === "volatility") return "border-rose-200 text-rose-700";
  return "border-sky-200 text-sky-700";
}

function FutureRow({ quote }: { quote: MajorFutureQuote }) {
  const fallback = quote.snapshotMode !== "16et";
  return (
    <div className="grid grid-cols-[1fr_auto] gap-3 px-1 py-3 sm:grid-cols-[1.3fr_0.7fr_0.5fr]">
      <div className="min-w-0">
        <div className="flex min-w-0 items-center gap-2">
          <p className="truncate text-sm font-bold text-slate-900">{quote.name}</p>
          <span className={`rounded-full border bg-white px-1.5 py-0.5 text-[9px] font-black ${badgeTone(quote)}`}>
            {quote.symbol}
          </span>
          {fallback && (
            <span
              title={quote.note}
              className="rounded-full border border-slate-200 bg-slate-100 px-1.5 py-0.5 text-[9px] font-black text-slate-500"
            >
              대체값
            </span>
          )}
        </div>
        <p className="mt-1 text-[11px] text-slate-400">
          {formatDate(quote.date)} · {quote.basisLabel} · Yahoo Finance
        </p>
      </div>
      <div className="text-right">
        <p className="font-black tabular-nums text-slate-950">
          {formatValue(quote.current)} {quote.unitLabel}
        </p>
        <p className={`mt-1 text-xs font-black sm:hidden ${tone(quote.changePercent)}`}>
          1D {formatPercent(quote.changePercent)}
        </p>
      </div>
      <div className="hidden text-right sm:block">
        <p className={`font-black ${tone(quote.changePercent)}`}>
          {formatPercent(quote.changePercent)}
        </p>
        <p className="mt-1 text-xs text-slate-400">1D</p>
      </div>
    </div>
  );
}

function DisclosureLink() {
  return (
    <Link
      href="/data/disclosures"
      className="mt-4 flex items-center justify-between gap-3 rounded-2xl border border-blue-200 bg-blue-50 px-4 py-3 transition hover:border-blue-300"
    >
      <div>
        <p className="text-[10px] font-black uppercase tracking-[0.14em] text-blue-600">OFFICIAL FILINGS</p>
        <p className="mt-1 text-sm font-black text-slate-950">오늘의 공시·실적 데이터</p>
        <p className="mt-1 text-[11px] text-slate-500">미국 SEC · 한국 DART 공식 원문 기준</p>
      </div>
      <span className="shrink-0 text-sm font-black text-blue-600">보기 →</span>
    </Link>
  );
}

function FuturesShell({ unavailable = false }: { unavailable?: boolean }) {
  return (
    <div className="mt-2 border-t border-slate-200 pt-4">
      <div className="rounded-2xl bg-slate-50/80 p-3 sm:p-4">
        <div className="flex flex-wrap items-end justify-between gap-2">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.16em] text-violet-600">
              FUTURES · 16:00 ET SNAPSHOT
            </p>
            <h3 className="mt-1 text-base font-black text-slate-950">주요 선물 장마감 동시점</h3>
          </div>
          <span className="rounded-full border border-violet-200 bg-violet-50 px-2.5 py-1 text-[10px] font-black text-violet-700">
            15분 서버 캐시
          </span>
        </div>
        <p className="mt-3 rounded-xl bg-white px-3 py-3 text-xs leading-5 text-slate-500">
          {unavailable
            ? "외부 선물 시세가 잠시 응답하지 않아 최신값을 다시 확인 중입니다. 섹션은 유지되며 다음 요청에서 자동 복구합니다."
            : "주요 선물 데이터를 확인 중입니다."}
        </p>
        <DisclosureLink />
      </div>
    </div>
  );
}

export default async function MajorFuturesSection() {
  let futures: MajorFutureQuote[] = [];
  try {
    futures = await getMajorFuturesSnapshot();
  } catch {
    return <FuturesShell unavailable />;
  }

  if (futures.length === 0) return <FuturesShell unavailable />;

  const indexFutures = futures.filter((item) => item.group === "index");
  const commodityFutures = futures.filter((item) => item.group === "commodity");
  const volatility = futures.filter((item) => item.group === "volatility");
  const rates = futures.filter((item) => item.group === "rates");

  return (
    <div className="mt-2 border-t border-slate-200 pt-4">
      <div className="rounded-2xl bg-slate-50/80 p-3 sm:p-4">
        <div className="flex flex-wrap items-end justify-between gap-2">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.16em] text-violet-600">
              FUTURES · 16:00 ET SNAPSHOT
            </p>
            <h3 className="mt-1 text-base font-black text-slate-950">주요 선물 장마감 동시점</h3>
            <p className="mt-1 text-[11px] leading-4 text-slate-500">
              16:00 ET 분봉을 우선하고, 원천이 잠시 불안정하면 근접 분봉 또는 일봉 마감값으로 자동 대체합니다.
            </p>
          </div>
          <span className="rounded-full border border-violet-200 bg-violet-50 px-2.5 py-1 text-[10px] font-black text-violet-700">
            15분 서버 캐시
          </span>
        </div>

        {indexFutures.length > 0 && (
          <div className="mt-4">
            <p className="px-1 text-[10px] font-black uppercase tracking-wider text-slate-400">주가지수 선물</p>
            <div className="mt-1 divide-y divide-slate-200/80">
              {indexFutures.map((quote) => (
                <FutureRow key={quote.symbol} quote={quote} />
              ))}
            </div>
          </div>
        )}

        {commodityFutures.length > 0 && (
          <div className="mt-4 border-t border-slate-200 pt-4">
            <p className="px-1 text-[10px] font-black uppercase tracking-wider text-slate-400">에너지 · 금속 선물</p>
            <div className="mt-1 divide-y divide-slate-200/80">
              {commodityFutures.map((quote) => (
                <FutureRow key={quote.symbol} quote={quote} />
              ))}
            </div>
          </div>
        )}

        {(volatility.length > 0 || rates.length > 0) && (
          <div className="mt-4 border-t border-slate-200 pt-4">
            <p className="px-1 text-[10px] font-black uppercase tracking-wider text-slate-400">변동성 · 미국채</p>
            <div className="mt-1 divide-y divide-slate-200/80">
              {volatility.map((quote) => (
                <FutureRow key={quote.symbol} quote={quote} />
              ))}
              {rates.map((quote) => (
                <FutureRow key={quote.symbol} quote={quote} />
              ))}
            </div>
            <p className="mt-2 rounded-xl bg-sky-50 px-3 py-2 text-[10px] leading-4 text-sky-700">
              미국채 선물은 가격과 금리가 반대로 움직이는 경향이 있습니다. 선물 가격 상승은 금리 하락 방향, 가격 하락은 금리 상승 방향을 참고할 때 유용합니다.
            </p>
          </div>
        )}

        <p className="mt-3 rounded-xl bg-white px-3 py-2 text-[10px] leading-4 text-slate-400">
          NQ·ES·YM·RTY·CL·GC·SI·NG·HG·ZT·ZN·ZB는 공식 정산가가 아니라 미국 현물 정규장 마감 16:00 ET 부근 비교용 스냅샷입니다. VIX는 같은 시점의 변동성지수 값이며, ‘대체값’은 분봉 확보 실패 시 보조 데이터가 사용됐다는 뜻입니다.
        </p>

        <DisclosureLink />
      </div>
    </div>
  );
}
