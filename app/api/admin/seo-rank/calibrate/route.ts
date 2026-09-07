import { NextResponse } from "next/server";

import { verifyAdminRequest } from "@/app/lib/adminAuth";
import { calibrateGoogleRankPredictions } from "@/app/lib/googleRankPredictionStore";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 120;

export async function POST(request: Request) {
  if (!(await verifyAdminRequest(request))) {
    return NextResponse.json(
      { ok: false, error: "관리자 인증이 필요합니다." },
      { status: 401 },
    );
  }

  try {
    const result = await calibrateGoogleRankPredictions(20);
    return NextResponse.json({ ok: true, result });
  } catch (error) {
    console.error("Rank Predictor 보정 실패:", error);
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "예측 보정에 실패했습니다.",
      },
      { status: 500 },
    );
  }
}
