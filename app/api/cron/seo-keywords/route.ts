import { NextRequest, NextResponse } from "next/server";

import { generateDailySeoKeywordRecommendations } from "@/app/lib/dailySeoKeywordRecommendations";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 180;

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
    const recommendations = await generateDailySeoKeywordRecommendations(true);
    return NextResponse.json({
      ok: true,
      startedAt,
      completedAt: new Date().toISOString(),
      count: recommendations.length,
      keywords: recommendations.map((item) => ({
        rank: item.rank,
        keyword: item.keyword,
        predicted: `${item.analysis.prediction.min}~${item.analysis.prediction.max}`,
        top10Probability: item.analysis.prediction.top10Probability,
      })),
      schedule: "21:05 UTC · 한국 06:05 오늘 쓸 SEO 키워드 5개 생성",
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
