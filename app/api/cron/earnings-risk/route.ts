import { NextRequest, NextResponse } from "next/server";

import { warmEarningsRiskRadar } from "@/app/lib/earningsRisk";

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
    const result = await warmEarningsRiskRadar();
    return NextResponse.json({
      ok: true,
      startedAt,
      completedAt: new Date().toISOString(),
      ...result,
      schedule: "21:45 UTC / 한국 06:45 · MARKET MAP 저장 후 향후 7일 대형주 실적 위험 레이더 생성",
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
