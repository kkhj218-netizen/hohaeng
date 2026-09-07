import { NextRequest, NextResponse } from "next/server";

import { calibrateGoogleRankPredictions } from "@/app/lib/googleRankPredictionStore";

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
    const result = await calibrateGoogleRankPredictions(25);
    return NextResponse.json({
      ok: true,
      startedAt,
      completedAt: new Date().toISOString(),
      schedule: "매일 20:15 UTC · URL이 있는 예측의 7/14/30/60일 Search Console 순위 자동 보정",
      ...result,
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
