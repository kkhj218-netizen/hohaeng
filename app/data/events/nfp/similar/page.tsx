import type { Metadata } from "next";
import Link from "next/link";

import { getNfpFullAnalysis, type NfpMetricSnapshot } from "@/app/lib/nfpAnalysis";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "고용보고서 비슷했던 과거 | NFP 유사사례 분석 | 호행처럼",
  description: "비농업고용·실업률·시간당임금을 함께 비교해 현재 고용보고서와 비슷했던 과거 사례와 자산 반응을 찾습니다.",
  alternates: { canonical: "/data/events/nfp/similar" },
};

function date(value: string) {
  return new Intl.DateTimeFormat("ko-KR", { timeZone: "Asia/Seoul", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date(value));
}

function pct(value: number | null, digits = 2) {
  if (value === null) return "—";
  return `${value > 0 ? "+" : ""}${value.toFixed(digits)}%`;
}

function metricValue(metrics: NfpMetricSnapshot, key: keyof NfpMetricSnapshot) {
  const value = metrics[key].actual;
  if (value === null) return "—";
  return key === "payroll_change" ? `${Math.round(value).toLocaleString("ko-KR")}천명` : `${value.toFixed(2)}%`;
}

function qualityTone(grade: "A" | "B" | "C" | "D") {
  return grade === "A" ? "bg-emerald-50 text-emerald-700" : grade === "B" ? "bg-blue-50 text-blue-700" : grade === "C" ? "bg-amber-50 text-amber-700" : "bg-rose-50 text-rose-700";
}

export default async function NfpSimilarPage() {
  const analysis = await getNfpFullAnalysis();

  return (
    <main className="min-h-screen bg-[#f6f7f9] pb-16 text-slate-900">
      <section className="border-b border-slate-200 bg-white">
        <div className="mx-auto max-w-6xl px-4 py-9 sm:px-6">
          <p className="text-xs font-black uppercase tracking-[0.2em] text-violet-600">NFP ANALYSIS V2</p>
          <h1 className="mt-2 text-3xl font-black tracking-tight sm:text-4xl">지금 고용보고서와 비슷했던 과거는?</h1>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600">비농업고용·실업률·시간당임금의 수준과 변화 방향을 함께 비교합니다. 검증 가능한 컨센서스가 있는 경우에만 서프라이즈도 유사도에 반영합니다.</p>
          <div className="mt-5 flex flex-wrap gap-2">
            <Link href="/data/events/nfp" className="rounded-full bg-slate-950 px-4 py-2 text-sm font-black text-white">고용보고서 홈 →</Link>
            <Link href="/data/events/nfp/regime" className="rounded-full bg-blue-600 px-4 py-2 text-sm font-black text-white">고용 + 시장환경 →</Link>
            <Link href="/data/events/nfp/pattern" className="rounded-full bg-fuchsia-600 px-4 py-2 text-sm font-black text-white">시장 반응 유형 →</Link>
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-6xl space-y-8 px-4 py-7 sm:px-6">
        {!analysis ? (
          <section className="rounded-3xl border border-dashed border-slate-300 bg-white p-6">
            <h2 className="text-xl font-black">분석할 고용보고서 데이터가 아직 부족합니다.</h2>
            <p className="mt-2 text-sm text-slate-500">관리자에서 2016년 이후 고용보고서 백필을 먼저 실행해 주세요.</p>
            <Link href="/admin/economic-events/nfp" className="mt-4 inline-flex rounded-xl bg-slate-950 px-4 py-2 text-sm font-black text-white">백필 실행 →</Link>
          </section>
        ) : (
          <>
            <section className="grid gap-4 lg:grid-cols-[1.5fr_0.8fr]">
              <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
                <p className="text-xs font-black uppercase tracking-wider text-violet-600">CURRENT JOBS REPORT</p>
                <h2 className="mt-1 text-2xl font-black">{date(analysis.current.releaseAt)} 발표</h2>
                <div className="mt-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
                  <div className="rounded-2xl bg-slate-50 p-4"><p className="text-xs text-slate-400">비농업고용</p><p className="mt-1 text-xl font-black">{metricValue(analysis.current.metrics, "payroll_change")}</p></div>
                  <div className="rounded-2xl bg-slate-50 p-4"><p className="text-xs text-slate-400">실업률</p><p className="mt-1 text-xl font-black">{metricValue(analysis.current.metrics, "unemployment_rate")}</p></div>
                  <div className="rounded-2xl bg-slate-50 p-4"><p className="text-xs text-slate-400">임금 MoM</p><p className="mt-1 text-xl font-black">{metricValue(analysis.current.metrics, "ahe_mom")}</p></div>
                  <div className="rounded-2xl bg-slate-50 p-4"><p className="text-xs text-slate-400">임금 YoY</p><p className="mt-1 text-xl font-black">{metricValue(analysis.current.metrics, "ahe_yoy")}</p></div>
                </div>
              </div>
              <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
                <p className="text-xs font-black uppercase tracking-wider text-slate-400">COMPARISON QUALITY</p>
                <div className="mt-3 flex items-end gap-3">
                  <span className={`rounded-2xl px-4 py-2 text-3xl font-black ${qualityTone(analysis.quality.grade)}`}>{analysis.quality.grade}</span>
                  <div><p className="text-2xl font-black">{analysis.quality.score.toFixed(1)}</p><p className="text-xs text-slate-400">{analysis.quality.label}</p></div>
                </div>
                <div className="mt-4 space-y-1 text-xs leading-5 text-slate-500">{analysis.quality.reasons.map((reason) => <p key={reason}>• {reason}</p>)}</div>
              </div>
            </section>

            <section className="rounded-3xl bg-slate-950 p-5 text-white sm:p-6">
              <p className="text-xs font-black uppercase tracking-wider text-orange-300">AUTO INSIGHTS</p>
              <div className="mt-3 space-y-3 text-sm leading-6 text-slate-200">{analysis.insights.map((insight) => <p key={insight}>• {insight}</p>)}</div>
            </section>

            <section>
              <p className="text-xs font-black uppercase tracking-wider text-slate-400">SENSITIVITY</p>
              <h2 className="mt-1 text-2xl font-black">TOP5 · TOP10 · TOP20을 같이 봅니다</h2>
              <div className="mt-4 grid gap-3 md:grid-cols-3">
                {analysis.sensitivity.map((window) => {
                  const nq = window.assetStats.find((item) => item.assetKey === "NQ");
                  return (
                    <div key={window.size} className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                      <div className="flex items-center justify-between"><h3 className="text-xl font-black">TOP {window.size}</h3><span className="text-xs font-bold text-slate-400">실제 {window.actualSize}건</span></div>
                      <p className="mt-3 text-xs text-slate-400">평균 유사도</p><p className="text-2xl font-black">{window.averageSimilarity?.toFixed(1) ?? "—"}</p>
                      <div className="mt-4 grid grid-cols-2 gap-2 rounded-2xl bg-slate-50 p-3 text-sm">
                        <div><p className="text-[10px] text-slate-400">NQ +1D 상승</p><p className="mt-1 font-black">{nq?.oneDay.positiveRate?.toFixed(1) ?? "—"}%</p></div>
                        <div><p className="text-[10px] text-slate-400">NQ +1D 중앙값</p><p className="mt-1 font-black">{pct(nq?.oneDay.medianReturn ?? null)}</p></div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>

            <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
              <p className="text-xs font-black uppercase tracking-wider text-blue-600">CROSS ASSET</p>
              <h2 className="mt-1 text-2xl font-black">유사한 과거 10번에서 자산 방향은 얼마나 모였나?</h2>
              <div className="mt-4 grid gap-3 sm:grid-cols-3">
                {analysis.crossAsset.map((item) => (
                  <div key={item.key} className="rounded-2xl bg-slate-50 p-4">
                    <p className="text-xs font-bold text-slate-400">{item.label}</p>
                    <p className="mt-1 text-2xl font-black">{item.agreementRate?.toFixed(1) ?? "—"}%</p>
                    <p className="mt-2 text-xs text-slate-500">상승 {item.positiveAssets} · 하락 {item.negativeAssets} · 중립 {item.neutralAssets}</p>
                  </div>
                ))}
              </div>
            </section>

            <section>
              <p className="text-xs font-black uppercase tracking-wider text-violet-600">TOP MATCHES</p>
              <h2 className="mt-1 text-2xl font-black">가장 비슷했던 과거 고용보고서</h2>
              <div className="mt-4 grid gap-3 md:grid-cols-2">
                {analysis.matches.slice(0, 10).map((item, index) => {
                  const nq = item.reactions.NQ;
                  return (
                    <article key={item.id} className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                      <div className="flex items-start justify-between gap-3">
                        <div><p className="text-xs font-black text-violet-600">#{index + 1} · {date(item.releaseAt)}</p><h3 className="mt-1 text-xl font-black">유사도 {item.similarityScore.toFixed(1)}</h3></div>
                        <span className="rounded-full bg-violet-50 px-3 py-1 text-xs font-black text-violet-700">레벨 {item.levelScore.toFixed(0)}</span>
                      </div>
                      <div className="mt-4 grid grid-cols-2 gap-2 text-sm sm:grid-cols-4">
                        <div className="rounded-xl bg-slate-50 p-3"><p className="text-[10px] text-slate-400">NFP</p><p className="mt-1 font-black">{metricValue(item.metrics, "payroll_change")}</p></div>
                        <div className="rounded-xl bg-slate-50 p-3"><p className="text-[10px] text-slate-400">실업률</p><p className="mt-1 font-black">{metricValue(item.metrics, "unemployment_rate")}</p></div>
                        <div className="rounded-xl bg-slate-50 p-3"><p className="text-[10px] text-slate-400">임금 YoY</p><p className="mt-1 font-black">{metricValue(item.metrics, "ahe_yoy")}</p></div>
                        <div className="rounded-xl bg-slate-50 p-3"><p className="text-[10px] text-slate-400">NQ +1D</p><p className="mt-1 font-black">{pct(nq?.oneDay ?? null)}</p></div>
                      </div>
                    </article>
                  );
                })}
              </div>
            </section>

            <section className="rounded-3xl border border-slate-200 bg-white p-5 text-xs leading-6 text-slate-500 sm:p-6">
              <strong className="text-slate-800">해석 기준:</strong> 유사도는 예측 확률이 아닙니다. 고용·실업률·임금의 수준과 변화 방향이 얼마나 닮았는지 보여주는 비교 점수이며, 과거 고용통계는 현재 FRED 빈티지 기준 재구성값이라 발표 당시 최초치와 차이가 날 수 있습니다.
            </section>
          </>
        )}
      </div>
    </main>
  );
}
