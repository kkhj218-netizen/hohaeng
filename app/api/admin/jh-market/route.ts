import { NextRequest, NextResponse } from "next/server";

import { verifyAdminRequest } from "@/app/lib/adminAuth";
import { collectFredDataWithArchive } from "@/app/lib/jhCollectionService";
import type { FredCollectionRequestMode } from "@/app/lib/fredCollector";
import { getJhMarketDashboard } from "@/app/lib/jhMarketEngine";
import { applyLiveMarketOverlay } from "@/app/lib/jhMarketLiveOverlay";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

function unauthorized() {
  return NextResponse.json(
    { ok: false, error: "관리자 로그인이 필요합니다." },
    { status: 401, headers: { "Cache-Control": "no-store" } }
  );
}

function serverError(error: unknown) {
  const message = error instanceof Error ? error.message : String(error);
  return NextResponse.json(
    { ok: false, error: message },
    { status: 500, headers: { "Cache-Control": "no-store" } }
  );
}

export async function GET(request: NextRequest) {
  if (!(await verifyAdminRequest(request))) return unauthorized();

  try {
    const asOfDate = request.nextUrl.searchParams.get("date");
    const baseDashboard = await getJhMarketDashboard(asOfDate);
    const dashboard = await applyLiveMarketOverlay(baseDashboard);

    return NextResponse.json(
      { ok: true, dashboard },
      { headers: { "Cache-Control": "private, no-store, max-age=0" } }
    );
  } catch (error) {
    return serverError(error);
  }
}

export async function POST(request: NextRequest) {
  if (!(await verifyAdminRequest(request))) return unauthorized();

  let mode: FredCollectionRequestMode = "auto";

  try {
    const body = (await request.json()) as { mode?: unknown };
    if (body.mode === "daily" || body.mode === "backfill" || body.mode === "auto") {
      mode = body.mode;
    }
  } catch {
    // 본문이 없으면 안전한 자동 모드로 실행한다.
  }

  try {
    const result = await collectFredDataWithArchive(mode);
    const dashboard = result.dashboard
      ? await applyLiveMarketOverlay(result.dashboard)
      : await applyLiveMarketOverlay(await getJhMarketDashboard());

    return NextResponse.json(
      { ok: true, ...result, dashboard },
      { headers: { "Cache-Control": "private, no-store, max-age=0" } }
    );
  } catch (error) {
    return serverError(error);
  }
}
