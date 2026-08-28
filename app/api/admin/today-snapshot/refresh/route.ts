import { revalidatePath } from "next/cache";
import { NextRequest, NextResponse } from "next/server";

import { verifyAdminRequest } from "@/app/lib/adminAuth";
import { warmTodaySnapshot } from "@/app/lib/todaySnapshot";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

export async function POST(request: NextRequest) {
  if (!(await verifyAdminRequest(request))) {
    return NextResponse.json({ ok: false, error: "관리자 로그인이 필요합니다." }, { status: 401 });
  }

  const startedAt = new Date().toISOString();
  try {
    const result = await warmTodaySnapshot();
    revalidatePath("/today");
    return NextResponse.json({
      ok: true,
      startedAt,
      completedAt: new Date().toISOString(),
      result,
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
