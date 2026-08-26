import type { Metadata } from "next";
import Link from "next/link";

import { getFomcAnalysisV2, type FomcMeetingCase } from "@/app/lib/fomcAnalysis";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "FOMC 이전 회의 비교 | 금리결정·SEP·시장반응 | 호행처럼",
  description: "이번 FOMC를 직전 회의와 이전 SEP, 같은 금리결정 유형의 과거 시장반응과 비교합니다.",
  alternates: { canonical: "/data/events/fomc/compare" },
};

function date(value: string) {
  return new Intl.DateTimeFormat("ko-KR", { timeZone: "Asia/Seoul", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date(value));
}

function bp(value: number | null) {
  if (value === null) return "—";
  if (Math.abs(value) < 1) return "0bp";
  return `${value > 0 ? "+" : ""}${Math.round(value)}bp`;
}

function pct(value: number | null, digits = 2) {
  if (value === null) return "—";
  return `${value > 0 ? "+" : ""}${value.toFixed(digits)}%`;
}

function rateRange(meeting: FomcMeetingCase | null) {
  if (!meeting || meeting.lower === null || meeting.upper === null) return "—";
  return `${meeting.lower.toFixed(2)}~${meeting.upper.toFixed(2)}%`;
}

function typeLabel(type: FomcMeetingCase["decisionType"]) {
  return type === "hike" ? "금리 인상" : type === "cut" ? "금리 인하" : "금리 동결";
}

export default async function FomcComparePage() {
  const analysis = await getFomcAnalysisV2();

  return (
    <main className="min-h-screen bg-[#f6f7f9] pb-16 text-slate-900">
      <section className="border-b border-slate-200 bg-white">
        <div className="mx-auto max-w-6xl px-4 py-9 sm:px-6">
          <p className="text-xs font-black uppercase tracking-[0.2em] text-blue-600">FOMC ANALYSIS V2</p>
          <h1 className="mt-2 text-3xl font-black tracking-tight sm:text-4xl">이번 FOMC는 직전 회의와 무엇이 달라졌나?</h1>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600">FOMC는 단순 유사도보다 금리결정 변화, SEP 변화, 같은 인상·동결·인하 국면의 과거 자산반응을 따로 보는 편이 더 유용합니다.</p>
          <div className="mt-5 flex flex-wrap gap-2">
            <Link href="/data/events/fomc" className="rounded-full bg-slate-950 px-4 py-2 text-sm font-black text-white">FOMC 홈 →</Link>
            <Link href="/data/events" className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-black text-slate-700">EVENT DB →</Link>
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-6xl space-y-8 px-4 py-7 sm:px-6">
        {!analysis ? (
          <section className="rounded-3xl border border-dashed border-slate-300 bg-white p-6">
            <h2 className="text-xl font-black">FOMC 비교 데이터가 아직 부족합니다.</h2>
            <p className="mt-2 text-sm text-slate-500">관리자에서 FOMC 역사 백필을 먼저 실행해 주세요.</p>
            <Link href="/admin/economic-events/fomc" className="mt-4 inline-flex rounded-xl bg-slate-950 px-4 py-2 text-sm font-black text-white">FOMC 백필 →</Link>
          </section>
        ) : (
          <>
            <section className="grid gap-4 lg:grid-cols-2">
              <div className="rounded-3xl border border-blue-200 bg-blue-50 p-5 sm:p-6">
                <p className="text-xs font-black uppercase tracking-wider text-blue-600">CURRENT</p>
                <h2 className="mt-1 text-2xl font-black">{date(analysis.current.releaseAt)} FOMC</h2>
                <div className="mt-5 grid grid-cols-2 gap-3">
                  <div className="rounded-2xl bg-white p-4"><p className="text-xs text-slate-400">목표금리 범위</p><p className="mt-1 text-xl font-black">{rateRange(analysis.current)}</p></div>
                  <div className="rounded-2xl bg-white p-4"><p className="text-xs text-slate-400">결정</p><p className="mt-1 text-xl font-black">{typeLabel(analysis.current.decisionType)} · {bp(analysis.current.changeBp)}</p></div>
                  <div className="rounded-2xl bg-white p-4"><p className="text-xs text-slate-400">금리 중간값</p><p className="mt-1 text-xl font-black">{pct(analysis.current.midpoint)}</p></div>
                  <div className="rounded-2xl bg-white p-4"><p className="text-xs text-slate-400">장기 점도표</p><p className="mt-1 text-xl font-black">{pct(analysis.current.sepLongRun)}</p></div>
                </div>
              </div>

              <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
                <p className="text-xs font-black uppercase tracking-wider text-slate-400">PREVIOUS MEETING</p>
                <h2 className="mt-1 text-2xl font-black">{analysis.previous ? date(analysis.previous.releaseAt) : "—"}</h2>
                <div className="mt-5 grid grid-cols-2 gap-3">
                  <div className="rounded-2xl bg-slate-50 p-4"><p className="text-xs text-slate-400">이전 금리 범위</p><p className="mt-1 text-xl font-black">{rateRange(analysis.previous)}</p></div>
                  <div className="rounded-2xl bg-slate-50 p-4"><p className="text-xs text-slate-400">이번 변화</p><p className="mt-1 text-xl font-black">{bp(analysis.deltas.midpointBp)}</p></div>
                  <div className="rounded-2xl bg-slate-50 p-4"><p className="text-xs text-slate-400">이전 SEP 장기금리</p><p className="mt-1 text-xl font-black">{pct(analysis.previousSep?.sepLongRun ?? null)}</p></div>
                  <div className="rounded-2xl bg-slate-50 p-4"><p className="text-xs text-slate-400">SEP 변화</p><p className="mt-1 text-xl font-black">{analysis.current.referencePeriod === "SEP" ? bp(analysis.deltas.sepLongRunBp) : "비SEP 회의"}</p></div>
                </div>
              </div>
            </section>

            <section className="rounded-3xl bg-slate-950 p-5 text-white sm:p-6">
              <p className="text-xs font-black uppercase tracking-wider text-orange-300">AUTO INSIGHTS</p>
              <div className="mt-3 space-y-3 text-sm leading-6 text-slate-200">{analysis.insights.map((insight) => <p key={insight}>• {insight}</p>)}</div>
            </section>

            <section>
              <p className="text-xs font-black uppercase tracking-wider text-violet-600">DECISION BUCKETS</p>
              <h2 className="mt-1 text-2xl font-black">2016년 이후 결정 유형 분포</h2>
              <div className="mt-4 grid gap-3 sm:grid-cols-3">
                {analysis.buckets.map((bucket) => (
                  <div key={bucket.type} className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                    <p className="text-xs font-bold text-slate-400">{bucket.label}</p>
                    <p className="mt-1 text-3xl font-black">{bucket.count}회</p>
                  </div>
                ))}
              </div>
            </section>

            <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
              <p className="text-xs font-black uppercase tracking-wider text-blue-600">SAME DECISION TYPE</p>
              <h2 className="mt-1 text-2xl font-black">과거 같은 '{typeLabel(analysis.current.decisionType)}' 뒤 자산 반응</h2>
              <p className="mt-2 text-xs text-slate-500">현재 회의를 제외한 {analysis.sameDecisionCases.length}개 사례 기준입니다.</p>
              <div className="mt-5 overflow-x-auto">
                <table className="w-full min-w-[760px] text-sm">
                  <thead className="bg-slate-50 text-xs font-black text-slate-400">
                    <tr>
                      <th className="px-4 py-3 text-left">자산</th>
                      <th className="px-4 py-3 text-right">당일 상승률</th>
                      <th className="px-4 py-3 text-right">당일 중앙값</th>
                      <th className="px-4 py-3 text-right">+1D 상승률</th>
                      <th className="px-4 py-3 text-right">+1D 중앙값</th>
                      <th className="px-4 py-3 text-right">+5D 중앙값</th>
                    </tr>
                  </thead>
                  <tbody>
                    {analysis.sameDecisionStats.map((asset) => (
                      <tr key={asset.assetKey} className="border-t border-slate-100">
                        <td className="px-4 py-3 font-black">{asset.assetName}</td>
                        <td className="px-4 py-3 text-right font-black">{asset.close.positiveRate?.toFixed(1) ?? "—"}%</td>
                        <td className="px-4 py-3 text-right font-black">{pct(asset.close.medianReturn)}</td>
                        <td className="px-4 py-3 text-right font-black">{asset.oneDay.positiveRate?.toFixed(1) ?? "—"}%</td>
                        <td className="px-4 py-3 text-right font-black">{pct(asset.oneDay.medianReturn)}</td>
                        <td className="px-4 py-3 text-right font-black">{pct(asset.fiveDay.medianReturn)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>

            <section>
              <p className="text-xs font-black uppercase tracking-wider text-slate-400">PAST SAME DECISIONS</p>
              <h2 className="mt-1 text-2xl font-black">같은 결정 유형의 최근 사례</h2>
              <div className="mt-4 grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                {analysis.sameDecisionCases.slice(0, 12).map((meeting) => {
                  const nq = meeting.reactions.NQ;
                  return (
                    <article key={meeting.id} className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                      <p className="text-xs font-black text-blue-600">{date(meeting.releaseAt)}</p>
                      <h3 className="mt-1 text-lg font-black">{rateRange(meeting)}</h3>
                      <div className="mt-4 grid grid-cols-2 gap-2 text-sm">
                        <div className="rounded-xl bg-slate-50 p-3"><p className="text-[10px] text-slate-400">결정</p><p className="mt-1 font-black">{bp(meeting.changeBp)}</p></div>
                        <div className="rounded-xl bg-slate-50 p-3"><p className="text-[10px] text-slate-400">NQ +1D</p><p className="mt-1 font-black">{pct(nq?.oneDay ?? null)}</p></div>
                      </div>
                    </article>
                  );
                })}
              </div>
            </section>

            <section className="rounded-3xl border border-amber-200 bg-amber-50 p-5 text-xs leading-6 text-amber-950/70 sm:p-6">
              <strong>해석 주의:</strong> 같은 금리결정 유형이라도 당시 물가·고용·금융여건이 다르므로 동일한 시장 반응을 기대할 수는 없습니다. 이 페이지는 이번 회의가 직전 회의에서 어떻게 변했고, 과거 같은 결정 뒤 자산이 어떤 분포를 보였는지를 확인하는 비교 도구입니다.
            </section>
          </>
        )}
      </div>
    </main>
  );
}
