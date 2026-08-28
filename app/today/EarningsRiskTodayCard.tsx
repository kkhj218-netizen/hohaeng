"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import type { EarningsRiskEvent, EarningsRiskSnapshot } from "@/app/lib/earningsRiskTypes";

type EarningsApiResponse = {
  ok?: boolean;
  snapshot?: EarningsRiskSnapshot | null;
};

function dDay(event: EarningsRiskEvent) {
  if (event.daysAway <= 0) return "오늘";
  if (event.daysAway === 1) return "D-1";
  return `D-${event.daysAway}`;
}

function riskTone(event: EarningsRiskEvent) {
  if (event.riskLevel === "high") return "border-rose-200 bg-rose-50 text-rose-700";
  if (event.riskLevel === "important") return "border-amber-200 bg-amber-50 text-amber-700";
  return "border-slate-200 bg-slate-50 text-slate-600";
}

export default function EarningsRiskTodayCard({
  initialSnapshot,
}: {
  initialSnapshot?: EarningsRiskSnapshot | null;
}) {
  const [snapshot, setSnapshot] = useState<EarningsRiskSnapshot | null>(initialSnapshot ?? null);

  useEffect(() => {
    if (initialSnapshot !== undefined) return;

    let cancelled = false;
    let controller: AbortController | null = null;

    const timer = window.setTimeout(async () => {
      controller = new AbortController();
      const timeout = window.setTimeout(() => controller?.abort(), 2_500);

      try {
        const response = await fetch("/api/public/earnings-risk", {
          signal: controller.signal,
          credentials: "same-origin",
        });
        if (!response.ok) return;
        const payload = (await response.json()) as EarningsApiResponse;
        if (!cancelled && payload.snapshot) setSnapshot(payload.snapshot);
      } catch {
        // TODAY 본문 렌더링과 사용성을 절대 방해하지 않는다.
      } finally {
        window.clearTimeout(timeout);
      }
    }, 650);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
      controller?.abort();
    };
  }, [initialSnapshot]);

  if (!snapshot || snapshot.events.length === 0) return null;

  const events = snapshot.events.slice(0, 4);
  const urgent = events.find((event) => event.riskLevel === "high") ?? events[0];

  return (
    <section className="rounded-3xl border border-rose-100 bg-white p-5 shadow-sm sm:p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-black uppercase tracking-wider text-rose-600">EARNINGS RISK RADAR</p>
          <h2 className="mt-1 text-xl font-black text-slate-950">대형주 실적 전, 포지션 주의</h2>
          <p className="mt-2 text-xs leading-5 text-slate-500">
            향후 7일 중 NASDAQ100·S&amp;P500에 영향이 큰 기업만 추려 봅니다.
          </p>
        </div>
        <Link href="/data/earnings-risk" className="shrink-0 text-xs font-black text-rose-600 hover:text-rose-700">
          전체 보기 →
        </Link>
      </div>

      <div className={`mt-4 rounded-2xl border px-4 py-3 ${riskTone(urgent)}`}>
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <strong className="text-base font-black">⚠ {urgent.symbol}</strong>
              <span className="rounded-full bg-white/70 px-2 py-0.5 text-[10px] font-black">{dDay(urgent)}</span>
              <span className="rounded-full bg-white/70 px-2 py-0.5 text-[10px] font-black">{urgent.sessionLabel}</span>
            </div>
            <p className="mt-1 truncate text-xs font-semibold opacity-80">{urgent.name}</p>
          </div>
          <div className="shrink-0 text-right">
            <p className="text-xs font-black">영향도 {urgent.impactScore}</p>
            <p className="mt-0.5 text-[10px] font-bold opacity-75">{urgent.impactLabel}</p>
          </div>
        </div>
      </div>

      {events.length > 1 && (
        <div className="mt-3 flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {events.slice(1).map((event) => (
            <div key={`${event.reportDate}-${event.symbol}`} className="min-w-[145px] rounded-xl bg-slate-50 px-3 py-2.5">
              <div className="flex items-center justify-between gap-2">
                <strong className="text-sm font-black text-slate-900">{event.symbol}</strong>
                <span className="text-[10px] font-black text-slate-500">{dDay(event)}</span>
              </div>
              <p className="mt-1 text-[10px] font-bold text-slate-400">{event.sessionLabel}</p>
              <p className="mt-1 text-[10px] font-black text-slate-600">영향도 {event.impactScore} · {event.impactLabel}</p>
            </div>
          ))}
        </div>
      )}

      <p className="mt-3 text-[10px] leading-4 text-slate-400">
        일정은 자동 수집 단계에서는 ESTIMATED일 수 있습니다. 방향 예측이 아니라 변동성 이벤트 사전 경고용입니다.
      </p>
    </section>
  );
}
