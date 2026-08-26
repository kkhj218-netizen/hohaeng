import type { Metadata } from "next";
import Link from "next/link";

import { getPceSimilarityAnalysis, type PceHorizonStat } from "@/app/lib/pceAnalysisEngine";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "현재 PCE와 비슷했던 과거 사례 | PCE 분석 V2 | 호행처럼",
  description: "2016년 이후 PCE 유사 사례 TOP5·10·20 민감도, 7개 자산 상승확률·평균·중앙값·최대최소와 Cross Asset 방향을 분석합니다.",
  alternates: { canonical: "/data/events/pce/similar" },
};

function date(value: string) {
  return new Intl.DateTimeFormat("ko-KR", { timeZone: "Asia/Seoul", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date(value));
}
function pct(value: number | null, digits = 1) { return value === null ? "—" : `${value.toFixed(digits)}%`; }
function signed(value: number | null) { return value === null ? "—" : `${value > 0 ? "+" : ""}${value.toFixed(2)}%`; }
function tone(value: number | null) { return value === null || value === 0 ? "text-slate-400" : value > 0 ? "text-emerald-600" : "text-rose-600"; }
function qualityTone(grade: "A" | "B" | "C" | "D") {
  return grade === "A" ? "border-emerald-200 bg-emerald-50 text-emerald-800" : grade === "B" ? "border-blue-200 bg-blue-50 text-blue-800" : grade === "C" ? "border-amber-200 bg-amber-50 text-amber-800" : "border-rose-200 bg-rose-50 text-rose-800";
}
function Stat({ label, stat }: { label: string; stat: PceHorizonStat }) {
  return <div className="rounded-2xl bg-slate-50 p-4">
    <p className="text-xs font-black text-slate-400">{label}</p>
    <p className="mt-1 text-2xl font-black">{pct(stat.positiveRate)}</p>
    <p className="mt-1 text-xs text-slate-500">상승 {stat.positiveCount}/{stat.sampleSize}</p>
    <div className="mt-3 grid grid-cols-2 gap-2 text-xs text-slate-500">
      <span>평균 <strong className={tone(stat.averageReturn)}>{signed(stat.averageReturn)}</strong></span>
      <span>중앙값 <strong className={tone(stat.medianReturn)}>{signed(stat.medianReturn)}</strong></span>
      <span>최저 <strong className={tone(stat.minReturn)}>{signed(stat.minReturn)}</strong></span>
      <span>최고 <strong className={tone(stat.maxReturn)}>{signed(stat.maxReturn)}</strong></span>
    </div>
  </div>;
}

export default async function PceSimilarPage() {
  const data = await getPceSimilarityAnalysis();
  if (!data) return <main className="min-h-screen bg-[#f6f7f9] px-4 py-10 text-slate-900"><div className="mx-auto max-w-5xl rounded-3xl bg-white p-6"><h1 className="text-2xl font-black">PCE 분석 데이터를 준비하고 있습니다.</h1><p className="mt-2 text-sm text-slate-500">PCE 2016~현재 백필이 완료되면 자동 계산됩니다.</p></div></main>;

  const current = data.current.metrics;
  const nqTop10 = data.top10AssetStats.find((asset) => asset.assetKey === "NQ");

  return <main className="min-h-screen bg-[#f6f7f9] pb-16 text-slate-900">
    <section className="border-b border-slate-200 bg-white"><div className="mx-auto max-w-6xl px-4 py-9 sm:px-6">
      <p className="text-xs font-black uppercase tracking-[0.2em] text-violet-600">HOHAENG PCE ANALYSIS V2</p>
      <h1 className="mt-2 text-3xl font-black sm:text-4xl">현재 PCE와 비슷했던 과거</h1>
      <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600">헤드라인보다 근원 PCE에 조금 더 높은 가중치를 두고 2016년 이후 과거 사례를 비교합니다. TOP5·10·20으로 표본을 넓혀도 결과가 유지되는지와 7개 자산의 공통 반응까지 함께 봅니다.</p>
      <div className="mt-5 flex flex-wrap gap-2"><Link href="/data/events/pce" className="rounded-full bg-slate-950 px-4 py-2 text-sm font-black text-white">PCE 메인 →</Link><Link href="/data/events/pce/regime" className="rounded-full bg-blue-600 px-4 py-2 text-sm font-black text-white">PCE + 시장환경 →</Link><Link href="/data/events/pce/pattern" className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-black text-violet-700">반응 유형 →</Link></div>
    </div></section>

    <div className="mx-auto max-w-6xl space-y-8 px-4 py-7 sm:px-6">
      <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <div className="flex flex-wrap items-end justify-between gap-3"><div><p className="text-xs font-black text-violet-600">CURRENT PCE</p><h2 className="mt-1 text-2xl font-black">{date(data.current.releaseAt)} 발표</h2></div><span className="rounded-full bg-violet-50 px-3 py-2 text-xs font-black text-violet-700">기준월 {data.current.referencePeriod ?? "—"}</span></div>
        <div className="mt-5 grid grid-cols-2 gap-3 lg:grid-cols-4">{[
          ["헤드라인 YoY", current.headline_yoy], ["헤드라인 MoM", current.headline_mom], ["근원 YoY", current.core_yoy], ["근원 MoM", current.core_mom],
        ].map(([label, metric]) => <div key={String(label)} className="rounded-2xl bg-slate-50 p-4"><p className="text-xs font-bold text-slate-400">{String(label)}</p><p className="mt-1 text-2xl font-black">{pct((metric as typeof current.headline_yoy).actual, 2)}</p><p className="mt-2 text-xs text-slate-500">이전 {pct((metric as typeof current.headline_yoy).previous, 2)}</p></div>)}</div>
      </section>

      <section className="grid gap-4 lg:grid-cols-[0.8fr_1.2fr]">
        <div className={`rounded-3xl border p-5 shadow-sm sm:p-6 ${qualityTone(data.quality.grade)}`}><p className="text-xs font-black">COMPARISON QUALITY</p><div className="mt-2 flex items-end gap-3"><span className="text-5xl font-black">{data.quality.grade}</span><div><p className="text-xl font-black">{data.quality.label}</p><p className="text-sm font-bold">{data.quality.score.toFixed(1)} / 100</p></div></div><p className="mt-4 text-xs leading-5">TOP5 평균 유사도 {data.quality.top5Average.toFixed(1)}점 · 시장반응 커버리지 {data.quality.reactionCoverage.toFixed(1)}%</p></div>
        <div className="rounded-3xl bg-slate-950 p-5 text-white shadow-sm sm:p-6"><p className="text-xs font-black text-orange-300">AUTO INTERPRETATION</p><h2 className="mt-1 text-2xl font-black">이렇게 읽으면 됩니다</h2><div className="mt-4 space-y-3 text-sm leading-6 text-slate-300">{data.insights.map((item, index) => <p key={item}><strong className="mr-2 text-white">{index + 1}.</strong>{item}</p>)}</div></div>
      </section>

      <section><p className="text-xs font-black text-violet-600">TOP 10 MATCHES</p><h2 className="mt-1 text-2xl font-black">가장 비슷했던 과거 PCE 10회</h2><div className="mt-4 grid gap-3 md:grid-cols-2">{data.matches.map((item, index) => <div key={item.id} className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm"><div className="flex items-start justify-between gap-3"><div><p className="text-xs font-black text-violet-600">#{index + 1} · 유사도 {item.similarityScore.toFixed(1)}점</p><p className="mt-1 text-xl font-black">{date(item.releaseAt)}</p><p className="mt-1 text-xs text-slate-400">수준 {item.levelScore.toFixed(0)} · 추세 {item.trendScore?.toFixed(0) ?? "—"}{item.surpriseUsed ? ` · 서프라이즈 ${item.surpriseScore?.toFixed(0) ?? "—"}` : ""}</p></div><span className="rounded-full bg-violet-50 px-3 py-2 text-sm font-black text-violet-700">{item.similarityScore.toFixed(0)}</span></div><div className="mt-4 grid grid-cols-4 gap-2 text-center">{[item.metrics.headline_yoy.actual,item.metrics.headline_mom.actual,item.metrics.core_yoy.actual,item.metrics.core_mom.actual].map((v,i)=><div key={i} className="rounded-xl bg-slate-50 px-2 py-3"><p className="text-[10px] text-slate-400">{["H YoY","H MoM","C YoY","C MoM"][i]}</p><p className="mt-1 text-sm font-black">{pct(v,2)}</p></div>)}</div>{item.reactions.NQ && <div className="mt-4 grid grid-cols-3 gap-2 border-t border-slate-100 pt-4 text-center">{[["당일",item.reactions.NQ.close],["+1D",item.reactions.NQ.oneDay],["+5D",item.reactions.NQ.fiveDay]].map(([label,v])=><div key={String(label)}><p className="text-[10px] text-slate-400">NQ {String(label)}</p><p className={`mt-1 text-sm font-black ${tone(v as number|null)}`}>{signed(v as number|null)}</p></div>)}</div>}</div>)}</div></section>

      <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6"><p className="text-xs font-black text-blue-600">TOP5 / 10 / 20 SENSITIVITY</p><h2 className="mt-1 text-2xl font-black">표본을 넓혀도 결과가 유지될까?</h2><div className="mt-5 grid gap-3 md:grid-cols-3">{data.sensitivity.map((row)=>{const nq=row.assetStats.find((a)=>a.assetKey==="NQ");return <div key={row.size} className="rounded-2xl bg-slate-50 p-4"><p className="text-lg font-black">TOP {row.size}</p><p className="mt-1 text-xs text-slate-500">실제 {row.actualSize}회 · 평균 유사도 {row.averageSimilarity?.toFixed(1) ?? "—"}</p><div className="mt-4 space-y-2 text-sm"><p>NQ +1D 상승 <strong>{pct(nq?.oneDay.positiveRate ?? null)}</strong></p><p>NQ +1D 중앙값 <strong className={tone(nq?.oneDay.medianReturn ?? null)}>{signed(nq?.oneDay.medianReturn ?? null)}</strong></p><p>NQ +5D 상승 <strong>{pct(nq?.fiveDay.positiveRate ?? null)}</strong></p><p>NQ +5D 중앙값 <strong className={tone(nq?.fiveDay.medianReturn ?? null)}>{signed(nq?.fiveDay.medianReturn ?? null)}</strong></p></div></div>})}</div></section>

      {nqTop10 && <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6"><p className="text-xs font-black text-emerald-600">NQ TOP10 DISTRIBUTION</p><h2 className="mt-1 text-2xl font-black">나스닥 반응 분포</h2><div className="mt-5 grid gap-3 md:grid-cols-3"><Stat label="당일" stat={nqTop10.close}/><Stat label="+1D" stat={nqTop10.oneDay}/><Stat label="+5D" stat={nqTop10.fiveDay}/></div></section>}

      <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6"><p className="text-xs font-black text-amber-600">CROSS ASSET</p><h2 className="mt-1 text-2xl font-black">7개 자산 방향은 얼마나 모였나?</h2><div className="mt-5 grid gap-3 lg:grid-cols-3">{data.crossAsset.map((row)=><div key={row.horizon} className="rounded-2xl bg-slate-50 p-4"><p className="text-lg font-black">{row.label}</p><p className="mt-1 text-xs text-slate-500">상승 {row.positive} · 하락 {row.negative} · 중립 {row.neutral}</p><div className="mt-3 flex flex-wrap gap-1.5">{row.medians.map((item)=><span key={item.assetKey} className={`rounded-full bg-white px-2.5 py-1 text-xs font-bold ${tone(item.median)}`}>{item.assetKey} {signed(item.median)}</span>)}</div></div>)}</div></section>

      <section className="rounded-3xl border border-slate-200 bg-white p-5 text-xs leading-6 text-slate-500 sm:p-6"><strong className="text-slate-800">주의:</strong> 이 분석은 과거 유사 사례의 분포를 보는 도구이며 다음 시장 방향을 보장하지 않습니다. PCE 과거값은 현재 빈티지 시계열로 재구성된 값이 포함될 수 있습니다.</section>
    </div>
  </main>;
}
