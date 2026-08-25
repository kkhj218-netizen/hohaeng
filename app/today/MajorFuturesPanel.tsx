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
  const digits = absolute >= 10_000 ? 1 : absolute >= 1_000 ? 2 : absolute >= 10 ? 2 : 3;
  return new Intl.NumberFormat("ko-KR", { maximumFractionDigits: digits }).format(value);
}

function formatDate(value: string) {
  return value.replaceAll("-", ".");
}

function FutureRow({ quote }: { quote: MajorFutureQuote }) {
  const fallback = quote.snapshotMode !== "16et";
  return (
    <div className="grid grid-cols-[1fr_auto] gap-3 py-3">
      <div className="min-w-0">
        <div className="flex min-w-0 items-center gap-2">
          <span
            className={`rounded-full border bg-white px-1.5 py-0.5 text-[9px] font-black ${
              quote.group === "index"
                ? "border-violet-200 text-violet-700"
                : "border-amber-200 text-amber-700"
            }`}
          >
            {quote.symbol}
          </span>
          <p className="truncate text-sm font-black text-slate-900">{quote.name}</p>
          {fallback && (
            <span
              title={quote.note}
              className="rounded-full border border-slate-200 bg-slate-100 px-1.5 py-0.5 text-[9px] font-black text-slate-500"
            >
              대체값
            </span>
          )}
        </div>
        <p className="mt-1 text-[10px] text-slate-400">
          {formatDate(quote.date)} · {quote.basisLabel} · Yahoo Finance
        </p>
      </div>
      <div className="text-right">
        <p className="font-black tabular-nums text-slate-950">
          {formatValue(quote.current)} {quote.unitLabel}
        </p>
        <p className={`mt-1 text-xs font-black ${tone(quote.changePercent)}`}>
          1D {formatPercent(quote.changePercent)}
        </p>
      </div>
    </div>
  );
}

export function MajorFuturesSkeleton() {
  return (
    <div className="mt-5 rounded-3xl border border-slate-200 bg-white p-4 sm:p-5">
      <div className="h-4 w-36 animate-pulse rounded bg-slate-100" />
      <div className="mt-2 h-6 w-52 animate-pulse rounded bg-slate-100" />
      <div className="mt-5 grid gap-2">
        {[0, 1, 2, 3, 4].map((item) => (
          <div key={item} className="h-16 animate-pulse rounded-2xl bg-slate-50" />
        ))}
      </div>
    </div>
  );
}

export default async function MajorFuturesPanel() {
  let futures: MajorFutureQuote[] = [];
  try {
    futures = await getMajorFuturesSnapshot();
  } catch {
    // 아래 상태 카드 유지
  }

  const indexFutures = futures.filter((item) => item.group === "index");
  const commodityFutures = futures.filter((item) => item.group === "commodity");

  return (
    <section className="mt-5 rounded-3xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.16em] text-violet-600">
            FUTURES · 16:00 ET SNAPSHOT
          </p>
          <h3 className="mt-1 text-lg font-black text-slate-950">주요 선물 장마감 동시점</h3>
          <p className="mt-1 text-[11px] leading-5 text-slate-500">
            매일 오전 7시 KST 자동 갱신 · 미국 현물장 16:00 ET 기준
          </p>
        </div>
        <span className="rounded-full border border-violet-200 bg-violet-50 px-2.5 py-1 text-[10px] font-black text-violet-700">
          DAILY 07:00
        </span>
      </div>

      {futures.length === 0 ? (
        <p className="mt-4 rounded-2xl bg-slate-50 p-4 text-xs leading-5 text-slate-500">
          외부 선물 시세가 잠시 응답하지 않아 최신 장마감 값을 다시 확인 중입니다. 섹션은 유지되고 다음 갱신에서 자동 복구됩니다.
        </p>
      ) : (
        <>
          {indexFutures.length > 0 && (
            <div className="mt-5">
              <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">주가지수 선물</p>
              <div className="mt-1 divide-y divide-slate-100">
                {indexFutures.map((quote) => (
                  <FutureRow key={quote.symbol} quote={quote} />
                ))}
              </div>
            </div>
          )}

          {commodityFutures.length > 0 && (
            <div className="mt-4 border-t border-slate-200 pt-4">
              <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">에너지 · 금속 선물</p>
              <div className="mt-1 divide-y divide-slate-100">
                {commodityFutures.map((quote) => (
                  <FutureRow key={quote.symbol} quote={quote} />
                ))}
              </div>
            </div>
          )}
        </>
      )}

      <p className="mt-3 rounded-2xl bg-slate-50 px-3 py-2 text-[10px] leading-4 text-slate-400">
        NQ·ES·YM·RTY·CL·GC·SI·NG·HG는 CME 공식 정산가가 아니라 미국 현물 정규장 마감 16:00 ET 부근의 비교용 스냅샷입니다. 분봉 확보가 어려우면 근접 분봉 또는 일봉 마감값으로 자동 대체합니다.
      </p>
    </section>
  );
}
