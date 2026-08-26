import type { Metadata } from "next";
import Link from "next/link";

import { getPceRegimeAnalysis, type PcePathPoint } from "@/app/lib/pceAnalysisEngine";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "PCE + 시장환경 유사도 | PCE 분석 V3 | 호행처럼",
  description: "PCE 유사도와 2Y·10Y 금리, VIX, Fed Funds, DXY, 나스닥 추세를 결합해 과거 유사 시장환경과 이후 가격경로를 분석합니다.",
  alternates: { canonical: "/data/events/pce/regime" },
};

function date(value: string) {
  return new Intl.DateTimeFormat("ko-KR", { timeZone: "Asia/Seoul", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date(value));
}
function signed(value: number | null, digits = 2) { return value === null ? "—" : `${value > 0 ? "+" : ""}${value.toFixed(digits)}%`; }
function pct(value: number | null, digits = 1) { return value === null ? "—" : `${value.toFixed(digits)}%`; }
function tone(value: number | null) { return value === null || value === 0 ? "text-slate-400" : value > 0 ? "text-emerald-600" : "text-rose-600"; }
function qualityTone(grade: "A"|"B"|"C"|"D") { return grade === "A" ? "border-emerald-200 bg-emerald-50 text-emerald-800" : grade === "B" ? "border-blue-200 bg-blue-50 text-blue-800" : grade === "C" ? "border-amber-200 bg-amber-50 text-amber-800" : "border-rose-200 bg-rose-50 text-rose-800"; }

function PathChart({ points }: { points: PcePathPoint[] }) {
  const width = 900, height = 340, padX = 44, padY = 30;
  const all = points.flatMap((p) => [p.q25,p.q75,p.median,p.current]).filter((v):v is number=>v!==null);
  const min = all.length ? Math.min(...all, 96) : 96;
  const max = all.length ? Math.max(...all, 104) : 104;
  const span = Math.max(1, max-min);
  const x = (i:number) => padX + (i/(Math.max(1,points.length-1)))*(width-padX*2);
  const y = (v:number) => height-padY-((v-min)/span)*(height-padY*2);
  const line = (key:"median"|"current") => points.map((p,i)=>p[key]===null?null:`${x(i)},${y(p[key] as number)}`).filter(Boolean).join(" ");
  const areaTop = points.map((p,i)=>p.q75===null?null:`${x(i)},${y(p.q75)}`).filter(Boolean);
  const areaBottom = [...points].reverse().map((p,ri)=>{const i=points.length-1-ri;return p.q25===null?null:`${x(i)},${y(p.q25)}`}).filter(Boolean);
  return <div className="overflow-x-auto"><svg viewBox={`0 0 ${width} ${height}`} className="min-w-[760px] w-full" role="img" aria-label="PCE 유사 사례 NQ 가격경로">
    <line x1={padX} y1={y(100)} x2={width-padX} y2={y(100)} stroke="currentColor" opacity="0.15" strokeDasharray="5 5" />
    {areaTop.length && areaBottom.length ? <polygon points={[...areaTop,...areaBottom].join(" ")} fill="currentColor" opacity="0.07" /> : null}
    <polyline points={line("median")} fill="none" stroke="currentColor" strokeWidth="3" />
    <polyline points={line("current")} fill="none" stroke="currentColor" strokeWidth="2" strokeDasharray="7 5" opacity="0.7" />
    {points.map((p,i)=><g key={p.label}><text x={x(i)} y={height-7} textAnchor="middle" fontSize="11" fill="currentColor" opacity="0.55">{p.label}</text>{p.median!==null&&<circle cx={x(i)} cy={y(p.median)} r="3" fill="currentColor"/>}</g>)}
  </svg></div>;
}

export default async function PceRegimePage() {
  const data = await getPceRegimeAnalysis();
  if (!data) return <main className="min-h-screen bg-[#f6f7f9] px-4 py-10 text-slate-900"><div className="mx-auto max-w-5xl rounded-3xl bg-white p-6"><h1 className="text-2xl font-black">PCE 시장환경 분석을 준비하고 있습니다.</h1><p className="mt-2 text-sm text-slate-500">PCE 백필이 완료되면 자동 계산됩니다.</p></div></main>;
  const r=data.current.regime;
  return <main className="min-h-screen bg-[#f6f7f9] pb-16 text-slate-900">
    <section className="border-b border-slate-200 bg-white"><div className="mx-auto max-w-6xl px-4 py-9 sm:px-6"><p className="text-xs font-black tracking-[0.2em] text-blue-600">HOHAENG PCE ANALYSIS V3</p><h1 className="mt-2 text-3xl font-black sm:text-4xl">PCE + 시장환경까지 비슷했던 과거</h1><p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600">PCE 유사도 60%와 발표 전 시장환경 유사도 40%를 합쳐 비교합니다. 발표 후 움직임은 유사도 계산에 넣지 않습니다.</p><div className="mt-5 flex flex-wrap gap-2"><Link href="/data/events/pce/similar" className="rounded-full bg-slate-950 px-4 py-2 text-sm font-black text-white">PCE 유사 사례 →</Link><Link href="/data/events/pce/pattern" className="rounded-full bg-violet-600 px-4 py-2 text-sm font-black text-white">반응 유형 →</Link><Link href="/data/events/pce" className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-black text-blue-700">PCE 메인 →</Link></div></div></section>

    <div className="mx-auto max-w-6xl space-y-8 px-4 py-7 sm:px-6">
      <section className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6"><p className="text-xs font-black text-blue-600">CURRENT PRE-RELEASE REGIME</p><h2 className="mt-1 text-2xl font-black">{date(data.current.releaseAt)} 발표 전 환경</h2><div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">{[
          ["2Y",r.twoYear===null?"—":`${r.twoYear.toFixed(2)}%`],["10Y",r.tenYear===null?"—":`${r.tenYear.toFixed(2)}%`],["10Y-2Y",r.curve10y2y===null?"—":`${r.curve10y2y.toFixed(2)}%p`],["VIX",r.vix?.toFixed(1)??"—"],["Fed Funds",r.fedFunds===null?"—":`${r.fedFunds.toFixed(2)}%`],["DXY",r.dxy?.toFixed(1)??"—"],["NQ 20D",signed(r.nq20d,1)],["NQ 60D",signed(r.nq60d,1)]
        ].map(([label,v])=><div key={String(label)} className="rounded-2xl bg-slate-50 p-4"><p className="text-xs font-bold text-slate-400">{String(label)}</p><p className="mt-1 text-xl font-black">{String(v)}</p></div>)}</div><p className="mt-4 text-xs text-slate-400">환경 데이터 커버리지 {r.coverage.toFixed(1)}% · 기준일 {r.asOfDate ?? "—"}</p></div>
        <div className={`rounded-3xl border p-5 shadow-sm sm:p-6 ${qualityTone(data.quality.grade)}`}><p className="text-xs font-black">COMBINED QUALITY</p><div className="mt-2 flex items-end gap-3"><span className="text-5xl font-black">{data.quality.grade}</span><div><p className="text-xl font-black">{data.quality.label}</p><p className="text-sm font-bold">{data.quality.score.toFixed(1)} / 100</p></div></div><p className="mt-5 text-xs leading-5">PCE {data.methodology.pceWeight}% + 시장환경 {data.methodology.regimeWeight}% · {data.methodology.regimeInputs.join(" · ")}</p></div>
      </section>

      <section className="rounded-3xl bg-slate-950 p-5 text-white shadow-sm sm:p-6"><p className="text-xs font-black text-orange-300">AUTO INTERPRETATION</p><h2 className="mt-1 text-2xl font-black">종합 유사도를 이렇게 읽으면 됩니다</h2><div className="mt-4 space-y-3 text-sm leading-6 text-slate-300">{data.insights.map((item,index)=><p key={item}><strong className="mr-2 text-white">{index+1}.</strong>{item}</p>)}</div></section>

      <section><p className="text-xs font-black text-blue-600">COMBINED TOP 10</p><h2 className="mt-1 text-2xl font-black">PCE와 시장환경이 함께 비슷했던 과거</h2><div className="mt-4 grid gap-3 md:grid-cols-2">{data.matches.slice(0,10).map((item,index)=><div key={item.id} className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm"><div className="flex justify-between gap-3"><div><p className="text-xs font-black text-blue-600">#{index+1} · 종합 {item.combinedScore.toFixed(1)}점</p><p className="mt-1 text-xl font-black">{date(item.releaseAt)}</p><p className="mt-1 text-xs text-slate-400">PCE {item.pceScore.toFixed(1)} · 시장환경 {item.regimeScore?.toFixed(1)??"—"}</p></div><span className="rounded-full bg-blue-50 px-3 py-2 text-sm font-black text-blue-700">{item.combinedScore.toFixed(0)}</span></div><div className="mt-4 grid grid-cols-2 gap-2 text-sm"><div className="rounded-xl bg-slate-50 p-3">NQ +1D <strong className={tone(item.reactions.NQ?.oneDay??null)}>{signed(item.reactions.NQ?.oneDay??null)}</strong></div><div className="rounded-xl bg-slate-50 p-3">NQ +5D <strong className={tone(item.reactions.NQ?.fiveDay??null)}>{signed(item.reactions.NQ?.fiveDay??null)}</strong></div></div></div>)}</div></section>

      <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6"><p className="text-xs font-black text-violet-600">TOP5 / 10 / 20</p><h2 className="mt-1 text-2xl font-black">종합 표본 민감도</h2><div className="mt-5 grid gap-3 md:grid-cols-3">{data.sensitivity.map(row=><div key={row.size} className="rounded-2xl bg-slate-50 p-4"><p className="text-lg font-black">TOP {row.size}</p><p className="mt-1 text-xs text-slate-500">평균 종합 {row.averageCombined?.toFixed(1)??"—"} · 최저 {row.minimumCombined?.toFixed(1)??"—"}</p><div className="mt-4 space-y-2 text-sm"><p>NQ +1D 상승 <strong>{pct(row.nq1dPositiveRate)}</strong></p><p>NQ +1D 중앙값 <strong className={tone(row.nq1dMedian)}>{signed(row.nq1dMedian)}</strong></p><p>NQ +5D 상승 <strong>{pct(row.nq5dPositiveRate)}</strong></p><p>NQ +5D 중앙값 <strong className={tone(row.nq5dMedian)}>{signed(row.nq5dMedian)}</strong></p></div></div>)}</div></section>

      <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6"><p className="text-xs font-black text-emerald-600">NQ PATH</p><h2 className="mt-1 text-2xl font-black">유사 TOP10의 발표 후 가격경로</h2><p className="mt-2 text-xs leading-5 text-slate-500">발표 전 거래일 종가를 100으로 맞춘 뒤 중앙값과 25~75% 구간을 표시합니다. 점선은 현재 PCE 이후 실제 경로입니다.</p><div className="mt-5 text-blue-700"><PathChart points={data.path}/></div></section>

      <section className="rounded-3xl border border-slate-200 bg-white p-5 text-xs leading-6 text-slate-500 sm:p-6"><strong className="text-slate-800">해석 원칙:</strong> 시장환경은 PCE 발표 이전 마지막 관측값만 사용합니다. 종합 유사도가 높아도 과거 결과가 미래를 보장하지 않으며, 무료 시계열·연속선물 특성상 데이터 품질 한계가 있습니다.</section>
    </div>
  </main>;
}
