import { revalidatePath } from "next/cache";
import { NextRequest, NextResponse } from "next/server";

import type { FredCollectionRequestMode } from "@/app/lib/fredCollector";
import { collectFredDataWithArchive } from "@/app/lib/jhCollectionService";
import { warmTodaySnapshot } from "@/app/lib/todaySnapshot";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

function isAuthorized(request: NextRequest): boolean {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) return false;
  return request.headers.get("authorization") === `Bearer ${cronSecret}`;
}

async function runCollection(mode: FredCollectionRequestMode) {
  try {
    const result = await collectFredDataWithArchive(mode);

    let todaySnapshot: Awaited<ReturnType<typeof warmTodaySnapshot>> | null = null;
    let todaySnapshotWarning: string | null = null;
    try {
      todaySnapshot = await warmTodaySnapshot();
      revalidatePath("/today");
    } catch (error) {
      todaySnapshotWarning = error instanceof Error ? error.message : String(error);
    }

    return NextResponse.json({
      ok: true,
      ...result,
      todaySnapshot,
      todaySnapshotWarning,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }
  return runCollection("auto");
}

export async function POST(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  let mode: FredCollectionRequestMode = "backfill";
  try {
    const body = (await request.json()) as { mode?: FredCollectionRequestMode };
    if (body.mode === "auto" || body.mode === "daily" || body.mode === "backfill") {
      mode = body.mode;
    }
  } catch {
    // 본문이 없으면 최초 과거 데이터 적재로 실행한다.
  }

  return runCollection(mode);
}
