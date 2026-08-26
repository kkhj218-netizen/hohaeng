"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { supabase } from "@/app/lib/supabase";

type Result = {
  eventCount: number;
  metricCount: number;
  reactionCount: number;
  earliestRelease: string | null;
  latestRelease: string | null;
  mode?: "batch";
};

type ApiResponse = { ok: true; result: Result } | { ok: false; error: string };

function parseApiResponse(raw: string): ApiResponse | null {
  if (!raw.trim()) return null;
  try {
    return JSON.parse(raw) as ApiResponse;
  } catch {
    return null;
  }
}

export default function FomcBackfillAdminPage() {
  const router = useRouter();
  const [running, setRunning] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<Result | null>(null);

  async function run() {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      router.replace("/admin/login");
      return;
    }

    setRunning(true);
    setError("");
    setResult(null);

    try {
      const response = await fetch("/api/admin/economic-events/fomc/backfill", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          "Content-Type": "application/json",
        },
      });
      const raw = await response.text();
      const payload = parseApiResponse(raw);

      if (response.status === 401) {
        router.replace("/admin/login");
        return;
      }
      if (!payload) {
        const hint = response.status >= 500
          ? "서버 처리시간 초과 또는 외부 데이터 원천의 일시 오류일 수 있습니다. 잠시 뒤 다시 실행해 주세요."
          : "서버 응답 형식을 읽지 못했습니다. 새로고침 후 다시 실행해 주세요.";
        throw new Error(`FOMC 백필 응답 오류 (${response.status}). ${hint}`);
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
        <p className="text-xs font-black uppercase tracking-[0.2em] text-blue-400">HOHAENG FOMC EVENT DB</p>
        <h1 className="mt-2 text-3xl font-black">FOMC 2016~현재 데이터 백필</h1>
        <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-400">
          연준 FOMC 일정과 FRED의 목표금리 상·하단, SEP 장기금리 중앙값을 이용해 금리결정 이벤트를 만들고,
          7개 자산의 당일/+1D/+5D 반응을 같은 이벤트로 저장합니다.
        </p>

        <section className="mt-6 rounded-2xl border border-slate-800 bg-slate-900 p-5">
          <h2 className="font-black">이번 단계의 기준</h2>
          <div className="mt-3 space-y-2 text-sm leading-6 text-slate-400">
            <p>• 목표금리: DFEDTARL / DFEDTARU</p>
            <p>• 변화폭: 목표금리 중간값의 회의 전후 차이를 bp로 계산</p>
            <p>• SEP: 점도표 발표 회의 표시 + FEDTARMDLR 장기금리 중앙값</p>
            <p>• 2020년 3월 3일·15일 긴급회의 포함</p>
            <p>• 시장반응: 결정 직전 거래일 종가 대비 결정일(또는 다음 거래일)/+1D/+5D</p>
            <p>• 자산: NQ, RTY, 금, WTI, DXY, 2Y·10Y 국채선물</p>
            <p>• 성명 문구의 매파/비둘기파 판정은 V1에서 임의 생성하지 않음</p>
          </div>
        </section>

        <button
          type="button"
          onClick={() => void run()}
          disabled={running}
          className="mt-6 w-full rounded-2xl bg-blue-500 px-5 py-4 text-base font-black text-slate-950 disabled:opacity-50 sm:w-auto"
        >
          {running ? "FOMC 백필 실행 중..." : "2016~현재 FOMC 데이터 채우기"}
        </button>

        {running && <p className="mt-3 text-xs leading-5 text-slate-500">이벤트·금리결정·SEP·시장반응을 일괄 저장합니다. 완료 표시가 뜰 때까지 화면을 유지해 주세요.</p>}

        {error && (
          <div className="mt-5 rounded-2xl border border-rose-800 bg-rose-950/40 p-4 text-sm leading-6 text-rose-200">{error}</div>
        )}

        {result && (
          <section className="mt-5 rounded-2xl border border-emerald-800 bg-emerald-950/30 p-5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="font-black text-emerald-200">FOMC 백필 완료</h2>
              {result.mode === "batch" && <span className="rounded-full border border-emerald-800 px-3 py-1 text-xs font-bold text-emerald-300">일괄 저장 완료</span>}
            </div>
            <div className="mt-4 grid gap-3 sm:grid-cols-3">
              <div className="rounded-xl bg-slate-950/60 p-4"><p className="text-xs text-slate-500">이벤트</p><p className="mt-1 text-2xl font-black">{result.eventCount}</p></div>
              <div className="rounded-xl bg-slate-950/60 p-4"><p className="text-xs text-slate-500">지표 행</p><p className="mt-1 text-2xl font-black">{result.metricCount}</p></div>
              <div className="rounded-xl bg-slate-950/60 p-4"><p className="text-xs text-slate-500">시장반응 행</p><p className="mt-1 text-2xl font-black">{result.reactionCount}</p></div>
            </div>
            <p className="mt-4 text-xs text-slate-400">일정 범위 {result.earliestRelease ?? "—"} ~ {result.latestRelease ?? "—"}</p>
            <a href="/data/events/fomc" className="mt-5 inline-flex rounded-xl bg-white px-4 py-2 text-sm font-black text-slate-950">FOMC EVENT DB 확인 →</a>
          </section>
        )}
      </div>
    </main>
  );
}
