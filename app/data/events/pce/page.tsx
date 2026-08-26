import type { Metadata } from "next";
import Link from "next/link";

import { getPcePageData } from "@/app/lib/pceEventDb";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "미국 PCE 물가 EVENT DB | 발표값·시장반응 | 호행처럼",
  description:
    "미국 PCE 물가지수의 헤드라인·근원 YoY/MoM과 발표 후 나스닥·러셀·금·WTI·달러·국채선물 반응을 축적하고 유사 사례·시장환경·반응 유형을 분석합니다.",
  alternates: { canonical: "/data/events/pce" },
};

function formatDate(value: string | null) {
  if (!value) return "—";
  return new Intl.DateTimeFormat("ko-KR", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(value));
}

function value(value: number | null, digits = 2) {
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

export default async function PceEventPage() {
  const data = await getPcePageData();
  const latest = data.latest;
  const upcoming = data.upcoming;

  return (
    <main className="min-h-screen bg-[#f6f7f9] pb-16 text-slate-900">
      <section className="border-b border-slate-200 bg-white">
        <div className="mx-auto max-w-6xl px-4 py-9 sm:px-6">
          <p className="text-xs font-black uppercase tracking-[0.2em] text-blue-600">HOHAENG PCE EVENT DB</p>
          <h1 className="mt-2 text-3xl font-black tracking-tight sm:text-4xl">미국 PCE 발표와 시장 반응</h1>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600">
            Fed가 중요하게 보는 PCE 물가를 헤드라인·근원 YoY/MoM으로 정리하고, 발표 뒤 7개 자산이 실제로 어떻게 움직였는지 같은 이벤트 단위로 축적합니다.
          </p>
          <div className="mt-5 flex flex-wrap gap-2">
            <Link href="/data/events" className="rounded-full bg-slate-950 px-4 py-2 text-sm font-black text-white">EVENT DB 홈 →</Link>
            <Link href="/data/events/pce/similar" className="rounded-full bg-violet-600 px-4 py-2 text-sm font-black text-white">비슷했던 과거 →</Link>
            <Link href="/data/events/pce/regime" className="rounded-full bg-blue-600 px-4 py-2 text-sm font-black text-white">PCE + 시장환경 →</Link>
            <Link href="/data/events/pce/pattern" className="rounded-full bg-fuchsia-600 px-4 py-2 text-sm font-black text-white">반응 유형 →</Link>
            <Link href="/data/events/cpi" className="rounded-full border border-blue-200 bg-blue-50 px-4 py-2 text-sm font-black text-blue-700">CPI EVENT DB →</Link>
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-6xl space-y-8 px-4 py-7 sm:px-6">
        {upcoming && (
          <section className="rounded-3xl border border-blue-200 bg-blue-50 p-5 sm:p-6">
            <p className="text-xs font-black uppercase tracking-wider text-blue-600">NEXT PCE</p>
            <div className="mt-2 flex flex-wrap items-end justify-between gap-3">
              <div>
                <h2 className="text-2xl font-black">다음 PCE 발표 {formatDate(upcoming.releaseAt)}</h2>
                <p className="mt-1 text-sm text-blue-900/70">기준월 {upcoming.referencePeriod ?? "—"} · 컨센서스는 검증 가능한 원천만 입력</p>
              </div>
              <span className="rounded-full bg-white px-3 py-2 text-xs font-black text-blue-700">예정</span>
            </div>
          </section>
        )}

        {!latest ? (
          <section className="rounded-3xl border border-dashed border-slate-300 bg-white p-6">
            <h2 className="text-xl font-black">PCE 역사 데이터가 아직 채워지지 않았습니다.</h2>
            <p className="mt-2 text-sm leading-6 text-slate-500">관리자 백필을 한 번 실행하면 2016년 이후 발표값과 일봉 기준 시장반응이 채워집니다.</p>
            <Link href="/admin/economic-events/pce" className="mt-4 inline-flex rounded-xl bg-slate-950 px-4 py-2.5 text-sm font-black text-white">관리자 PCE 백필 →</Link>
          </section>
        ) : (
          <>
            <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
              <div className="flex flex-wrap items-end justify-between gap-3">
                <div>
                  <p className="text-xs font-black uppercase tracking-wider text-emerald-600">LATEST RELEASED</p>
                  <h2 className="mt-1 text-2xl font-black">{formatDate(latest.releaseAt)} PCE</h2>
                  <p className="mt-1 text-xs text-slate-400">기준월 {latest.referencePeriod ?? "—"}</p>
                </div>
                <span className="rounded-full bg-slate-100 px-3 py-2 text-xs font-black text-slate-600">누적 {data.totalCount}개 이벤트</span>
              </div>

              <div className="mt-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
                {latest.metrics.map((metric) => (
                  <div key={metric.key} className="rounded-2xl bg-slate-50 p-4">
                    <p className="text-xs font-bold text-slate-400">{metric.name}</p>
                    <p className="mt-1 text-2xl font-black">{value(metric.actual)}</p>
                    <p className="mt-2 text-xs text-slate-500">이전 {value(metric.previous)} · 예상 {value(metric.forecast)}</p>
                    {metric.surprise !== null && <p className={`mt-1 text-xs font-black ${tone(metric.surprise)}`}>서프라이즈 {signed(metric.surprise)}</p>}
                  </div>
                ))}
              </div>
            </section>

            <section className="grid gap-3 md:grid-cols-3">
              <Link href="/data/events/pce/similar" className="rounded-3xl border border-violet-200 bg-violet-50 p-5 transition hover:-translate-y-0.5 hover:shadow-md">
                <p className="text-xs font-black text-violet-600">ANALYSIS V2</p><h2 className="mt-1 text-xl font-black">비슷했던 과거</h2><p className="mt-2 text-xs leading-5 text-violet-900/70">근원 PCE 비중을 높인 유사도, TOP5·10·20 민감도, 7개 자산 통계.</p>
              </Link>
              <Link href="/data/events/pce/regime" className="rounded-3xl border border-blue-200 bg-blue-50 p-5 transition hover:-translate-y-0.5 hover:shadow-md">
                <p className="text-xs font-black text-blue-600">ANALYSIS V3</p><h2 className="mt-1 text-xl font-black">PCE + 시장환경</h2><p className="mt-2 text-xs leading-5 text-blue-900/70">금리·VIX·DXY·나스닥 추세까지 비슷했던 과거와 가격경로.</p>
              </Link>
              <Link href="/data/events/pce/pattern" className="rounded-3xl border border-fuchsia-200 bg-fuchsia-50 p-5 transition hover:-translate-y-0.5 hover:shadow-md">
                <p className="text-xs font-black text-fuchsia-600">ANALYSIS V4</p><h2 className="mt-1 text-xl font-black">시장 반응 유형</h2><p className="mt-2 text-xs leading-5 text-fuchsia-900/70">Risk-On·금리부담·성장둔화·리플레이션 등 Cross Asset 패턴 분류.</p>
              </Link>
            </section>

            <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
              <p className="text-xs font-black uppercase tracking-wider text-violet-600">MARKET REACTION</p>
              <h2 className="mt-1 text-2xl font-black">발표 뒤 7개 자산 반응</h2>
              <p className="mt-2 text-xs leading-5 text-slate-500">현재 PCE 역사 데이터는 발표 전 거래일 종가 대비 일봉 기준입니다. +30분 정밀 반응은 별도 데이터 원천 확보 후 확장합니다.</p>
              <div className="mt-5 overflow-x-auto">
                <table className="w-full min-w-[680px] text-sm">
                  <thead className="bg-slate-50 text-xs font-black text-slate-400">
                    <tr>
                      <th className="px-4 py-3 text-left">자산</th>
                      <th className="px-4 py-3 text-right">당일</th>
                      <th className="px-4 py-3 text-right">+1D</th>
                      <th className="px-4 py-3 text-right">+5D</th>
                    </tr>
                  </thead>
                  <tbody>
                    {latest.reactions.map((reaction) => (
                      <tr key={reaction.assetKey} className="border-t border-slate-100">
                        <td className="px-4 py-3 font-black">{reaction.assetName}</td>
                        {[reaction.close, reaction.oneDay, reaction.fiveDay].map((item, index) => (
                          <td key={index} className={`px-4 py-3 text-right font-black tabular-nums ${tone(item)}`}>{signed(item)}</td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>

            <section>
              <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
                <div>
                  <p className="text-xs font-black uppercase tracking-wider text-slate-400">HISTORY</p>
                  <h2 className="mt-1 text-2xl font-black">최근 PCE 발표 기록</h2>
                </div>
                <span className="text-xs font-bold text-slate-400">2016년 이후 DB 기준</span>
              </div>
              <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                {data.history.slice(0, 18).map((event) => {
                  const core = event.metrics.find((metric) => metric.key === "core_yoy");
                  const nq = event.reactions.find((reaction) => reaction.assetKey === "NQ");
                  return (
                    <div key={event.id} className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                      <p className="text-xs font-black text-blue-600">{formatDate(event.releaseAt)}</p>
                      <p className="mt-1 text-lg font-black">기준월 {event.referencePeriod ?? "—"}</p>
                      <div className="mt-4 grid grid-cols-2 gap-2 text-sm">
                        <div className="rounded-xl bg-slate-50 p-3">
                          <p className="text-[10px] text-slate-400">Core PCE YoY</p>
                          <p className="mt-1 font-black">{value(core?.actual ?? null)}</p>
                        </div>
                        <div className="rounded-xl bg-slate-50 p-3">
                          <p className="text-[10px] text-slate-400">NQ +1D</p>
                          <p className={`mt-1 font-black ${tone(nq?.oneDay ?? null)}`}>{signed(nq?.oneDay ?? null)}</p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          </>
        )}

        <section className="rounded-3xl border border-slate-200 bg-white p-5 text-xs leading-6 text-slate-500 sm:p-6">
          <strong className="text-slate-800">데이터 기준:</strong> PCEPI와 PCEPILFE FRED 시계열에서 YoY·MoM을 계산합니다. PCE는 과거치가 개정될 수 있어 오래된 발표값은 현재 빈티지 시계열을 기준으로 한 재구성값이며, 발표 당시 실시간 빈티지와 차이가 있을 수 있습니다.
        </section>
      </div>
    </main>
  );
}
