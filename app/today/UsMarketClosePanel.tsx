import { getUsMarketCloseDashboard, type UsMarketCloseQuote } from "@/app/lib/usMarketClose";

function tone(value: number | null) {
  if (value === null || value === 0) return "text-slate-500";
  return value > 0 ? "text-emerald-600" : "text-rose-600";
}

function formatPercent(value: number | null) {
  if (value === null) return "—";
  const sign = value > 0 ? "+" : "";
  return `${sign}${value.toFixed(2)}%`;
}

function formatValue(quote: UsMarketCloseQuote) {
  const digits = quote.current >= 10_000 ? 1 : quote.current >= 1_000 ? 2 : 3;
  return new Intl.NumberFormat("ko-KR", {
    maximumFractionDigits: digits,
  }).format(quote.current);
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
    </div>
  );
}

function FutureRow({ quote }: { quote: UsMarketCloseQuote }) {
  return (
    <div className="grid grid-cols-[1fr_auto] items-center gap-3 rounded-xl bg-slate-50 px-3 py-3">
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <span className="rounded bg-slate-900 px-1.5 py-0.5 text-[10px] font-black text-white">
            {quote.symbol}
          </span>
          <p className="truncate text-xs font-bold text-slate-600">{quote.name}</p>
        </div>
        <p className="mt-1 text-[10px] text-slate-400">
          {formatDate(quote.date)} · {quote.timeEt} ET 동시점
        </p>
      </div>
      <div className="text-right">
        <p className="font-black tabular-nums text-slate-950">{formatValue(quote)}</p>
        <p className={`mt-0.5 text-xs font-black ${tone(quote.changePercent)}`}>
          {formatPercent(quote.changePercent)}
        </p>
      </div>
    </div>
  );
}

export default async function UsMarketClosePanel() {
  const market = await getUsMarketCloseDashboard();

  if (market.cash.length === 0 && market.futures.length === 0) {
    return (
      <p className="mt-5 rounded-2xl bg-slate-50 p-4 text-sm text-slate-500">
        최근 미국시장 마감 데이터를 불러오지 못했습니다.
      </p>
    );
  }

  const latestDate = [...market.cash, ...market.futures]
    .map((item) => item.date)
    .sort((a, b) => b.localeCompare(a))[0];

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

      {market.futures.length > 0 && (
        <div className="mt-5 rounded-2xl border border-slate-200 bg-white p-4">
          <div className="flex flex-wrap items-end justify-between gap-2">
            <div>
              <p className="text-xs font-black uppercase tracking-wider text-violet-600">
                FUTURES AT CASH CLOSE
              </p>
              <h3 className="mt-1 text-base font-black text-slate-950">
                현물 장마감 동시점 선물
              </h3>
            </div>
            <span className="text-[10px] font-bold text-slate-400">16:00 ET 기준</span>
          </div>
          <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-4">
            {market.futures.map((quote) => (
              <FutureRow key={quote.symbol} quote={quote} />
            ))}
          </div>
          <p className="mt-3 text-[10px] leading-4 text-slate-400">
            NQ·ES·YM·RTY는 미국 현물 정규장이 끝나는 16:00 ET 부근의 선물 가격을 비교합니다.
            CME 공식 정산가(settlement)가 아니라 현물과 같은 시점의 시장 스냅샷입니다.
          </p>
        </div>
      )}
    </>
  );
}
