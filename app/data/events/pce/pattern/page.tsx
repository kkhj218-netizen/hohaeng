import type { Metadata } from "next";
import Link from "next/link";

import { getPcePatternAnalysis, type PcePatternClassification } from "@/app/lib/pceAnalysisEngine";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "PCE 시장 반응 유형 | PCE 분석 V4 | 호행처럼",
  description: "유사 PCE TOP10의 7개 자산 반응을 인플레 완화형 Risk-On, 금리부담형 Risk-Off, 성장둔화형, 리플레이션형 등으로 자동 분류합니다.",
  alternates: { canonical: "/data/events/pce/pattern" },
};

function signed(value: number | null) { return value === null ? "—" : `${value > 0 ? "+" : ""}${value.toFixed(2)}%`; }
function tone(value: number | null) { return value === null || value === 0 ? "text-slate-400" : value > 0 ? "text-emerald-600" : "text-rose-600"; }
function patternTone(item: PcePatternClassification) {
  if (item.key === "easing_risk_on") return "border-emerald-200 bg-emerald-50 text-emerald-800";
  if (item.key === "rate_pressure_risk_off") return "border-rose-200 bg-rose-50 text-rose-800";
  if (item.key === "growth_slowdown") return "border-blue-200 bg-blue-50 text-blue-800";
  if (item.key === "reflation") return "border-orange-200 bg-orange-50 text-orange-800";
  if (item.key === "stagflation_pressure") return "border-amber-200 bg-amber-50 text-amber-900";
  return "border-slate-200 bg-slate-50 text-slate-700";
}
function persistenceTone(level: "높음"|"보통"|"낮음") { return level === "높음" ? "bg-emerald-100 text-emerald-800" : level === "보통" ? "bg-amber-100 text-amber-800" : "bg-rose-100 text-rose-800"; }

export default async function PcePatternPage() {
  const data = await getPcePatternAnalysis();
  if (!data) return <main className="min-h-screen bg-[#f6f7f9] px-4 py-10 text-slate-900"><div className="mx-auto max-w-5xl rounded-3xl bg-white p-6"><h1 className="text-2xl font-black">PCE 반응 유형 분석을 준비하고 있습니다.</h1><p className="mt-2 text-sm text-slate-500">PCE 백필이 완료되면 자동 계산됩니다.</p></div></main>;

  return <main className="min-h-screen bg-[#f6f7f9] pb-16 text-slate-900">
    <section className="border-b border-slate-200 bg-white"><div className="mx-auto max-w-6xl px-4 py-9 sm:px-6"><p className="text-xs font-black tracking-[0.2em] text-fuchsia-600">HOHAENG PCE ANALYSIS V4</p><h1 className="mt-2 text-3xl font-black sm:text-4xl">PCE 이후 시장은 어떤 유형으로 반응했나?</h1><p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600">PCE와 시장환경이 비슷했던 과거 TOP10에서 NQ·RTY·금·WTI·달러·2Y·10Y의 중앙 반응을 묶어 경제적 의미가 있는 패턴으로 자동 분류합니다.</p><div className="mt-5 flex flex-wrap gap-2"><Link href="/data/events/pce/regime" className="rounded-full bg-slate-950 px-4 py-2 text-sm font-black text-white">PCE + 시장환경 →</Link><Link href="/data/events/pce/similar" className="rounded-full bg-violet-600 px-4 py-2 text-sm font-black text-white">유사 사례 →</Link><Link href="/data/events/pce" className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-black text-fuchsia-700">PCE 메인 →</Link></div></div></section>

    <div className="mx-auto max-w-6xl space-y-8 px-4 py-7 sm:px-6">
      <section className="grid gap-4 lg:grid-cols-[0.75fr_1.25fr]">
        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6"><p className="text-xs font-black text-fuchsia-600">PATTERN PERSISTENCE</p><div className="mt-3 flex items-center gap-3"><span className={`rounded-full px-4 py-2 text-lg font-black ${persistenceTone(data.persistence.level)}`}>{data.persistence.level}</span><p className="text-sm font-bold text-slate-700">{data.persistence.label}</p></div><p className="mt-5 text-xs leading-5 text-slate-500">기초 비교 품질 {data.baseQuality.grade}등급 · {data.baseQuality.score.toFixed(1)}점</p></div>
        <div className="rounded-3xl bg-slate-950 p-5 text-white shadow-sm sm:p-6"><p className="text-xs font-black text-orange-300">AUTO INTERPRETATION</p><h2 className="mt-1 text-2xl font-black">과거 전형과 이번 반응을 비교</h2><div className="mt-4 space-y-3 text-sm leading-6 text-slate-300">{data.insights.map((item,index)=><p key={item}><strong className="mr-2 text-white">{index+1}.</strong>{item}</p>)}</div></div>
      </section>

      <section><p className="text-xs font-black text-fuchsia-600">REACTION TYPE BY HORIZON</p><h2 className="mt-1 text-2xl font-black">당일 → +1D → +5D 유형 변화</h2><div className="mt-5 grid gap-4 lg:grid-cols-3">{data.horizons.map(row=><div key={row.horizon} className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm"><div className="flex items-center justify-between"><p className="text-xl font-black">{row.label}</p><span className="rounded-full bg-slate-100 px-3 py-1.5 text-xs font-black text-slate-600">TOP10 중앙값</span></div><div className={`mt-4 rounded-2xl border p-4 ${patternTone(row.historical)}`}><p className="text-xs font-black">과거 전형</p><p className="mt-1 text-xl font-black">{row.historical.label}</p><p className="mt-2 text-xs leading-5 opacity-80">{row.historical.description}</p><p className="mt-2 text-[11px] font-bold">분류 강도 {row.historical.confidence}%</p></div>{row.current ? <div className={`mt-3 rounded-2xl border p-4 ${patternTone(row.current)}`}><p className="text-xs font-black">이번 실제 반응</p><p className="mt-1 text-lg font-black">{row.current.label}</p><p className="mt-2 text-xs leading-5 opacity-80">{row.current.description}</p></div> : <div className="mt-3 rounded-2xl border border-dashed border-slate-200 p-4 text-xs text-slate-400">이번 PCE의 이 시간구간 데이터가 아직 충분하지 않습니다.</div>}<div className="mt-4 flex flex-wrap gap-1.5">{row.historical.signals.map(signal=><span key={signal} className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-600">{signal}</span>)}</div></div>)}</div></section>

      <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6"><p className="text-xs font-black text-blue-600">CROSS ASSET MEDIANS</p><h2 className="mt-1 text-2xl font-black">패턴을 만든 실제 중앙값</h2><div className="mt-5 overflow-x-auto"><table className="w-full min-w-[760px] text-sm"><thead className="bg-slate-50 text-xs font-black text-slate-400"><tr><th className="px-4 py-3 text-left">자산</th>{data.horizons.map(row=><th key={row.horizon} className="px-4 py-3 text-right">{row.label}</th>)}</tr></thead><tbody>{data.horizons[0]?.medians.map((asset,index)=><tr key={asset.assetKey} className="border-t border-slate-100"><td className="px-4 py-3 font-black">{asset.assetName}</td>{data.horizons.map(row=>{const value=row.medians[index]?.value??null;return <td key={row.horizon} className={`px-4 py-3 text-right font-black ${tone(value)}`}>{signed(value)}</td>})}</tr>)}</tbody></table></div></section>

      <section className="rounded-3xl border border-slate-200 bg-white p-5 sm:p-6"><p className="text-xs font-black text-slate-500">분류 기준</p><div className="mt-3 grid gap-2 text-xs leading-5 text-slate-500 md:grid-cols-2"><p>• 주식↑ + 채권↑ + 달러↓ → 인플레 완화형 Risk-On</p><p>• 주식↓ + 채권↓ + 달러↑ → 금리부담형 Risk-Off</p><p>• 주식↓ + 채권↑ + WTI↓ → 성장둔화형 Risk-Off</p><p>• 주식↑ + WTI↑ + 채권 약세 → 리플레이션형 Risk-On</p><p>• 주식↓ + WTI↑ + 채권↓ → 스태그플레이션 압박형</p><p>• 한 방향으로 모이지 않으면 → 혼조 / 전환</p></div></section>

      <section className="rounded-3xl border border-slate-200 bg-white p-5 text-xs leading-6 text-slate-500 sm:p-6"><strong className="text-slate-800">주의:</strong> 패턴 이름은 과거 자산반응을 쉽게 읽기 위한 분류이며 매수·매도 신호가 아닙니다. 분류 강도가 높아도 사건별 다른 거시변수와 뉴스가 시장을 바꿀 수 있습니다.</section>
    </div>
  </main>;
}
