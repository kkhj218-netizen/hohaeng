import type { Metadata } from "next";
import Link from "next/link";

import {
  getCpiRegimeAnalysisV3,
  type CpiPathPoint,
  type CpiRegimeSensitivity,
  type CpiRegimeSnapshot,
} from "@/app/lib/cpiRegimeSimilarityV3";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "CPI + 시장환경 유사도 분석 | 호행처럼",
  description:
    "미국 CPI뿐 아니라 발표 전 2년물·10년물 금리, VIX, Fed Funds, DXY, 나스닥 추세까지 함께 비교해 과거 유사 환경과 이후 가격경로를 분석합니다.",
  alternates: { canonical: "/data/events/cpi/regime" },
};

function formatDate(value: string) {
  return new Intl.DateTimeFormat("ko-KR", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(value));
}

function number(value: number | null, digits = 2) {
  return value === null ? "—" : value.toFixed(digits);
}

function percent(value: number | null, digits = 1) {
  if (value === null) return "—";
  return `${value > 0 ? "+" : ""}${value.toFixed(digits)}%`;
}

function tone(value: number | null) {
  if (value === null || value === 0) return "text-slate-400";
  return value > 0 ? "text-emerald-600" : "text-rose-600";
}

function regimeItems(regime: CpiRegimeSnapshot) {
  return [
    ["미국 2Y", regime.twoYear, "%"],
    ["미국 10Y", regime.tenYear, "%"],
    ["10Y-2Y", regime.curve10y2y, "%p"],
    ["VIX", regime.vix, ""],
    ["Fed Funds", regime.fedFunds, "%"],
    ["DXY", regime.dxy, ""],
    ["NQ 20D", regime.nq20d, "%"],
    ["NQ 60D", regime.nq60d, "%"],
  ] as const;
}

function RegimeGrid({ regime }: { regime: CpiRegimeSnapshot }) {
  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-8">
      {regimeItems(regime).map(([label, value, unit]) => (
        <div key={label} className="rounded-2xl bg-slate-50 p-3">
          <p className="text-[11px] font-bold text-slate-400">{label}</p>
          <p className="mt-1 text-lg font-black tabular-nums text-slate-950">
            {value === null ? "—" : `${value > 0 && (label.includes("NQ") || label === "10Y-2Y") ? "+" : ""}${value.toFixed(label === "VIX" || label === "DXY" ? 1 : 2)}${unit}`}
          </p>
        </div>
      ))}
    </div>
  );
}

function SensitivityCard({ row }: { row: CpiRegimeSensitivity }) {
  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-xs font-black uppercase tracking-wider text-violet-600">TOP {row.size}</p>
          <p className="mt-1 text-xl font-black">표본 {row.actualSize}개</p>
        </div>
        <div className="text-right">
          <p className="text-[10px] font-bold text-slate-400">평균 종합 유사도</p>
          <p className="mt-1 text-xl font-black text-violet-700">{number(row.averageCombined, 1)}</p>
        </div>
      </div>
      <div className="mt-4 grid grid-cols-2 gap-3 border-t border-slate-100 pt-4 text-sm">
        <div>
          <p className="text-xs text-slate-400">NQ +1D 상승률</p>
          <p className="mt-1 text-lg font-black">{row.nq1dPositiveRate === null ? "—" : `${row.nq1dPositiveRate.toFixed(1)}%`}</p>
          <p className="mt-1 text-xs text-slate-500">평균 <strong className={tone(row.nq1dAverage)}>{percent(row.nq1dAverage, 2)}</strong> · 중앙 <strong className={tone(row.nq1dMedian)}>{percent(row.nq1dMedian, 2)}</strong></p>
        </div>
        <div>
          <p className="text-xs text-slate-400">NQ +5D 상승률</p>
          <p className="mt-1 text-lg font-black">{row.nq5dPositiveRate === null ? "—" : `${row.nq5dPositiveRate.toFixed(1)}%`}</p>
          <p className="mt-1 text-xs text-slate-500">평균 <strong className={tone(row.nq5dAverage)}>{percent(row.nq5dAverage, 2)}</strong> · 중앙 <strong className={tone(row.nq5dMedian)}>{percent(row.nq5dMedian, 2)}</strong></p>
        </div>
      </div>
      <p className="mt-3 text-[11px] text-slate-400">최저 종합 유사도 {number(row.minimumCombined, 1)}점</p>
    </div>
  );
}

function PathChart({ rows }: { rows: CpiPathPoint[] }) {
  const available = rows.flatMap((row) => [row.q25, row.q75, row.median, row.current]).filter((value): value is number => value !== null);
  if (!available.length) {
    return <div className="rounded-2xl bg-slate-50 p-6 text-sm text-slate-500">가격경로 데이터를 준비하고 있습니다.</div>;
  }

  const width = 900;
  const height = 300;
  const left = 54;
  const right = 24;
  const top = 24;
  const bottom = 45;
  const minRaw = Math.min(100, ...available);
  const maxRaw = Math.max(100, ...available);
  const padding = Math.max(1, (maxRaw - minRaw) * 0.12);
  const min = minRaw - padding;
  const max = maxRaw + padding;
  const x = (index: number) => left + (index / Math.max(1, rows.length - 1)) * (width - left - right);
  const y = (value: number) => top + ((max - value) / Math.max(0.0001, max - min)) * (height - top - bottom);
  const line = (key: "median" | "current") => rows
    .map((row, index) => row[key] === null ? null : `${x(index)},${y(row[key] as number)}`)
    .filter(Boolean)
    .join(" ");
  const upper = rows.map((row, index) => row.q75 === null ? null : `${x(index)},${y(row.q75)}`).filter(Boolean);
  const lower = [...rows].reverse().map((row, reverseIndex) => {
    const index = rows.length - 1 - reverseIndex;
    return row.q25 === null ? null : `${x(index)},${y(row.q25)}`;
  }).filter(Boolean);
  const band = [...upper, ...lower].join(" ");
  const baseY = y(100);
  const labelIndexes = new Set([0, 1, 2, 6, 11]);

  return (
    <div className="overflow-x-auto">
      <svg viewBox={`0 0 ${width} ${height}`} className="min-w-[720px] w-full" role="img" aria-label="유사 CPI 이후 나스닥100 가격경로">
        <line x1={left} x2={width - right} y1={baseY} y2={baseY} stroke="#cbd5e1" strokeDasharray="5 5" />
        {band && <polygon points={band} fill="#ede9fe" opacity="0.8" />}
        <polyline points={line("median")} fill="none" stroke="#7c3aed" strokeWidth="3" strokeLinejoin="round" strokeLinecap="round" />
        <polyline points={line("current")} fill="none" stroke="#0f172a" strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />
        {rows.map((row, index) => labelIndexes.has(index) ? (
          <g key={row.day}>
            <line x1={x(index)} x2={x(index)} y1={height - bottom} y2={height - bottom + 5} stroke="#94a3b8" />
            <text x={x(index)} y={height - 15} textAnchor="middle" fontSize="12" fill="#64748b">{row.label}</text>
          </g>
        ) : null)}
        <text x={left} y={Math.max(14, baseY - 7)} fontSize="11" fill="#94a3b8">100 = 발표 전 거래일 종가</text>
      </svg>
      <div className="mt-2 flex flex-wrap gap-4 text-xs font-bold text-slate-500">
        <span><span className="mr-1 inline-block h-0.5 w-5 bg-violet-600 align-middle" />유사 TOP10 중앙값</span>
        <span><span className="mr-1 inline-block h-3 w-5 bg-violet-100 align-middle" />25~75% 구간</span>
        <span><span className="mr-1 inline-block h-0.5 w-5 bg-slate-950 align-middle" />현재 CPI 이후 실제 경로</span>
      </div>
    </div>
  );
}

export default async function CpiRegimePage() {
  let analysis: Awaited<ReturnType<typeof getCpiRegimeAnalysisV3>> = null;
  let loadError = "";
  try {
    analysis = await getCpiRegimeAnalysisV3();
  } catch (error) {
    loadError = error instanceof Error ? error.message : String(error);
  }

  if (!analysis) {
    return (
      <main className="min-h-screen bg-[#f6f7f9] px-4 py-10 text-slate-900">
        <div className="mx-auto max-w-5xl rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <h1 className="text-2xl font-black">CPI 시장환경 분석을 준비하고 있습니다.</h1>
          <p className="mt-2 text-sm text-slate-500">CPI 역사 데이터와 시장환경 원천을 연결하면 자동으로 계산됩니다.</p>
          {loadError && <p className="mt-3 rounded-xl bg-amber-50 px-3 py-2 text-xs text-amber-800">{loadError}</p>}
        </div>
      </main>
    );
  }

  const top10 = analysis.matches.slice(0, 10);

  return (
    <main className="min-h-screen bg-[#f6f7f9] pb-16 text-slate-900">
      <section className="border-b border-slate-200 bg-white">
        <div className="mx-auto max-w-6xl px-4 py-9 sm:px-6">
          <p className="text-xs font-black uppercase tracking-[0.2em] text-violet-600">HOHAENG CPI REGIME V3</p>
          <h1 className="mt-2 text-3xl font-black tracking-tight sm:text-4xl">CPI도 비슷하고, 시장환경도 비슷했던 과거는?</h1>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600">
            CPI 숫자만 닮은 시기를 찾지 않습니다. 발표 전에 이미 알 수 있었던 2Y·10Y 금리, 금리곡선, VIX,
            Fed Funds, DXY, 나스닥 20·60거래일 추세까지 함께 비교해 종합 유사도를 계산합니다.
          </p>
          <div className="mt-5 flex flex-wrap gap-2">
            <span className="rounded-full bg-slate-950 px-4 py-2 text-xs font-black text-white">CPI {analysis.methodology.cpiWeight}% + 시장환경 {analysis.methodology.regimeWeight}%</span>
            <Link href="/data/events/cpi/similar" className="rounded-full border border-violet-200 bg-violet-50 px-4 py-2 text-xs font-black text-violet-700">CPI만 비교 →</Link>
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-6xl space-y-8 px-4 py-7 sm:px-6">
        <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="text-xs font-black uppercase tracking-wider text-violet-600">PRE-RELEASE REGIME</p>
              <h2 className="mt-1 text-2xl font-black">{formatDate(analysis.current.releaseAt)} CPI 발표 전 시장환경</h2>
              <p className="mt-1 text-xs text-slate-400">시장 데이터 기준일 {analysis.current.regime.asOfDate ?? "—"}</p>
            </div>
            <div className="rounded-2xl bg-slate-950 px-4 py-3 text-white">
              <p className="text-[10px] font-bold text-slate-400">비교 품질</p>
              <div className="mt-1 flex items-baseline gap-2">
                <span className="text-3xl font-black">{analysis.quality.grade}</span>
                <span className="text-sm font-black">{analysis.quality.score.toFixed(1)}점</span>
              </div>
            </div>
          </div>
          <div className="mt-5"><RegimeGrid regime={analysis.current.regime} /></div>
          <p className="mt-4 text-xs text-slate-500">시장환경 데이터 커버리지 {analysis.current.regime.coverage.toFixed(1)}%. 모든 시장값은 CPI 발표일보다 앞선 마지막 관측값만 사용합니다.</p>
        </section>

        <section className="rounded-3xl bg-slate-950 p-5 text-white sm:p-6">
          <p className="text-xs font-black uppercase tracking-wider text-orange-300">AUTO INTERPRETATION</p>
          <h2 className="mt-1 text-2xl font-black">지금 먼저 볼 것</h2>
          <div className="mt-4 space-y-3">
            {analysis.insights.map((insight, index) => (
              <div key={insight} className="flex gap-3 rounded-2xl border border-slate-800 bg-slate-900 px-4 py-3 text-sm leading-6 text-slate-300">
                <span className="font-black text-orange-300">{index + 1}</span>
                <p>{insight}</p>
              </div>
            ))}
          </div>
        </section>

        <section>
          <div className="mb-4">
            <p className="text-xs font-black uppercase tracking-wider text-blue-600">SAMPLE SENSITIVITY</p>
            <h2 className="mt-1 text-2xl font-black">TOP5 → TOP10 → TOP20에서도 결과가 유지되나?</h2>
          </div>
          <div className="grid gap-3 lg:grid-cols-3">
            {analysis.sensitivity.map((row) => <SensitivityCard key={row.size} row={row} />)}
          </div>
        </section>

        <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="text-xs font-black uppercase tracking-wider text-violet-600">NORMALIZED PRICE PATH</p>
              <h2 className="mt-1 text-2xl font-black">유사 TOP10의 나스닥 경로</h2>
            </div>
            <span className="text-xs font-bold text-slate-400">발표 전 종가 = 100 · 거래일 기준</span>
          </div>
          <div className="mt-5"><PathChart rows={analysis.path} /></div>
          <p className="mt-4 text-xs leading-5 text-slate-500">보라색 범위는 과거 유사 TOP10의 25~75% 구간이고, 보라색 선은 중앙값입니다. 검은 선은 현재 CPI 발표 이후 실제 NQ 일봉이 존재하는 구간까지만 표시됩니다.</p>
        </section>

        <section>
          <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="text-xs font-black uppercase tracking-wider text-emerald-600">COMBINED MATCHES</p>
              <h2 className="mt-1 text-2xl font-black">CPI + 시장환경 종합 TOP10</h2>
            </div>
            <span className="text-xs font-bold text-slate-400">전체 후보 중 종합점수 순</span>
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            {top10.map((item, index) => (
              <Link key={item.id} href={`/data/events/cpi/history/${item.id}`} className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-violet-300 hover:shadow-md">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-xs font-black text-violet-600">#{index + 1} · 종합 {item.combinedScore.toFixed(1)}점</p>
                    <p className="mt-1 text-xl font-black">{formatDate(item.releaseAt)}</p>
                    <p className="mt-1 text-xs text-slate-400">CPI {item.cpiScore.toFixed(1)} · 시장환경 {item.regimeScore?.toFixed(1) ?? "—"}</p>
                  </div>
                  <span className="rounded-full bg-violet-50 px-3 py-2 text-lg font-black text-violet-700">{item.combinedScore.toFixed(0)}</span>
                </div>
                <div className="mt-4"><RegimeGrid regime={item.regime} /></div>
                <div className="mt-4 grid grid-cols-2 gap-2 border-t border-slate-100 pt-4 text-center">
                  <div><p className="text-[10px] text-slate-400">NQ +1D</p><p className={`mt-1 text-sm font-black ${tone(item.nq1d)}`}>{percent(item.nq1d, 2)}</p></div>
                  <div><p className="text-[10px] text-slate-400">NQ +5D</p><p className={`mt-1 text-sm font-black ${tone(item.nq5d)}`}>{percent(item.nq5d, 2)}</p></div>
                </div>
              </Link>
            ))}
          </div>
        </section>

        <section className="rounded-3xl border border-slate-200 bg-white p-5 text-xs leading-6 text-slate-500 sm:p-6">
          <p className="font-black text-slate-800">분석 기준</p>
          <p className="mt-2">시장환경은 {analysis.methodology.regimeInputs.join(" · ")}를 사용합니다. 시장 데이터는 CPI 발표일보다 앞선 마지막 관측값만 사용해 발표 후 움직임이 유사도 계산에 섞이지 않도록 했습니다.</p>
          <p className="mt-2">종합 유사도는 미래 수익률 예측값이 아니라 과거 비교의 검색 점수입니다. FRED·Yahoo의 현재 제공 이력 기준이며, 실시간 빈티지 데이터베이스(ALFRED) 기반 재현과는 차이가 있을 수 있습니다.</p>
        </section>
      </div>
    </main>
  );
}
