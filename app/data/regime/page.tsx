import type { Metadata } from "next";
import Link from "next/link";

import {
  getMarketRegimeAnalysisV1,
  type MarketRegimeFactor,
  type MarketRegimeHorizonStat,
} from "@/app/lib/marketRegimeV1";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "현재 시장국면 | 금리·VIX·유동성·달러·경기 | 호행처럼",
  description:
    "Trend·Inflation·Rates·Liquidity·Volatility·Dollar·Growth 7개 축으로 현재 시장환경을 정리하고, 과거 비슷했던 국면과 이후 자산 반응을 비교합니다.",
  alternates: { canonical: "/data/regime" },
};

function formatDate(value: string) {
  return new Intl.DateTimeFormat("ko-KR", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(`${value}T12:00:00Z`));
}

function scoreClass(score: number | null) {
  if (score === null) return "text-slate-400";
  if (score >= 60) return "text-emerald-600";
  if (score <= 40) return "text-rose-600";
  return "text-amber-600";
}

function scoreBg(score: number | null) {
  if (score === null) return "bg-slate-100";
  if (score >= 60) return "bg-emerald-500";
  if (score <= 40) return "bg-rose-500";
  return "bg-amber-400";
}

function signed(value: number | null, digits = 2) {
  if (value === null) return "—";
  return `${value > 0 ? "+" : ""}${value.toFixed(digits)}%`;
}

function statText(stat: MarketRegimeHorizonStat) {
  if (!stat.sampleSize || stat.positiveRate === null || stat.medianReturn === null) return "—";
  return `상승 ${stat.positiveRate.toFixed(0)}% · 중앙 ${signed(stat.medianReturn)}`;
}

function FactorCard({ item }: { item: MarketRegimeFactor }) {
  const width = item.score === null ? 0 : Math.max(0, Math.min(100, item.score));
  return (
    <article className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[11px] font-black uppercase tracking-wider text-slate-400">{item.name}</p>
          <h3 className="mt-1 text-lg font-black">{item.key === "trend" ? "시장 추세" : item.key === "inflation" ? "물가 기대" : item.key === "rates" ? "금리 환경" : item.key === "liquidity" ? "유동성" : item.key === "volatility" ? "변동성" : item.key === "dollar" ? "달러" : "경기·고용"}</h3>
        </div>
        <p className={`text-3xl font-black tabular-nums ${scoreClass(item.score)}`}>{item.score ?? "—"}</p>
      </div>
      <div className="mt-4 h-2 overflow-hidden rounded-full bg-slate-100">
        <div className={`h-full rounded-full ${scoreBg(item.score)}`} style={{ width: `${width}%` }} />
      </div>
      <p className="mt-3 text-sm leading-6 text-slate-600">{item.summary}</p>
      <div className="mt-4 flex flex-wrap gap-2">
        {item.metrics.map((metric) => (
          <span key={metric.label} className="rounded-full bg-slate-50 px-3 py-1.5 text-[11px] font-bold text-slate-500">
            {metric.label} <strong className="text-slate-800">{metric.value}</strong>
          </span>
        ))}
      </div>
      <p className="mt-3 text-[10px] font-bold text-slate-400">전체 점수 가중치 {item.weight}%</p>
    </article>
  );
}

export default async function MarketRegimePage() {
  const data = await getMarketRegimeAnalysisV1();

  if (!data) {
    return (
      <main className="min-h-screen bg-[#f6f7f9] px-4 py-12 text-slate-900">
        <section className="mx-auto max-w-3xl rounded-3xl border border-slate-200 bg-white p-7">
          <p className="text-xs font-black uppercase tracking-wider text-blue-600">HOHAENG MARKET REGIME</p>
          <h1 className="mt-2 text-3xl font-black">현재 시장환경을 불러오지 못했습니다.</h1>
          <p className="mt-3 text-sm leading-6 text-slate-500">FRED 또는 시장가격 원천이 일시적으로 응답하지 않을 수 있습니다. 기존 TODAY와 EVENT DB는 그대로 사용할 수 있습니다.</p>
          <Link href="/today" className="mt-5 inline-flex rounded-xl bg-slate-950 px-4 py-2.5 text-sm font-black text-white">TODAY로 돌아가기 →</Link>
        </section>
      </main>
    );
  }

  const current = data.current;
  const best = data.matches[0] ?? null;

  return (
    <main className="min-h-screen bg-[#f6f7f9] pb-20 text-slate-900">
      <section className="bg-slate-950 text-white">
        <div className="mx-auto max-w-6xl px-4 py-9 sm:px-6 sm:py-11">
          <div className="flex flex-wrap items-end justify-between gap-5">
            <div className="max-w-3xl">
              <p className="text-xs font-black uppercase tracking-[0.2em] text-blue-300">HOHAENG MARKET REGIME</p>
              <h1 className="mt-2 text-3xl font-black tracking-tight sm:text-4xl">지금 시장은 어떤 환경인가?</h1>
              <p className="mt-3 text-sm leading-6 text-slate-300">
                한 지표로 시장을 단정하지 않고 추세·물가·금리·유동성·변동성·달러·경기를 함께 봅니다. 점수는 위험자산에 얼마나 우호적인 환경인지 정리한 비교용 지표입니다.
              </p>
              <div className="mt-5 flex flex-wrap gap-2">
                <Link href="/today" className="rounded-full bg-white px-4 py-2 text-sm font-black text-slate-950">TODAY →</Link>
                <Link href="/data/events" className="rounded-full border border-white/15 px-4 py-2 text-sm font-black text-slate-200">EVENT DB →</Link>
                <Link href="/data" className="rounded-full border border-white/15 px-4 py-2 text-sm font-black text-slate-200">투자 데이터 →</Link>
              </div>
            </div>

            <div className="min-w-[220px] rounded-3xl border border-white/10 bg-white/[0.06] p-5">
              <p className="text-xs font-bold text-slate-400">{formatDate(current.asOfDate)} 미국장 기준</p>
              <div className="mt-2 flex items-end gap-2">
                <p className="text-5xl font-black tabular-nums">{current.score}</p>
                <p className="pb-1 text-sm font-black text-slate-400">/ 100</p>
              </div>
              <p className={`mt-2 text-lg font-black ${current.regime === "Risk-On" ? "text-emerald-300" : current.regime === "Risk-Off" ? "text-rose-300" : "text-amber-200"}`}>{current.label}</p>
              <p className="mt-2 text-xs text-slate-400">데이터 커버리지 {current.coverage}% · 비교 신뢰도 {current.confidence}%</p>
            </div>
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-6xl space-y-8 px-4 py-7 sm:px-6">
        <section className="grid gap-4 sm:grid-cols-3">
          <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-xs font-black uppercase tracking-wider text-slate-400">20D CHANGE</p>
            <p className={`mt-2 text-2xl font-black ${data.transition.direction === "improving" ? "text-emerald-600" : data.transition.direction === "worsening" ? "text-rose-600" : "text-slate-900"}`}>{data.transition.label}</p>
            <p className="mt-2 text-sm text-slate-500">{data.previous20d ? `${data.previous20d.score} → ${current.score}점 (${data.transition.delta !== null && data.transition.delta > 0 ? "+" : ""}${data.transition.delta ?? "—"})` : "20거래일 전 비교값 없음"}</p>
          </div>
          <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-xs font-black uppercase tracking-wider text-slate-400">BEST HISTORICAL MATCH</p>
            <p className="mt-2 text-2xl font-black">{best ? formatDate(best.date) : "—"}</p>
            <p className="mt-2 text-sm text-slate-500">{best ? `유사도 ${best.similarity} · 당시 ${best.score}점 ${best.label}` : "과거 유사국면 데이터 부족"}</p>
          </div>
          <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-xs font-black uppercase tracking-wider text-slate-400">HOW TO READ</p>
            <p className="mt-2 text-lg font-black">60↑ Risk-On · 40↓ Risk-Off</p>
            <p className="mt-2 text-sm leading-6 text-slate-500">중간 구간은 Neutral로 둡니다. 숫자는 매수·매도 신호가 아니라 현재 환경을 일관된 기준으로 비교하기 위한 점수입니다.</p>
          </div>
        </section>

        <section>
          <div className="mb-4">
            <p className="text-xs font-black uppercase tracking-wider text-blue-600">7 FACTORS</p>
            <h2 className="mt-1 text-2xl font-black">현재 점수가 왜 이렇게 나왔나?</h2>
          </div>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {current.factors.map((item) => <FactorCard key={item.key} item={item} />)}
          </div>
        </section>

        <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <p className="text-xs font-black uppercase tracking-wider text-violet-600">AUTO READ</p>
          <h2 className="mt-1 text-2xl font-black">지금 시장을 짧게 읽으면</h2>
          <div className="mt-4 space-y-3">
            {data.insights.map((insight, index) => (
              <div key={index} className="rounded-2xl bg-slate-50 px-4 py-3 text-sm leading-6 text-slate-600">{insight}</div>
            ))}
          </div>
        </section>

        <section>
          <div className="mb-4">
            <p className="text-xs font-black uppercase tracking-wider text-emerald-600">SIMILAR REGIMES</p>
            <h2 className="mt-1 text-2xl font-black">지금과 비슷했던 과거 시장</h2>
            <p className="mt-2 max-w-3xl text-xs leading-5 text-slate-500">2016년 이후 약 주간 간격으로 비교한 뒤, 비슷한 날짜가 연속으로 중복되지 않도록 최소 20거래일 이상 떨어진 사례만 선택합니다.</p>
          </div>
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-5">
            {data.matches.map((match, index) => (
              <article key={match.date} className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-[10px] font-black text-slate-400">TOP {index + 1}</p>
                    <p className="mt-1 font-black">{formatDate(match.date)}</p>
                  </div>
                  <span className="rounded-full bg-blue-50 px-2.5 py-1 text-[10px] font-black text-blue-700">{match.similarity}</span>
                </div>
                <p className="mt-3 text-sm font-black">{match.score}점 · {match.label}</p>
                <div className="mt-3 border-t border-slate-100 pt-3 text-xs leading-5 text-slate-500">
                  <p>NQ +1D <strong className="text-slate-800">{signed(match.returns.NQ.oneDay)}</strong></p>
                  <p>NQ +5D <strong className="text-slate-800">{signed(match.returns.NQ.fiveDay)}</strong></p>
                  <p>NQ +20D <strong className="text-slate-800">{signed(match.returns.NQ.twentyDay)}</strong></p>
                </div>
              </article>
            ))}
          </div>
        </section>

        <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <p className="text-xs font-black uppercase tracking-wider text-orange-500">AFTER SIMILAR REGIMES</p>
          <h2 className="mt-1 text-2xl font-black">과거 유사국면 이후 7개 자산</h2>
          <p className="mt-2 text-xs leading-5 text-slate-500">상승률은 선택된 과거 사례에서 해당 기간 수익률이 플러스였던 비율입니다. 방향 예측 확률이 아닙니다.</p>
          <div className="mt-5 overflow-x-auto">
            <table className="w-full min-w-[760px] text-sm">
              <thead className="bg-slate-50 text-xs font-black text-slate-400">
                <tr>
                  <th className="px-4 py-3 text-left">자산</th>
                  <th className="px-4 py-3 text-left">+1D</th>
                  <th className="px-4 py-3 text-left">+5D</th>
                  <th className="px-4 py-3 text-left">+20D</th>
                </tr>
              </thead>
              <tbody>
                {data.assetStats.map((asset) => (
                  <tr key={asset.assetKey} className="border-t border-slate-100">
                    <td className="px-4 py-3 font-black">{asset.assetName}</td>
                    <td className="px-4 py-3 text-slate-600">{statText(asset.oneDay)}</td>
                    <td className="px-4 py-3 text-slate-600">{statText(asset.fiveDay)}</td>
                    <td className="px-4 py-3 text-slate-600">{statText(asset.twentyDay)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="rounded-3xl border border-amber-200 bg-amber-50 p-5 text-xs leading-6 text-amber-950/70 sm:p-6">
          <strong className="text-amber-950">해석 기준:</strong> 7개 점수와 가중치는 설명 가능한 휴리스틱이며 백테스트된 예측모형이 아닙니다. 기대인플레이션·금리·고용 등 FRED 시계열은 이후 개정될 수 있습니다. Yahoo Finance의 연속선물은 롤오버 영향을 포함할 수 있습니다. 유동성 점수의 Fed 자산·RRP 방향 역시 단독 인과관계로 해석하지 않습니다.
          <div className="mt-2">{data.sources.join(" · ")}</div>
        </section>
      </div>
    </main>
  );
}
