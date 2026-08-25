import Link from "next/link";

import {
  getGlobalPolicyRates,
  type GlobalPolicyRate,
  type PolicyRateObservation,
} from "@/app/lib/globalPolicyRates";

function formatDate(value: string | null) {
  return value ? value.replaceAll("-", ".") : "—";
}

function formatRate(value: number | null) {
  return value === null ? "—" : `${value.toFixed(2)}%`;
}

function formatBp(value: number | null) {
  if (value === null) return "—";
  const sign = value > 0 ? "+" : "";
  return `${sign}${value}bp`;
}

function trendTone(trend: GlobalPolicyRate["trend"]) {
  if (trend === "easing") return "border-blue-200 bg-blue-50 text-blue-700";
  if (trend === "hiking") return "border-rose-200 bg-rose-50 text-rose-700";
  if (trend === "steady") return "border-slate-200 bg-slate-50 text-slate-600";
  return "border-amber-200 bg-amber-50 text-amber-700";
}

function Sparkline({ history }: { history: PolicyRateObservation[] }) {
  if (history.length < 2) {
    return <div className="h-12 rounded-xl bg-slate-50" />;
  }

  const values = history.map((point) => point.value);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = Math.max(max - min, 0.25);
  const points = history
    .map((point, index) => {
      const x = (index / Math.max(1, history.length - 1)) * 100;
      const y = 30 - ((point.value - min) / span) * 24;
      return `${x.toFixed(2)},${y.toFixed(2)}`;
    })
    .join(" ");

  return (
    <svg viewBox="0 0 100 34" className="h-12 w-full" role="img" aria-label="최근 5년 기준금리 추이">
      <line x1="0" y1="30" x2="100" y2="30" stroke="currentColor" strokeOpacity="0.08" strokeWidth="1" />
      <polyline
        points={points}
        fill="none"
        stroke="currentColor"
        strokeWidth="2.25"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="text-blue-600"
      />
    </svg>
  );
}

function PolicyCard({ rate }: { rate: GlobalPolicyRate }) {
  return (
    <article className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-xl" aria-hidden="true">{rate.flag}</span>
            <h3 className="text-lg font-black text-slate-950">{rate.countryKo}</h3>
          </div>
          <p className="mt-1 text-xs text-slate-400">{rate.bankKo} · {rate.bankEn}</p>
        </div>
        <span className={`shrink-0 rounded-full border px-2.5 py-1 text-[10px] font-black ${trendTone(rate.trend)}`}>
          {rate.trendLabel}
        </span>
      </div>

      <div className="mt-5 flex items-end justify-between gap-3">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">POLICY RATE</p>
          <p className="mt-1 text-3xl font-black tracking-tight tabular-nums text-slate-950">
            {formatRate(rate.currentRate)}
          </p>
        </div>
        <div className="text-right">
          <p className="text-[10px] text-slate-400">BIS 관측일</p>
          <p className="mt-1 text-xs font-bold text-slate-600">{formatDate(rate.observedAt)}</p>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-2 text-xs">
        <div className="rounded-2xl bg-slate-50 p-3">
          <p className="text-[10px] font-bold text-slate-400">최근 변경</p>
          <p className="mt-1 font-black text-slate-800">{formatBp(rate.lastChangeBp)}</p>
          <p className="mt-1 text-[10px] text-slate-400">{formatDate(rate.lastChangeDate)}</p>
        </div>
        <div className="rounded-2xl bg-slate-50 p-3">
          <p className="text-[10px] font-bold text-slate-400">1년 변화</p>
          <p className="mt-1 font-black text-slate-800">{formatBp(rate.oneYearChangeBp)}</p>
          <p className="mt-1 text-[10px] text-slate-400">1년 전 {formatRate(rate.oneYearAgoRate)}</p>
        </div>
      </div>

      <div className="mt-4 rounded-2xl border border-slate-100 bg-white px-3 py-2">
        <div className="flex items-center justify-between gap-2">
          <p className="text-[10px] font-bold text-slate-400">최근 5년 추이</p>
          <span className="text-[9px] font-bold text-blue-600">BIS</span>
        </div>
        <Sparkline history={rate.history} />
      </div>

      <div className="mt-4 flex items-center justify-between gap-3 border-t border-slate-100 pt-3">
        <div>
          <p className="text-[10px] text-slate-400">다음 통화정책 회의</p>
          <p className="mt-0.5 text-sm font-black text-slate-800">{formatDate(rate.nextMeeting)}</p>
        </div>
        <a
          href={rate.meetingSourceUrl}
          target="_blank"
          rel="noreferrer"
          className="text-[11px] font-black text-blue-600 hover:text-blue-500"
        >
          공식 일정 →
        </a>
      </div>

      {rate.error && (
        <p className="mt-3 rounded-xl bg-amber-50 px-3 py-2 text-[10px] leading-4 text-amber-700">
          정책금리 원천을 다시 확인 중입니다. 회의 일정은 공식 중앙은행 일정 기준으로 표시합니다.
        </p>
      )}
    </article>
  );
}

export function GlobalPolicyRatesSkeleton() {
  return (
    <section className="mt-8">
      <div className="h-3 w-44 animate-pulse rounded bg-slate-200" />
      <div className="mt-3 h-8 w-56 animate-pulse rounded bg-slate-200" />
      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        {Array.from({ length: 4 }).map((_, index) => (
          <div key={index} className="h-72 animate-pulse rounded-3xl bg-white shadow-sm" />
        ))}
      </div>
    </section>
  );
}

export default async function GlobalPolicyRatesSection() {
  const rates = await getGlobalPolicyRates();
  const easing = rates.filter((rate) => rate.trend === "easing").length;
  const steady = rates.filter((rate) => rate.trend === "steady").length;
  const hiking = rates.filter((rate) => rate.trend === "hiking").length;

  const us = rates.find((rate) => rate.code === "US") ?? null;
  const spreadTargets = ["KR", "JP", "XM"]
    .map((code) => rates.find((rate) => rate.code === code))
    .filter((rate): rate is GlobalPolicyRate => Boolean(rate));

  return (
    <section className="mt-8">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.18em] text-blue-600">02 · GLOBAL POLICY RATES</p>
          <h2 className="mt-1 text-2xl font-black text-slate-950">글로벌 기준금리</h2>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-500">
            주요 중앙은행이 지금 인하·동결·인상 중 어디에 있는지 한눈에 봅니다. 정책금리는 BIS 장기 시계열,
            다음 회의일은 각 중앙은행의 공식 일정 기준입니다.
          </p>
        </div>
        <Link href="/data/calendar" className="text-sm font-black text-blue-600 hover:text-blue-500">
          전체 발표 일정 →
        </Link>
      </div>

      <div className="mt-4 grid grid-cols-3 gap-2">
        <div className="rounded-2xl border border-blue-100 bg-blue-50 p-3">
          <p className="text-[10px] font-bold text-blue-500">인하 중</p>
          <p className="mt-1 text-2xl font-black text-blue-800">{easing}</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-3">
          <p className="text-[10px] font-bold text-slate-400">동결</p>
          <p className="mt-1 text-2xl font-black text-slate-800">{steady}</p>
        </div>
        <div className="rounded-2xl border border-rose-100 bg-rose-50 p-3">
          <p className="text-[10px] font-bold text-rose-500">인상 중</p>
          <p className="mt-1 text-2xl font-black text-rose-800">{hiking}</p>
        </div>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        {rates.map((rate) => (
          <PolicyCard key={rate.code} rate={rate} />
        ))}
      </div>

      {us !== null && us.currentRate !== null && spreadTargets.length > 0 && (
        <div className="mt-4 rounded-3xl bg-slate-950 p-5 text-white sm:p-6">
          <p className="text-xs font-black uppercase tracking-[0.16em] text-blue-300">POLICY RATE GAP</p>
          <h3 className="mt-1 text-lg font-black">미국과 주요국 기준금리 차이</h3>
          <p className="mt-2 text-xs leading-5 text-slate-400">
            환율·캐리트레이드·외국인 자금흐름을 볼 때 참고할 수 있는 단순 정책금리 차이입니다.
          </p>
          <div className="mt-4 grid gap-2 sm:grid-cols-3">
            {spreadTargets.map((rate) => {
              const spread = rate.currentRate !== null ? us.currentRate - rate.currentRate : null;
              return (
                <div key={rate.code} className="rounded-2xl border border-white/10 bg-white/5 p-4">
                  <p className="text-xs font-bold text-slate-400">미국 - {rate.countryKo}</p>
                  <p className="mt-2 text-xl font-black tabular-nums">
                    {spread === null ? "—" : `${spread >= 0 ? "+" : ""}${spread.toFixed(2)}%p`}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <p className="mt-3 text-[10px] leading-4 text-slate-400">
        BIS 정책금리는 각 중앙은행과 협의해 선정된 대표 정책금리 시계열입니다. 기준금리는 장중 가격처럼 실시간으로 변하지 않으며,
        BIS 원천 갱신 전에는 최근 공식 관측값을 유지합니다.
      </p>
    </section>
  );
}
