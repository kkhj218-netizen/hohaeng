"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

type BootstrapResponse =
  | { ok: true; ready?: boolean; nasdaq100Count?: number; sp500Count?: number; marketDate?: string | null }
  | { ok: false; error: string };

export default function MarketMapBootstrap() {
  const router = useRouter();
  const [status, setStatus] = useState<"idle" | "running" | "done" | "error">("idle");
  const [message, setMessage] = useState("최초 장마감 스냅샷을 자동으로 준비합니다.");

  async function run() {
    if (status === "running") return;
    setStatus("running");
    setMessage("NASDAQ100·S&P500 장마감 데이터를 한 번만 생성하고 있습니다…");

    try {
      const response = await fetch("/api/market-map/bootstrap", {
        method: "POST",
        cache: "no-store",
        headers: { "Content-Type": "application/json" },
      });
      const payload = (await response.json()) as BootstrapResponse;
      if (!response.ok || !payload.ok) {
        throw new Error(payload.ok ? "시장지도 생성에 실패했습니다." : payload.error);
      }

      setStatus("done");
      const counts = payload.nasdaq100Count && payload.sp500Count
        ? `NASDAQ100 ${payload.nasdaq100Count}종목 · S&P500 ${payload.sp500Count}종목`
        : "저장 스냅샷";
      setMessage(`${counts} 준비 완료. 지도를 불러옵니다…`);
      window.setTimeout(() => router.refresh(), 500);
    } catch (error) {
      setStatus("error");
      setMessage(error instanceof Error ? error.message : "시장지도 생성에 실패했습니다.");
    }
  }

  useEffect(() => {
    void run();
    // 최초 준비 화면에서 한 번만 실행한다.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="mt-5 rounded-2xl border border-blue-100 bg-blue-50/70 p-4">
      <div className="flex items-start gap-3">
        <span
          className={`mt-0.5 inline-block h-3 w-3 shrink-0 rounded-full ${
            status === "error" ? "bg-rose-500" : status === "done" ? "bg-emerald-500" : "animate-pulse bg-blue-500"
          }`}
        />
        <div className="min-w-0">
          <p className="text-sm font-black text-slate-900">
            {status === "error" ? "자동 생성에 실패했습니다." : status === "done" ? "시장지도 준비 완료" : "시장지도 최초 데이터 생성 중"}
          </p>
          <p className="mt-1 text-xs leading-5 text-slate-500">{message}</p>
          {status === "error" && (
            <button
              type="button"
              onClick={() => void run()}
              className="mt-3 rounded-full bg-slate-950 px-4 py-2 text-xs font-black text-white"
            >
              다시 시도
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
