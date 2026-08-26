import type { Metadata } from "next";
import Link from "next/link";

import {
  getCpiReactionPatternV4,
  type CpiReactionAssetStat,
  type CpiReactionPattern,
  type CpiReactionPatternKey,
} from "@/app/lib/cpiReactionPatternV4";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "CPI 시장 반응 유형 자동 분류 | 호행처럼",
  description:
    "CPI와 시장환경이 비슷했던 과거 사례의 나스닥·러셀·금·원유·달러·국채 반응을 묶어 인플레 완화형 Risk-On, 금리부담형 Risk-Off 등으로 자동 분류합니다.",
  alternates: { canonical: "/data/events/cpi/pattern" },
};

function signed(value: number | null, digits = 2) {
  if (value === null) return "—";
  return `${value > 0 ? "+" : ""}${value.toFixed(digits)}%`;
}

function returnTone(value: number | null) {
  if (value === null || Math.abs(value) < 0.001) return "text-slate-400";
  return value > 0 ? "text-emerald-600" : "text-rose-600";
}

function patternTone(key: CpiReactionPatternKey) {
  if (key === "disinflation_risk_on") return "border-emerald-200 bg-emerald-50 text-emerald-800";
  if (key === "rate_pressure_risk_off") return "border-rose-200 bg-rose-50 text-rose-800";
  if (key === "growth_scare") return "border-blue-200 bg-blue-50 text-blue-800";
  if (key === "reflation_risk_on") return "border-orange-200 bg-orange-50 text-orange-800";
  if (key === "stagflation_pressure") return "border-amber-200 bg-amber-50 text-amber-900";
  return "border-slate-200 bg-slate-50 text-slate-700";
}

function directionBadge(stat: CpiReactionAssetStat) {
  if (stat.direction === null) return "—";
  if (stat.direction === 0) return "→";
  return stat.direction > 0 ? "↑" : "↓";
}

function PatternCard({ pattern, eyebrow }: { pattern: CpiReactionPattern; eyebrow: string }) {
  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-black uppercase tracking-wider text-slate-400">{eyebrow} · {pattern.label}</p>
          <h3 className="mt-2 text-xl font-black">{pattern.title}</h3>
        </div>
        <span className={`rounded-full border px-3 py-2 text-xs font-black ${patternTone(pattern.patternKey)}`}>
          적합도 {pattern.fitScore.toFixed(1)}
        </span>
      </div>
      <p className="mt-3 text-sm leading-6 text-slate-600">{pattern.explanation}</p>
      <div className="mt-4 flex flex-wrap gap-2">
        {pattern.assetStats.map((stat) => (
          <span key={stat.assetKey} className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-black text-slate-600">
            {stat.assetKey} {directionBadge(stat)} {signed(stat.medianReturn)}
          </span>
        ))}
      </div>
      <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2 border-t border-slate-100 pt-4 text-xs text-slate-500">
        <span>데이터 커버리지 <strong className="text-slate-800">{pattern.coverageRate.toFixed(1)}%</strong></span>
        {pattern.runnerUpTitle && (
          <span>차선 유형 <strong className="text-slate-800">{pattern.runnerUpTitle} {pattern.runnerUpScore?.toFixed(1) ?? "—"}</strong></span>
        )}
      </div>
    </div>
  );
}

function assetValue(pattern: CpiReactionPattern, assetKey: string) {
  return pattern.assetStats.find((item) => item.assetKey === assetKey) ?? null;
}

export default async function CpiReactionPatternPage() {
  let analysis: Awaited<ReturnType<typeof getCpiReactionPatternV4>> = null;
  let loadError = "";
  try {
    analysis = await getCpiReactionPatternV4();
  } catch (error) {
    loadError = error instanceof Error ? error.message : String(error);
  }

  if (!analysis) {
    return (
      <main className="min-h-screen bg-[#f6f7f9] px-4 py-10 text-slate-900">
        <div className="mx-auto max-w-5xl rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <h1 className="text-2xl font-black">CPI 반응 유형 분석을 준비하고 있습니다.</h1>
          <p className="mt-2 text-sm text-slate-500">CPI V3 유사 사례와 7개 자산 반응이 연결되면 자동으로 분류됩니다.</p>
          {loadError && <p className="mt-3 rounded-xl bg-amber-50 px-3 py-2 text-xs text-amber-800">{loadError}</p>}
        </div>
      </main>
    );
  }

  const assetKeys = analysis.historical[0]?.assetStats.map((item) => ({ key: item.assetKey, name: item.assetName })) ?? [];

  return (
    <main className="min-h-screen bg-[#f6f7f9] pb-16 text-slate-900">
      <section className="border-b border-slate-200 bg-white">
        <div className="mx-auto max-w-6xl px-4 py-9 sm:px-6">
          <p className="text-xs font-black uppercase tracking-[0.2em] text-orange-600">HOHAENG CPI REACTION TYPE V4</p>
          <h1 className="mt-2 text-3xl font-black tracking-tight sm:text-4xl">비슷한 CPI 때 시장은 어떤 ‘유형’으로 반응했을까?</h1>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600">
            단순 상승·하락 개수를 세지 않습니다. 나스닥·러셀·금·WTI·달러·2년물·10년물 국채선물의 방향을 경제적 조합으로 묶어
            Risk-On, 금리부담, 성장둔화, 리플레이션, 스태그플레이션 패턴으로 자동 분류합니다.
          </p>
          <div className="mt-5 flex flex-wrap gap-2">
            <span className="rounded-full bg-slate-950 px-4 py-2 text-xs font-black text-white">유사 TOP {analysis.sampleSize} 기준</span>
            <span className="rounded-full border border-slate-200 bg-white px-4 py-2 text-xs font-black text-slate-600">V3 비교 품질 {analysis.sourceQuality.grade} · {analysis.sourceQuality.score.toFixed(1)}점</span>
            <Link href="/data/events/cpi/regime" className="rounded-full border border-violet-200 bg-violet-50 px-4 py-2 text-xs font-black text-violet-700">CPI + 시장환경 V3 →</Link>
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-6xl space-y-8 px-4 py-7 sm:px-6">
        <section className="rounded-3xl bg-slate-950 p-5 text-white sm:p-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-xs font-black uppercase tracking-wider text-orange-300">PATTERN PERSISTENCE</p>
              <h2 className="mt-1 text-2xl font-black">{analysis.persistence.label}</h2>
              <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-300">{analysis.persistence.description}</p>
            </div>
            <span className="rounded-full border border-slate-700 bg-slate-900 px-4 py-2 text-xs font-black text-slate-300">당일 → +1D → +5D</span>
          </div>
          <div className="mt-5 space-y-3">
            {analysis.summary.map((item, index) => (
              <div key={`${index}-${item}`} className="flex gap-3 rounded-2xl border border-slate-800 bg-slate-900 px-4 py-3 text-sm leading-6 text-slate-300">
                <span className="font-black text-orange-300">{index + 1}</span>
                <p>{item}</p>
              </div>
            ))}
          </div>
        </section>

        <section>
          <div className="mb-4">
            <p className="text-xs font-black uppercase tracking-wider text-emerald-600">HISTORICAL TEMPLATE</p>
            <h2 className="mt-1 text-2xl font-black">과거 유사 사례의 전형적인 반응</h2>
          </div>
          <div className="grid gap-3 lg:grid-cols-3">
            {analysis.historical.map((pattern) => <PatternCard key={pattern.horizon} pattern={pattern} eyebrow="유사 TOP10" />)}
          </div>
        </section>

        <section>
          <div className="mb-4">
            <p className="text-xs font-black uppercase tracking-wider text-blue-600">CURRENT OBSERVED</p>
            <h2 className="mt-1 text-2xl font-black">이번 CPI의 실제 반응은 같은 유형인가?</h2>
            <p className="mt-2 text-sm text-slate-500">아직 지나지 않은 +1D·+5D 구간은 데이터가 부족해 혼조/판단 보류로 표시될 수 있습니다.</p>
          </div>
          <div className="grid gap-3 lg:grid-cols-3">
            {analysis.currentObserved.map((pattern) => <PatternCard key={pattern.horizon} pattern={pattern} eyebrow="현재 실제" />)}
          </div>
        </section>

        <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="text-xs font-black uppercase tracking-wider text-violet-600">CROSS ASSET MATRIX</p>
              <h2 className="mt-1 text-2xl font-black">유사 TOP10 자산별 중앙값 반응</h2>
            </div>
            <span className="text-xs font-bold text-slate-400">유형 분류는 중앙값 방향 기준</span>
          </div>
          <div className="mt-5 overflow-x-auto">
            <table className="w-full min-w-[680px] text-sm">
              <thead>
                <tr className="text-xs font-black text-slate-400">
                  <th className="px-3 py-3 text-left">자산</th>
                  {analysis.historical.map((pattern) => <th key={pattern.horizon} className="px-3 py-3 text-right">{pattern.label}</th>)}
                </tr>
              </thead>
              <tbody>
                {assetKeys.map((asset) => (
                  <tr key={asset.key} className="border-t border-slate-100">
                    <td className="px-3 py-4 font-black">{asset.name} <span className="ml-1 text-[10px] text-slate-400">{asset.key}</span></td>
                    {analysis.historical.map((pattern) => {
                      const stat = assetValue(pattern, asset.key);
                      return (
                        <td key={pattern.horizon} className={`px-3 py-4 text-right font-black tabular-nums ${returnTone(stat?.medianReturn ?? null)}`}>
                          {directionBadge(stat ?? { direction: null } as CpiReactionAssetStat)} {signed(stat?.medianReturn ?? null)}
                          <span className="ml-2 text-[10px] font-bold text-slate-400">n={stat?.sampleSize ?? 0}</span>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-4 text-xs leading-5 text-slate-500">ZT·ZN은 미국 2년물·10년물 국채선물 가격입니다. 선물 가격 상승은 일반적으로 금리 하락 방향과 연결되므로 현물 금리와 동일 방향으로 읽으면 안 됩니다.</p>
        </section>

        <section>
          <div className="mb-4">
            <p className="text-xs font-black uppercase tracking-wider text-slate-500">PATTERN GUIDE</p>
            <h2 className="mt-1 text-2xl font-black">5가지 반응 유형 기준</h2>
          </div>
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {analysis.patternGuide.map((item) => (
              <div key={item.key} className={`rounded-3xl border p-5 ${patternTone(item.key)}`}>
                <p className="text-lg font-black">{item.title}</p>
                <p className="mt-2 text-sm leading-6 opacity-80">{item.description}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-3xl border border-slate-200 bg-white p-5 text-xs leading-6 text-slate-500 sm:p-6">
          <strong className="text-slate-800">해석 주의:</strong> 유형 적합도는 미래 방향 예측 확률이 아닙니다. 과거 유사 사례의 여러 자산 반응을 경제적 패턴으로 요약하기 위한 분류 점수입니다. 당시 정책·유동성·지정학 환경에 따라 같은 CPI에서도 반응은 달라질 수 있습니다.
        </section>
      </div>
    </main>
  );
}
