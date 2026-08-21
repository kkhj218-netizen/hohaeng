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
    "CPI, PCE, 고용, 경기, 금리 등 호행처럼 데이터팩에서 확인되는 다음 경제지표 발표일을 한눈에 확인합니다.",
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
            경제지표 발표 일정
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600">
            호행처럼의 공식 데이터팩에 연결된 지표 중 다음 발표일이 확인되는
            일정을 모았습니다. 발표 전에는 일정을 확인하고, 발표 후에는 각
            지표 상세 페이지에서 최신값과 변화를 이어서 확인할 수 있습니다.
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
        <div className="mb-5 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-900">
          <strong>V1 안내:</strong> 현재는 FRED 원천에서 확인되는
          <strong> 다음 발표일</strong>을 제공합니다. 발표 시각은 지표별 공식
          발표기관 공지가 최종 기준이며, 시각 자동화는 다음 단계에서 별도
          캘린더 데이터로 확장합니다.
        </div>

        {Object.keys(grouped).length > 0 ? (
          <div className="space-y-5">
            {Object.entries(grouped).map(([date, items]) => (
              <section
                key={date}
                className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm"
              >
                <div className="border-b border-slate-100 bg-slate-50 px-5 py-4 sm:px-6">
                  <h2 className="font-black text-slate-900">{dateHeading(date)}</h2>
                </div>

                <div className="divide-y divide-slate-100 px-5 sm:px-6">
                  {items.map((release) => (
                    <div
                      key={`${release.date}-${release.title}`}
                      className="grid gap-3 py-5 sm:grid-cols-[90px_1fr_auto] sm:items-center"
                    >
                      <div>
                        <p className="text-xs font-black tracking-wider text-amber-500">
                          {stars(release.importanceScore)}
                        </p>
                        <p className="mt-1 text-[11px] uppercase text-slate-400">
                          {release.category}
                        </p>
                      </div>

                      <div>
                        <h3 className="font-black text-slate-900">
                          {release.title}
                        </h3>
                        <p className="mt-1 text-xs text-slate-400">
                          {release.symbols.join(" · ")}
                        </p>
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
              데이터팩의 다음 수집에서 원천 발표 정보가 확인되면 자동으로
              반영됩니다.
            </p>
          </div>
        )}
      </div>
    </main>
  );
}
