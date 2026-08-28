import { getCnnFearGreed, type CnnFearGreedReading, type FearGreedRating } from "@/app/lib/cnnFearGreed";

const BANDS: Array<{
  rating: FearGreedRating;
  label: string;
  width: number;
  className: string;
}> = [
  { rating: "extreme fear", label: "극도의 공포", width: 25, className: "bg-rose-500" },
  { rating: "fear", label: "공포", width: 20, className: "bg-orange-400" },
  { rating: "neutral", label: "중립", width: 10, className: "bg-slate-300" },
  { rating: "greed", label: "탐욕", width: 20, className: "bg-emerald-300" },
  { rating: "extreme greed", label: "극도의 탐욕", width: 25, className: "bg-emerald-500" },
];

const RATING_LABEL: Record<FearGreedRating, string> = {
  "extreme fear": "극도의 공포",
  fear: "공포",
  neutral: "중립",
  greed: "탐욕",
  "extreme greed": "극도의 탐욕",
};

function ratingTone(rating: FearGreedRating) {
  if (rating === "extreme fear") return "border-rose-200 bg-rose-50 text-rose-700";
  if (rating === "fear") return "border-orange-200 bg-orange-50 text-orange-700";
  if (rating === "neutral") return "border-slate-200 bg-slate-50 text-slate-700";
  if (rating === "greed") return "border-emerald-200 bg-emerald-50 text-emerald-700";
  return "border-emerald-300 bg-emerald-100 text-emerald-800";
}

function formatUpdatedAt(value: string | null) {
  if (!value) return "업데이트 시각 확인 중";
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return "업데이트 시각 확인 중";

  return `${new Intl.DateTimeFormat("ko-KR", {
    timeZone: "America/New_York",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(date)} ET`;
}

function ComparisonCard({
  label,
  value,
  current,
}: {
  label: string;
  value: number | null;
  current: number;
}) {
  if (value === null) {
    return (
      <div className="rounded-xl bg-slate-50 p-3">
        <p className="text-[10px] font-bold text-slate-400">{label}</p>
        <p className="mt-1 text-base font-black text-slate-400">—</p>
      </div>
    );
  }

  const delta = current - value;
  const deltaLabel = `${delta > 0 ? "+" : ""}${delta.toFixed(1)}`;
  const deltaTone = delta > 0 ? "text-emerald-600" : delta < 0 ? "text-rose-600" : "text-slate-500";

  return (
    <div className="rounded-xl bg-slate-50 p-3">
      <p className="text-[10px] font-bold text-slate-400">{label}</p>
      <div className="mt-1 flex items-baseline gap-1.5">
        <p className="text-base font-black tabular-nums text-slate-900">{Math.round(value)}</p>
        <span className={`text-[10px] font-black tabular-nums ${deltaTone}`}>{deltaLabel}</span>
      </div>
    </div>
  );
}

function Gauge({ reading }: { reading: CnnFearGreedReading }) {
  const score = Math.max(0, Math.min(100, reading.score));

  return (
    <div>
      <div className="relative pt-5">
        <div className="flex h-3 overflow-hidden rounded-full">
          {BANDS.map((band) => (
            <div key={band.rating} className={band.className} style={{ width: `${band.width}%` }} />
          ))}
        </div>
        <div className="absolute top-0 -translate-x-1/2" style={{ left: `${score}%` }} aria-hidden="true">
          <div className="mx-auto h-5 w-0.5 rounded-full bg-slate-950" />
          <div className="mx-auto -mt-0.5 h-2 w-2 rotate-45 bg-slate-950" />
        </div>
      </div>

      <div className="mt-2 flex text-[8px] font-bold leading-3 text-slate-400 sm:text-[9px]">
        {BANDS.map((band) => (
          <div key={band.rating} className="text-center" style={{ width: `${band.width}%` }}>
            {band.label}
          </div>
        ))}
      </div>
    </div>
  );
}

export function FearGreedSkeleton() {
  return (
    <section className="mt-5 animate-pulse rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="h-3 w-28 rounded bg-slate-100" />
      <div className="mt-2 h-6 w-48 rounded bg-slate-100" />
      <div className="mt-5 h-24 rounded-2xl bg-slate-100" />
      <div className="mt-3 grid grid-cols-4 gap-2">
        {Array.from({ length: 4 }).map((_, index) => (
          <div key={index} className="h-14 rounded-xl bg-slate-100" />
        ))}
      </div>
    </section>
  );
}

export default async function FearGreedPanel({
  reading: providedReading,
}: {
  reading?: CnnFearGreedReading | null;
} = {}) {
  const reading = providedReading === undefined ? await getCnnFearGreed() : providedReading;

  if (!reading) {
    return (
      <section className="mt-5 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <p className="text-xs font-black uppercase tracking-wider text-blue-600">MARKET SENTIMENT</p>
            <h3 className="mt-1 text-base font-black text-slate-950">CNN Fear &amp; Greed Index</h3>
          </div>
          <a href="https://www.cnn.com/markets/fear-and-greed" target="_blank" rel="noreferrer" className="text-[10px] font-black text-blue-600">
            CNN 원문 →
          </a>
        </div>
        <div className="mt-4 rounded-xl bg-slate-50 p-4">
          <p className="text-sm font-black text-slate-700">저장된 CNN 데이터가 아직 없습니다.</p>
          <p className="mt-1 text-xs leading-5 text-slate-500">다음 TODAY 스냅샷 갱신에서 자동으로 다시 확인합니다.</p>
        </div>
      </section>
    );
  }

  return (
    <section className="mt-5 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-black uppercase tracking-wider text-blue-600">MARKET SENTIMENT</p>
          <h3 className="mt-1 text-base font-black text-slate-950">CNN Fear &amp; Greed Index</h3>
          <p className="mt-1 text-[10px] font-bold text-slate-400">{formatUpdatedAt(reading.timestamp)}</p>
        </div>
        <a href={reading.sourceUrl} target="_blank" rel="noreferrer" className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-[10px] font-black text-blue-600">
          CNN 원문 →
        </a>
      </div>

      <div className="mt-4 grid gap-4 sm:grid-cols-[160px_1fr] sm:items-center">
        <div className="rounded-2xl bg-slate-950 p-4 text-white">
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">CURRENT</p>
          <div className="mt-1 flex items-end gap-2">
            <p className="text-5xl font-black tabular-nums tracking-tight">{Math.round(reading.score)}</p>
            <span className="mb-1 text-sm font-bold text-slate-400">/ 100</span>
          </div>
          <span className={`mt-3 inline-flex rounded-full border px-2.5 py-1 text-[10px] font-black ${ratingTone(reading.rating)}`}>
            {RATING_LABEL[reading.rating]}
          </span>
        </div>

        <div>
          <Gauge reading={reading} />
          <p className="mt-3 text-[10px] leading-4 text-slate-500">점수가 낮을수록 공포, 높을수록 탐욕 구간입니다. 시장 심리 참고용이며 단독 매매 신호로 사용하지 않습니다.</p>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-4 gap-2">
        <ComparisonCard label="전일" value={reading.previousClose} current={reading.score} />
        <ComparisonCard label="1주 전" value={reading.previousWeek} current={reading.score} />
        <ComparisonCard label="1개월 전" value={reading.previousMonth} current={reading.score} />
        <ComparisonCard label="1년 전" value={reading.previousYear} current={reading.score} />
      </div>

      <p className="mt-3 text-[10px] leading-4 text-slate-400">Source: CNN Business Fear &amp; Greed Index · 호행처럼은 원 지표 값을 재계산하지 않고 표시만 합니다.</p>
    </section>
  );
}
