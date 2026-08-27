import { NextRequest, NextResponse } from "next/server";

import { warmMarketMapCache } from "@/app/lib/marketMap";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 120;

function isAuthorized(request: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) return false;
  return request.headers.get("authorization") === `Bearer ${cronSecret}`;
}

export async function GET(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const startedAt = new Date().toISOString();
  try {
    const result = await warmMarketMapCache();
    return NextResponse.json({
      ok: true,
      startedAt,
      completedAt: new Date().toISOString(),
      ...result,
      schedule: "05:30 UTC · 미국장 개장 전 장마감 MARKET MAP 생성 → DB 저장",
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        startedAt,
        completedAt: new Date().toISOString(),
        error: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    );
  }
}
