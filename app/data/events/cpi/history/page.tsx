import type { Metadata } from "next";
import Link from "next/link";

import { getCpiHistoryArchive } from "@/app/lib/cpiHistoricalBackfill";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "미국 CPI 10년 역사 데이터와 나스닥 반응 | 호행처럼",
  description: "2016년부터 미국 CPI 실제값과 나스닥100의 발표 당일·1거래일·5거래일 반응을 연도별로 축적한 이벤트 데이터 아카이브입니다.",
  alternates: { canonical: "/data/events/cpi/history" },
};

function percent(value: number | null, digits = 1) {
  if (value === null) return "—";
  return `${value.toFixed(digits)}%`;
}

function signed(value: number | null) {
  if (value === null) return "—";
  return `${value > 0 ? "+" : ""}${value.toFixed(2)}%`;
}

function tone(value: number | null) {
  if (value === null || value === 0) return "text-slate-400";
  return value > 0 ? "text-emerald-600" : "text-rose-600";
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("ko-KR", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(value));
}

export default async function CpiHistoryPage() {
  const items = await getCpiHistoryArchive();
  const byYear = new Map<string, typeof items>();
  for (const item of items) {
    const year = item.releaseAt.slice(0, 4);
    const rows = byYear.get(year) ?? [];
    rows.push(item);
    byYear.set(year, rows);
  }

  return (
    <main className="min-h-screen bg-[#f6f7f9] pb-16 text-slate-900">
      <section className="border-b border-slate-200 bg-white">
        <div className="mx-auto max-w-6xl px-4 py-9 sm:px-6">
          <p className="text-xs font-black uppercase tracking-[0.2em] text-blue-600">HOHAENG CPI HISTORY DB</p>
          <h1 className="mt-2 text-3xl font-black tracking-tight sm:text-4xl">2016~ CPI 10년 아카이브</h1>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600">
            CPI 발표마다 같은 기준으로 실제값과 시장 반응을 쌓습니다. 과거 장기 데이터는 무료 분봉 보관 한계 때문에
            전 거래일 종가 대비 발표 당일·1거래일·5거래일 반응을 사용하고, 최근 이벤트는 별도로 발표 직전·30분 반응까지 보존합니다.
          </p>
          <div className="mt-5 flex flex-wrap gap-2 text-xs font-black">
            <span className="rounded-full bg-slate-950 px-3 py-2 text-white">이벤트 {items.length}개</span>
            <span className="rounded-full border border-slate-200 bg-white px-3 py-2 text-slate-600">BLS CPI</span>
            <span className="rounded-full border border-slate-200 bg-white px-3 py-2 text-slate-600">FRED 발표일</span>
            <span className="rounded-full border border-slate-200 bg-white px-3 py-2 text-slate-600">Yahoo Finance 일봉</span>
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-6xl space-y-9 px-4 py-7 sm:px-6">
        {items.length === 0 ? (
          <section className="rounded-3xl border border-dashed border-slate-300 bg-white p-6 text-sm text-slate-500">
            아직 역사 데이터 백필 전입니다. 관리자에서 10년 백필을 한 번 실행하면 2016년부터 기록이 채워집니다.
          </section>
        ) : (
          [...byYear.entries()].map(([year, rows]) => (
            <section key={year}>
              <div className="mb-4 flex items-end justify-between gap-3">
                <div>
                  <p className="text-xs font-black uppercase tracking-wider text-blue-600">CPI EVENTS</p>
                  <h2 className="mt-1 text-2xl font-black">{year}년</h2>
                </div>
                <span className="text-xs font-bold text-slate-400">{rows.length}회</span>
              </div>

              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                {rows.map((item) => (
                  <Link
                    key={item.id}
                    href={`/data/events/cpi/history/${item.id}`}
                    className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-blue-300 hover:shadow-md"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-lg font-black">{formatDate(item.releaseAt)}</p>
                        <p className="mt-1 text-xs text-slate-400">기준월 {item.referencePeriod ?? "—"}</p>
                      </div>
                      <span className="text-xs font-black text-blue-600">상세 →</span>
                    </div>

                    <div className="mt-4 grid grid-cols-2 gap-2">
                      <div className="rounded-2xl bg-slate-50 p-3">
                        <p className="text-[11px] font-bold text-slate-400">헤드라인 YoY</p>
                        <p className="mt-1 text-xl font-black">{percent(item.headlineYoy)}</p>
                      </div>
                      <div className="rounded-2xl bg-slate-50 p-3">
                        <p className="text-[11px] font-bold text-slate-400">헤드라인 MoM</p>
                        <p className="mt-1 text-xl font-black">{percent(item.headlineMom)}</p>
                      </div>
                      <div className="rounded-2xl bg-slate-50 p-3">
                        <p className="text-[11px] font-bold text-slate-400">근원 YoY</p>
                        <p className="mt-1 text-xl font-black">{percent(item.coreYoy)}</p>
                      </div>
                      <div className="rounded-2xl bg-slate-50 p-3">
                        <p className="text-[11px] font-bold text-slate-400">근원 MoM</p>
                        <p className="mt-1 text-xl font-black">{percent(item.coreMom)}</p>
                      </div>
                    </div>

                    <div className="mt-4 border-t border-slate-100 pt-4">
                      <p className="text-[11px] font-black uppercase tracking-wider text-slate-400">NASDAQ 100</p>
                      <div className="mt-2 grid grid-cols-3 gap-2 text-center">
                        <div>
                          <p className="text-[10px] text-slate-400">당일</p>
                          <p className={`mt-1 text-sm font-black ${tone(item.nqClose)}`}>{signed(item.nqClose)}</p>
                        </div>
                        <div>
                          <p className="text-[10px] text-slate-400">+1D</p>
                          <p className={`mt-1 text-sm font-black ${tone(item.nq1d)}`}>{signed(item.nq1d)}</p>
                        </div>
                        <div>
                          <p className="text-[10px] text-slate-400">+5D</p>
                          <p className={`mt-1 text-sm font-black ${tone(item.nq5d)}`}>{signed(item.nq5d)}</p>
                        </div>
                      </div>
                    </div>

                    {item.headlineForecast !== null && (
                      <p className="mt-4 text-xs font-bold text-amber-600">
                        컨센서스 {percent(item.headlineForecast)} · 서프라이즈 {item.headlineSurprise === null ? "—" : `${item.headlineSurprise > 0 ? "+" : ""}${item.headlineSurprise.toFixed(2)}%p`}
                      </p>
                    )}
                  </Link>
                ))}
              </div>
            </section>
          ))
        )}
      </div>
    </main>
  );
}
