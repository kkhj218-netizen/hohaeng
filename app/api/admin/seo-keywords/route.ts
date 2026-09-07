import { NextResponse } from "next/server";

import { verifyAdminRequest } from "@/app/lib/adminAuth";
import {
  generateDailySeoKeywordRecommendations,
  getOrGenerateDailySeoKeywordRecommendations,
} from "@/app/lib/dailySeoKeywordRecommendations";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 180;

export async function GET(request: Request) {
  if (!(await verifyAdminRequest(request))) {
    return NextResponse.json({ ok: false, error: "관리자 인증이 필요합니다." }, { status: 401 });
  }

  try {
    const recommendations = await getOrGenerateDailySeoKeywordRecommendations();
    return NextResponse.json({ ok: true, recommendations });
  } catch (error) {
    console.error("오늘 SEO 키워드 조회 실패:", error);
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "오늘 추천 키워드를 불러오지 못했습니다.",
      },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  if (!(await verifyAdminRequest(request))) {
    return NextResponse.json({ ok: false, error: "관리자 인증이 필요합니다." }, { status: 401 });
  }

  try {
    const recommendations = await generateDailySeoKeywordRecommendations(true);
    return NextResponse.json({ ok: true, recommendations });
  } catch (error) {
    console.error("오늘 SEO 키워드 재생성 실패:", error);
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "오늘 추천 키워드를 다시 만들지 못했습니다.",
      },
      { status: 500 },
    );
  }
}
