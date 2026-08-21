import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import {
  changeTone,
  firstChange,
  formatChange,
  formatMetricValue,
  formatObservedDate,
  freshnessLabel,
  getPublicMarketDashboard,
  metricBySymbol,
} from "@/app/lib/publicMarket";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{
    symbol: string;
  }>;
};

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { symbol } = await params;
  const decoded = decodeURIComponent(symbol).toUpperCase();

  return {
    title: `${decoded} 투자 데이터 | 호행처럼`,
    description: `${decoded} 최신 관측값, 기간별 변화, 추세, 다음 발표일과 데이터 출처를 확인합니다.`,
    alternates: {
      canonical: `/data/${encodeURIComponent(decoded)}`,
    },
  };
}

function releaseDate(value: string | null | undefined) {
  if (!value) return "확인되는 일정 없음";
  const parsed = new Date(`${value.slice(0, 10)}T12:00:00+09:00`);
  return new Intl.DateTimeFormat("ko-KR", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "long",
    day: "numeric",
    weekday: "short",
  }).format(parsed);
}

export default async function MarketMetricPage({ params }: PageProps) {
  const { symbol } = await params;
  const dashboard = await getPublicMarketDashboard();
  const metric = metricBySymbol(dashboard, decodeURIComponent(symbol));

  if (!dashboard || !metric) {
    notFound();
  }

  const shortChange = firstChange(metric);

  return (
    <main className="min-h-screen bg-[#f6f7f9] pb-16 text-slate-900">
      <section className="border-b border-slate-200 bg-white">
        <div className="mx-auto max-w-4xl px-4 py-9 sm:px-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-blue-600">
                {metric.category} · {metric.symbol}
              </p>
              <h1 className="mt-2 text-3xl font-black tracking-tight sm:text-4xl">
                {metric.nameKo}
              </h1>
              <p className="mt-2 text-sm text-slate-500">{metric.nameEn}</p>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-right">
              <p className="text-xs text-slate-400">데이터 상태</p>
              <p className="mt-1 text-sm font-black text-slate-800">
                {freshnessLabel(metric)}
              </p>
            </div>
          </div>

          <div className="mt-7 flex flex-wrap items-end gap-x-6 gap-y-2">
            <p className="text-4xl font-black tracking-tight tabular-nums text-slate-950">
              {formatMetricValue(metric)}
            </p>
            <div>
              <p className={`text-lg font-black ${changeTone(shortChange)}`}>
                {formatChange(shortChange)}
              </p>
              <p className="text-xs text-slate-400">
                {shortChange?.label ?? "최근 변화"}
              </p>
            </div>
          </div>

          <p className="mt-3 text-xs text-slate-400">
            관측일 {formatObservedDate(metric.observedAt)} · Source {metric.sourceName}
          </p>
        </div>
      </section>

      <div className="mx-auto max-w-4xl space-y-6 px-4 py-7 sm:px-6">
        <section className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {metric.changes.map((change) => (
            <div
              key={change.key}
              className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
            >
              <p className="text-xs font-bold text-slate-400">{change.label}</p>
              <p className={`mt-2 text-lg font-black ${changeTone(change)}`}>
                {formatChange(change)}
              </p>
            </div>
          ))}
        </section>

        <section className="grid gap-4 sm:grid-cols-2">
          <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
              TREND
            </p>
            <h2 className="mt-2 text-xl font-black">{metric.trendLabel}</h2>
            <dl className="mt-5 space-y-3 text-sm">
              <div className="flex justify-between gap-4">
                <dt className="text-slate-500">백분위</dt>
                <dd className="font-bold">
                  {metric.percentile === null ? "—" : `${metric.percentile}%`}
                </dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-slate-500">Z-Score</dt>
                <dd className="font-bold">{metric.zScore ?? "—"}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-slate-500">연속 방향</dt>
                <dd className="font-bold">
                  {metric.consecutiveCount > 0
                    ? `${metric.consecutiveCount}회 ${metric.consecutiveDirection}`
                    : "—"}
                </dd>
              </div>
            </dl>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
              NEXT RELEASE
            </p>
            <h2 className="mt-2 text-xl font-black">
              {releaseDate(metric.nextReleaseDate)}
            </h2>
            <p className="mt-3 text-sm leading-6 text-slate-500">
              {metric.releaseName || "연결된 발표명 정보가 없습니다."}
            </p>
            <Link
              href="/data/calendar"
              className="mt-5 inline-flex rounded-full bg-blue-50 px-4 py-2 text-sm font-bold text-blue-700 hover:bg-blue-100"
            >
              전체 발표 일정 →
            </Link>
          </div>
        </section>

        {metric.description && (
          <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
            <p className="text-xs font-bold uppercase tracking-wider text-blue-600">
              ABOUT
            </p>
            <h2 className="mt-2 text-xl font-black">
              {metric.nameKo} 데이터 설명
            </h2>
            <p className="mt-4 text-sm leading-7 text-slate-600">
              {metric.description}
            </p>
          </section>
        )}

        <section className="rounded-3xl bg-slate-950 p-5 text-white sm:p-6">
          <p className="text-xs font-bold uppercase tracking-wider text-blue-300">
            SOURCE & CONTEXT
          </p>
          <h2 className="mt-2 text-xl font-black">출처와 함께 확인하기</h2>
          <dl className="mt-5 grid gap-3 text-sm sm:grid-cols-2">
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <dt className="text-slate-400">Provider</dt>
              <dd className="mt-1 font-bold">{metric.provider}</dd>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <dt className="text-slate-400">Source</dt>
              <dd className="mt-1 font-bold">{metric.sourceName}</dd>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <dt className="text-slate-400">Frequency</dt>
              <dd className="mt-1 font-bold">{metric.frequency}</dd>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <dt className="text-slate-400">Series</dt>
              <dd className="mt-1 break-all font-bold">{metric.sourceSeriesCode}</dd>
            </div>
          </dl>

          <div className="mt-5 flex flex-wrap gap-2">
            <Link
              href={`/blog?q=${encodeURIComponent(metric.nameKo)}`}
              className="rounded-full bg-blue-600 px-4 py-2 text-sm font-bold hover:bg-blue-500"
            >
              관련 글 찾아보기 →
            </Link>
            <Link
              href="/data"
              className="rounded-full border border-white/15 px-4 py-2 text-sm font-bold text-slate-200 hover:bg-white/10"
            >
              데이터 허브 →
            </Link>
          </div>
        </section>
      </div>
    </main>
  );
}
