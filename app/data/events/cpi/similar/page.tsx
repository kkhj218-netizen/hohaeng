import type { Metadata } from "next";
import Link from "next/link";

import {
  getCpiSimilarityAnalysisV2,
  type CpiHorizonStat,
  type CpiSimilarityFilters,
  type CpiTrendFilter,
} from "@/app/lib/cpiSimilarityAnalysisV2";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "현재 CPI와 비슷했던 과거 사례 분석 | 호행처럼",
  description:
    "2016년 이후 CPI 유사 사례의 TOP5·10·20 민감도, 자산별 상승률·평균·중앙값·최대최소, 7개 자산 방향 일치도와 자동 해석을 제공합니다.",
  alternates: { canonical: "/data/events/cpi/similar" },
};

type SearchParams = Record<string, string | string[] | undefined>;

function first(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function numeric(value: string | string[] | undefined): number | undefined {
  const raw = first(value);
  if (raw === undefined || raw.trim() === "") return undefined;
  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("ko-KR", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(value));
}

function percent(value: number | null, digits = 1) {
  return value === null ? "—" : `${value.toFixed(digits)}%`;
}

function signed(value: number | null, digits = 2) {
  if (value === null) return "—";
  return `${value > 0 ? "+" : ""}${value.toFixed(digits)}%`;
}

function tone(value: number | null) {
  if (value === null || value === 0) return "text-slate-400";
  return value > 0 ? "text-emerald-600" : "text-rose-600";
}

function StatCard({ label, stat }: { label: string; stat: CpiHorizonStat }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <p className="text-xs font-black uppercase tracking-wider text-slate-400">{label}</p>
      <p className="mt-2 text-2xl font-black text-slate-950">
        {stat.positiveRate === null ? "—" : `${stat.positiveRate.toFixed(1)}%`}
      </p>
      <p className="mt-1 text-xs text-slate-500">
        상승 {stat.positiveCount} / 표본 {stat.sampleSize}
      </p>
      <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
        <span className="text-slate-500">평균 <strong className={tone(stat.averageReturn)}>{signed(stat.averageReturn)}</strong></span>
        <span className="text-slate-500">중앙값 <strong className={tone(stat.medianReturn)}>{signed(stat.medianReturn)}</strong></span>
        <span className="text-slate-500">최저 <strong className={tone(stat.minReturn)}>{signed(stat.minReturn)}</strong></span>
        <span className="text-slate-500">최고 <strong className={tone(stat.maxReturn)}>{signed(stat.maxReturn)}</strong></span>
      </div>
    </div>
  );
}

function inputDefault(params: SearchParams, name: string) {
  return first(params[name]) ?? "";
}

function assetHref(asset: string, params: SearchParams) {
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (key === "asset") continue;
    const raw = first(value);
    if (raw) query.set(key, raw);
  }
  query.set("asset", asset);
  return `/data/events/cpi/similar?${query.toString()}`;
}

function qualityTone(grade: "A" | "B" | "C" | "D") {
  if (grade === "A") return "bg-emerald-50 text-emerald-700 border-emerald-200";
  if (grade === "B") return "bg-blue-50 text-blue-700 border-blue-200";
  if (grade === "C") return "bg-amber-50 text-amber-700 border-amber-200";
  return "bg-rose-50 text-rose-700 border-rose-200";
}

export default async function CpiSimilarPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const params = await searchParams;
  const trendRaw = first(params.trend) ?? "any";
  const trend: CpiTrendFilter = [
    "any",
    "headline_cooling",
    "headline_heating",
    "core_cooling",
    "core_heating",
  ].includes(trendRaw)
    ? (trendRaw as CpiTrendFilter)
    : "any";

  const filters: CpiSimilarityFilters = {
    headlineYoyMin: numeric(params.headlineYoyMin),
    headlineYoyMax: numeric(params.headlineYoyMax),
    headlineMomMin: numeric(params.headlineMomMin),
    headlineMomMax: numeric(params.headlineMomMax),
    coreYoyMin: numeric(params.coreYoyMin),
    coreYoyMax: numeric(params.coreYoyMax),
    coreMomMin: numeric(params.coreMomMin),
    coreMomMax: numeric(params.coreMomMax),
    trend,
  };

  const explorer = await getCpiSimilarityAnalysisV2({ assetKey: first(params.asset), filters });

  if (!explorer) {
    return (
      <main className="min-h-screen bg-[#f6f7f9] px-4 py-10 text-slate-900">
        <div className="mx-auto max-w-5xl rounded-3xl border border-slate-200 bg-white p-6">
          <h1 className="text-2xl font-black">CPI 유사 사례 데이터를 준비하고 있습니다.</h1>
          <p className="mt-2 text-sm text-slate-500">10년 백필이 완료되면 자동으로 계산됩니다.</p>
        </div>
      </main>
    );
  }

  const filterActive = explorer.filteredCases.length > 0 || [
    filters.headlineYoyMin,
    filters.headlineYoyMax,
    filters.headlineMomMin,
    filters.headlineMomMax,
    filters.coreYoyMin,
    filters.coreYoyMax,
    filters.coreMomMin,
    filters.coreMomMax,
  ].some((value) => value !== undefined) || trend !== "any";

  const current = explorer.current.metrics;
  const top10Window = explorer.sensitivity.find((item) => item.size === 10);
  const selectedTop10 = top10Window?.assetStats.find((item) => item.assetKey === explorer.selectedAsset);
  const filteredStats = explorer.filteredAssetStats.find((item) => item.assetKey === explorer.selectedAsset);

  return (
    <main className="min-h-screen bg-[#f6f7f9] pb-16 text-slate-900">
      <section className="border-b border-slate-200 bg-white">
        <div className="mx-auto max-w-6xl px-4 py-9 sm:px-6">
          <p className="text-xs font-black uppercase tracking-[0.2em] text-violet-600">HOHAENG CPI ANALYSIS V2</p>
          <h1 className="mt-2 text-3xl font-black tracking-tight sm:text-4xl">현재 CPI와 비슷했던 과거, 얼마나 믿을 만할까?</h1>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600">
            단순 TOP10 나열에서 끝내지 않습니다. TOP5·10·20으로 표본을 넓혀도 결과가 유지되는지,
            평균이 극단값에 끌린 것은 아닌지, 7개 자산의 방향이 얼마나 모였는지까지 함께 봅니다.
          </p>
          <div className="mt-5 flex flex-wrap gap-2">
            <Link href="/data/events/cpi" className="rounded-full bg-slate-950 px-4 py-2 text-sm font-black text-white">최신 CPI →</Link>
            <Link href="/data/events/cpi/history" className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-black text-blue-600">10년 아카이브 →</Link>
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-6xl space-y-8 px-4 py-7 sm:px-6">
        <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="text-xs font-black uppercase tracking-wider text-violet-600">CURRENT CPI</p>
              <h2 className="mt-1 text-2xl font-black">{formatDate(explorer.current.releaseAt)} 발표 기준</h2>
            </div>
            <span className="rounded-full bg-violet-50 px-3 py-2 text-xs font-black text-violet-700">기준월 {explorer.current.referencePeriod ?? "—"}</span>
          </div>
          <div className="mt-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
            {[
              ["헤드라인 YoY", current.headline_yoy.actual, current.headline_yoy.previous],
              ["헤드라인 MoM", current.headline_mom.actual, current.headline_mom.previous],
              ["근원 YoY", current.core_yoy.actual, current.core_yoy.previous],
              ["근원 MoM", current.core_mom.actual, current.core_mom.previous],
            ].map(([label, actual, previous]) => (
              <div key={String(label)} className="rounded-2xl bg-slate-50 p-4">
                <p className="text-xs font-bold text-slate-400">{label}</p>
                <p className="mt-1 text-2xl font-black">{percent(actual as number | null)}</p>
                <p className="mt-2 text-xs text-slate-500">이전 {percent(previous as number | null)}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="grid gap-4 lg:grid-cols-[0.8fr_1.2fr]">
          <div className={`rounded-3xl border p-5 shadow-sm sm:p-6 ${qualityTone(explorer.quality.grade)}`}>
            <p className="text-xs font-black uppercase tracking-wider">COMPARISON QUALITY</p>
            <div className="mt-2 flex items-end gap-3">
              <span className="text-5xl font-black">{explorer.quality.grade}</span>
              <div className="pb-1">
                <p className="text-xl font-black">{explorer.quality.label}</p>
                <p className="text-sm font-bold">{explorer.quality.score.toFixed(1)} / 100</p>
              </div>
            </div>
            <div className="mt-5 space-y-2 text-xs leading-5">
              {explorer.quality.reasons.map((reason) => <p key={reason}>• {reason}</p>)}
            </div>
          </div>

          <div className="rounded-3xl bg-slate-950 p-5 text-white shadow-sm sm:p-6">
            <p className="text-xs font-black uppercase tracking-wider text-orange-300">AUTO INTERPRETATION</p>
            <h2 className="mt-1 text-2xl font-black">숫자를 이렇게 읽으면 됩니다</h2>
            <div className="mt-4 space-y-3 text-sm leading-6 text-slate-300">
              {explorer.insights.map((insight, index) => (
                <p key={insight}><strong className="mr-2 text-white">{index + 1}.</strong>{insight}</p>
              ))}
            </div>
          </div>
        </section>

        <section>
          <div className="mb-4">
            <p className="text-xs font-black uppercase tracking-wider text-emerald-600">TOP 10 MATCHES</p>
            <h2 className="mt-1 text-2xl font-black">가장 비슷했던 과거 CPI 10회</h2>
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            {explorer.matches.map((item, index) => {
              const reaction = item.reactions[explorer.selectedAsset];
              return (
                <Link key={item.id} href={`/data/events/cpi/history/${item.id}`} className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-violet-300 hover:shadow-md">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-xs font-black text-violet-600">#{index + 1} · 유사도 {item.similarityScore.toFixed(1)}점</p>
                      <p className="mt-1 text-xl font-black">{formatDate(item.releaseAt)}</p>
                      <p className="mt-1 text-xs text-slate-400">수준 {item.levelScore.toFixed(0)} · 추세 {item.trendScore?.toFixed(0) ?? "—"}{item.surpriseUsed ? ` · 서프라이즈 ${item.surpriseScore?.toFixed(0) ?? "—"}` : ""}</p>
                    </div>
                    <span className="rounded-full bg-violet-50 px-3 py-2 text-sm font-black text-violet-700">{item.similarityScore.toFixed(0)}</span>
                  </div>
                  <div className="mt-4 grid grid-cols-4 gap-2 text-center">
                    {[item.metrics.headline_yoy.actual, item.metrics.headline_mom.actual, item.metrics.core_yoy.actual, item.metrics.core_mom.actual].map((value, metricIndex) => (
                      <div key={metricIndex} className="rounded-xl bg-slate-50 px-2 py-3">
                        <p className="text-[10px] text-slate-400">{["H YoY", "H MoM", "C YoY", "C MoM"][metricIndex]}</p>
                        <p className="mt-1 text-sm font-black">{percent(value)}</p>
                      </div>
                    ))}
                  </div>
                  <div className="mt-4 border-t border-slate-100 pt-4">
                    <p className="text-[11px] font-black uppercase tracking-wider text-slate-400">{reaction?.assetName ?? explorer.selectedAsset}</p>
                    <div className="mt-2 grid grid-cols-3 gap-2 text-center">
                      {[["당일", reaction?.close ?? null], ["+1D", reaction?.oneDay ?? null], ["+5D", reaction?.fiveDay ?? null]].map(([label, value]) => (
                        <div key={String(label)}><p className="text-[10px] text-slate-400">{label}</p><p className={`mt-1 text-sm font-black ${tone(value as number | null)}`}>{signed(value as number | null)}</p></div>
                      ))}
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        </section>

        <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <p className="text-xs font-black uppercase tracking-wider text-blue-600">ASSET SELECT</p>
          <h2 className="mt-1 text-2xl font-black">어떤 자산으로 비교할까?</h2>
          <div className="mt-4 flex gap-2 overflow-x-auto pb-2">
            {explorer.assets.map((asset) => (
              <Link key={asset.key} href={assetHref(asset.key, params)} className={`whitespace-nowrap rounded-full px-4 py-2 text-sm font-black ${explorer.selectedAsset === asset.key ? "bg-slate-950 text-white" : "border border-slate-200 bg-white text-slate-600"}`}>
                {asset.key} {asset.name}
              </Link>
            ))}
          </div>
          {selectedTop10 && (
            <div className="mt-4 grid gap-3 sm:grid-cols-3">
              <StatCard label="TOP10 · 당일" stat={selectedTop10.close} />
              <StatCard label="TOP10 · +1D" stat={selectedTop10.oneDay} />
              <StatCard label="TOP10 · +5D" stat={selectedTop10.fiveDay} />
            </div>
          )}
        </section>

        <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <p className="text-xs font-black uppercase tracking-wider text-violet-600">SENSITIVITY CHECK</p>
          <h2 className="mt-1 text-2xl font-black">TOP5 · TOP10 · TOP20에서도 결과가 유지될까?</h2>
          <p className="mt-2 text-sm leading-6 text-slate-500">표본을 넓혀도 방향과 중앙값이 비슷하면 패턴이 상대적으로 안정적입니다. 크게 달라지면 유사 사례 선택에 민감한 결과로 봅니다.</p>
          <div className="mt-5 space-y-4">
            {explorer.sensitivity.map((window) => {
              const stat = window.assetStats.find((item) => item.assetKey === explorer.selectedAsset);
              if (!stat) return null;
              return (
                <div key={window.size} className="rounded-2xl bg-slate-50 p-4">
                  <div className="flex flex-wrap items-end justify-between gap-2">
                    <div><p className="text-lg font-black">TOP {window.size}</p><p className="text-xs text-slate-500">실제 표본 {window.actualSize}개 · 평균 유사도 {window.averageSimilarity?.toFixed(1) ?? "—"}점 · 최저 유사도 {window.minimumSimilarity?.toFixed(1) ?? "—"}점</p></div>
                    <span className="text-xs font-black text-violet-600">{explorer.selectedAsset}</span>
                  </div>
                  <div className="mt-3 grid gap-3 sm:grid-cols-3">
                    <StatCard label="당일" stat={stat.close} />
                    <StatCard label="+1D" stat={stat.oneDay} />
                    <StatCard label="+5D" stat={stat.fiveDay} />
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <p className="text-xs font-black uppercase tracking-wider text-emerald-600">CROSS ASSET CHECK</p>
          <h2 className="mt-1 text-2xl font-black">7개 자산의 평균 방향은 얼마나 모였나?</h2>
          <p className="mt-2 text-sm leading-6 text-slate-500">TOP10의 자산별 평균 수익률 부호를 단순 집계한 원시 방향 일치도입니다. 달러·채권처럼 구조적으로 반대 방향이 의미 있을 수 있어 ‘매수 신호’로 해석하면 안 됩니다.</p>
          <div className="mt-5 grid gap-3 sm:grid-cols-3">
            {explorer.crossAsset.map((item) => {
              const majorityLabel = item.majority === "positive" ? "상승 우세" : item.majority === "negative" ? "하락 우세" : "혼조";
              return (
                <div key={item.key} className="rounded-2xl bg-slate-50 p-4">
                  <p className="text-xs font-black uppercase tracking-wider text-slate-400">{item.label}</p>
                  <p className="mt-2 text-2xl font-black">{item.agreementRate === null ? "—" : `${item.agreementRate.toFixed(1)}%`}</p>
                  <p className="mt-1 text-sm font-black text-slate-700">{majorityLabel} · {item.majorityCount}/{item.availableAssets}</p>
                  <p className="mt-3 text-xs text-slate-500">상승 {item.positiveAssets} · 하락 {item.negativeAssets} · 중립 {item.neutralAssets}</p>
                </div>
              );
            })}
          </div>
        </section>

        <section className="rounded-3xl bg-slate-950 p-5 text-white sm:p-6">
          <p className="text-xs font-black uppercase tracking-wider text-orange-300">CUSTOM FILTER</p>
          <h2 className="mt-1 text-2xl font-black">조건을 직접 골라 과거 사례 찾기</h2>
          <p className="mt-2 text-sm leading-6 text-slate-400">비워둔 칸은 조건에서 제외됩니다. 예: 헤드라인 YoY 3~4%, MoM 0~0.3%만 입력해도 됩니다.</p>
          <form action="/data/events/cpi/similar" method="get" className="mt-5 space-y-4">
            <input type="hidden" name="asset" value={explorer.selectedAsset} />
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {[
                ["헤드라인 YoY", "headlineYoyMin", "headlineYoyMax"],
                ["헤드라인 MoM", "headlineMomMin", "headlineMomMax"],
                ["근원 YoY", "coreYoyMin", "coreYoyMax"],
                ["근원 MoM", "coreMomMin", "coreMomMax"],
              ].map(([label, minName, maxName]) => (
                <div key={minName} className="rounded-2xl border border-slate-800 bg-slate-900 p-4">
                  <p className="text-xs font-black text-slate-300">{label}</p>
                  <div className="mt-2 grid grid-cols-2 gap-2">
                    <input name={minName} defaultValue={inputDefault(params, minName)} inputMode="decimal" placeholder="최소" className="min-w-0 rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm outline-none focus:border-orange-400" />
                    <input name={maxName} defaultValue={inputDefault(params, maxName)} inputMode="decimal" placeholder="최대" className="min-w-0 rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm outline-none focus:border-orange-400" />
                  </div>
                </div>
              ))}
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <select name="trend" defaultValue={trend} className="rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-sm font-bold">
                <option value="any">추세 조건 없음</option>
                <option value="headline_cooling">헤드라인 YoY 하락 중</option>
                <option value="headline_heating">헤드라인 YoY 상승 중</option>
                <option value="core_cooling">근원 YoY 하락 중</option>
                <option value="core_heating">근원 YoY 상승 중</option>
              </select>
              <button type="submit" className="rounded-xl bg-orange-400 px-5 py-2.5 text-sm font-black text-slate-950">조건으로 찾기</button>
              <Link href={`/data/events/cpi/similar?asset=${explorer.selectedAsset}`} className="rounded-xl border border-slate-700 px-4 py-2.5 text-sm font-black text-slate-300">초기화</Link>
            </div>
          </form>
        </section>

        {filterActive && (
          <section>
            <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
              <div><p className="text-xs font-black uppercase tracking-wider text-orange-600">FILTER RESULTS</p><h2 className="mt-1 text-2xl font-black">직접 선택한 조건의 과거 사례</h2></div>
              <span className="text-sm font-black text-slate-500">{explorer.filteredCases.length}건</span>
            </div>
            {explorer.filteredCases.length === 0 ? (
              <div className="rounded-3xl border border-dashed border-slate-300 bg-white p-6 text-sm text-slate-500">조건에 맞는 과거 CPI가 없습니다. 범위를 조금 넓혀보세요.</div>
            ) : (
              <>
                {filteredStats && (
                  <div className="mb-5 grid gap-3 sm:grid-cols-3">
                    <StatCard label={`${explorer.selectedAsset} 당일`} stat={filteredStats.close} />
                    <StatCard label={`${explorer.selectedAsset} +1D`} stat={filteredStats.oneDay} />
                    <StatCard label={`${explorer.selectedAsset} +5D`} stat={filteredStats.fiveDay} />
                  </div>
                )}
                <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[760px] text-sm">
                      <thead className="bg-slate-50 text-xs font-black text-slate-400"><tr><th className="px-4 py-3 text-left">발표일</th><th className="px-3 py-3 text-right">H YoY</th><th className="px-3 py-3 text-right">H MoM</th><th className="px-3 py-3 text-right">C YoY</th><th className="px-3 py-3 text-right">C MoM</th><th className="px-3 py-3 text-right">당일</th><th className="px-3 py-3 text-right">+1D</th><th className="px-3 py-3 text-right">+5D</th></tr></thead>
                      <tbody>
                        {explorer.filteredCases.map((item) => {
                          const reaction = item.reactions[explorer.selectedAsset];
                          return (
                            <tr key={item.id} className="border-t border-slate-100">
                              <td className="px-4 py-3 font-black"><Link href={`/data/events/cpi/history/${item.id}`} className="hover:text-blue-600">{formatDate(item.releaseAt)}</Link></td>
                              {[item.metrics.headline_yoy.actual, item.metrics.headline_mom.actual, item.metrics.core_yoy.actual, item.metrics.core_mom.actual].map((value, index) => <td key={index} className="px-3 py-3 text-right font-bold tabular-nums">{percent(value)}</td>)}
                              {[reaction?.close ?? null, reaction?.oneDay ?? null, reaction?.fiveDay ?? null].map((value, index) => <td key={index} className={`px-3 py-3 text-right font-black tabular-nums ${tone(value)}`}>{signed(value)}</td>)}
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              </>
            )}
          </section>
        )}

        <section className="rounded-3xl border border-slate-200 bg-white p-5 text-xs leading-6 text-slate-500">
          <strong className="text-slate-800">해석 주의:</strong> 품질등급·유사도·상승률은 미래 수익률 예측값이 아닙니다. 과거 사례가 얼마나 비슷하고 결과가 표본 선택에 얼마나 민감한지를 빠르게 검토하기 위한 분석 보조도구입니다. 당시 금리·유동성·정책 환경이 다르면 시장 반응도 달라질 수 있습니다.
        </section>
      </div>
    </main>
  );
}
