"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { supabase } from "@/app/lib/supabase";

type BackfillResult = {
  startDate: string;
  releaseCount: number;
  storedEventCount: number;
  metricRowCount: number;
  reactionRowCount: number;
  assetCoverage: Record<string, number>;
  fetchedAt: string;
};

type ApiResponse =
  | { ok: true; result: BackfillResult }
  | { ok: false; error: string };

export default function CpiBackfillAdminPage() {
  const router = useRouter();
  const [running, setRunning] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<BackfillResult | null>(null);

  async function runBackfill() {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      router.replace("/admin/login");
      return;
    }

    setRunning(true);
    setError("");
    setResult(null);

    try {
      const response = await fetch("/api/admin/economic-events/backfill", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          "Content-Type": "application/json",
        },
      });
      const payload = (await response.json()) as ApiResponse;
      if (response.status === 401) {
        router.replace("/admin/login");
        return;
      }
      if (!payload.ok) throw new Error(payload.error);
      setResult(payload.result);
    } catch (backfillError) {
      setError(backfillError instanceof Error ? backfillError.message : String(backfillError));
    } finally {
      setRunning(false);
    }
  }

  return (
    <main className="min-h-screen bg-slate-950 px-4 py-8 text-slate-100 sm:px-6">
      <div className="mx-auto max-w-4xl">
        <p className="text-xs font-black uppercase tracking-[0.2em] text-orange-400">HOHAENG CPI HISTORY</p>
        <h1 className="mt-2 text-3xl font-black">CPI 10년치 역사 데이터 백필</h1>
        <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-400">
          2016년부터 현재까지 CPI 발표일과 실제값을 BLS·FRED에서 채우고, Yahoo Finance 일봉으로
          나스닥100·러셀2000·금·WTI·달러·미국채 선물의 당일/+1D/+5D 반응을 계산합니다.
        </p>

        <section className="mt-6 rounded-2xl border border-slate-800 bg-slate-900 p-5">
          <h2 className="font-black">백필 기준</h2>
          <div className="mt-3 space-y-2 text-sm leading-6 text-slate-400">
            <p>• 실제 CPI: BLS 공식 CPI 지수에서 YoY·MoM을 계산</p>
            <p>• 발표일: FRED CPI release calendar</p>
            <p>• 과거 시장반응: Yahoo Finance 일봉의 전 거래일 종가 대비</p>
            <p>• 과거 +30분: 무료 장기 분봉 한계 때문에 비워두고, 최근 데이터만 기존 정밀 수집값 유지</p>
            <p>• 과거 컨센서스: 검증된 원천이 있는 값만 유지하며 임의 생성하지 않음</p>
          </div>
        </section>

        <button
          type="button"
          onClick={() => void runBackfill()}
          disabled={running}
          className="mt-6 w-full rounded-2xl bg-orange-500 px-5 py-4 text-base font-black text-slate-950 disabled:opacity-50 sm:w-auto"
        >
          {running ? "10년치 백필 실행 중..." : "2016~현재 데이터 채우기"}
        </button>

        {running && (
          <p className="mt-3 text-xs leading-5 text-slate-500">
            발표일·CPI 지수·7개 자산 일봉을 한 번에 처리하므로 수십 초 걸릴 수 있습니다. 화면을 닫지 마세요.
          </p>
        )}

        {error && (
          <div className="mt-5 rounded-2xl border border-rose-800 bg-rose-950/40 p-4 text-sm text-rose-200">
            {error}
          </div>
        )}

        {result && (
          <section className="mt-5 rounded-2xl border border-emerald-800 bg-emerald-950/30 p-5">
            <h2 className="font-black text-emerald-200">백필 완료</h2>
            <div className="mt-4 grid gap-3 sm:grid-cols-3">
              <div className="rounded-xl bg-slate-950/60 p-4">
                <p className="text-xs text-slate-500">CPI 이벤트</p>
                <p className="mt-1 text-2xl font-black">{result.storedEventCount}</p>
              </div>
              <div className="rounded-xl bg-slate-950/60 p-4">
                <p className="text-xs text-slate-500">CPI 지표 행</p>
                <p className="mt-1 text-2xl font-black">{result.metricRowCount}</p>
              </div>
              <div className="rounded-xl bg-slate-950/60 p-4">
                <p className="text-xs text-slate-500">시장반응 행</p>
                <p className="mt-1 text-2xl font-black">{result.reactionRowCount}</p>
              </div>
            </div>
            <div className="mt-4 flex flex-wrap gap-2 text-xs">
              {Object.entries(result.assetCoverage).map(([asset, count]) => (
                <span key={asset} className="rounded-full border border-emerald-900 px-3 py-1.5 text-emerald-200">
                  {asset} {count}회
                </span>
              ))}
            </div>
            <a href="/data/events/cpi/history" className="mt-5 inline-flex rounded-xl bg-white px-4 py-2 text-sm font-black text-slate-950">
              10년 아카이브 확인 →
            </a>
          </section>
        )}
      </div>
    </main>
  );
}
