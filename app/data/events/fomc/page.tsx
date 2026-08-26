import type { Metadata } from "next";
import Link from "next/link";

import { getFomcPageData, type FomcEventView } from "@/app/lib/fomcEventDb";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "FOMC EVENT DB | 기준금리·SEP·시장반응 | 호행처럼",
  description:
    "2016년 이후 FOMC 기준금리 결정, SEP 회의 여부, 장기 점도표 중앙값과 나스닥·러셀·금·WTI·달러·국채선물 반응을 축적합니다.",
  alternates: { canonical: "/data/events/fomc" },
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

function metric(event: FomcEventView | null, key: string) {
  return event?.metrics.find((item) => item.key === key) ?? null;
}

function pctValue(value: number | null, digits = 2) {
  return value === null ? "—" : `${value.toFixed(digits)}%`;
}

function signed(value: number | null, digits = 2) {
  if (value === null) return "—";
  return `${value > 0 ? "+" : ""}${value.toFixed(digits)}%`;
}

function bpLabel(value: number | null) {
  if (value === null) return "—";
  if (value === 0) return "동결";
  return `${value > 0 ? "+" : ""}${Math.round(value)}bp`;
}

function tone(value: number | null) {
  if (value === null || value === 0) return "text-slate-400";
  return value > 0 ? "text-emerald-600" : "text-rose-600";
}

function meetingBadge(reference: string | null) {
  if (reference === "SEP") return { label: "SEP · 점도표", className: "bg-violet-100 text-violet-700" };
  if (reference === "EMERGENCY") return { label: "긴급회의", className: "bg-rose-100 text-rose-700" };
  return { label: "정례회의", className: "bg-slate-100 text-slate-600" };
}

export default async function FomcEventPage() {
  const data = await getFomcPageData();
  const latest = data.latest;
  const upcoming = data.upcoming;

  const lower = metric(latest, "target_lower")?.actual ?? null;
  const upper = metric(latest, "target_upper")?.actual ?? null;
  const midpoint = metric(latest, "target_midpoint")?.actual ?? null;
  const change = metric(latest, "decision_change_bp")?.actual ?? null;
  const sepLongRun = metric(latest, "sep_long_run_rate")?.actual ?? null;

  return (
    <main className="min-h-screen bg-[#f6f7f9] pb-16 text-slate-900">
      <section className="border-b border-slate-200 bg-white">
        <div className="mx-auto max-w-6xl px-4 py-9 sm:px-6">
          <p className="text-xs font-black uppercase tracking-[0.2em] text-blue-600">HOHAENG FOMC EVENT DB</p>
          <h1 className="mt-2 text-3xl font-black tracking-tight sm:text-4xl">FOMC 금리결정과 시장 반응</h1>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600">
            기준금리 결정만 보는 것이 아니라 SEP 회의 여부와 장기 점도표 중앙값, 발표 뒤 7개 자산의 실제 반응을 같은 이벤트 단위로 쌓습니다.
          </p>
          <div className="mt-5 flex flex-wrap gap-2">
            <Link href="/data/events" className="rounded-full bg-slate-950 px-4 py-2 text-sm font-black text-white">EVENT DB 홈 →</Link>
            <Link href="/data/events/cpi" className="rounded-full border border-blue-200 bg-blue-50 px-4 py-2 text-sm font-black text-blue-700">CPI →</Link>
            <Link href="/data/events/pce" className="rounded-full border border-violet-200 bg-violet-50 px-4 py-2 text-sm font-black text-violet-700">PCE →</Link>
            <Link href="/data/events/nfp" className="rounded-full border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm font-black text-emerald-700">고용보고서 →</Link>
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-6xl space-y-8 px-4 py-7 sm:px-6">
        {upcoming && (() => {
          const badge = meetingBadge(upcoming.referencePeriod);
          return (
            <section className="rounded-3xl border border-blue-200 bg-blue-50 p-5 sm:p-6">
              <p className="text-xs font-black uppercase tracking-wider text-blue-600">NEXT FOMC</p>
              <div className="mt-2 flex flex-wrap items-end justify-between gap-3">
                <div>
                  <h2 className="text-2xl font-black">다음 FOMC {formatDate(upcoming.releaseAt)}</h2>
                  <p className="mt-1 text-sm text-blue-900/70">정례회의 기준 정책성명 14:00 ET · 시장반응은 일봉으로 추적</p>
                </div>
                <span className={`rounded-full px-3 py-2 text-xs font-black ${badge.className}`}>{badge.label}</span>
              </div>
            </section>
          );
        })()}

        {!latest ? (
          <section className="rounded-3xl border border-dashed border-slate-300 bg-white p-6">
            <h2 className="text-xl font-black">FOMC 역사 데이터가 아직 채워지지 않았습니다.</h2>
            <p className="mt-2 text-sm leading-6 text-slate-500">관리자 백필을 한 번 실행하면 2016년 이후 금리결정·SEP 장기금리 중앙값과 일봉 기준 시장반응이 채워집니다.</p>
            <Link href="/admin/economic-events/fomc" className="mt-4 inline-flex rounded-xl bg-slate-950 px-4 py-2.5 text-sm font-black text-white">관리자 FOMC 백필 →</Link>
          </section>
        ) : (
          <>
            <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
              <div className="flex flex-wrap items-end justify-between gap-3">
                <div>
                  <p className="text-xs font-black uppercase tracking-wider text-emerald-600">LATEST DECISION</p>
                  <h2 className="mt-1 text-2xl font-black">{formatDate(latest.releaseAt)} FOMC</h2>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {(() => {
                      const badge = meetingBadge(latest.referencePeriod);
                      return <span className={`rounded-full px-3 py-1 text-[11px] font-black ${badge.className}`}>{badge.label}</span>;
                    })()}
                    <span className={`rounded-full bg-slate-950 px-3 py-1 text-[11px] font-black text-white`}>{bpLabel(change)}</span>
                  </div>
                </div>
                <span className="rounded-full bg-slate-100 px-3 py-2 text-xs font-black text-slate-600">누적 {data.totalCount}개 이벤트</span>
              </div>

              <div className="mt-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
                <div className="rounded-2xl bg-slate-50 p-4">
                  <p className="text-xs font-bold text-slate-400">목표금리 범위</p>
                  <p className="mt-1 text-2xl font-black">{lower === null || upper === null ? "—" : `${lower.toFixed(2)}~${upper.toFixed(2)}%`}</p>
                </div>
                <div className="rounded-2xl bg-slate-50 p-4">
                  <p className="text-xs font-bold text-slate-400">중간값</p>
                  <p className="mt-1 text-2xl font-black">{pctValue(midpoint)}</p>
                </div>
                <div className="rounded-2xl bg-slate-50 p-4">
                  <p className="text-xs font-bold text-slate-400">이번 결정</p>
                  <p className={`mt-1 text-2xl font-black ${change === 0 ? "text-slate-900" : change !== null && change > 0 ? "text-rose-600" : "text-blue-600"}`}>{bpLabel(change)}</p>
                </div>
                <div className="rounded-2xl bg-slate-50 p-4">
                  <p className="text-xs font-bold text-slate-400">SEP 장기금리 중앙값</p>
                  <p className="mt-1 text-2xl font-black">{pctValue(sepLongRun)}</p>
                  <p className="mt-2 text-[11px] text-slate-400">SEP 회의에서만 값 표시</p>
                </div>
              </div>
            </section>

            <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
              <p className="text-xs font-black uppercase tracking-wider text-violet-600">MARKET REACTION</p>
              <h2 className="mt-1 text-2xl font-black">금리결정 뒤 7개 자산 반응</h2>
              <p className="mt-2 text-xs leading-5 text-slate-500">정례회의는 결정 직전 거래일 종가 대비 결정일 종가/+1D/+5D입니다. 2020년 주말 긴급회의는 다음 거래일을 당일 반응으로 사용합니다.</p>
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
                  <h2 className="mt-1 text-2xl font-black">최근 FOMC 결정 기록</h2>
                </div>
                <span className="text-xs font-bold text-slate-400">2016년 이후 · 긴급회의 포함</span>
              </div>
              <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                {data.history.slice(0, 24).map((event) => {
                  const eventLower = metric(event, "target_lower")?.actual ?? null;
                  const eventUpper = metric(event, "target_upper")?.actual ?? null;
                  const eventChange = metric(event, "decision_change_bp")?.actual ?? null;
                  const eventSep = metric(event, "sep_long_run_rate")?.actual ?? null;
                  const nq = event.reactions.find((reaction) => reaction.assetKey === "NQ");
                  const badge = meetingBadge(event.referencePeriod);
                  return (
                    <div key={event.id} className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-xs font-black text-blue-600">{formatDate(event.releaseAt)}</p>
                        <span className={`rounded-full px-2.5 py-1 text-[10px] font-black ${badge.className}`}>{badge.label}</span>
                      </div>
                      <p className="mt-2 text-lg font-black">{eventLower === null || eventUpper === null ? "—" : `${eventLower.toFixed(2)}~${eventUpper.toFixed(2)}%`}</p>
                      <div className="mt-4 grid grid-cols-3 gap-2 text-sm">
                        <div className="rounded-xl bg-slate-50 p-3"><p className="text-[10px] text-slate-400">결정</p><p className="mt-1 font-black">{bpLabel(eventChange)}</p></div>
                        <div className="rounded-xl bg-slate-50 p-3"><p className="text-[10px] text-slate-400">장기 점도표</p><p className="mt-1 font-black">{pctValue(eventSep)}</p></div>
                        <div className="rounded-xl bg-slate-50 p-3"><p className="text-[10px] text-slate-400">NQ +1D</p><p className={`mt-1 font-black ${tone(nq?.oneDay ?? null)}`}>{signed(nq?.oneDay ?? null)}</p></div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          </>
        )}

        <section className="rounded-3xl border border-amber-200 bg-amber-50 p-5 text-xs leading-6 text-amber-950/70 sm:p-6">
          <strong className="text-amber-950">해석 주의:</strong> V1은 기준금리 범위와 SEP 장기금리 중앙값처럼 검증 가능한 숫자를 우선 축적합니다. 점도표의 연도별 전체 분포와 성명 문구의 매파·비둘기파 변화는 발표 당시 원문 빈티지를 보존하는 별도 텍스트 분석 레이어에서 확장합니다. 시장반응 역시 역사 구간은 일봉 기준이라 14:00 ET 직후의 순수 반응과는 다를 수 있습니다.
        </section>
      </div>
    </main>
  );
}
