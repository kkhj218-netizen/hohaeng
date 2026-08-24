import { NextResponse } from "next/server";

import { archiveDailyDisclosures } from "@/app/lib/disclosureArchive";
import { getInvestmentDiscoveryDashboard } from "@/app/lib/dartInvestmentDiscoveries";

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
    const result = await archiveDailyDisclosures();

    // 실제 사용자가 /data를 열기 전에 실적·지분 탐지까지 미리 계산해 캐시에 넣는다.
    // 같은 공시 피드를 재사용하므로 사용자 첫 방문에서 무거운 OpenDART 분석을 기다릴 가능성을 줄인다.
    const discovery = await getInvestmentDiscoveryDashboard();

    return NextResponse.json({
      ok: result.error === null,
      archiveConfigured: result.configured,
      sourceDateUs: result.sourceDateUs,
      sourceDateKr: result.sourceDateKr,
      fetched: result.fetched,
      archived: result.archived,
      skipped: result.skipped,
      factsSaved: result.factsSaved,
      discoveryPrewarmed: discovery.configured,
      discoverySourceDate: discovery.sourceDate,
      discoveryItems: discovery.items.length,
      error: result.error,
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
