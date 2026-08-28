import { NextResponse } from "next/server";

import { getEarningsRiskSnapshot } from "@/app/lib/earningsRisk";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const snapshot = await getEarningsRiskSnapshot();
  return NextResponse.json(
    { ok: true, snapshot },
    {
      headers: {
        "Cache-Control": "public, max-age=120, s-maxage=900, stale-while-revalidate=1800",
      },
    },
  );
}
