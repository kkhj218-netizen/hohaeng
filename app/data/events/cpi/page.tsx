import type { Metadata } from "next";
import Link from "next/link";

import { getCpiEventAnalysis } from "@/app/lib/economicEventEngine";
import type {
  CpiComparableHorizon,
  CpiMetricView,
  CpiReactionView,
} from "@/app/lib/economicEventTypes";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "미국 CPI 발표 결과와 나스닥 반응 데이터 | 호행처럼",
  description:
    "미국 CPI 실제·예상·이전값과 발표 30분, 당일, 1거래일, 5거래일 뒤 나스닥·금·달러·원유 등 시장 반응을 한 화면에서 비교합니다.",
  alternates: {
    canonical: "/data/events/cpi",
  },
};

function formatKst(value: string) {
  return new Intl.DateTimeFormat("ko-KR", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date(value));
}

function metricLabel(metric: CpiMetricView) {
  if (metric.key === "headline_yoy") return "헤드라인 YoY";
  if (metric.key === "headline_mom") return "헤드라인 MoM";
  if (metric.key === "core_yoy") return "근원 YoY";
  return "근원 MoM";
}

function percent(value: number | null, digits = 1) {
  if (value === null) return "—";
  return `${value.toFixed(digits)}%`;
}

function signedPercent(value: number | null, digits = 2) {
  if (value === null) return "—";
  const sign = value > 0 ? "+" : "";
  return `${sign}${value.toFixed(digits)}%`;
}

function signedPoint(value: number | null) {
  if (value === null) return "—";
  const sign = value > 0 ? "+" : "";
  return `${sign}${value.toFixed(2)}%p`;
}

function reactionTone(value: number | null) {
  if (value === null || value === 0) return "text-slate-400";
  return value > 0 ? "text-emerald-600" : "text-rose-600";
}

function surpriseTone(value: number | null) {
  if (value === null || value === 0) return "text-slate-500";
  return value > 0 ? "text-rose-600" : "text-blue-600";
}

function ReactionCell({ value }: { value: number | null }) {
  return (
    <span className={`font-black tabular-nums ${reactionTone(value)}`}>
      {signedPercent(value)}
    </span>
  );
}

function HorizonCard({ horizon }: { horizon: CpiComparableHorizon }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <p className="text-xs font-black uppercase tracking-wider text-slate-400">
        {horizon.label}
      </p>
      <p className="mt-2 text-2xl font-black text-slate-950">
        {horizon.positiveRate === null ? "—" : `${horizon.positiveRate.toFixed(1)}%`}
      </p>
      <p className="mt-1 text-xs text-slate-500">
        상승 {horizon.positiveCount} / 표본 {horizon.sampleSize}
      </p>
      <div className="mt-3 flex gap-3 text-xs">
        <span className="text-slate-500">평균</span>
        <ReactionCell value={horizon.averageReturn} />
        <span className="text-slate-500">중앙값</span>
        <ReactionCell value={horizon.medianReturn} />
      </div>
    </div>
  );
}

function ReactionRow({ reaction }: { reaction: CpiReactionView }) {
  return (
    <tr className="border-t border-slate-100">
      <td className="whitespace-nowrap px-3 py-4 font-black text-slate-900">
        {reaction.assetName}
        <span className="ml-2 text-[10px] font-bold text-slate-400">{reaction.assetKey}</span>
      </td>
      <td className="px-3 py-4 text-right"><ReactionCell value={reaction.return30m} /></td>
      <td className="px-3 py-4 text-right"><ReactionCell value={reaction.returnClose} /></td>
      <td className="px-3 py-4 text-right"><ReactionCell value={reaction.return1d} /></td>
      <td className="px-3 py-4 text-right"><ReactionCell value={reaction.return5d} /></td>
    </tr>
  );
}

export default async function CpiEventPage() {
  let analysis: Awaited<ReturnType<typeof getCpiEventAnalysis>> = null;
  let loadError = "";

  try {
    analysis = await getCpiEventAnalysis();
  } catch (error) {
    loadError = error instanceof Error ? error.message : String(error);
  }

  return (
    <main className="min-h-screen bg-[#f6f7f9] pb-16 text-slate-900">
      <section className="border-b border-slate-200 bg-white">
        <div className="mx-auto max-w-6xl px-4 py-9 sm:px-6">
          <p className="text-xs font-black uppercase tracking-[0.2em] text-orange-600">
            HOHAENG EVENT DB · CPI
          </p>
          <h1 className="mt-2 text-3xl font-black tracking-tight sm:text-4xl">
            CPI 발표 뒤 시장은 실제로 어떻게 움직였을까?
          </h1>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600">
            CPI 숫자만 나열하지 않습니다. 실제·컨센서스·이전값과 발표 직전 대비 30분,
            당일 16:00 ET, 1거래일, 5거래일 뒤 주요 자산 반응을 같은 기준으로 축적합니다.
          </p>
          <div className="mt-5 flex flex-wrap gap-2">
            <Link
              href="/data/calendar"
              className="rounded-full bg-slate-950 px-4 py-2 text-sm font-black text-white hover:bg-slate-800"
            >
              다음 경제지표 일정 →
            </Link>
            <Link
              href="/data"
              className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-black text-blue-600 hover:border-blue-300"
            >
              전체 투자 데이터 →
            </Link>
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-6xl space-y-6 px-4 py-7 sm:px-6">
        {!analysis ? (
          <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-xl font-black">CPI 이벤트 DB를 준비하고 있습니다.</h2>
            <p className="mt-2 text-sm leading-6 text-slate-500">
              최초 동기화 후 CPI 발표값과 시장 반응이 이 화면에 자동으로 쌓입니다.
            </p>
            {loadError && (
              <p className="mt-3 rounded-xl bg-amber-50 px-3 py-2 text-xs text-amber-800">
                데이터 준비 상태: {loadError}
              </p>
            )}
          </section>
        ) : (
          <>
            <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
              <div className="border-b border-slate-100 bg-slate-950 px-5 py-5 text-white sm:px-6">
                <p className="text-xs font-bold uppercase tracking-wider text-orange-300">LATEST CPI</p>
                <div className="mt-2 flex flex-wrap items-end justify-between gap-3">
                  <div>
                    <h2 className="text-2xl font-black">{formatKst(analysis.event.releaseAt)} 발표</h2>
                    <p className="mt-1 text-xs text-slate-400">
                      기준월 {analysis.event.referencePeriod ?? "—"}
                    </p>
                  </div>
                  {analysis.event.sourceUrl && (
                    <a
                      href={analysis.event.sourceUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="text-xs font-bold text-slate-300 hover:text-white"
                    >
                      {analysis.event.sourceName ?? "공식 원천"} ↗
                    </a>
                  )}
                </div>
              </div>

              <div className="grid gap-px bg-slate-100 sm:grid-cols-2 lg:grid-cols-4">
                {analysis.metrics.map((metric) => (
                  <div key={metric.key} className="bg-white p-5">
                    <p className="text-xs font-black text-slate-500">{metricLabel(metric)}</p>
                    <div className="mt-3 flex items-baseline gap-2">
                      <span className="text-3xl font-black tabular-nums text-slate-950">
                        {percent(metric.actual)}
                      </span>
                      {metric.forecast !== null && (
                        <span className={`text-sm font-black ${surpriseTone(metric.surprise)}`}>
                          {signedPoint(metric.surprise)}
                        </span>
                      )}
                    </div>
                    <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                      <div>
                        <span className="text-slate-400">예상</span>
                        <p className="mt-1 font-black text-slate-700">{percent(metric.forecast)}</p>
                      </div>
                      <div>
                        <span className="text-slate-400">이전</span>
                        <p className="mt-1 font-black text-slate-700">{percent(metric.previous)}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
              <div className="flex flex-wrap items-end justify-between gap-3">
                <div>
                  <p className="text-xs font-black uppercase tracking-wider text-blue-600">MARKET REACTION</p>
                  <h2 className="mt-1 text-2xl font-black">발표 직전 대비 시장 반응</h2>
                </div>
                <p className="text-xs text-slate-400">Yahoo Finance 분봉 · 거래가능 가격의 근사치</p>
              </div>

              <div className="mt-5 overflow-x-auto">
                <table className="min-w-[760px] w-full text-sm">
                  <thead>
                    <tr className="text-left text-xs font-black text-slate-400">
                      <th className="px-3 py-3">자산</th>
                      <th className="px-3 py-3 text-right">+30분</th>
                      <th className="px-3 py-3 text-right">당일 16ET</th>
                      <th className="px-3 py-3 text-right">+1거래일</th>
                      <th className="px-3 py-3 text-right">+5거래일</th>
                    </tr>
                  </thead>
                  <tbody>
                    {analysis.reactions.length > 0 ? (
                      analysis.reactions.map((reaction) => (
                        <ReactionRow key={reaction.assetKey} reaction={reaction} />
                      ))
                    ) : (
                      <tr className="border-t border-slate-100">
                        <td colSpan={5} className="px-3 py-8 text-center text-sm text-slate-400">
                          시장 반응을 수집 중입니다. 다음 자동 동기화 때 채워집니다.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              <div className="mt-4 rounded-2xl bg-slate-50 px-4 py-3 text-xs leading-5 text-slate-500">
                ZT·ZN은 각각 미국 2년물·10년물 국채 <strong>선물 가격</strong>입니다. 현물 금리와 방향이
                반대로 움직일 수 있으므로 금리 그 자체로 해석하면 안 됩니다. V2에서 실제 수익률 반응도
                별도 저장할 예정입니다.
              </div>
            </section>

            <section>
              <div className="mb-4">
                <p className="text-xs font-black uppercase tracking-wider text-emerald-600">PAST SIMILAR EVENTS</p>
                <h2 className="mt-1 text-2xl font-black">비슷한 CPI 서프라이즈 이후 나스닥100</h2>
              </div>

              {analysis.comparable && analysis.comparable.eventCount > 0 ? (
                <>
                  <p className="mb-4 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm leading-6 text-slate-600 shadow-sm">
                    비교 기준: <strong className="text-slate-900">{analysis.comparable.rule}</strong>
                    <br />
                    과거 비교 이벤트 {analysis.comparable.eventCount}개. 실제 반응 데이터가 존재하는 표본만
                    각 기간 통계에 포함합니다.
                  </p>
                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                    {analysis.comparable.horizons.map((horizon) => (
                      <HorizonCard key={horizon.key} horizon={horizon} />
                    ))}
                  </div>
                </>
              ) : (
                <div className="rounded-3xl border border-dashed border-slate-300 bg-white p-6 text-sm text-slate-500">
                  컨센서스와 과거 반응이 쌓이면 ‘예상보다 높았던 CPI 이후 나스닥은 실제로 어땠는가’를
                  자동 계산합니다.
                </div>
              )}
            </section>

            <section className="rounded-3xl bg-slate-950 p-6 text-white">
              <p className="text-xs font-black uppercase tracking-wider text-orange-300">WHY THIS DATA?</p>
              <h2 className="mt-2 text-2xl font-black">숫자보다 ‘같은 기준으로 계속 쌓는 것’이 핵심입니다.</h2>
              <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-300">
                한 번의 CPI 반응으로 방향을 예측하는 도구가 아닙니다. 매 발표마다 동일한 시점과 동일한
                자산을 기록해 시간이 지날수록 비교 가능한 호행처럼만의 이벤트 데이터셋을 만드는 것이
                목적입니다.
              </p>
            </section>
          </>
        )}
      </div>
    </main>
  );
}
