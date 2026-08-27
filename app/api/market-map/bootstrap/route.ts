import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";

import { warmMarketMapCache } from "@/app/lib/marketMap";
import { loadMarketMapSnapshot } from "@/app/lib/marketMapSnapshotStore";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 120;

let bootstrapPromise: Promise<Awaited<ReturnType<typeof warmMarketMapCache>>> | null = null;

async function handleBootstrap() {
  const [nasdaq100, sp500] = await Promise.all([
    loadMarketMapSnapshot("nasdaq100"),
    loadMarketMapSnapshot("sp500"),
  ]);

  if (nasdaq100 && sp500) {
    return NextResponse.json(
      {
        ok: true,
        ready: true,
        nasdaq100Count: nasdaq100.totalCount,
        sp500Count: sp500.totalCount,
        marketDate: nasdaq100.marketDate ?? sp500.marketDate,
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  }

  try {
    if (!bootstrapPromise) {
      bootstrapPromise = warmMarketMapCache().finally(() => {
        bootstrapPromise = null;
      });
    }
    const result = await bootstrapPromise;
    revalidatePath("/data/market-map");
    revalidatePath("/data");

    return NextResponse.json(
      { ok: true, ready: true, ...result },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    console.error("MARKET MAP bootstrap failed:", error);
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : String(error),
      },
      { status: 500, headers: { "Cache-Control": "no-store" } },
    );
  }
}

export async function POST() {
  return handleBootstrap();
}

// 저장 스냅샷이 없는 최초 1회에만 실제 수집을 실행한다.
// 스냅샷이 생긴 뒤에는 단순 상태 확인만 하므로 반복 호출에도 외부 API를 재호출하지 않는다.
export async function GET() {
  return handleBootstrap();
}
