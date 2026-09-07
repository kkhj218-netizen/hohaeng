import { NextResponse } from "next/server";

import { verifyAdminRequest } from "@/app/lib/adminAuth";
import { analyzeGoogleRank } from "@/app/lib/googleRankPredictor";
import {
  listGoogleRankPredictions,
  saveGoogleRankPrediction,
} from "@/app/lib/googleRankPredictionStore";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET(request: Request) {
  if (!(await verifyAdminRequest(request))) {
    return NextResponse.json(
      { ok: false, error: "관리자 인증이 필요합니다." },
      { status: 401 },
    );
  }

  try {
    const history = await listGoogleRankPredictions(25);
    return NextResponse.json({ ok: true, history });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "예측 이력을 불러오지 못했습니다.",
      },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  if (!(await verifyAdminRequest(request))) {
    return NextResponse.json(
      { ok: false, error: "관리자 인증이 필요합니다." },
      { status: 401 },
    );
  }

  try {
    const body = (await request.json()) as {
      title?: unknown;
      url?: unknown;
    };
    const title = typeof body.title === "string" ? body.title.trim() : "";
    const url = typeof body.url === "string" ? body.url.trim() : null;

    if (title.length < 4) {
      return NextResponse.json(
        { ok: false, error: "분석할 제목을 4자 이상 입력해 주세요." },
        { status: 400 },
      );
    }

    const analysis = await analyzeGoogleRank(title, url);
    let saved = null;
    let saveError: string | null = null;

    try {
      saved = await saveGoogleRankPrediction(analysis);
    } catch (error) {
      saveError = error instanceof Error ? error.message : "예측 결과 저장 실패";
      console.error("Rank Predictor 저장 실패:", error);
    }

    return NextResponse.json({
      ok: true,
      analysis,
      saved,
      saveError,
    });
  } catch (error) {
    console.error("Google Rank Predictor 분석 실패:", error);
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "Google 예상 순위 분석에 실패했습니다.",
      },
      { status: 500 },
    );
  }
}
