"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { supabase } from "@/app/lib/supabase";

type RefreshResult = {
  asOfDate: string;
  eventCount: number;
  highRiskCount: number;
  importantCount: number;
};

type ApiResponse =
  | { ok: true; result: RefreshResult }
  | { ok: false; error: string };

export default function EarningsRiskAdminPage() {
  const router = useRouter();
  const [running, setRunning] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<RefreshResult | null>(null);

  async function refresh() {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      router.replace("/admin/login");
      return;
    }

    setRunning(true);
    setError("");
    setResult(null);

    try {
      const response = await fetch("/api/admin/earnings-risk/refresh", {
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
    } catch (runError) {
      setError(runError instanceof Error ? runError.message : String(runError));
    } finally {
      setRunning(false);
    }
  }

  return (
    <main className="min-h-screen bg-slate-950 px-4 py-8 text-slate-100 sm:px-6">
      <div className="mx-auto max-w-4xl">
        <p className="text-xs font-black uppercase tracking-[0.2em] text-rose-400">HOHAENG EARNINGS RISK</p>
        <h1 className="mt-2 text-3xl font-black">대형주 실적 위험 레이더 생성</h1>
        <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-400">
          저장된 MARKET MAP을 기준으로 시가총액이 큰 NASDAQ100·S&amp;P500 종목을 선별한 뒤 향후 7일 Nasdaq Earnings Calendar를 확인합니다.
          공개 TODAY와 MARKET MAP은 이 저장 결과만 읽습니다.
        </p>

        <section className="mt-6 rounded-2xl border border-slate-800 bg-slate-900 p-5">
          <h2 className="font-black">자동 운영 기준</h2>
          <div className="mt-3 space-y-2 text-sm leading-6 text-slate-400">
            <p>• 자동 수집: 매일 21:45 UTC / 한국시간 06:45</p>
            <p>• MARKET MAP 생성 15분 뒤 실행</p>
            <p>• 대상: NASDAQ100 시총 상위 30 + S&amp;P500 상위 50</p>
            <p>• 경고: D-7 / D-3 / D-1·당일 + 지수 영향도</p>
            <p>• Nasdaq 자동 일정은 회사 확정 전 ESTIMATED로 표시</p>
          </div>
        </section>

        <button
          type="button"
          onClick={() => void refresh()}
          disabled={running}
          className="mt-6 w-full rounded-2xl bg-rose-400 px-5 py-4 text-base font-black text-slate-950 disabled:opacity-50 sm:w-auto"
        >
          {running ? "향후 7일 실적 확인 중..." : "지금 EARNINGS RISK 데이터 만들기"}
        </button>

        {error && (
          <div className="mt-5 rounded-2xl border border-rose-800 bg-rose-950/40 p-4 text-sm leading-6 text-rose-200">{error}</div>
        )}

        {result && (
          <section className="mt-5 rounded-2xl border border-emerald-800 bg-emerald-950/30 p-5">
            <h2 className="font-black text-emerald-200">EARNINGS RISK 생성 완료</h2>
            <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
              <div className="rounded-xl bg-slate-950/60 p-4"><p className="text-xs text-slate-500">기준일</p><p className="mt-1 font-black">{result.asOfDate}</p></div>
              <div className="rounded-xl bg-slate-950/60 p-4"><p className="text-xs text-slate-500">주요 실적</p><p className="mt-1 text-2xl font-black">{result.eventCount}</p></div>
              <div className="rounded-xl bg-slate-950/60 p-4"><p className="text-xs text-rose-400">HIGH</p><p className="mt-1 text-2xl font-black">{result.highRiskCount}</p></div>
              <div className="rounded-xl bg-slate-950/60 p-4"><p className="text-xs text-amber-400">IMPORTANT</p><p className="mt-1 text-2xl font-black">{result.importantCount}</p></div>
            </div>
            <div className="mt-5 flex flex-wrap gap-2">
              <Link href="/data/earnings-risk" className="rounded-xl bg-white px-4 py-2 text-sm font-black text-slate-950">위험 레이더 확인 →</Link>
              <Link href="/data/market-map" className="rounded-xl border border-emerald-800 px-4 py-2 text-sm font-black text-emerald-200">MARKET MAP →</Link>
            </div>
          </section>
        )}
      </div>
    </main>
  );
}
