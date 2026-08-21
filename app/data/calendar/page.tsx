import type { Metadata } from "next";
import Link from "next/link";

import {
  buildUpcomingReleases,
  getPublicMarketDashboard,
} from "@/app/lib/publicMarket";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "미국 경제지표 발표 일정 | 투자 캘린더 | 호행처럼",
  description:
    "CPI, PCE, 고용, GDP, 주택, M2 등 주요 미국 경제지표의 다음 발표일과 한국시간 발표시각을 한눈에 확인합니다.",
  alternates: {
    canonical: "/data/calendar",
  },
};

function dateHeading(date: string) {
  const parsed = new Date(`${date}T12:00:00+09:00`);
  return new Intl.DateTimeFormat("ko-KR", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "long",
    day: "numeric",
    weekday: "short",
  }).format(parsed);
}

function stars(score: number) {
  if (score >= 75) return "★★★";
  if (score >= 50) return "★★☆";
  return "★☆☆";
}

function daysUntil(date: string, baseDate: string) {
  const target = Date.parse(`${date}T00:00:00Z`);
  const base = Date.parse(`${baseDate}T00:00:00Z`);
  const diff = Math.round((target - base) / 86_400_000);
  if (diff <= 0) return "오늘";
  if (diff === 1) return "내일";
  return `D-${diff}`;
}

export default async function InvestmentCalendarPage() {
  const dashboard = await getPublicMarketDashboard();
  const releases = buildUpcomingReleases(dashboard, 60);

  const grouped = releases.reduce<Record<string, typeof releases>>(
    (accumulator, release) => {
      accumulator[release.date] ??= [];
      accumulator[release.date].push(release);
      return accumulator;
    },
    {},
  );

  return (
    <main className="min-h-screen bg-[#f6f7f9] pb-16 text-slate-900">
      <section className="border-b border-slate-200 bg-white">
        <div className="mx-auto max-w-5xl px-4 py-9 sm:px-6">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-rose-600">
            INVESTMENT CALENDAR
          </p>
          <h1 className="mt-2 text-3xl font-black tracking-tight sm:text-4xl">
            주요 경제지표 발표 일정
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600">
            CPI, PCE, 고용, GDP, 주택, 통화량 등 시장에 영향을 줄 수 있는 주요
            발표를 한국시간 기준으로 정리합니다. 발표 후에는 각 지표 페이지에서
            최신값과 변화를 이어서 확인할 수 있습니다.
          </p>

          <div className="mt-5 flex flex-wrap gap-2">
            <Link
              href="/today"
              className="rounded-full bg-slate-950 px-4 py-2 text-sm font-bold text-white hover:bg-slate-800"
            >
              TODAY →
            </Link>
            <Link
              href="/data"
              className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-bold text-blue-600 hover:border-blue-300"
            >
              투자 데이터 →
            </Link>
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-5xl px-4 py-7 sm:px-6">
        <div className="mb-5 flex flex-wrap items-center gap-2 rounded-2xl border border-blue-100 bg-blue-50/70 px-4 py-3 text-xs font-medium text-blue-900">
          <span className="font-black">한국시간 기준</span>
          <span className="text-blue-300">•</span>
          <span>공식 일정이 확인되는 핵심 지표는 발표시각까지 표시</span>
        </div>

        {Object.keys(grouped).length > 0 ? (
          <div className="space-y-5">
            {Object.entries(grouped).map(([date, items]) => (
              <section
                key={date}
                className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm"
              >
                <div className="flex items-center justify-between gap-4 border-b border-slate-100 bg-slate-50 px-5 py-4 sm:px-6">
                  <h2 className="font-black text-slate-900">{dateHeading(date)}</h2>
                  {dashboard && (
                    <span className="rounded-full bg-white px-3 py-1 text-xs font-black text-slate-500 shadow-sm">
                      {daysUntil(date, dashboard.asOfDate)}
                    </span>
                  )}
                </div>

                <div className="divide-y divide-slate-100 px-5 sm:px-6">
                  {items.map((release) => (
                    <div
                      key={`${release.date}-${release.title}`}
                      className="grid gap-3 py-5 sm:grid-cols-[110px_1fr_auto] sm:items-center"
                    >
                      <div>
                        {release.timeKst ? (
                          <p className="text-lg font-black tabular-nums text-blue-600">
                            {release.timeKst}
                          </p>
                        ) : (
                          <p className="text-sm font-black text-slate-500">시간 미정</p>
                        )}
                        <p className="mt-1 text-xs font-black tracking-wider text-amber-500">
                          {stars(release.importanceScore)}
                        </p>
                      </div>

                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="font-black text-slate-900">{release.title}</h3>
                          <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-500">
                            {release.categoryLabel}
                          </span>
                        </div>
                        <div className="mt-1 flex flex-wrap gap-x-2 gap-y-1 text-xs text-slate-400">
                          {release.sourceAgency && <span>{release.sourceAgency}</span>}
                          <span>{release.symbols.join(" · ")}</span>
                        </div>
                        {release.sourceUrl && (
                          <a
                            href={release.sourceUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="mt-2 inline-flex text-xs font-bold text-slate-500 hover:text-blue-600"
                          >
                            공식 일정 확인 ↗
                          </a>
                        )}
                      </div>

                      <div className="flex flex-wrap gap-2 sm:justify-end">
                        {release.symbols.slice(0, 3).map((symbol) => (
                          <Link
                            key={symbol}
                            href={`/data/${encodeURIComponent(symbol)}`}
                            className="rounded-full bg-blue-50 px-3 py-1.5 text-xs font-bold text-blue-700 hover:bg-blue-100"
                          >
                            {symbol} →
                          </Link>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            ))}
          </div>
        ) : (
          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-xl font-black">확인되는 다음 발표 일정이 없습니다.</h2>
            <p className="mt-2 text-sm leading-6 text-slate-500">
              다음 일정이 확인되면 자동으로 반영됩니다.
            </p>
          </div>
        )}
      </div>
    </main>
  );
}
