"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { supabase } from "@/app/lib/supabase";

type Result = {
  generatedAt: string;
  asOfDate: string;
  dashboardReady: boolean;
  postCount: number;
  cashCount: number;
  futureCount: number;
  fearGreedReady: boolean;
  earningsEventCount: number;
};

type ResponsePayload =
  | { ok: true; result: Result }
  | { ok: false; error: string };

export default function TodaySnapshotAdminPage() {
  const router = useRouter();
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<Result | null>(null);
  const [error, setError] = useState("");

  async function refresh() {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      router.replace("/admin/login");
      return;
    }

    setRunning(true);
    setResult(null);
    setError("");

    try {
      const response = await fetch("/api/admin/today-snapshot/refresh", {
        method: "POST",
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      const payload = (await response.json()) as ResponsePayload;
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
        <p className="text-xs font-black uppercase tracking-[0.2em] text-blue-400">HOHAENG TODAY</p>
        <h1 className="mt-2 text-3xl font-black">TODAY Traffic-Safe Snapshot</h1>
        <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-400">
          시장 대시보드·미국장 마감·주요 선물·Fear &amp; Greed·실적 위험·최신 글을 한 번 계산해 저장합니다.
          공개 TODAY는 저장 결과와 서버 캐시를 우선 사용하므로 방문자마다 무거운 시장 계산이나 외부 API를 반복하지 않습니다.
        </p>

        <section className="mt-6 rounded-2xl border border-slate-800 bg-slate-900 p-5">
          <h2 className="font-black">운영 원칙</h2>
          <div className="mt-3 space-y-2 text-sm leading-6 text-slate-400">
            <p>• 07:00 KST: 미국장 마감 수집과 함께 TODAY 1차 스냅샷 생성</p>
            <p>• FRED 수집 완료 후: 최신 경제지표를 반영해 TODAY 스냅샷 최종 갱신</p>
            <p>• 공개 TODAY: 저장 스냅샷 + 5분 서버/페이지 캐시 우선</p>
            <p>• 스냅샷이 없을 때만 기존 안전 fallback 사용</p>
            <p>• 실적·MARKET MAP 수집 실패가 TODAY 본문을 막지 않음</p>
          </div>
        </section>

        <button
          type="button"
          onClick={() => void refresh()}
          disabled={running}
          className="mt-6 w-full rounded-2xl bg-blue-500 px-5 py-4 text-base font-black text-slate-950 disabled:opacity-50 sm:w-auto"
        >
          {running ? "TODAY 스냅샷 생성 중..." : "지금 TODAY 스냅샷 만들기"}
        </button>

        {error && <div className="mt-5 rounded-2xl border border-rose-800 bg-rose-950/40 p-4 text-sm text-rose-200">{error}</div>}

        {result && (
          <section className="mt-5 rounded-2xl border border-emerald-800 bg-emerald-950/30 p-5">
            <h2 className="font-black text-emerald-200">TODAY 스냅샷 생성 완료</h2>
            <div className="mt-4 grid gap-3 sm:grid-cols-3">
              <div className="rounded-xl bg-slate-950/60 p-4">
                <p className="text-xs text-slate-500">기준일</p>
                <p className="mt-1 text-lg font-black">{result.asOfDate}</p>
              </div>
              <div className="rounded-xl bg-slate-950/60 p-4">
                <p className="text-xs text-slate-500">시장 데이터</p>
                <p className="mt-1 text-lg font-black">현물 {result.cashCount} · 선물 {result.futureCount}</p>
              </div>
              <div className="rounded-xl bg-slate-950/60 p-4">
                <p className="text-xs text-slate-500">실적 이벤트</p>
                <p className="mt-1 text-lg font-black">{result.earningsEventCount}</p>
              </div>
            </div>
            <div className="mt-4 flex flex-wrap gap-2 text-xs font-bold text-slate-300">
              <span className="rounded-full bg-slate-900 px-3 py-1.5">Dashboard {result.dashboardReady ? "OK" : "대기"}</span>
              <span className="rounded-full bg-slate-900 px-3 py-1.5">Fear &amp; Greed {result.fearGreedReady ? "OK" : "대기"}</span>
              <span className="rounded-full bg-slate-900 px-3 py-1.5">글 {result.postCount}개</span>
            </div>
            <Link href="/today" className="mt-5 inline-flex rounded-xl bg-white px-4 py-2 text-sm font-black text-slate-950">
              TODAY 확인 →
            </Link>
          </section>
        )}
      </div>
    </main>
  );
}
