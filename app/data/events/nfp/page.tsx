import type { Metadata } from "next";
import Link from "next/link";

import { getNfpPageData, type NfpEventMetricView } from "@/app/lib/nfpEventDb";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "미국 고용보고서 EVENT DB | NFP·실업률·임금·시장반응 | 호행처럼",
  description:
    "미국 고용보고서의 비농업고용·실업률·시간당임금과 발표 후 나스닥·러셀·금·WTI·달러·국채선물 반응을 2016년 이후 축적합니다.",
  alternates: { canonical: "/data/events/nfp" },
};

function formatDate(value: string | null) {
  if (!value) return "—";
  return new Intl.DateTimeFormat("ko-KR", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(value));
}

function metricValue(metric: NfpEventMetricView | undefined, field: "actual" | "forecast" | "previous" | "surprise") {
  if (!metric || metric[field] === null) return "—";
  const value = metric[field] as number;
  if (metric.key === "payroll_change") return `${value > 0 && field === "surprise" ? "+" : ""}${Math.round(value).toLocaleString("ko-KR")}천명`;
  return `${value > 0 && field === "surprise" ? "+" : ""}${value.toFixed(2)}%`;
}

function signed(value: number | null, digits = 2) {
  if (value === null) return "—";
  return `${value > 0 ? "+" : ""}${value.toFixed(digits)}%`;
}

function tone(value: number | null) {
  if (value === null || value === 0) return "text-slate-400";
  return value > 0 ? "text-emerald-600" : "text-rose-600";
}

const METRIC_ORDER = ["payroll_change", "unemployment_rate", "ahe_mom", "ahe_yoy"];

export default async function NfpEventPage() {
  const data = await getNfpPageData();
  const latest = data.latest;
  const upcoming = data.upcoming;
  const latestMetrics = latest
    ? [...latest.metrics].sort((a, b) => METRIC_ORDER.indexOf(a.key) - METRIC_ORDER.indexOf(b.key))
    : [];

  return (
    <main className="min-h-screen bg-[#f6f7f9] pb-16 text-slate-900">
      <section className="border-b border-slate-200 bg-white">
        <div className="mx-auto max-w-6xl px-4 py-9 sm:px-6">
          <p className="text-xs font-black uppercase tracking-[0.2em] text-blue-600">HOHAENG JOBS EVENT DB</p>
          <h1 className="mt-2 text-3xl font-black tracking-tight sm:text-4xl">미국 고용보고서와 시장 반응</h1>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600">
            비농업고용 증감·실업률·시간당임금을 같은 발표 이벤트로 묶고, 발표 뒤 7개 자산이 실제로 어떻게 움직였는지 2016년 이후 축적합니다.
          </p>
          <div className="mt-5 flex flex-wrap gap-2">
            <Link href="/data/events" className="rounded-full bg-slate-950 px-4 py-2 text-sm font-black text-white">EVENT DB 홈 →</Link>
            <Link href="/data/events/cpi" className="rounded-full border border-blue-200 bg-blue-50 px-4 py-2 text-sm font-black text-blue-700">CPI →</Link>
            <Link href="/data/events/pce" className="rounded-full border border-violet-200 bg-violet-50 px-4 py-2 text-sm font-black text-violet-700">PCE →</Link>
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-6xl space-y-8 px-4 py-7 sm:px-6">
        {upcoming && (
          <section className="rounded-3xl border border-blue-200 bg-blue-50 p-5 sm:p-6">
            <p className="text-xs font-black uppercase tracking-wider text-blue-600">NEXT JOBS REPORT</p>
            <div className="mt-2 flex flex-wrap items-end justify-between gap-3">
              <div>
                <h2 className="text-2xl font-black">다음 미국 고용보고서 {formatDate(upcoming.releaseAt)}</h2>
                <p className="mt-1 text-sm text-blue-900/70">기준월 {upcoming.referencePeriod ?? "—"} · 발표시간 08:30 ET</p>
              </div>
              <span className="rounded-full bg-white px-3 py-2 text-xs font-black text-blue-700">예정</span>
            </div>
          </section>
        )}

        {!latest ? (
          <section className="rounded-3xl border border-dashed border-slate-300 bg-white p-6">
            <h2 className="text-xl font-black">고용보고서 역사 데이터가 아직 채워지지 않았습니다.</h2>
            <p className="mt-2 text-sm leading-6 text-slate-500">관리자 백필을 한 번 실행하면 2016년 이후 고용지표와 일봉 기준 시장반응이 채워집니다.</p>
            <Link href="/admin/economic-events/nfp" className="mt-4 inline-flex rounded-xl bg-slate-950 px-4 py-2.5 text-sm font-black text-white">관리자 고용보고서 백필 →</Link>
          </section>
        ) : (
          <>
            <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
              <div className="flex flex-wrap items-end justify-between gap-3">
                <div>
                  <p className="text-xs font-black uppercase tracking-wider text-emerald-600">LATEST RELEASED</p>
                  <h2 className="mt-1 text-2xl font-black">{formatDate(latest.releaseAt)} 미국 고용보고서</h2>
                  <p className="mt-1 text-xs text-slate-400">기준월 {latest.referencePeriod ?? "—"}</p>
                </div>
                <span className="rounded-full bg-slate-100 px-3 py-2 text-xs font-black text-slate-600">누적 {data.totalCount}개 이벤트</span>
              </div>

              <div className="mt-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
                {latestMetrics.map((metric) => (
                  <div key={metric.key} className="rounded-2xl bg-slate-50 p-4">
                    <p className="text-xs font-bold text-slate-400">{metric.name}</p>
                    <p className="mt-1 text-2xl font-black">{metricValue(metric, "actual")}</p>
                    <p className="mt-2 text-xs leading-5 text-slate-500">이전 {metricValue(metric, "previous")} · 예상 {metricValue(metric, "forecast")}</p>
                    {metric.surprise !== null && (
                      <p className={`mt-1 text-xs font-black ${tone(metric.key === "unemployment_rate" ? -metric.surprise : metric.surprise)}`}>
                        서프라이즈 {metricValue(metric, "surprise")}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </section>

            <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
              <p className="text-xs font-black uppercase tracking-wider text-violet-600">MARKET REACTION</p>
              <h2 className="mt-1 text-2xl font-black">발표 뒤 7개 자산 반응</h2>
              <p className="mt-2 text-xs leading-5 text-slate-500">발표 전 거래일 종가 대비 일봉 기준입니다. 발표 직후 +30분 정밀 반응은 향후 별도 데이터 원천으로 확장합니다.</p>
              <div className="mt-5 overflow-x-auto">
                <table className="w-full min-w-[680px] text-sm">
                  <thead className="bg-slate-50 text-xs font-black text-slate-400">
                    <tr>
                      <th className="px-4 py-3 text-left">자산</th>
                      <th className="px-4 py-3 text-right">당일</th>
                      <th className="px-4 py-3 text-right">+1D</th>
                      <th className="px-4 py-3 text-right">+5D</th>
                    </tr>
                  </thead>
                  <tbody>
                    {latest.reactions.map((reaction) => (
                      <tr key={reaction.assetKey} className="border-t border-slate-100">
                        <td className="px-4 py-3 font-black">{reaction.assetName}</td>
                        {[reaction.close, reaction.oneDay, reaction.fiveDay].map((item, index) => (
                          <td key={index} className={`px-4 py-3 text-right font-black tabular-nums ${tone(item)}`}>{signed(item)}</td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>

            <section>
              <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
                <div>
                  <p className="text-xs font-black uppercase tracking-wider text-slate-400">HISTORY</p>
                  <h2 className="mt-1 text-2xl font-black">최근 고용보고서 발표 기록</h2>
                </div>
                <span className="text-xs font-bold text-slate-400">2016년 이후 DB 기준</span>
              </div>
              <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                {data.history.slice(0, 18).map((event) => {
                  const payroll = event.metrics.find((metric) => metric.key === "payroll_change");
                  const unemployment = event.metrics.find((metric) => metric.key === "unemployment_rate");
                  const nq = event.reactions.find((reaction) => reaction.assetKey === "NQ");
                  return (
                    <div key={event.id} className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                      <p className="text-xs font-black text-blue-600">{formatDate(event.releaseAt)}</p>
                      <p className="mt-1 text-lg font-black">기준월 {event.referencePeriod ?? "—"}</p>
                      <div className="mt-4 grid grid-cols-3 gap-2 text-sm">
                        <div className="rounded-xl bg-slate-50 p-3">
                          <p className="text-[10px] text-slate-400">NFP</p>
                          <p className="mt-1 font-black">{metricValue(payroll, "actual")}</p>
                        </div>
                        <div className="rounded-xl bg-slate-50 p-3">
                          <p className="text-[10px] text-slate-400">실업률</p>
                          <p className="mt-1 font-black">{metricValue(unemployment, "actual")}</p>
                        </div>
                        <div className="rounded-xl bg-slate-50 p-3">
                          <p className="text-[10px] text-slate-400">NQ +1D</p>
                          <p className={`mt-1 font-black ${tone(nq?.oneDay ?? null)}`}>{signed(nq?.oneDay ?? null)}</p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          </>
        )}

        <section className="rounded-3xl border border-slate-200 bg-white p-5 text-xs leading-6 text-slate-500 sm:p-6">
          <strong className="text-slate-800">데이터 기준:</strong> PAYEMS·UNRATE·CES0500000003 FRED 시계열을 사용합니다. 비농업고용은 PAYEMS의 월간 증감으로 계산하며, 과거 고용통계는 개정될 수 있어 오래된 값은 현재 제공되는 시계열 기준 재구성값입니다. 발표 당시 빈티지와 차이가 있을 수 있습니다.
        </section>
      </div>
    </main>
  );
}
