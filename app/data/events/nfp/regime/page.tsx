import type { Metadata } from "next";
import Link from "next/link";

import { getNfpFullAnalysis, type NfpRegimeSnapshot } from "@/app/lib/nfpAnalysis";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "고용보고서 + 시장환경 | 금리·VIX·달러·나스닥 유사환경 | 호행처럼",
  description: "고용보고서 숫자뿐 아니라 2년물·10년물 금리, VIX, Fed Funds, DXY, 나스닥 추세까지 비슷했던 과거를 함께 비교합니다.",
  alternates: { canonical: "/data/events/nfp/regime" },
};

function date(value: string) {
  return new Intl.DateTimeFormat("ko-KR", { timeZone: "Asia/Seoul", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date(value));
}

function number(value: number | null, suffix = "", digits = 2) {
  return value === null ? "—" : `${value.toFixed(digits)}${suffix}`;
}

const REGIME_FIELDS: Array<{ key: keyof NfpRegimeSnapshot; label: string; suffix: string; digits?: number }> = [
  { key: "twoYear", label: "미 2Y", suffix: "%" },
  { key: "tenYear", label: "미 10Y", suffix: "%" },
  { key: "curve10y2y", label: "10Y-2Y", suffix: "%p", digits: 3 },
  { key: "vix", label: "VIX", suffix: "", digits: 1 },
  { key: "fedFunds", label: "Fed Funds", suffix: "%" },
  { key: "dxy", label: "DXY", suffix: "", digits: 1 },
  { key: "nq20d", label: "NQ 20D", suffix: "%" },
  { key: "nq60d", label: "NQ 60D", suffix: "%" },
];

export default async function NfpRegimePage() {
  const analysis = await getNfpFullAnalysis();
  const regime = analysis?.regime ?? null;

  return (
    <main className="min-h-screen bg-[#f6f7f9] pb-16 text-slate-900">
      <section className="border-b border-slate-200 bg-white">
        <div className="mx-auto max-w-6xl px-4 py-9 sm:px-6">
          <p className="text-xs font-black uppercase tracking-[0.2em] text-blue-600">NFP ANALYSIS V3</p>
          <h1 className="mt-2 text-3xl font-black tracking-tight sm:text-4xl">고용도 비슷하고, 시장환경도 비슷했던 과거는?</h1>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600">고용지표 유사도 60%와 발표 직전 시장환경 40%를 합쳐 비교합니다. 시장환경은 발표일보다 앞선 관측치만 사용해 발표 이후 정보를 섞지 않습니다.</p>
          <div className="mt-5 flex flex-wrap gap-2">
            <Link href="/data/events/nfp" className="rounded-full bg-slate-950 px-4 py-2 text-sm font-black text-white">고용보고서 홈 →</Link>
            <Link href="/data/events/nfp/similar" className="rounded-full bg-violet-600 px-4 py-2 text-sm font-black text-white">비슷했던 과거 →</Link>
            <Link href="/data/events/nfp/pattern" className="rounded-full bg-fuchsia-600 px-4 py-2 text-sm font-black text-white">반응 유형 →</Link>
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-6xl space-y-8 px-4 py-7 sm:px-6">
        {!analysis || !regime ? (
          <section className="rounded-3xl border border-dashed border-slate-300 bg-white p-6">
            <h2 className="text-xl font-black">분석할 고용보고서 데이터가 아직 부족합니다.</h2>
            <Link href="/admin/economic-events/nfp" className="mt-4 inline-flex rounded-xl bg-slate-950 px-4 py-2 text-sm font-black text-white">고용보고서 백필 →</Link>
          </section>
        ) : (
          <>
            <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
              <div className="flex flex-wrap items-end justify-between gap-3">
                <div>
                  <p className="text-xs font-black uppercase tracking-wider text-blue-600">PRE-RELEASE REGIME</p>
                  <h2 className="mt-1 text-2xl font-black">{date(analysis.current.releaseAt)} 발표 직전 시장환경</h2>
                  <p className="mt-1 text-xs text-slate-400">마지막 관측일 {regime.current.asOfDate ?? "—"} · 커버리지 {regime.current.coverageRate.toFixed(1)}%</p>
                </div>
                <div className="rounded-2xl bg-blue-50 px-4 py-3 text-right"><p className="text-xs font-bold text-blue-500">종합 비교 품질</p><p className="text-2xl font-black text-blue-700">{regime.quality.grade} · {regime.quality.score.toFixed(1)}</p></div>
              </div>
              <div className="mt-5 grid grid-cols-2 gap-3 md:grid-cols-4">
                {REGIME_FIELDS.map((field) => {
                  const value = regime.current[field.key];
                  return (
                    <div key={field.key} className="rounded-2xl bg-slate-50 p-4">
                      <p className="text-xs font-bold text-slate-400">{field.label}</p>
                      <p className="mt-1 text-xl font-black">{typeof value === "number" ? number(value, field.suffix, field.digits ?? 2) : "—"}</p>
                    </div>
                  );
                })}
              </div>
            </section>

            <section className="rounded-3xl bg-slate-950 p-5 text-white sm:p-6">
              <p className="text-xs font-black uppercase tracking-wider text-orange-300">AUTO INSIGHTS</p>
              <div className="mt-3 space-y-3 text-sm leading-6 text-slate-200">{regime.insights.map((insight) => <p key={insight}>• {insight}</p>)}</div>
            </section>

            <section>
              <p className="text-xs font-black uppercase tracking-wider text-blue-600">COMBINED TOP MATCHES</p>
              <h2 className="mt-1 text-2xl font-black">고용 + 시장환경 종합 TOP10</h2>
              <div className="mt-4 grid gap-3 md:grid-cols-2">
                {regime.matches.slice(0, 10).map((item, index) => {
                  const nq = item.reactions.NQ;
                  return (
                    <article key={item.id} className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                      <div className="flex items-start justify-between gap-3">
                        <div><p className="text-xs font-black text-blue-600">#{index + 1} · {date(item.releaseAt)}</p><h3 className="mt-1 text-xl font-black">종합 {item.combinedScore.toFixed(1)}</h3></div>
                        <div className="text-right text-xs leading-5 text-slate-500"><p>고용 {item.similarityScore.toFixed(1)}</p><p>환경 {item.regimeScore?.toFixed(1) ?? "—"}</p></div>
                      </div>
                      <div className="mt-4 grid grid-cols-2 gap-2 text-sm sm:grid-cols-4">
                        <div className="rounded-xl bg-slate-50 p-3"><p className="text-[10px] text-slate-400">2Y</p><p className="mt-1 font-black">{number(item.regime.twoYear, "%")}</p></div>
                        <div className="rounded-xl bg-slate-50 p-3"><p className="text-[10px] text-slate-400">VIX</p><p className="mt-1 font-black">{number(item.regime.vix, "", 1)}</p></div>
                        <div className="rounded-xl bg-slate-50 p-3"><p className="text-[10px] text-slate-400">DXY</p><p className="mt-1 font-black">{number(item.regime.dxy, "", 1)}</p></div>
                        <div className="rounded-xl bg-slate-50 p-3"><p className="text-[10px] text-slate-400">NQ +1D</p><p className="mt-1 font-black">{number(nq?.oneDay ?? null, "%")}</p></div>
                      </div>
                    </article>
                  );
                })}
              </div>
            </section>

            <section className="rounded-3xl border border-slate-200 bg-white p-5 text-xs leading-6 text-slate-500 sm:p-6">
              <strong className="text-slate-800">주의:</strong> 시장환경은 FRED의 현재 시계열과 Yahoo Finance 일봉을 이용합니다. ALFRED 빈티지 재구성이 아니므로 과거 금리·거시 시계열 개정 가능성이 있고, 60/40 가중치는 비교용 휴리스틱이지 최적화된 예측모형이 아닙니다.
            </section>
          </>
        )}
      </div>
    </main>
  );
}
