"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { supabase } from "@/app/lib/supabase";

type RefreshResult = {
  nasdaq100Count: number;
  sp500Count: number;
  marketDate: string | null;
  nasdaqStorage: string;
  sp500Storage: string;
};

type ApiResponse =
  | { ok: true; startedAt: string; completedAt: string; result: RefreshResult }
  | { ok: false; error: string };

function parseApiResponse(raw: string): ApiResponse | null {
  if (!raw.trim()) return null;
  try {
    return JSON.parse(raw) as ApiResponse;
  } catch {
    return null;
  }
}

export default function MarketMapAdminPage() {
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
      const response = await fetch("/api/admin/market-map/refresh", {
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
        throw new Error(`MARKET MAP 생성 응답 오류 (${response.status}). 잠시 후 다시 실행해 주세요.`);
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
        <p className="text-xs font-black uppercase tracking-[0.2em] text-blue-400">HOHAENG MARKET MAP</p>
        <h1 className="mt-2 text-3xl font-black">장마감 시장지도 생성</h1>
        <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-400">
          NASDAQ100과 S&amp;P500 구성종목을 장마감 기준으로 한 번 수집한 뒤 완성된 스냅샷을 서버 DB에 저장합니다.
          공개 MARKET MAP과 TODAY는 이 저장 결과만 사용하므로 방문자가 외부 시세 API를 기다리지 않습니다.
        </p>

        <section className="mt-6 rounded-2xl border border-slate-800 bg-slate-900 p-5">
          <h2 className="font-black">자동 운영 기준</h2>
          <div className="mt-3 space-y-2 text-sm leading-6 text-slate-400">
            <p>• 자동 수집: 매일 21:30 UTC / 한국시간 06:30</p>
            <p>• 대상: NASDAQ 100 + S&amp;P 500</p>
            <p>• 저장값: 종가·등락률·시가총액·섹터·Breadth 요약</p>
            <p>• 공개 화면: 저장 스냅샷만 읽음</p>
            <p>• 이 버튼: 첫 설치·수집 실패·데이터 재생성이 필요할 때만 사용</p>
          </div>
        </section>

        <button
          type="button"
          onClick={() => void refresh()}
          disabled={running}
          className="mt-6 w-full rounded-2xl bg-blue-500 px-5 py-4 text-base font-black text-slate-950 disabled:opacity-50 sm:w-auto"
        >
          {running ? "NASDAQ100 · S&P500 생성 중..." : "지금 MARKET MAP 데이터 만들기"}
        </button>

        {running && (
          <p className="mt-3 max-w-2xl text-xs leading-5 text-slate-500">
            최초 생성은 외부 장마감 데이터를 한 번 수집하므로 수십 초 걸릴 수 있습니다. 이 작업은 관리자 실행에서만 발생하며 TODAY 속도에는 영향을 주지 않습니다.
          </p>
        )}

        {error && (
          <div className="mt-5 rounded-2xl border border-rose-800 bg-rose-950/40 p-4 text-sm leading-6 text-rose-200">
            {error}
          </div>
        )}

        {result && (
          <section className="mt-5 rounded-2xl border border-emerald-800 bg-emerald-950/30 p-5">
            <h2 className="font-black text-emerald-200">MARKET MAP 생성 완료</h2>
            <div className="mt-4 grid gap-3 sm:grid-cols-3">
              <div className="rounded-xl bg-slate-950/60 p-4">
                <p className="text-xs text-slate-500">NASDAQ 100</p>
                <p className="mt-1 text-2xl font-black">{result.nasdaq100Count}</p>
                <p className="mt-1 text-[10px] text-slate-500">{result.nasdaqStorage}</p>
              </div>
              <div className="rounded-xl bg-slate-950/60 p-4">
                <p className="text-xs text-slate-500">S&amp;P 500</p>
                <p className="mt-1 text-2xl font-black">{result.sp500Count}</p>
                <p className="mt-1 text-[10px] text-slate-500">{result.sp500Storage}</p>
              </div>
              <div className="rounded-xl bg-slate-950/60 p-4">
                <p className="text-xs text-slate-500">장마감 기준일</p>
                <p className="mt-1 text-lg font-black">{result.marketDate ?? "—"}</p>
              </div>
            </div>
            <div className="mt-5 flex flex-wrap gap-2">
              <Link href="/data/market-map" className="rounded-xl bg-white px-4 py-2 text-sm font-black text-slate-950">
                MARKET MAP 확인 →
              </Link>
              <Link href="/today" className="rounded-xl border border-emerald-800 px-4 py-2 text-sm font-black text-emerald-200">
                TODAY 확인 →
              </Link>
            </div>
          </section>
        )}
      </div>
    </main>
  );
}
