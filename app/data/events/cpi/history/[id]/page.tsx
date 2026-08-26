import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { getCpiHistoryDetail } from "@/app/lib/cpiHistoricalBackfill";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "미국 CPI 과거 발표 상세와 자산 반응 | 호행처럼",
  description: "과거 미국 CPI 발표의 실제·예상·이전값과 나스닥·러셀·금·원유·달러·미국채 선물 반응을 확인합니다.",
};

function percent(value: number | null, digits = 1) {
  if (value === null) return "—";
  return `${value.toFixed(digits)}%`;
}

function signed(value: number | null) {
  if (value === null) return "—";
  return `${value > 0 ? "+" : ""}${value.toFixed(2)}%`;
}

function point(value: number | null) {
  if (value === null) return "—";
  return `${value > 0 ? "+" : ""}${value.toFixed(2)}%p`;
}

function tone(value: number | null) {
  if (value === null || value === 0) return "text-slate-400";
  return value > 0 ? "text-emerald-600" : "text-rose-600";
}

function formatKst(value: string) {
  return new Intl.DateTimeFormat("ko-KR", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date(value));
}

export default async function CpiHistoryDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const detail = await getCpiHistoryDetail(id);
  if (!detail) notFound();

  return (
    <main className="min-h-screen bg-[#f6f7f9] pb-16 text-slate-900">
      <section className="border-b border-slate-200 bg-white">
        <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
          <Link href="/data/events/cpi/history" className="text-xs font-black text-blue-600">← 10년 아카이브</Link>
          <p className="mt-5 text-xs font-black uppercase tracking-[0.2em] text-orange-600">CPI EVENT DETAIL</p>
          <h1 className="mt-2 text-3xl font-black">{formatKst(detail.event.releaseAt)} CPI</h1>
          <p className="mt-2 text-sm text-slate-500">기준월 {detail.event.referencePeriod ?? "—"}</p>
        </div>
      </section>

      <div className="mx-auto max-w-6xl space-y-6 px-4 py-7 sm:px-6">
        <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {detail.metrics.map((metric) => (
            <div key={metric.key} className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
              <p className="text-xs font-black text-slate-500">{metric.name}</p>
              <p className="mt-2 text-3xl font-black">{percent(metric.actual)}</p>
              <div className="mt-4 grid grid-cols-2 gap-2 text-xs">
                <div>
                  <p className="text-slate-400">예상</p>
                  <p className="mt-1 font-black">{percent(metric.forecast)}</p>
                </div>
                <div>
                  <p className="text-slate-400">이전</p>
                  <p className="mt-1 font-black">{percent(metric.previous)}</p>
                </div>
              </div>
              {metric.forecast !== null && (
                <p className="mt-3 text-xs font-black text-amber-600">서프라이즈 {point(metric.surprise)}</p>
              )}
            </div>
          ))}
        </section>

        <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <div>
            <p className="text-xs font-black uppercase tracking-wider text-blue-600">MULTI-ASSET REACTION</p>
            <h2 className="mt-1 text-2xl font-black">발표 이후 자산별 반응</h2>
          </div>

          <div className="mt-5 grid gap-3 md:grid-cols-2">
            {detail.reactions.map((reaction) => (
              <div key={reaction.assetKey} className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
                <div className="flex items-center justify-between gap-3">
                  <p className="font-black">{reaction.assetName}</p>
                  <span className="text-[10px] font-black text-slate-400">{reaction.assetKey}</span>
                </div>
                <div className="mt-4 grid grid-cols-4 gap-2 text-center">
                  <div>
                    <p className="text-[10px] text-slate-400">+30분</p>
                    <p className={`mt-1 text-sm font-black ${tone(reaction.thirtyMinuteReturn)}`}>{signed(reaction.thirtyMinuteReturn)}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-slate-400">당일</p>
                    <p className={`mt-1 text-sm font-black ${tone(reaction.closeReturn)}`}>{signed(reaction.closeReturn)}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-slate-400">+1D</p>
                    <p className={`mt-1 text-sm font-black ${tone(reaction.oneDayReturn)}`}>{signed(reaction.oneDayReturn)}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-slate-400">+5D</p>
                    <p className={`mt-1 text-sm font-black ${tone(reaction.fiveDayReturn)}`}>{signed(reaction.fiveDayReturn)}</p>
                  </div>
                </div>
                <p className="mt-4 text-[11px] leading-5 text-slate-400">{reaction.basisLabel}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-3xl bg-slate-950 p-5 text-sm leading-6 text-slate-300 sm:p-6">
          <h2 className="font-black text-white">데이터 해석 기준</h2>
          <p className="mt-2">
            과거 장기 백필은 무료 장기 분봉을 확보하기 어려워 전 거래일 종가를 기준점으로 사용합니다.
            따라서 최근 이벤트의 ‘발표 직전 대비’ 정밀 반응과 과거 일봉 반응은 기준이 다르며, 각 카드의 기준 문구를 함께 확인해야 합니다.
          </p>
        </section>
      </div>
    </main>
  );
}
