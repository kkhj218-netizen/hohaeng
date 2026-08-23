import { getMajorFuturesSnapshot } from "@/app/lib/majorFutures";

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
  const digits = absolute >= 10_000 ? 1 : absolute >= 1_000 ? 2 : absolute >= 10 ? 2 : 3;
  return new Intl.NumberFormat("ko-KR", {
    maximumFractionDigits: digits,
  }).format(value);
}

function formatDate(value: string) {
  return value.replaceAll("-", ".");
}

export default async function MajorFuturesSection() {
  const futures = await getMajorFuturesSnapshot();
  if (futures.length === 0) return null;

  const indexFutures = futures.filter((item) => item.group === "index");
  const commodityFutures = futures.filter((item) => item.group === "commodity");

  return (
    <div className="mt-2 border-t border-slate-200 pt-4">
      <div className="rounded-2xl bg-slate-50/80 p-3 sm:p-4">
        <div className="flex flex-wrap items-end justify-between gap-2">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.16em] text-violet-600">
              FUTURES · 16:00 ET SNAPSHOT
            </p>
            <h3 className="mt-1 text-base font-black text-slate-950">
              주요 선물 장마감 동시점
            </h3>
            <p className="mt-1 text-[11px] leading-4 text-slate-500">
              미국 현물 정규장이 끝나는 16:00 ET 부근 가격으로 통일해 비교합니다.
            </p>
          </div>
          <span className="rounded-full border border-violet-200 bg-violet-50 px-2.5 py-1 text-[10px] font-black text-violet-700">
            15분 서버 캐시
          </span>
        </div>

        {indexFutures.length > 0 && (
          <div className="mt-4">
            <p className="px-1 text-[10px] font-black uppercase tracking-wider text-slate-400">
              주가지수 선물
            </p>
            <div className="mt-1 divide-y divide-slate-200/80">
              {indexFutures.map((quote) => (
                <div
                  key={quote.symbol}
                  className="grid grid-cols-[1fr_auto] gap-3 px-1 py-3 sm:grid-cols-[1.3fr_0.7fr_0.5fr]"
                >
                  <div className="min-w-0">
                    <div className="flex min-w-0 items-center gap-2">
                      <p className="truncate text-sm font-bold text-slate-900">{quote.name}</p>
                      <span className="rounded-full border border-violet-200 bg-white px-1.5 py-0.5 text-[9px] font-black text-violet-700">
                        {quote.symbol}
                      </span>
                    </div>
                    <p className="mt-1 text-[11px] text-slate-400">
                      {formatDate(quote.date)} · {quote.timeEt} ET · Yahoo Finance
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
              ))}
            </div>
          </div>
        )}

        {commodityFutures.length > 0 && (
          <div className="mt-4 border-t border-slate-200 pt-4">
            <p className="px-1 text-[10px] font-black uppercase tracking-wider text-slate-400">
              에너지 · 금속 선물
            </p>
            <div className="mt-1 divide-y divide-slate-200/80">
              {commodityFutures.map((quote) => (
                <div
                  key={quote.symbol}
                  className="grid grid-cols-[1fr_auto] gap-3 px-1 py-3 sm:grid-cols-[1.3fr_0.7fr_0.5fr]"
                >
                  <div className="min-w-0">
                    <div className="flex min-w-0 items-center gap-2">
                      <p className="truncate text-sm font-bold text-slate-900">{quote.name}</p>
                      <span className="rounded-full border border-amber-200 bg-white px-1.5 py-0.5 text-[9px] font-black text-amber-700">
                        {quote.symbol}
                      </span>
                    </div>
                    <p className="mt-1 text-[11px] text-slate-400">
                      {formatDate(quote.date)} · {quote.timeEt} ET · Yahoo Finance
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
              ))}
            </div>
          </div>
        )}

        <p className="mt-3 rounded-xl bg-white px-3 py-2 text-[10px] leading-4 text-slate-400">
          NQ·ES·YM·RTY·CL·GC·SI·NG·HG는 CME 공식 정산가(settlement)가 아니라 미국 현물 정규장 마감 16:00 ET 부근의 비교용 스냅샷입니다.
        </p>
      </div>
    </div>
  );
}
