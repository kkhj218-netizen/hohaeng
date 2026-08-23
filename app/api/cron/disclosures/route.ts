import { NextResponse } from "next/server";

import { getDailyDisclosureFeed } from "@/app/lib/disclosureHub";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 120;

function authorized(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  return request.headers.get("authorization") === `Bearer ${secret}`;
}

export async function GET(request: Request) {
  if (!authorized(request)) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  try {
    const feed = await getDailyDisclosureFeed();
    return NextResponse.json({
      ok: true,
      generatedAt: feed.generatedAt,
      korea: {
        configured: feed.korea.configured,
        sourceDate: feed.korea.sourceDate,
        count: feed.korea.items.length,
        error: feed.korea.error,
      },
      us: {
        sourceDate: feed.us.sourceDate,
        count: feed.us.items.length,
        error: feed.us.error,
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    );
  }
}
