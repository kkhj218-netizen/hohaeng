import { revalidatePath } from "next/cache";
import { NextRequest, NextResponse } from "next/server";

import { warmTodaySnapshot } from "@/app/lib/todaySnapshot";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

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
    const result = await warmTodaySnapshot();
    revalidatePath("/today");
    return NextResponse.json({
      ok: true,
      phase: "post-fred",
      startedAt,
      completedAt: new Date().toISOString(),
      ...result,
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        phase: "post-fred",
        startedAt,
        completedAt: new Date().toISOString(),
        error: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    );
  }
}
