import { NextResponse } from "next/server";

import { verifyAdminRequest } from "@/app/lib/adminAuth";
import { getContentRadar } from "@/app/lib/contentRadar";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  if (!(await verifyAdminRequest(request))) {
    return NextResponse.json({ ok: false, error: "관리자 인증이 필요합니다." }, { status: 401 });
  }

  try {
    const radar = await getContentRadar();
    return NextResponse.json({ ok: true, radar });
  } catch (error) {
    console.error("Content Radar 조회 실패:", error);
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "Content Radar를 불러오지 못했습니다.",
      },
      { status: 500 },
    );
  }
}
