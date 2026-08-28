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
  return new Intl.NumberFormat("ko-KR", { maximumFractionDigits: digits }).format(value);
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
    <div className="grid grid-cols-[1fr_auto] gap-3 py-3">
      <div className="min-w-0">
        <div className="flex min-w-0 items-center gap-2">
          <span className={`rounded-full border bg-white px-1.5 py-0.5 text-[9px] font-black ${badgeTone(quote)}`}>
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

export default async function MajorFuturesPanel({
  futures: providedFutures,
}: {
  futures?: MajorFutureQuote[];
} = {}) {
  let futures: MajorFutureQuote[] = providedFutures ?? [];

  if (providedFutures === undefined) {
    try {
      futures = await getMajorFuturesSnapshot();
    } catch {
      // 아래 상태 카드 유지
    }
  }

  const indexFutures = futures.filter((item) => item.group === "index");
  const commodityFutures = futures.filter((item) => item.group === "commodity");
  const volatility = futures.filter((item) => item.group === "volatility");
  const rates = futures.filter((item) => item.group === "rates");

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
          저장된 선물 장마감 값을 확인 중입니다. 다음 스냅샷 갱신에서 자동 복구됩니다.
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

          {(volatility.length > 0 || rates.length > 0) && (
            <div className="mt-4 border-t border-slate-200 pt-4">
              <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">변동성 · 미국채</p>
              <div className="mt-1 divide-y divide-slate-100">
                {volatility.map((quote) => (
                  <FutureRow key={quote.symbol} quote={quote} />
                ))}
                {rates.map((quote) => (
                  <FutureRow key={quote.symbol} quote={quote} />
                ))}
              </div>
              <p className="mt-2 rounded-xl bg-sky-50 px-3 py-2 text-[10px] leading-4 text-sky-700">
                미국채 선물은 가격과 금리가 반대로 움직이는 경향이 있습니다. 채권선물 가격 상승은 금리 하락 방향, 가격 하락은 금리 상승 방향으로 해석할 때 참고합니다.
              </p>
            </div>
          )}
        </>
      )}

      <p className="mt-3 rounded-2xl bg-slate-50 px-3 py-2 text-[10px] leading-4 text-slate-400">
        NQ·ES·YM·RTY·CL·GC·SI·NG·HG·ZT·ZN·ZB는 공식 정산가가 아니라 미국 현물 정규장 마감 16:00 ET 부근의 비교용 스냅샷입니다. VIX는 CBOE 변동성지수의 같은 시점 값이며, 분봉 확보가 어려우면 근접 분봉 또는 일봉 마감값으로 자동 대체합니다.
      </p>
    </section>
  );
}
