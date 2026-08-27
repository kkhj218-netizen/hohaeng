import { revalidatePath } from "next/cache";
import { NextRequest, NextResponse } from "next/server";

import { verifyAdminRequest } from "@/app/lib/adminAuth";
import { warmMarketMapCache } from "@/app/lib/marketMap";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 120;

export async function POST(request: NextRequest) {
  if (!(await verifyAdminRequest(request))) {
    return NextResponse.json(
      { ok: false, error: "관리자 로그인이 필요합니다." },
      { status: 401, headers: { "Cache-Control": "no-store" } },
    );
  }

  const startedAt = new Date().toISOString();

  try {
    const result = await warmMarketMapCache();

    revalidatePath("/data/market-map");
    revalidatePath("/data");

    return NextResponse.json(
      {
        ok: true,
        startedAt,
        completedAt: new Date().toISOString(),
        result,
      },
      { headers: { "Cache-Control": "private, no-store, max-age=0" } },
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("MARKET MAP manual refresh failed:", error);

    return NextResponse.json(
      {
        ok: false,
        startedAt,
        completedAt: new Date().toISOString(),
        error: message,
      },
      { status: 500, headers: { "Cache-Control": "no-store" } },
    );
  }
}
