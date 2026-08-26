import type { Metadata } from "next";
import Link from "next/link";

import { getNfpFullAnalysis, type NfpPatternResult } from "@/app/lib/nfpAnalysis";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "고용보고서 시장 반응 유형 | Cross Asset 패턴 | 호행처럼",
  description: "고용보고서와 시장환경이 비슷했던 과거 사례의 나스닥·러셀·금·유가·달러·국채 반응을 Cross Asset 유형으로 분류합니다.",
  alternates: { canonical: "/data/events/nfp/pattern" },
};

function pct(value: number | null, digits = 2) {
  if (value === null) return "—";
  return `${value > 0 ? "+" : ""}${value.toFixed(digits)}%`;
}

function horizonLabel(result: NfpPatternResult) {
  return result.horizon === "close" ? "당일" : result.horizon === "oneDay" ? "+1거래일" : "+5거래일";
}

export default async function NfpPatternPage() {
  const analysis = await getNfpFullAnalysis();
  const pattern = analysis?.pattern ?? null;

  return (
    <main className="min-h-screen bg-[#f6f7f9] pb-16 text-slate-900">
      <section className="border-b border-slate-200 bg-white">
        <div className="mx-auto max-w-6xl px-4 py-9 sm:px-6">
          <p className="text-xs font-black uppercase tracking-[0.2em] text-fuchsia-600">NFP ANALYSIS V4</p>
          <h1 className="mt-2 text-3xl font-black tracking-tight sm:text-4xl">비슷했던 고용보고서 뒤 시장은 어떤 유형으로 움직였나?</h1>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600">고용 + 시장환경 종합 TOP10의 7개 자산 중앙값 방향을 이용해 고용둔화 Risk-On, 고용과열·금리부담, 성장둔화 등 반복되는 Cross Asset 전형과 비교합니다.</p>
          <div className="mt-5 flex flex-wrap gap-2">
            <Link href="/data/events/nfp" className="rounded-full bg-slate-950 px-4 py-2 text-sm font-black text-white">고용보고서 홈 →</Link>
            <Link href="/data/events/nfp/similar" className="rounded-full bg-violet-600 px-4 py-2 text-sm font-black text-white">비슷했던 과거 →</Link>
            <Link href="/data/events/nfp/regime" className="rounded-full bg-blue-600 px-4 py-2 text-sm font-black text-white">고용 + 시장환경 →</Link>
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-6xl space-y-8 px-4 py-7 sm:px-6">
        {!analysis || !pattern ? (
          <section className="rounded-3xl border border-dashed border-slate-300 bg-white p-6">
            <h2 className="text-xl font-black">반응 유형을 만들 데이터가 아직 부족합니다.</h2>
            <Link href="/admin/economic-events/nfp" className="mt-4 inline-flex rounded-xl bg-slate-950 px-4 py-2 text-sm font-black text-white">고용보고서 백필 →</Link>
          </section>
        ) : (
          <>
            <section className="grid gap-4 lg:grid-cols-[1.3fr_0.7fr]">
              <div className="rounded-3xl bg-slate-950 p-6 text-white shadow-sm">
                <p className="text-xs font-black uppercase tracking-wider text-fuchsia-300">PRIMARY PATTERN · +1D</p>
                <h2 className="mt-2 text-3xl font-black">{pattern.primary.label}</h2>
                <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-300">{pattern.primary.description}</p>
                <div className="mt-5 flex flex-wrap gap-2 text-xs font-black">
                  <span className="rounded-full bg-white/10 px-3 py-2">Fit {pattern.primary.fitScore.toFixed(1)}</span>
                  <span className="rounded-full bg-white/10 px-3 py-2">2위와 격차 {pattern.primary.margin.toFixed(1)}</span>
                </div>
              </div>
              <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
                <p className="text-xs font-black uppercase tracking-wider text-slate-400">PERSISTENCE</p>
                <h3 className="mt-2 text-xl font-black">시간이 지나도 같은 유형인가?</h3>
                <p className="mt-3 text-sm leading-6 text-slate-600">{pattern.persistenceLabel}</p>
              </div>
            </section>

            <section>
              <p className="text-xs font-black uppercase tracking-wider text-fuchsia-600">HORIZON PATTERN</p>
              <h2 className="mt-1 text-2xl font-black">당일 → +1D → +5D 변화</h2>
              <div className="mt-4 grid gap-3 md:grid-cols-3">
                {[pattern.close, pattern.oneDay, pattern.fiveDay].map((item) => (
                  <div key={item.horizon} className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                    <p className="text-xs font-black text-slate-400">{horizonLabel(item)}</p>
                    <h3 className="mt-1 text-xl font-black">{item.label}</h3>
                    <p className="mt-3 text-3xl font-black text-fuchsia-600">{item.fitScore.toFixed(1)}</p>
                    <p className="mt-1 text-xs text-slate-400">전형 적합도 · 확률 아님</p>
                  </div>
                ))}
              </div>
            </section>

            <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
              <p className="text-xs font-black uppercase tracking-wider text-blue-600">TOP10 ASSET MEDIAN · +1D</p>
              <h2 className="mt-1 text-2xl font-black">유사사례의 실제 자산 중앙값</h2>
              <div className="mt-5 grid grid-cols-2 gap-3 md:grid-cols-4">
                {pattern.oneDay.assetMedians.map((asset) => (
                  <div key={asset.assetKey} className="rounded-2xl bg-slate-50 p-4">
                    <p className="text-xs font-bold text-slate-400">{asset.assetName}</p>
                    <p className={`mt-1 text-xl font-black ${asset.medianReturn === null ? "text-slate-400" : asset.medianReturn > 0 ? "text-emerald-600" : asset.medianReturn < 0 ? "text-rose-600" : "text-slate-500"}`}>{pct(asset.medianReturn)}</p>
                  </div>
                ))}
              </div>
            </section>

            <section className="rounded-3xl border border-amber-200 bg-amber-50 p-5 text-xs leading-6 text-amber-900 sm:p-6">
              <strong>중요:</strong> {pattern.note} 고용지표가 비슷하다고 같은 시장 반응이 반복된다는 의미가 아니며, 유형은 매수·매도 신호가 아니라 과거 Cross Asset 반응을 요약하기 위한 비교 도구입니다.
            </section>
          </>
        )}
      </div>
    </main>
  );
}
