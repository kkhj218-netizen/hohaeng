import { NextRequest, NextResponse } from "next/server";

import { verifyAdminRequest } from "@/app/lib/adminAuth";
import { runCpiHistoricalBackfill } from "@/app/lib/cpiHistoricalBackfill";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 180;

export async function POST(request: NextRequest) {
  if (!(await verifyAdminRequest(request))) {
    return NextResponse.json(
      { ok: false, error: "관리자 로그인이 필요합니다." },
      { status: 401, headers: { "Cache-Control": "no-store" } },
    );
  }

  try {
    const result = await runCpiHistoricalBackfill();
    return NextResponse.json(
      { ok: true, result },
      { headers: { "Cache-Control": "private, no-store, max-age=0" } },
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      { ok: false, error: message },
      { status: 500, headers: { "Cache-Control": "no-store" } },
    );
  }
}
