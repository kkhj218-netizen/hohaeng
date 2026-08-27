import { revalidatePath } from "next/cache";
import { NextRequest, NextResponse } from "next/server";

import { verifyAdminRequest } from "@/app/lib/adminAuth";
import { warmEarningsRiskRadar } from "@/app/lib/earningsRisk";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 120;

export async function POST(request: NextRequest) {
  if (!(await verifyAdminRequest(request))) {
    return NextResponse.json(
      { ok: false, error: "관리자 로그인이 필요합니다." },
      { status: 401, headers: { "Cache-Control": "no-store" } },
    );
  }

  const startedAt = new Date().toISOString();
  try {
    const result = await warmEarningsRiskRadar();
    revalidatePath("/data/earnings-risk");
    revalidatePath("/data/market-map");
    revalidatePath("/today");
    revalidatePath("/data");

    return NextResponse.json(
      { ok: true, startedAt, completedAt: new Date().toISOString(), result },
      { headers: { "Cache-Control": "private, no-store, max-age=0" } },
    );
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        startedAt,
        completedAt: new Date().toISOString(),
        error: error instanceof Error ? error.message : String(error),
      },
      { status: 500, headers: { "Cache-Control": "no-store" } },
    );
  }
}
